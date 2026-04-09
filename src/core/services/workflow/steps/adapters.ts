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
import type { WorkflowConfig, WorkflowStep } from '../types';
import type { ExportSettings } from '@/core/types';

import {
  executeUploadStep,
  executeAnalyzeStep,
  executeTemplateStep,
  executeScriptGenerateStep,
  executeDedupStep,
  executeAIClipStep,
  executeTimelineStep,
  executeExportStep,
  executeSubtitleStep,
  executeRepurposingStep,
} from './index';
import { musicStep, type MusicStepInput } from './musicStep';

// ============================================
// Step Executors
// ============================================

const uploadExecutor: IStepExecutor = {
  step: 'upload',
  async execute(ctx: StepContext) {
    const { projectId, config, updateData, reportProgress } = ctx;
    const videoFile = config.videoFile;
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
    ctx.updateData({ videoAnalysis: result.analysis });
  },
};

const templateSelectExecutor: IStepExecutor = {
  step: 'template-select',
  async execute(ctx: StepContext) {
    const { data, config, reportProgress } = ctx;
    if (!data.videoAnalysis) throw new Error('缺少视频分析结果');
    reportProgress(50);
    const result = await executeTemplateStep(data.videoAnalysis, config.preferredTemplate);
    ctx.updateData({ selectedTemplate: result.template });
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
    ctx.updateData({ generatedScript: result.script });
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
    ctx.updateData({
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
    if (!cfg.aiClipConfig?.enabled) throw new SkipRequest('ai-clip', 'ai-clip 未启用');

    const result = await executeAIClipStep(data.videoInfo, cfg.aiClipConfig, reportProgress);
    if (result) {
      ctx.updateData({ aiClipResult: result });
    }
  },
};

const repurposingExecutor: IStepExecutor = {
  step: 'repurposing',
  async execute(ctx: StepContext) {
    const { data, config, reportProgress } = ctx;
    const cfg = config as WorkflowConfig;

    if (!cfg.repurposingConfig?.enabled) {
      throw new SkipRequest('repurposing', '内容复用未启用');
    }
    if (!data.videoInfo || !data.videoAnalysis) {
      throw new Error('缺少视频信息用于内容复用');
    }

    const result = await executeRepurposingStep(
      data.videoInfo,
      data.videoAnalysis,
      cfg.repurposingConfig,
      reportProgress,
    );

    if (result) {
      ctx.updateData({ repurposingResult: result });
    }
  },
};

const musicExecutor: IStepExecutor = {
  step: 'music',
  async execute(ctx: StepContext) {
    const { data, config, reportProgress } = ctx;
    const cfg = config as WorkflowConfig;

    if (!cfg.musicConfig?.enabled) throw new SkipRequest('music', 'music 未启用');
    if (cfg.musicConfig?.skipMusic) {
      ctx.updateData({
        musicStepOutput: {
          tracks: [],
          totalDuration: 0,
          recommendations: [],
          usedSource: 'none',
          requiresUserAction: false,
        },
      });
      return;
    }

    if (!data.videoInfo) throw new Error('缺少视频信息用于配乐');

    const input: MusicStepInput = {
      videoDuration: data.videoInfo.duration,
      preferredGenre: cfg.musicConfig?.preferredGenre as any,
      preferredMood: cfg.musicConfig?.preferredMood as any,
    };

    reportProgress(30);
    const musicResult = await musicStep(input);
    reportProgress(100);

    ctx.updateData({ musicStepOutput: musicResult });
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
    ctx.updateData({
      timeline,
      alignmentReport: timeline.alignment,
      originalOverlayPlan: timeline.originalOverlayPlan,
    });
  },
};

const previewExecutor: IStepExecutor = {
  step: 'preview',
  async execute(ctx: StepContext) {
    ctx.reportProgress(50);
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
      data.exportSettings || ({
        format: 'mp4',
        quality: 'high',
        resolution: '1080p',
        frameRate: 30,
        includeSubtitles: true,
        burnSubtitles: true,
      } as ExportSettings),
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

const subtitleExecutor: IStepExecutor = {
  step: 'subtitle',
  async execute(ctx: StepContext) {
    const { data, config, reportProgress } = ctx;
    if (!data.videoInfo) throw new Error('缺少视频信息');

    // Check if faster-whisper is available
    const { whisperService } = await import('@/core/services/subtitle.service');
    const available = await whisperService.checkFasterWhisper();
    if (!available) {
      throw new SkipRequest('subtitle', 'ASR 服务未安装，跳过字幕识别');
    }

    const result = await executeSubtitleStep(
      data.videoInfo,
      ctx.projectId,
      {
        model: config.whisperConfig?.model || 'base',
        language: config.whisperConfig?.language || 'auto',
      },
      reportProgress,
    );
    ctx.updateData({ whisperSubtitleSegments: result.segments });
  },
};

const STEP_EXECUTORS: Partial<Record<WorkflowStep, IStepExecutor>> = {
  upload: uploadExecutor,
  analyze: analyzeExecutor,
  'template-select': templateSelectExecutor,
  'script-generate': scriptGenerateExecutor,
  'script-dedup': scriptDedupExecutor,
  'script-edit': scriptEditExecutor,
  subtitle: subtitleExecutor,
  'ai-clip': aiClipExecutor,
  repurposing: repurposingExecutor,
  music: musicExecutor,
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
  for (const [step, executor] of Object.entries(STEP_EXECUTORS) as [WorkflowStep, IStepExecutor][]) {
    if (executor) {
      engine.registerStepExecutor(step, executor);
    }
  }
  return engine;
}
