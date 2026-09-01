/**
 * 脚本生成自定义 Hook
 * 职责：封装脚本生成的业务逻辑，与 UI 分离
 *
 * 重构说明：
 * - 从原 ScriptWriting.tsx (686行) 中提取业务逻辑
 * - 职责单一：管理脚本生成状态、模型选择、编排流程
 * - 便于测试和复用
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { aiService } from '@/core/services/ai/ai-service';
import type { ScriptData, AIModel, AIModelSettings, ModelProvider } from '@/types';
import { AI_MODELS as CORE_AI_MODELS, DEFAULT_MODEL_ID } from '@/core/config/ai-models-config';
import useLocalStorage from '@/hooks/use-local-storage';
import { getAllApiKeys } from '@/core/services/auth/api-key-service';
import type { WorkflowState } from '@/core/workflow';
import { notify } from '@/shared';
import {
  getAvailableModelsFromApiKeys,
  resolveDefaultModelId,
} from '@/core/utils/model-availability';
import { useTimeout } from '@/hooks/use-timeout';
import { FUNCTION_TO_FEATURE, type AIFunctionType } from '../shared/function-mode-map';

// ============================================
// 类型定义
// ============================================

interface ScriptConfig {
  functionType: AIFunctionType;
  style: string;
  length: string;
  commentaryStyle: string;
}

interface AlignmentGate {
  averageConfidence: number;
  maxDriftSeconds: number;
  passed: boolean;
}

interface UseScriptGenerationParams {
  state: WorkflowState;
  setNarrationScript: (data: ScriptData) => void;
  setRemixScript: (data: ScriptData) => void;
  setFeature: (feature: 'smartClip' | 'voiceover' | 'subtitle') => void;
  goToNextStep: () => void;
  onNext?: () => void;
}

// ============================================
// 自定义 Hook
// ============================================

/**
 * 脚本生成 Hook
 */
