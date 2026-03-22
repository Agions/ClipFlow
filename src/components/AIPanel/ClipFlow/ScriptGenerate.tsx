import { logger } from '@/utils/logger';
/**
 * 步骤4: 生成文案 - 优化版
 * 
 * 三大核心功能：
 * 1. AI 视频解说 - 对视频内容进行专业解说
 * 2. AI 第一人称解说 - 以第一人称视角讲述
 * 3. AI 混剪 - 自动识别精彩片段并添加旁白
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Card, Button, Space, Typography, Input, Alert, Select, Empty, Badge, Tooltip, Progress, Tag, Row, Col
} from 'antd';
import {
  FileTextOutlined,
  UserOutlined,
  EditOutlined,
  CopyOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  VideoCameraOutlined,
  ScissorOutlined,
  StarOutlined,
  SettingOutlined,
  FullscreenOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useClipFlow } from '../AIEditorContext';
import { aiService } from '@/core/services/ai.service';
import type { ScriptData, ScriptSegment, ScriptMetadata, AIModel, AIModelSettings, ModelProvider } from '@/core/types';
import { AI_MODELS as CORE_AI_MODELS, DEFAULT_MODEL_ID } from '@/core/config/models.config';
import useLocalStorage from '@/hooks/useLocalStorage';
import { notify } from '@/shared';
import { getAvailableModelsFromApiKeys, resolveDefaultModelId } from '@/core/utils/model-availability';
import { orchestrateCommentaryAgents } from '@/core/services/workflow/agents';
import { ALIGNMENT_GATE_THRESHOLD, isAlignmentGatePassed } from '@/core/workflow/alignmentGate';
import {
  FEATURE_TO_FUNCTION,
  FUNCTION_TO_FEATURE,
  FUNCTION_TO_MODE,
  type AIFunctionType,
} from './functionModeMap';
import styles from './ClipFlow.module.less';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// 功能配置 - 优化版
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
    icon: <VideoCameraOutlined />,
    description: '对视频内容进行专业解说，适合教程、评测、科普类内容',
    color: '#1890ff',
    features: ['智能总结要点', '专业术语解释', '逻辑连贯', '多种语气可选'],
    example: '欢迎观看本期内容！今天我们来聊聊...',
  },
  'first-person': {
    title: 'AI 第一人称',
    icon: <UserOutlined />,
    description: '以第一人称视角讲述，像主播一样与观众互动',
    color: '#52c41a',
    features: ['真实互动感', '情感充沛', '口语化表达', '粉丝粘性高'],
    example: '嘿，朋友们！我是XXX，今天带大家一起...',
  },
  'remix': {
    title: 'AI 混剪',
    icon: <ScissorOutlined />,
    description: '自动识别精彩片段，生成节奏感强的混剪视频',
    color: '#fa8c16',
    features: ['智能片段选取', '节奏感强', '高潮迭起', '自动配音'],
    example: '【开场】就在刚才，发生了这一幕...',
  },
};

// 文案风格配置
const scriptStyles = [
  { value: 'formal', label: '正式', desc: '专业、严谨', icon: '👔' },
  { value: 'casual', label: '轻松', desc: '活泼、亲切', icon: '😊' },
  { value: 'humor', label: '幽默', desc: '搞笑、诙谐', icon: '😄' },
  { value: 'emotional', label: '情感', desc: '深情、感人', icon: '💝' },
];

// 文案长度配置
const scriptLengths = [
  { value: 'short', label: '短视频', desc: '30秒以内', wordCount: 80, time: '~30s' },
  { value: 'medium', label: '中视频', desc: '1-3分钟', wordCount: 300, time: '1-3min' },
  { value: 'long', label: '长视频', desc: '3-10分钟', wordCount: 800, time: '3-10min' },
];

// TODO: 生成文案 - 实际应调用 AI 服务
const _generateMockScript = (
  _functionType: AIFunctionType, 
  _style: string, 
  _length: string
): ScriptData => {
  // 占位函数，实际项目中应删除
  return {
    id: `script_${Date.now()}`,
    title: '待生成',
    content: '',
    segments: [],
    metadata: { style: 'unknown', tone: 'friendly', length: 'medium', targetAudience: 'general', language: 'zh', wordCount: 0, estimatedDuration: 0, generatedBy: 'unknown', generatedAt: new Date().toISOString() },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};
interface ScriptGenerateProps {
  onNext?: () => void;
}

const ScriptGenerate: React.FC<ScriptGenerateProps> = ({ onNext }) => {
  const { 
    state, 
    setNarrationScript, 
    setRemixScript,
    setFeature,
    goToNextStep,
    dispatch,
  } = useClipFlow();

  const [generating, setGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<AIFunctionType | null>(null);
  const [progress, setProgress] = useState(0);
  const [defaultModel] = useLocalStorage<string>('default_model', DEFAULT_MODEL_ID);
  const [apiKeys] = useLocalStorage<Partial<Record<ModelProvider, { key: string; isValid?: boolean }>>>('api_keys', {});
  
  // 文案配置
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

  // 获取当前功能配置
  const currentFunction = FUNCTION_CONFIG[config.functionType];
  const currentMode = FUNCTION_TO_MODE[config.functionType];

  useEffect(() => {
    if (state.selectedFeature === 'none') return;
    const mapped = FEATURE_TO_FUNCTION[state.selectedFeature as 'smartClip' | 'voiceover' | 'subtitle'];
    if (!mapped || mapped === config.functionType) return;
    setConfig((prev) => ({ ...prev, functionType: mapped }));
  }, [config.functionType, state.selectedFeature]);

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

  // 处理生成文案
  const handleGenerate = useCallback(async (functionType: AIFunctionType) => {
    setGenerating(true);
    setGeneratingType(functionType);
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
        apiKey: apiKeys[model.provider]?.key || '',
        temperature: 0.7,
        maxTokens: 2000,
      };
      
      const styleMap: Record<AIFunctionType, string> = {
        'video-narration': config.style,
        'first-person': 'casual',
        'remix': 'humor',
      };
      
      // 模拟进度
      setProgress(10);
      
      try {
        setProgress(30);
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
            keywords: state.analysis?.scenes?.map(s => s.type).filter((type): type is string => Boolean(type)) || [],
            videoDuration: state.currentVideo?.duration,
          }
        );
        
        setProgress(80);
        const alignedScript = applyCommentaryOrchestration(scriptData);
        if (functionType === 'video-narration' || functionType === 'first-person') {
          setNarrationScript(alignedScript);
        } else {
          setRemixScript(alignedScript);
        }
        
        setProgress(100);
        notify.success(`${FUNCTION_CONFIG[functionType].title}生成成功！`);
      } catch (apiError) {
        logger.error('AI API 调用失败:', { error: apiError });
        notify.error(apiError, 'AI 服务暂不可用');
      }
    } catch (error) {
      logger.error('文案生成失败:', { error });
      notify.error(error, '文案生成失败，请重试');
    } finally {
      setTimeout(() => {
        setGenerating(false);
        setGeneratingType(null);
        setProgress(0);
      }, 500);
    }
  }, [config.style, config.length, state.analysis, state.currentVideo, setNarrationScript, setRemixScript, setFeature, applyCommentaryOrchestration]);

  // 处理编辑文案
  const handleEditScript = (newContent: string): void => {
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
  };

  // 获取当前脚本
  const getCurrentScript = (): ScriptData | null => {
    if (config.functionType === 'remix') {
      return state.scriptData.remix;
    }
    return state.scriptData.narration;
  };

  const currentScript = getCurrentScript();
  const canProceed = state.stepStatus['ai-analyze'];
  const gateStatusTag = useMemo(() => {
    if (!alignmentGate) return null;
    return alignmentGate.passed
      ? <Tag color="success">对齐通过</Tag>
      : <Tag color="warning">对齐待优化</Tag>;
  }, [alignmentGate]);

  // 复制文案
  const handleCopy = () => {
    if (currentScript?.content) {
      navigator.clipboard.writeText(currentScript.content);
      notify.success('文案已复制到剪贴板');
    }
  };

  return (
    <div className={styles.stepContent}>
      {/* 头部 */}
      <div className={styles.stepTitle}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>📝 生成文案</Title>
          <Tag color={currentFunction.color}>{currentFunction.title}</Tag>
        </Space>
        <Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
          选择功能模式，AI 自动生成对应风格的文案
        </Paragraph>
      </div>

      {!canProceed ? (
        <Alert
          message="⚠️ 请先完成 AI 分析"
          description="请先完成视频的 AI 分析步骤，然后生成文案"
          type="warning"
          showIcon
          action={
            <Button size="small" type="primary" onClick={() => dispatch({ type: 'SET_STEP', payload: 'ai-analyze' })}>
              去分析
            </Button>
          }
        />
      ) : (
        <Row gutter={24}>
          {/* 左侧：功能选择和配置 */}
          <Col xs={24} lg={10}>
            <Card 
              title={<><SettingOutlined /> 功能配置</>}
              size="small"
              style={{ marginBottom: 16 }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* 三大核心功能选择 */}
                {(Object.entries(FUNCTION_CONFIG) as [AIFunctionType, typeof FUNCTION_CONFIG[AIFunctionType]][]).map(([key, func]) => {
                  const isActive = config.functionType === key;
                  const hasContent = key === 'remix'
                    ? !!state.scriptData.remix
                    : !!state.scriptData.narration;
                  
                  return (
                    <div
                      key={key}
                      onClick={() => {
                        setConfig({ ...config, functionType: key });
                        setFeature(FUNCTION_TO_FEATURE[key]);
                      }}
                      style={{
                        padding: '14px 16px',
                        border: `2px solid ${isActive ? func.color : '#e8e8e8'}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: isActive ? `${func.color}08` : '#fff',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Space>
                        <div style={{ fontSize: 22, color: func.color }}>
                          {func.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <Space>
                            <Text strong>{func.title}</Text>
                            {hasContent && <Badge status="success" text="已生成" />}
                          </Space>
                          <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                            {func.description}
                          </Text>
                        </div>
                        {isActive && <CheckCircleOutlined style={{ color: func.color, fontSize: 18 }} />}
                      </Space>
                    </div>
                  );
                })}
              </Space>
            </Card>

            {/* 配置选项 */}
            <Card size="small" title={<><SettingOutlined /> 文案设置</>}>
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>语气风格</Text>
                  <Select
                    value={config.style}
                    onChange={(style) => setConfig({ ...config, style })}
                    style={{ width: '100%' }}
                  >
                    {scriptStyles.map(s => (
                      <Select.Option key={s.value} value={s.value}>
                        <Space>{s.icon} {s.label} <Text type="secondary" style={{ fontSize: 12 }}>({s.desc})</Text></Space>
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={12}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>文案长度</Text>
                  <Select
                    value={config.length}
                    onChange={(length) => setConfig({ ...config, length })}
                    style={{ width: '100%' }}
                  >
                    {scriptLengths.map(l => (
                      <Select.Option key={l.value} value={l.value}>
                        <Space>{l.label} <Text type="secondary" style={{ fontSize: 12 }}>({l.time})</Text></Space>
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
              </Row>

              {/* 功能特点展示 */}
              <div style={{ marginTop: 16 }}>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>功能特点</Text>
                <Space wrap>
                  {currentFunction.features.map((f, i) => (
                    <Tag key={i} color={currentFunction.color} style={{ marginBottom: 4 }}>✓ {f}</Tag>
                  ))}
                </Space>
              </div>

              {/* 示例 */}
              <div style={{ marginTop: 16 }}>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>文案示例</Text>
                <div style={{ 
                  padding: 12, 
                  background: '#f5f5f5', 
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  "{currentFunction.example}..."
                </div>
              </div>
            </Card>
          </Col>

          {/* 右侧：文案编辑和预览 */}
          <Col xs={24} lg={14}>
            <Card
              title={<><FileTextOutlined /> 文案编辑</>}
              extra={
                <Space>
                  <Tooltip title="复制文案">
                    <Button icon={<CopyOutlined />} size="small" onClick={handleCopy} disabled={!currentScript}>
                      复制
                    </Button>
                  </Tooltip>
                  <Tooltip title="预览效果">
                    <Button icon={<FullscreenOutlined />} size="small">
                      预览
                    </Button>
                  </Tooltip>
                </Space>
              }
            >
              {/* 生成按钮区域 */}
              <div style={{ marginBottom: 16 }}>
                <Space wrap>
                  <Button 
                    type="primary"
                    icon={<SyncOutlined spin={generating} />}
                    loading={generating}
                    onClick={() => handleGenerate(config.functionType)}
                    size="large"
                    style={{ 
                      background: currentFunction.color,
                      borderColor: currentFunction.color,
                    }}
                  >
                    {currentScript ? '重新生成' : `生成${currentFunction.title}`}
                  </Button>
                  
                  {currentScript && (
                    <Tag icon={<CheckCircleOutlined />} color="success">
                      已生成 {currentScript.metadata?.wordCount || 0} 字
                    </Tag>
                  )}
                </Space>

                {/* 进度条 */}
                {generating && (
                  <div style={{ marginTop: 12 }}>
                    <Progress percent={progress} status="active" strokeColor={currentFunction.color} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      正在生成{currentFunction.title}...
                    </Text>
                  </div>
                )}
              </div>

              {/* 文案编辑区 */}
              <TextArea
                value={currentScript?.content || ''}
                onChange={(e) => handleEditScript(e.target.value)}
                placeholder={`点击上方"生成${currentFunction.title}"按钮，AI 将自动生成文案...\n\n或者在此手动编辑文案内容`}
                rows={12}
                style={{ 
                  fontFamily: '"SFMono-Regular", Consolas, monospace',
                  fontSize: 14,
                  lineHeight: 1.8,
                }}
                disabled={!currentScript && !generating}
              />

              {/* 统计信息 */}
              {currentScript && (
                <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
                  <Text type="secondary">
                    <HistoryOutlined /> 字数: {currentScript.content?.length || 0}
                  </Text>
                  <Text type="secondary">
                    <PlayCircleOutlined /> 预计时长: ~{Math.ceil((currentScript.content?.length || 0) / 3)}秒
                  </Text>
                  <Text type="secondary">
                    <StarOutlined /> 风格: {currentScript.metadata?.style || config.style}
                  </Text>
                  {gateStatusTag}
                </div>
              )}

              {alignmentGate && (
                <Alert
                  type={alignmentGate.passed ? 'success' : 'warning'}
                  showIcon
                  style={{ marginTop: 12 }}
                  message={alignmentGate.passed ? '音画对齐质量通过' : '音画对齐建议优化'}
                  description={`平均置信度 ${alignmentGate.averageConfidence.toFixed(2)}（阈值 ${ALIGNMENT_GATE_THRESHOLD.minConfidence}），最大漂移 ${alignmentGate.maxDriftSeconds.toFixed(2)}s（阈值 ${ALIGNMENT_GATE_THRESHOLD.maxDriftSeconds}s）。`}
                />
              )}

              {/* 空状态 */}
              {!currentScript && !generating && (
                <Empty 
                  description="点击上方按钮生成文案" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ marginTop: 32 }}
                />
              )}
            </Card>

            {/* 三个功能总览 */}
            <Card 
              size="small" 
              title="三大核心功能"
              style={{ marginTop: 16 }}
              styles={{ body: { padding: '12px' } }}
            >
              <Row gutter={8}>
                {(Object.entries(FUNCTION_CONFIG) as [AIFunctionType, typeof FUNCTION_CONFIG[AIFunctionType]][]).map(([key, func]) => {
                  const hasContent = key === 'remix'
                    ? !!state.scriptData.remix
                    : !!state.scriptData.narration;
                  return (
                    <Col span={8} key={key}>
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '8px',
                        borderRadius: 8,
                        background: config.functionType === key ? `${func.color}15` : 'transparent',
                      }}>
                        <div style={{ fontSize: 20, color: func.color }}>{func.icon}</div>
                        <Text strong style={{ fontSize: 12 }}>{func.title}</Text>
                        {hasContent && <Badge status="success" />}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default ScriptGenerate;
