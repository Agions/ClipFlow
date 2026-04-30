/**
 * 步骤4: 生成文案 — AI Cinema Studio Redesign
 * 三大核心功能：AI视频解说 / AI第一人称 / AI混剪
 */
import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { useCutDeck } from '../AIEditorContext';
import { aiService } from '../../../core/services/ai.service';
import type { ScriptData, AIModel, AIModelSettings, ModelProvider } from '../../../core/types';
import { AI_MODELS as CORE_AI_MODELS, DEFAULT_MODEL_ID } from '../../../core/config/models.config';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { notify } from '../../../shared';
import { getAvailableModelsFromApiKeys, resolveDefaultModelId } from '../../../core/utils/model-availability';
import { orchestrateCommentaryAgents } from '../../../core/services/workflow/commentaryAgents';
import { ALIGNMENT_GATE_THRESHOLD, isAlignmentGatePassed } from '../../../core/workflow/alignmentGate';
import {
  FEATURE_TO_FUNCTION,
  FUNCTION_TO_FEATURE,
  FUNCTION_TO_MODE,
  type AIFunctionType,
} from './functionModeMap';
import styles from './ScriptWriting.module.less';

// 功能配置
const FUNCTION_CONFIG: Record<AIFunctionType, {
  title: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  features: string[];
  example: string;
}> = {
  'video-narration': {
    title: 'AI 视频解说',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    description: '对视频内容进行专业解说，适合教程、评测、科普',
    color: '#1890ff',
    features: ['智能总结要点', '专业术语解释', '逻辑连贯', '多种语气可选'],
    example: '欢迎观看本期内容！今天我们来聊聊这个话题...',
  },
  'first-person': {
    title: 'AI 第一人称',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    description: '以第一人称视角讲述，像主播一样与观众互动',
    color: '#52c41a',
    features: ['真实互动感', '情感充沛', '口语化表达', '粉丝粘性高'],
    example: '嘿，朋友们！我是XXX，今天带大家一起体验...',
  },
  'remix': {
    title: 'AI 混剪',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="18" r="3" />
        <line x1="6" y1="9" x2="6" y2="15" />
        <line x1="18" y1="9" x2="18" y2="15" />
        <line x1="9" y1="6" x2="15" y2="6" />
        <line x1="9" y1="18" x2="15" y2="18" />
      </svg>
    ),
    description: '自动识别精彩片段，生成节奏感强的混剪视频',
    color: '#fa8c16',
    features: ['智能片段选取', '节奏感强', '高潮迭起', '自动配音'],
    example: '【开场】就在刚才，发生了这一幕...',
  },
};

// 文案风格选项
const SCRIPT_STYLES = [
  { value: 'formal', label: '正式' },
  { value: 'casual', label: '轻松' },
  { value: 'humor', label: '幽默' },
  { value: 'emotional', label: '情感' },
];

// 文案长度选项
const SCRIPT_LENGTHS = [
  { value: 'short', label: '短视频', time: '~30s' },
  { value: 'medium', label: '中视频', time: '1-3min' },
  { value: 'long', label: '长视频', time: '3-10min' },
];

interface ScriptGenerateProps {
  onNext?: () => void;
}

