import { useState, useCallback } from 'react';
import { useWorkflow, useModel } from '@/core/hooks';
import { notify } from '@/shared';
import { scriptTemplateService } from '@/core/templates/script.templates';
import type { ScriptTemplate, AIModel } from '@/core/types';
import { DEFAULT_WORKFLOW_MODE, type WorkflowMode } from '@/core/workflow/featureBlueprint';
import { getWorkflowSteps } from '../constants';

export interface AIClipConfig {
  enabled: boolean;
  autoClip: boolean;
  detectSceneChange: boolean;
  detectSilence: boolean;
  removeSilence: boolean;
  targetDuration?: number;
  pacingStyle: 'fast' | 'normal' | 'slow';
}

export interface ScriptParams {
  style: string;
  tone: string;
  length: 'short' | 'medium' | 'long';
  targetAudience: string;
  language: 'zh';
}

export const useWorkflowPage = () => {
  // 本地状态
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ScriptTemplate | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>(DEFAULT_WORKFLOW_MODE);
  const [autoOriginalOverlay, setAutoOriginalOverlay] = useState(true);
  const [overlayMixMode, setOverlayMixMode] = useState<'pip' | 'full'>('pip');
  const [overlayOpacity, setOverlayOpacity] = useState(0.72);
  const [scriptParams, setScriptParams] = useState<ScriptParams>({
    style: 'professional',
    tone: 'friendly',
    length: 'medium',
    targetAudience: 'general',
    language: 'zh',
  });
  const [aiClipConfig, setAiClipConfig] = useState<AIClipConfig>({
    enabled: true,
    autoClip: false,
    detectSceneChange: true,
    detectSilence: true,
    removeSilence: true,
    pacingStyle: 'normal',
  });

  // Hooks
  const {
    isRunning,
    isPaused,
    isCompleted,
    hasError,
    error,
    currentStep,
    progress,
    data,
    start,
    editScript,
    editTimeline,
    export: exportVideo,
    pause,
    resume,
    cancel,
    reset,
    jumpToStep,
  } = useWorkflow({
    onStepChange: (step) => {
      const stepInfo = getWorkflowSteps(workflowMode).find((s) => s.key === step);
      notify.info(`进入步骤: ${stepInfo?.title}`);
    },
    onError: (_err) => {
      notify.error(_err, '工作流执行失败');
    },
    onComplete: () => {
      notify.success('工作流完成！');
    },
  });

  const { allModels: models } = useModel();
  const templates = scriptTemplateService.getAllTemplates();

  const workflowSteps = getWorkflowSteps(workflowMode);
  const currentStepIndex = workflowSteps.findIndex((s) => s.key === currentStep);

  // 开始工作流
  const handleStart = useCallback(async () => {
    if (!selectedFile || !selectedModel) {
      notify.error(null, '请选择视频文件和 AI 模型');
      return;
    }

    try {
      await start('project_' + Date.now(), selectedFile, {
        mode: workflowMode,
        autoOriginalOverlay,
        overlayMixMode,
        overlayOpacity,
        autoAnalyze: true,
        autoGenerateScript: true,
        autoDedup: true,
        enforceUniqueness: true,
        preferredTemplate: selectedTemplate?.id,
        model: selectedModel,
        scriptParams,
        aiClipConfig: aiClipConfig.enabled ? aiClipConfig : undefined,
      });
    } catch (_err) {
      // 错误已在回调中处理
    }
  }, [selectedFile, selectedModel, selectedTemplate, scriptParams, aiClipConfig, start, workflowMode, autoOriginalOverlay, overlayMixMode, overlayOpacity]);

  // 更新脚本参数
  const updateScriptParams = useCallback((updates: Partial<ScriptParams>) => {
    setScriptParams((prev) => ({ ...prev, ...updates }));
  }, []);

  // 更新 AI 剪辑配置
  const updateAIClipConfig = useCallback((updates: Partial<AIClipConfig>) => {
    setAiClipConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    // 状态
    selectedFile,
    selectedTemplate,
    selectedModel,
    workflowMode,
    autoOriginalOverlay,
    overlayMixMode,
    overlayOpacity,
    scriptParams,
    aiClipConfig,
    isRunning,
    isPaused,
    isCompleted,
    hasError,
    error,
    currentStep,
    currentStepIndex,
    progress,
    data,
    models,
    templates,

    // 状态设置
    setSelectedFile,
    setSelectedTemplate,
    setSelectedModel,
    setWorkflowMode,
    setAutoOriginalOverlay,
    setOverlayMixMode,
    setOverlayOpacity,
    updateScriptParams,
    updateAIClipConfig,

    // 操作
    handleStart,
    editScript,
    editTimeline,
    exportVideo,
    pause,
    resume,
    cancel,
    reset,
    jumpToStep,
  };
};