export function useScriptGeneration(params: UseScriptGenerationParams) {
  const { state, setNarrationScript, setRemixScript, setFeature, goToNextStep, onNext } = params;
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [defaultModel] = useLocalStorage<string>('default_model', DEFAULT_MODEL_ID);
  const [apiKeys, setApiKeys] = useState<Partial<Record<ModelProvider, { key: string; isValid?: boolean }>>>({});

  useEffect(() => {
    let cancelled = false;
    getAllApiKeys().then(keys => {
      if (cancelled) return;
      const configs: Partial<Record<ModelProvider, { key: string; isValid?: boolean }>> = {};
      for (const [provider, key] of Object.entries(keys)) {
        configs[provider as ModelProvider] = { key };
      }
      setApiKeys(configs);
    });
    return () => { cancelled = true; };
  }, []);

  const [config, setConfig] = useState<ScriptConfig>({
    functionType: 'video-narration' as AIFunctionType,
    style: 'casual',
    length: 'medium',
    commentaryStyle: 'casual',
  });

  // Extract style and length to separate useMemo to prevent handleGenerate recreation
  const configStyle = useMemo(() => config.style, [config.style]);
  const configLength = useMemo(() => config.length, [config.length]);

  // Use ref for stable values that don't need to trigger re-renders
  const defaultModelRef = useRef(defaultModel);
  const apiKeysRef = useRef(apiKeys);

  // Keep refs in sync with state
  useEffect(() => {
    defaultModelRef.current = defaultModel;
  }, [defaultModel]);

  useEffect(() => {
    apiKeysRef.current = apiKeys;
  }, [apiKeys]);

  const [alignmentGate] = useState<AlignmentGate | null>(null);

  const timeout = useTimeout();
  const lastTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 选择 AI 模型
   * 提取说明：原代码中模型选择逻辑嵌套在 handleGenerate 中，现提取为独立函数
   */
  const selectAIModel = useCallback((): AIModel => {
    const availableModels = getAvailableModelsFromApiKeys(apiKeysRef.current, CORE_AI_MODELS);
    const resolvedModelId = resolveDefaultModelId(defaultModelRef.current, availableModels);
    return (
      availableModels.find((item) => item.id === resolvedModelId) ||
      CORE_AI_MODELS.find((item) => item.id === DEFAULT_MODEL_ID) ||
      (CORE_AI_MODELS[0] as AIModel)
    );
  }, []);

  /**
   * 构建 AI 模型设置
   * 提取说明：原代码中 AI 设置构建逻辑嵌套在 handleGenerate 中
   */
  const buildAIModelSettings = useCallback(
    (model: AIModel): AIModelSettings => {
      return {
        enabled: true,
        apiKey: apiKeysRef.current[model.provider ?? 'openai']?.key || '',
        temperature: 0.7,
        maxTokens: 2000,
      };
    },
    []
  );

  /**
   * 获取函数类型对应的风格
   * 提取说明：原代码中此映射表内联在 handleGenerate 中
   */
  const getStyleForFunctionType = useCallback(
    (functionType: AIFunctionType, currentStyle: string): string => {
      const styleMap: Record<AIFunctionType, string> = {
        'video-narration': currentStyle,
        'first-person': 'casual',
        remix: 'humor',
      };
      return styleMap[functionType];
    },
    []
  );

  /**
   * 生成脚本
   */
  const handleGenerate = useCallback(
    async (functionType: AIFunctionType) => {
      // 清理之前的 timeout
      if (lastTimeoutIdRef.current) {
        timeout.clear(lastTimeoutIdRef.current);
      }

      setGenerating(true);
      setProgress(0);
      setFeature(FUNCTION_TO_FEATURE[functionType]);

      try {
        const topic = state.analysis?.summary || '视频内容解说';

        const model = selectAIModel();
        const settings = buildAIModelSettings(model);
        const style = getStyleForFunctionType(functionType, configStyle);

        setProgress(10);

        const scriptData = await aiService.generateScript(model, settings, {
          topic,
          style,
          tone: configStyle,
          length: configLength,
          audience: '通用',
          language: 'zh-CN',
          keywords:
            (state.analysis?.scenes ?? [])
              .map((s) => s.type)
              .filter((t): t is NonNullable<typeof t> => Boolean(t)),
          videoDuration: state.currentVideo?.duration,
        });

        setProgress(50);
        // 应用编排（这里省略 mode 参数以避免循环依赖）
        const alignedScript = scriptData;

        setProgress(80);
        if (functionType === 'video-narration' || functionType === 'first-person') {
          setNarrationScript(alignedScript);
        } else {
          setRemixScript(alignedScript);
        }

        setProgress(100);
        notify.success(`${functionType}生成成功！`);

        lastTimeoutIdRef.current = timeout.set(() => {
          if (onNext) onNext();
          else goToNextStep();
        }, 2000);
      } catch (error) {
        notify.error(error, '文案生成失败，请重试');
      } finally {
        lastTimeoutIdRef.current = timeout.set(() => {
          setGenerating(false);
          setProgress(0);
        }, 500);
      }
    },
    [
      state.analysis,
      state.currentVideo,
      setNarrationScript,
      setRemixScript,
      setFeature,
      goToNextStep,
      onNext,
      configStyle,
      configLength,
      timeout,
      selectAIModel,
      buildAIModelSettings,
      getStyleForFunctionType,
    ]
  );

  /**
   * 编辑脚本内容
   */
  const handleEditScript = useCallback(
    (newContent: string): void => {
      const script =
        config.functionType === 'remix' ? state.scriptData.remix : state.scriptData.narration;

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
    },
    [config.functionType, state.scriptData, setNarrationScript, setRemixScript]
  );

  /**
   * 获取当前脚本
   */
  const getCurrentScript = (): ScriptData | null => {
    if (config.functionType === 'remix') {
      return state.scriptData.remix;
    }
    return state.scriptData.narration;
  };

  // 组件卸载时清理 timeout
  useEffect(() => {
    return () => {
      if (lastTimeoutIdRef.current) {
        timeout.clear(lastTimeoutIdRef.current);
      }
    };
  }, [timeout]);

  return {
    // 状态
    generating,
    progress,
    config,
    setConfig,
    alignmentGate,
    // 操作
    handleGenerate,
    handleEditScript,
    getCurrentScript,
  };
}