const ScriptGenerate: React.FC<ScriptGenerateProps> = memo(({ onNext }) => {
  const {
    state,
    setNarrationScript,
    setRemixScript,
    setFeature,
    goToNextStep,
    dispatch,
  } = useCutDeck();

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [defaultModel] = useLocalStorage<string>('default_model', DEFAULT_MODEL_ID);
  const [apiKeys] = useLocalStorage<Partial<Record<ModelProvider, { key: string; isValid?: boolean }>>>('api_keys', {});

  const [config, setConfig] = useState({
    functionType: 'video-narration' as AIFunctionType,
    style: 'casual',
    length: 'medium',
  });

  const [alignmentGate, setAlignmentGate] = useState<{
    averageConfidence: number;
    maxDriftSeconds: number;
    passed: boolean;
  } | null>(null);

  // 用于跟踪 setTimeout 的 ref，避免内存泄漏
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentFunction = FUNCTION_CONFIG[config.functionType];
  const currentMode = FUNCTION_TO_MODE[config.functionType];

  useEffect(() => {
    if (state.selectedFeature === 'none') return;
    const mapped = FEATURE_TO_FUNCTION[state.selectedFeature as 'smartClip' | 'voiceover' | 'subtitle'];
    if (!mapped || mapped === config.functionType) return;
    setConfig((prev) => ({ ...prev, functionType: mapped }));
  }, [config.functionType, state.selectedFeature]);

  // 组件卸载时清理 timeout，避免内存泄漏
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const applyCommentaryOrchestration = useCallback((scriptData: ScriptData): ScriptData => {
    if (!state.analysis?.scenes?.length || !scriptData.segments?.length) {
      setAlignmentGate(null);
      return scriptData;
    }

    const orchestration = orchestrateCommentaryAgents({
      mode: currentMode,
      analysis: state.analysis,
      segments: scriptData.segments,
    });

    const passed = isAlignmentGatePassed(orchestration.alignmentSummary);

    setAlignmentGate({
      averageConfidence: orchestration.alignmentSummary.averageConfidence,
      maxDriftSeconds: orchestration.alignmentSummary.maxDriftSeconds,
      passed,
    });

    return {
      ...scriptData,
      segments: orchestration.alignedSegments,
      content: orchestration.alignedSegments.map((segment) => segment.content).join('\n\n'),
      updatedAt: new Date().toISOString(),
    };
  }, [currentMode, state.analysis]);

  const handleGenerate = useCallback(async (functionType: AIFunctionType) => {
    // 清理之前的 timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setGenerating(true);
    setProgress(0);
    setFeature(FUNCTION_TO_FEATURE[functionType]);

    try {
      const topic = state.analysis?.summary || '视频内容解说';

      const availableModels = getAvailableModelsFromApiKeys(apiKeys, CORE_AI_MODELS);
      const resolvedModelId = resolveDefaultModelId(defaultModel, availableModels);
      const model = (
        availableModels.find((item) => item.id === resolvedModelId) ||
        CORE_AI_MODELS.find((item) => item.id === DEFAULT_MODEL_ID) ||
        CORE_AI_MODELS[0]
      ) as AIModel;

      const settings: AIModelSettings = {
        enabled: true,
        apiKey: apiKeys[model.provider ?? 'openai']?.key || '',
        temperature: 0.7,
        maxTokens: 2000,
      };

      const styleMap: Record<AIFunctionType, string> = {
        'video-narration': config.style,
        'first-person': 'casual',
        'remix': 'humor',
      };

      setProgress(10);

      const scriptData = await aiService.generateScript(
        model,
        settings,
        {
          topic,
          style: styleMap[functionType],
          tone: config.style,
          length: config.length,
          audience: '通用',
          language: 'zh-CN',
          keywords: state.analysis?.scenes?.map(s => s.type as string).filter((type): type is string => Boolean(type)) || [],
          videoDuration: state.currentVideo?.duration,
        }
      );

      setProgress(50);
      const alignedScript = applyCommentaryOrchestration(scriptData);

      setProgress(80);
      if (functionType === 'video-narration' || functionType === 'first-person') {
        setNarrationScript(alignedScript);
      } else {
        setRemixScript(alignedScript);
      }

      setProgress(100);
      notify.success(`${FUNCTION_CONFIG[functionType].title}生成成功！`);

      timeoutRef.current = setTimeout(() => {
        if (onNext) onNext();
        else goToNextStep();
      }, 2000);  // 增加到2秒，让用户有时间查看生成结果
    } catch (error) {
      notify.error(error, '文案生成失败，请重试');
    } finally {
      timeoutRef.current = setTimeout(() => {
        setGenerating(false);
        setProgress(0);
      }, 500);
    }
  }, [config.style, config.length, state.analysis, state.currentVideo, setNarrationScript, setRemixScript, setFeature, applyCommentaryOrchestration, goToNextStep, onNext]);

  const handleEditScript = useCallback((newContent: string): void => {
    const script = config.functionType === 'remix' ? state.scriptData.remix : state.scriptData.narration;

    if (script) {
      const updatedScript: ScriptData = {
        ...script,
        content: newContent,
        updatedAt: new Date().toISOString(),
      };

      if (config.functionType === 'remix') {
        setRemixScript(updatedScript);
      } else {
        setNarrationScript(updatedScript);
      }
      notify.success('文案已保存');
    }
  }, [config.functionType, state.scriptData, setNarrationScript, setRemixScript]);

  const getCurrentScript = (): ScriptData | null => {
    if (config.functionType === 'remix') {
      return state.scriptData.remix;
    }
    return state.scriptData.narration;
  };

  const currentScript = getCurrentScript();
  const canProceed = state.stepStatus['ai-analyze'];

  const handleCopy = () => {
    if (currentScript?.content) {
      navigator.clipboard.writeText(currentScript.content);
      notify.success('文案已复制到剪贴板');
    }
  };

  const wordCount = currentScript?.content?.length || 0;
  const estimatedDuration = Math.ceil(wordCount / 3);

  // 未完成前置步骤
  if (!canProceed) {
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepTitle}>
          <div className={styles.stepTitleLeft}>
            <h2>📝 生成文案</h2>
          </div>
        </div>
        <div style={{
          padding: '28px',
          background: 'rgba(250, 173, 20, 0.06)',
          border: '1px solid rgba(250, 173, 20, 0.15)',
          borderRadius: '12px',
          textAlign: 'center',
          fontFamily: 'Figtree, sans-serif',
          color: 'rgba(255, 255, 255, 0.55)',
          fontSize: '14px',
        }}>
          ⚠️ 请先完成 AI 分析步骤，再生成文案
          <br />
          <button
            style={{
              marginTop: '14px',
              padding: '8px 20px',
              background: 'rgba(250, 173, 20, 0.12)',
              border: '1px solid rgba(250, 173, 20, 0.25)',
              borderRadius: '8px',
              color: '#faad14',
              fontFamily: 'Figtree, sans-serif',
              fontSize: '13px',
              cursor: 'pointer',
            }}
            onClick={() => dispatch({ type: 'SET_STEP', payload: 'ai-analyze' })}
          >
            去分析
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stepContent}>
      {/* 头部 */}
      <div className={styles.stepTitle}>
        <div className={styles.stepTitleLeft}>
          <h2>📝 生成文案</h2>
          <span className={styles.modeTag}>
            <span className={styles.modeTagDot} />
            {currentFunction.title}
          </span>
        </div>
      </div>

      <div className={styles.columns}>
        {/* ====== 左侧：功能配置 ====== */}
        <div className={styles.configCard}>
          <div className={styles.configHeader}>
            <svg className={styles.configHeaderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <h3 className={styles.configTitle}>功能配置</h3>
          </div>

          <div className={styles.configBody}>
            {/* 功能模式选择 */}
            <div className={styles.modeList}>
              {(Object.entries(FUNCTION_CONFIG) as [AIFunctionType, typeof FUNCTION_CONFIG[AIFunctionType]][]).map(([key, func]) => {
                const isActive = config.functionType === key;
                const hasContent = key === 'remix'
                  ? !!state.scriptData.remix
                  : !!state.scriptData.narration;

                return (
                  <div
                    key={key}
                    className={`${styles.modeItem} ${isActive ? styles.modeActive : ''}`}
                    onClick={() => {
                      setConfig({ ...config, functionType: key });
                      setFeature(FUNCTION_TO_FEATURE[key]);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setConfig({ ...config, functionType: key })}
                  >
                    <div className={styles.modeItemInner}>
                      <span className={styles.modeItemIcon}>{func.icon}</span>
                      <div className={styles.modeItemContent}>
                        <div className={styles.modeItemName}>
                          {func.title}
                          {hasContent && <span className={styles.modeItemBadge}>已生成</span>}
                        </div>
                        <div className={styles.modeItemDesc}>{func.description}</div>
                      </div>
                    </div>
                    <div className={styles.modeItemCheck}>
                      <div className={styles.modeItemCheckDot} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 风格和长度 */}
            <div className={styles.subConfigRow}>
              <div className={styles.selectGroup}>
                <label htmlFor="styleSelect">语气风格</label>
                <div className={styles.selectWrapper}>
                  <select
                    id="styleSelect"
                    className={styles.selectInput}
                    value={config.style}
                    onChange={(e) => setConfig({ ...config, style: e.target.value })}
                  >
                    {SCRIPT_STYLES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <svg className={styles.selectArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              <div className={styles.selectGroup}>
                <label htmlFor="lengthSelect">文案长度</label>
                <div className={styles.selectWrapper}>
                  <select
                    id="lengthSelect"
                    className={styles.selectInput}
                    value={config.length}
                    onChange={(e) => setConfig({ ...config, length: e.target.value })}
                  >
                    {SCRIPT_LENGTHS.map(l => (
                      <option key={l.value} value={l.value}>{l.label} ({l.time})</option>
                    ))}
                  </select>
                  <svg className={styles.selectArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 功能特点 */}
            <div className={styles.featuresSection}>
              <span className={styles.featuresLabel}>功能特点</span>
              <div className={styles.featureTags}>
                {currentFunction.features.map((f, i) => (
                  <span key={i} className={styles.featureTag}>✓ {f}</span>
                ))}
              </div>
            </div>

            {/* 示例文案 */}
            <div className={styles.exampleSection}>
              <span className={styles.exampleLabel}>文案示例</span>
              <p className={styles.exampleText}>"{currentFunction.example}..."</p>
            </div>
          </div>
        </div>

        {/* ====== 右侧：文案编辑 ====== */}
        <div className={styles.editorCard}>
          <div className={styles.editorHeader}>
            <div className={styles.editorHeaderLeft}>
              <svg className={styles.editorHeaderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <h3 className={styles.editorTitle}>文案编辑</h3>
            </div>
            <div className={styles.editorActions}>
              <button className={styles.iconBtn} onClick={handleCopy} title="复制文案" aria-label="复制文案">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>

          {/* 生成按钮区 */}
          <div className={styles.generateSection}>
            <div className={styles.generateRow}>
              {currentScript && (
                <span className={styles.generateStats}>
                  ✓ {wordCount} 字 · ~{estimatedDuration}秒
                </span>
              )}
              <button
                className={styles.regenBtn}
                onClick={() => handleGenerate(config.functionType)}
                disabled={generating}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                重新生成
              </button>
            </div>
          </div>

          {/* 进度动画 */}
          {generating && (
            <div className={styles.progressSection}>
              <div className={styles.progressLabel}>
                <svg className={styles.progressLabelIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
                正在生成 {currentFunction.title}...
                <span className={styles.progressPercent}>{progress}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <div className={styles.typingIndicator}>
                <div className={styles.typingDot} />
                <div className={styles.typingDot} />
                <div className={styles.typingDot} />
                <span className={styles.typingLabel}>AI 正在创作中</span>
              </div>
            </div>
          )}

          {/* 文案编辑区 */}
          <div className={styles.scriptEditor}>
            <textarea
              className={styles.scriptTextarea}
              value={currentScript?.content || ''}
              onChange={(e) => handleEditScript(e.target.value)}
              placeholder={`点击上方"重新生成"按钮，AI 将自动生成 ${currentFunction.title}...\n\n也可以直接在此编辑文案内容`}
              disabled={!currentScript && !generating}
              aria-label="文案内容"
            />
          </div>

          {/* 统计栏 */}
          {currentScript && (
            <>
              <div className={styles.scriptStats}>
                <span className={styles.statItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  字数: <span className={styles.statValue}>{wordCount}</span>
                </span>
                <span className={styles.statItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  预计: <span className={styles.statValue}>~{estimatedDuration}秒</span>
                </span>
                <span className={styles.statItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  风格: <span className={styles.statValue}>{currentScript.metadata?.style || config.style}</span>
                </span>
              </div>

              {/* 音画对齐状态 */}
              {alignmentGate && (
                <div className={`${styles.alignmentAlert} ${alignmentGate.passed ? styles.alertSuccess : styles.alertWarning}`}>
                  <svg className={styles.alignmentIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {alignmentGate.passed
                      ? <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      : <circle cx="12" cy="12" r="10" />}
                    {alignmentGate.passed
                      ? <polyline points="22 4 12 14.01 9 11.01" />
                      : <><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>}
                  </svg>
                  <div>
                    <div className={styles.alignmentTitle}>
                      {alignmentGate.passed ? '✓ 音画对齐通过' : '⚠ 音画对齐待优化'}
                    </div>
                    <div>
                      平均置信度 {alignmentGate.averageConfidence.toFixed(2)}（阈值 {ALIGNMENT_GATE_THRESHOLD.minConfidence}），
                      最大漂移 {alignmentGate.maxDriftSeconds.toFixed(2)}s（阈值 {ALIGNMENT_GATE_THRESHOLD.maxDriftSeconds}s）
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 空状态 */}
          {!currentScript && !generating && (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className={styles.emptyTitle}>暂无文案</p>
              <p className={styles.emptyDesc}>点击左侧按钮生成文案</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ScriptGenerate.displayName = 'ScriptGenerate';
export default ScriptGenerate;

