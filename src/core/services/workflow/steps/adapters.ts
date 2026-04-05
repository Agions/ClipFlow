/**
 * Step Executor Adapters
 *
 * 将函数式步骤（executeXxxStep）包装为 IStepExecutor 接口实现，
 * 使其可注册到 WorkflowEngine。
 *
 * 使用方式：
 *   import { createWorkflowEngine } from './adapters';
 *   const engine = createWorkflowEngine();
 *   await engine.run(projectId, 'ai-commentary', config);
 */
import { WorkflowEngine } from '../WorkflowEngine';
import { RetryRequest, SkipRequest } from '../WorkflowEngine';
import type { IStepExecutor } from '../IStepExecutor';
import type { StepContext } from '../WorkflowEngine';
import type { WorkflowConfig } from '../types';

import {
  executeUploadStep,
  executeAnalyzeStep,
  executeTemplateStep,
  executeScriptGenerateStep,
  executeDedupStep,
  executeUniquenessStep,
  executeAIClipStep,
  executeTimelineStep,
  executeExportStep,
} from './index';

// ============================================
// Step Executors
// ============================================

const uploadExecutor: IStepExecutor = {
  step: 'upload',
  async execute(ctx: StepContext) {
    const { projectId, config, updateData, reportProgress } = ctx;
    const videoFile = (config as any).videoFile as File;
    if (!videoFile) throw new Error('缺少视频文件');
    const result = await executeUploadStep(projectId, videoFile, reportProgress);
    updateData({ videoInfo: result.videoInfo, projectId: result.projectId });
  },
};

const analyzeExecutor: IStepExecutor = {
  step: 'analyze',
  async execute(ctx: StepContext) {
    const { data, projectId, reportProgress } = ctx;
    if (!data.videoInfo) throw new Error('缺少视频信息');
    const result = await executeAnalyzeStep(data.videoInfo, projectId, reportProgress);
    updateData({ videoAnalysis: result.analysis });
  },
};

const templateSelectExecutor: IStepExecutor = {
  step: 'template-select',
  async execute(ctx: StepContext) {
    const { data, config, reportProgress } = ctx;
    if (!data.videoAnalysis) throw new Error('缺少视频分析结果');
    // reportProgress 作为 mock，templateSelect 不报告外部进度
    reportProgress(50);
    const result = await executeTemplateStep(data.videoAnalysis, (config as any).preferredTemplate);
    updateData({ selectedTemplate: result.template });
  },
};

const scriptGenerateExecutor: IStepExecutor = {
  step: 'script-generate',
  async execute(ctx: StepContext) {
    const { data, config, reportProgress } = ctx;
    if (!data.videoInfo || !data.videoAnalysis || !data.selectedTemplate) {
      throw new Error('缺少生成脚本所需数据');
    }
    const cfg = config as WorkflowConfig;
    const result = await executeScriptGenerateStep(
      data.videoInfo,
      data.videoAnalysis,
      data.selectedTemplate,
      cfg.model,
      cfg.scriptParams,
      ctx.projectId,
      cfg.mode || 'ai-commentary',
      reportProgress,
    );
    updateData({ generatedScript: result.script });
  },
};

const scriptDedupExecutor: IStepExecutor = {
  step: 'script-dedup',
  async execute(ctx: StepContext) {
    const { data, config, reportProgress } = ctx;
    if (!data.generatedScript) throw new Error('缺少待去重脚本');
    const cfg = config as WorkflowConfig;
    const result = await executeDedupStep(
      data.generatedScript,
      cfg.dedupConfig,
      reportProgress,
    );
    updateData({
      dedupedScript: result.script,
      originalityReport: result.report,
    });
  },
};

const scriptEditExecutor: IStepExecutor = {
  step: 'script-edit',
  async execute(_ctx: StepContext) {
    // script-edit 是人工介入步骤，引擎不自动执行
    throw new SkipRequest('script-edit');
  },
};

const aiClipExecutor: IStepExecutor = {
  step: 'ai-clip',
  async execute(ctx: StepContext) {
    const { data, config, reportProgress } = ctx;
    if (!data.videoInfo) throw new Error('缺少视频信息');
    const cfg = config as WorkflowConfig;
    if (!cfg.aiClipConfig?.enabled) throw new SkipRequest('ai-clip');
    await executeAIClipStep(data.videoInfo, cfg.aiClipConfig, reportProgress);
  },
};

const timelineEditExecutor: IStepExecutor = {
  step: 'timeline-edit',
  async execute(ctx: StepContext) {
    const { data, config, reportProgress } = ctx;
    const script =
      data.editedScript || data.uniqueScript || data.dedupedScript || data.generatedScript;
    if (!data.videoInfo || !data.videoAnalysis || !script) {
      throw new Error('缺少时间轴编辑所需数据');
    }
    const cfg = config as WorkflowConfig;
    const timeline = await executeTimelineStep(
      data.videoInfo,
      data.videoAnalysis,
      script,
      true, // autoMatch
      {
        mode: cfg.mode,
        autoOriginalOverlay: cfg.autoOriginalOverlay !== false,
        overlayMixMode: cfg.overlayMixMode,
        overlayOpacity: cfg.overlayOpacity,
        syncStrategy: cfg.commentarySyncStrategy,
      },
      reportProgress,
    );
    updateData({
      timeline,
      alignmentReport: timeline.alignment,
      originalOverlayPlan: timeline.originalOverlayPlan,
    });
  },
};

const previewExecutor: IStepExecutor = {
  step: 'preview',
  async execute(ctx: StepContext) {
    const { reportProgress } = ctx;
    reportProgress(50);
    // preview 是 UI 步骤，这里只占位
  },
};

const exportExecutor: IStepExecutor = {
  step: 'export',
  async execute(ctx: StepContext) {
    const { data, reportProgress } = ctx;
    const script =
      data.editedScript || data.uniqueScript || data.dedupedScript || data.generatedScript;
    if (!data.projectId || !data.videoInfo || !data.timeline || !script) {
      throw new Error('缺少导出所需数据');
    }
    reportProgress(50);
    await executeExportStep(
      data.projectId,
      data.videoInfo,
      data.timeline,
      script,
      data.exportSettings || {
        format: 'mp4',
        quality: 'high',
        resolution: '1080p',
        frameRate: 30,
        includeSubtitles: true,
        burnSubtitles: true,
      },
      {
        overlayMixMode: 'pip',
        overlayOpacity: 0.72,
      },
    );
  },
};

// ============================================
// Registry
// ============================================

const STEP_EXECUTORS: Record<string, IStepExecutor> = {
  upload: uploadExecutor,
  analyze: analyzeExecutor,
  'template-select': templateSelectExecutor,
  'script-generate': scriptGenerateExecutor,
  'script-dedup': scriptDedupExecutor,
  'script-edit': scriptEditExecutor,
  'ai-clip': aiClipExecutor,
  'timeline-edit': timelineEditExecutor,
  preview: previewExecutor,
  export: exportExecutor,
};

/**
 * 创建并配置好的 WorkflowEngine 实例。
 * 注册所有步骤执行器，可直接调用 run()。
 *
 * @param maxRetries 单步最大重试次数（默认 1）
 */
export function createWorkflowEngine(maxRetries = 1): WorkflowEngine {
  const engine = new WorkflowEngine();
  engine.setMaxRetries(maxRetries);
  for (const [step, executor] of Object.entries(STEP_EXECUTORS)) {
    engine.registerStepExecutor(step as any, executor);
  }
  return engine;
}
