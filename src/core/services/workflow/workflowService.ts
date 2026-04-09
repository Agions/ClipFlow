/**
 * @deprecated since v1.2.0
 *
 * WorkflowService — 旧版工作流编排器（函数式，逐步手动执行）。
 *
 * 此服务仍可用于需要细粒度步骤控制（stepAnalyze / stepTemplateSelect …）的场景，
 * 但新开发应使用 WorkflowEngine + useWorkflowEngine hook。
 *
 * 主要差异：
 * |                    | WorkflowService          | WorkflowEngine              |
 * |--------------------|--------------------------|-----------------------------|
 * | 执行模型            | 手动逐步调用              | 自动执行步骤图               |
 * | 步骤重试           | 手动管理                  | 引擎自动处理                 |
 * | 状态同步           | 内部状态 + callbacks      | Subscriber 模式               |
 * | 实例管理           | 单例                      | 每次 createWorkflowEngine()  |
 *
 * 导出保持不变，使用方式不变，仅标记为 deprecated。
 */
import { storageService } from '../storage.service';
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
} from './steps';
import { WORKFLOW_MODE_DEFINITIONS } from '@/core/workflow/featureBlueprint';
import { ALIGNMENT_GATE_THRESHOLD } from '@/core/workflow/alignmentGate';
import { sceneCommentaryAlignmentService } from '../scene-commentary-alignment.service';
import type {
  WorkflowState,
  WorkflowData,
  WorkflowConfig,
  WorkflowCallbacks,
  WorkflowStep,
  TimelineData,
} from './types';
import type { ScriptData, VideoAnalysis, ScriptTemplate, AIModel, ExportSettings } from '@/core/types';

export class WorkflowService {
  private state: WorkflowState;
  private callbacks: WorkflowCallbacks = {};
  private abortController: AbortController | null = null;
  private currentConfig: WorkflowConfig | null = null;

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): WorkflowState {
    return {
      step: 'upload',
      progress: 0,
      status: 'idle',
      data: {},
    };
  }

  setCallbacks(callbacks: WorkflowCallbacks): void {
    this.callbacks = callbacks;
  }

  getState(): WorkflowState {
    return { ...this.state };
  }

  private updateState(updates: Partial<WorkflowState>): void {
    const prevStep = this.state.step;
    const prevStatus = this.state.status;

    this.state = { ...this.state, ...updates };

    if (updates.step && updates.step !== prevStep) {
      this.callbacks.onStepChange?.(updates.step, prevStep);
    }
    if (updates.progress !== undefined) {
      this.callbacks.onProgress?.(updates.progress);
    }
    if (updates.status && updates.status !== prevStatus) {
      this.callbacks.onStatusChange?.(updates.status);
    }
    if (updates.error) {
      this.callbacks.onError?.(updates.error);
    }
  }

  private updateData(data: Partial<WorkflowData>): void {
    this.state.data = { ...this.state.data, ...data };
  }

  // 进度映射辅助函数：将步骤进度映射到整体进度
  private mapStepProgress(stepStart: number, stepEnd: number, stepProgress: number): number {
    return stepStart + (stepProgress / 100) * (stepEnd - stepStart);
  }

  async start(
    projectId: string,
    videoFile: File,
    config: WorkflowConfig
  ): Promise<void> {
    this.currentConfig = config;
    this.abortController = new AbortController();
    this.updateState({ status: 'running', progress: 0 });

    try {
      // Step 1: 上传视频 (0-15%)
      const uploadResult = await executeUploadStep(
        projectId,
        videoFile,
        (progress) => this.updateState({ 
          progress: this.mapStepProgress(0, 15, progress) 
        })
      );
      this.updateData(uploadResult);
      this.updateState({ progress: 15 });

      // Step 2: 分析视频 (15-30%)
      if (config.autoAnalyze) {
        const analyzeResult = await executeAnalyzeStep(
          uploadResult.videoInfo,
          projectId,
          (progress) => this.updateState({ 
            progress: this.mapStepProgress(15, 30, progress) 
          })
        );
        this.updateData({ videoAnalysis: analyzeResult.analysis });
      } else {
        this.updateState({ step: 'analyze', progress: 20 });
        return;
      }

      // Step 3: 选择模板 (30-40%)
      const templateResult = await executeTemplateStep(
        this.state.data.videoAnalysis!,
        config.preferredTemplate
      );
      this.updateData({ selectedTemplate: templateResult.template });
      this.updateState({ step: 'template-select', progress: 40 });

      // Step 4: 生成脚本 (40-60%)
      if (config.autoGenerateScript) {
        const scriptResult = await executeScriptGenerateStep(
          this.state.data.videoInfo!,
          this.state.data.videoAnalysis!,
          this.state.data.selectedTemplate!,
          config.model,
          config.scriptParams,
          projectId,
          config.mode || 'ai-commentary',
          (progress) => this.updateState({ 
            progress: this.mapStepProgress(40, 60, progress) 
          })
        );
        this.updateData({ generatedScript: scriptResult.script });
      } else {
        this.updateState({ step: 'script-generate', progress: 45 });
        return;
      }

      // Step 5: 脚本去重 (60-70%)
      if (config.autoDedup !== false && config.dedupConfig?.enabled !== false) {
        const dedupResult = await executeDedupStep(
          this.state.data.generatedScript!,
          config.dedupConfig,
          (progress) => this.updateState({ 
            progress: this.mapStepProgress(60, 70, progress) 
          })
        );
        this.updateData({
          dedupedScript: dedupResult.script,
          originalityReport: dedupResult.report,
        });
      }

      // Step 6: 唯一性保障 (70-75%)
      if (config.enforceUniqueness !== false) {
        const uniquenessResult = await executeUniquenessStep(
          this.state.data.dedupedScript || this.state.data.generatedScript!,
          async (script) => this.rewriteScript(script),
          config.uniquenessConfig,
          (progress) => this.updateState({ 
            progress: this.mapStepProgress(70, 75, progress) 
          })
        );
        this.updateData({
          uniqueScript: uniquenessResult.script,
          uniquenessReport: uniquenessResult.report,
        });
      }

      // Step 7: 编辑脚本 (75%)
      this.updateState({ step: 'script-edit', progress: 75 });

      // Step 8: AI 智能剪辑 (75-85%)
      if (config.aiClipConfig?.enabled) {
        await executeAIClipStep(
          this.state.data.videoInfo!,
          config.aiClipConfig,
          (progress) => this.updateState({ 
            progress: this.mapStepProgress(75, 85, progress) 
          })
        );
      }

      // Step 9: 时间轴编辑 (85-95%)
      const timeline = await executeTimelineStep(
        this.state.data.videoInfo!,
        this.state.data.videoAnalysis!,
        this.state.data.editedScript || this.state.data.uniqueScript!,
        true,
        {
          mode: config.mode,
          autoOriginalOverlay: config.autoOriginalOverlay !== false,
          overlayMixMode: config.overlayMixMode,
          overlayOpacity: config.overlayOpacity,
          syncStrategy:
            config.commentarySyncStrategy ||
            (config.mode ? WORKFLOW_MODE_DEFINITIONS[config.mode].syncTarget : 'balanced'),
        },
        (progress) => this.updateState({ 
          progress: this.mapStepProgress(85, 95, progress) 
        })
      );
      this.updateData({
        timeline,
        alignmentReport: timeline.alignment,
        originalOverlayPlan: timeline.originalOverlayPlan,
      });
      this.updateState({ step: 'timeline-edit', progress: 95 });

      // Step 10: 预览
      this.updateState({ step: 'preview', progress: 90 });

      // Step 11: 导出
      this.updateState({ step: 'export', progress: 100, status: 'completed' });
      this.callbacks.onComplete?.(this.state.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '工作流执行失败';
      this.updateState({ status: 'error', error: errorMessage });
      throw error;
    }
  }

  private async rewriteScript(script: ScriptData): Promise<ScriptData> {
    return {
      ...script,
      updatedAt: new Date().toISOString(),
    };
  }

  async stepAnalyze(): Promise<VideoAnalysis> {
    if (!this.state.data.videoInfo || !this.state.data.projectId) {
      throw new Error('缺少视频信息，无法执行分析');
    }
    const result = await executeAnalyzeStep(this.state.data.videoInfo, this.state.data.projectId);
    this.updateData({ videoAnalysis: result.analysis });
    this.updateState({ step: 'analyze', progress: 20 });
    return result.analysis;
  }

  async stepTemplateSelect(templateId?: string): Promise<ScriptTemplate> {
    if (!this.state.data.videoAnalysis) {
      throw new Error('缺少视频分析结果，无法选择模板');
    }
    const result = await executeTemplateStep(this.state.data.videoAnalysis, templateId);
    this.updateData({ selectedTemplate: result.template });
    this.updateState({ step: 'template-select', progress: 35 });
    return result.template;
  }

  async stepGenerateScript(
    model: AIModel,
    params: WorkflowConfig['scriptParams']
  ): Promise<ScriptData> {
    if (!this.state.data.videoInfo || !this.state.data.videoAnalysis || !this.state.data.selectedTemplate || !this.state.data.projectId) {
      throw new Error('缺少生成脚本所需数据');
    }
    const result = await executeScriptGenerateStep(
      this.state.data.videoInfo,
      this.state.data.videoAnalysis,
      this.state.data.selectedTemplate,
      model,
      params,
      this.state.data.projectId,
      this.currentConfig?.mode || 'ai-commentary'
    );
    this.updateData({ generatedScript: result.script });
    this.updateState({ step: 'script-generate', progress: 45 });
    return result.script;
  }

  async stepDedupScript(
    config?: WorkflowConfig['dedupConfig']
  ): Promise<{ script: ScriptData; report: WorkflowData['originalityReport'] }> {
    const baseScript = this.state.data.generatedScript;
    if (!baseScript) {
      throw new Error('缺少待去重脚本');
    }
    const result = await executeDedupStep(baseScript, config);
    this.updateData({ dedupedScript: result.script, originalityReport: result.report });
    this.updateState({ step: 'script-dedup', progress: 55 });
    return {
      script: result.script,
      report: result.report,
    };
  }

  async stepEnsureUniqueness(
    config?: WorkflowConfig['uniquenessConfig']
  ): Promise<{ script: ScriptData; isUnique: boolean; attempts: number }> {
    const baseScript = this.state.data.dedupedScript || this.state.data.generatedScript;
    if (!baseScript) {
      throw new Error('缺少待唯一性处理脚本');
    }
    const result = await executeUniquenessStep(baseScript, async (script) => this.rewriteScript(script), config);
    this.updateData({ uniqueScript: result.script, uniquenessReport: result.report });
    this.updateState({ step: 'script-dedup', progress: 60 });
    return { script: result.script, isUnique: result.isUnique, attempts: result.attempts };
  }

  async stepTimelineEdit(autoMatch: boolean = true): Promise<TimelineData> {
    if (!this.state.data.videoInfo || !this.state.data.videoAnalysis || !(this.state.data.editedScript || this.state.data.uniqueScript || this.state.data.generatedScript)) {
      throw new Error('缺少时间轴编辑所需数据');
    }
    const timeline = await executeTimelineStep(
      this.state.data.videoInfo,
      this.state.data.videoAnalysis,
      this.state.data.editedScript || this.state.data.uniqueScript || this.state.data.generatedScript!,
      autoMatch,
      {
        mode: this.currentConfig?.mode,
        autoOriginalOverlay: this.currentConfig?.autoOriginalOverlay !== false,
        overlayMixMode: this.currentConfig?.overlayMixMode,
        overlayOpacity: this.currentConfig?.overlayOpacity,
        syncStrategy:
          this.currentConfig?.commentarySyncStrategy ||
          (this.currentConfig?.mode
            ? WORKFLOW_MODE_DEFINITIONS[this.currentConfig.mode].syncTarget
            : 'balanced'),
      }
    );
    this.updateData({
      timeline,
      alignmentReport: timeline.alignment,
      originalOverlayPlan: timeline.originalOverlayPlan,
    });
    this.updateState({ step: 'timeline-edit', progress: 70 });
    return timeline;
  }

  async stepPreview(): Promise<string> {
    this.updateState({ step: 'preview', progress: 90 });
    return 'preview-ready';
  }

  async stepEditScript(editedScript: ScriptData): Promise<ScriptData> {
    this.updateState({ step: 'script-edit', progress: 60 });

    const project = storageService.projects.getById(this.state.data.projectId!);
    if (project) {
      project.scripts = project.scripts ?? [];
      const index = project.scripts.findIndex((s) => s.id === editedScript.id);
      if (index >= 0) {
        project.scripts[index] = {
          ...editedScript,
          updatedAt: new Date().toISOString(),
        };
      } else {
        project.scripts.push(editedScript);
      }
      storageService.projects.save(project);
    }

    this.updateData({ editedScript });
    this.updateState({ progress: 70 });
    return editedScript;
  }

  async stepExport(settings: WorkflowData['exportSettings']): Promise<string> {
    this.updateState({ step: 'export', progress: 95 });

    const exportSettings: ExportSettings = (settings || {
      format: 'mp4',
      quality: 'high',
      resolution: '1080p',
      fps: 30,
      includeSubtitles: true,
      includeWatermark: false,
      burnSubtitles: true,
    }) as ExportSettings;

    const activeScript =
      this.state.data.editedScript || this.state.data.uniqueScript || this.state.data.generatedScript;
    if (!activeScript) {
      throw new Error('缺少脚本，无法执行导出前对齐校验');
    }

    const alignmentGateResult = this.enforceAlignmentGate(this.state.data.timeline!, activeScript);
    if (!alignmentGateResult.report.passed) {
      throw new Error('导出已阻断：解说与画面对齐未达标，请检查时间轴后重试。');
    }
    this.updateData({
      timeline: alignmentGateResult.timeline,
      editedScript: alignmentGateResult.script,
      alignmentReport: alignmentGateResult.timeline.alignment,
      alignmentGateReport: alignmentGateResult.report,
    });

    const exportedPath = await executeExportStep(
      this.state.data.projectId!,
      this.state.data.videoInfo!,
      alignmentGateResult.timeline,
      alignmentGateResult.script,
      exportSettings,
      {
        overlayMixMode: this.currentConfig?.overlayMixMode || 'pip',
        overlayOpacity: this.currentConfig?.overlayOpacity ?? 0.72,
      }
    );

    this.updateState({ progress: 100, status: 'completed' });
    return exportedPath;
  }

  private enforceAlignmentGate(
    timeline: TimelineData,
    script: ScriptData
  ): {
    timeline: TimelineData;
    script: ScriptData;
    report: NonNullable<WorkflowData['alignmentGateReport']>;
  } {
    const videoTrack = timeline.tracks.find((track) => track.type === 'video');
    const subtitleTrack = timeline.tracks.find((track) => track.type === 'subtitle');
    if (!videoTrack || !subtitleTrack) {
      throw new Error('缺少视频轨或字幕轨，无法执行导出对齐门禁');
    }

    const buildAlignment = (currentTimeline: TimelineData, currentScript: ScriptData) => {
      const scenes = videoTrack.clips.map((clip, index) => ({
        id: `gate-scene-${index}`,
        startTime: clip.startTime,
        endTime: clip.endTime,
        thumbnail: '',
        tags: [],
      }));
      const currentSubtitleTrack =
        currentTimeline.tracks.find((track) => track.type === 'subtitle') || subtitleTrack;
      const segmentById = new Map(currentScript.segments.map((segment) => [segment.id, segment]));
      const timedSegments = currentSubtitleTrack.clips
        .map((clip) => {
          const segmentId = clip.scriptSegmentId;
          if (!segmentId) return null;
          const segment = segmentById.get(segmentId);
          if (!segment) return null;
          return {
            ...segment,
            startTime: clip.startTime,
            endTime: clip.endTime,
          };
        })
        .filter(Boolean) as ScriptData['segments'];

      const items = sceneCommentaryAlignmentService.align(scenes as any, timedSegments);
      const averageConfidence =
        items.reduce((sum, item) => sum + item.confidence, 0) / Math.max(items.length, 1);
      const maxDriftSeconds = items.reduce((max, item) => Math.max(max, item.driftSeconds), 0);
      const lowConfidenceCount = items.filter(
        (item) => item.confidence < ALIGNMENT_GATE_THRESHOLD.minConfidence
      ).length;
      const highDriftCount = items.filter(
        (item) => item.driftSeconds > ALIGNMENT_GATE_THRESHOLD.maxDriftSeconds
      ).length;
      return { items, averageConfidence, maxDriftSeconds, lowConfidenceCount, highDriftCount };
    };

    const before = buildAlignment(timeline, script);

    const lowItems = before.items.filter(
      (item) =>
        item.confidence < ALIGNMENT_GATE_THRESHOLD.minConfidence ||
        item.driftSeconds > ALIGNMENT_GATE_THRESHOLD.maxDriftSeconds
    );

    if (lowItems.length === 0) {
      const readyTimeline: TimelineData = {
        ...timeline,
        alignment: {
          averageConfidence: before.averageConfidence,
          maxDriftSeconds: before.maxDriftSeconds,
          items: before.items.map((item) => ({
            sceneId: item.sceneId,
            segmentId: item.segmentId,
            driftSeconds: item.driftSeconds,
            confidence: item.confidence,
          })),
        },
      };
      return {
        timeline: readyTimeline,
        script,
        report: {
          threshold: { ...ALIGNMENT_GATE_THRESHOLD },
          before: {
            averageConfidence: before.averageConfidence,
            maxDriftSeconds: before.maxDriftSeconds,
            lowConfidenceCount: before.lowConfidenceCount,
            highDriftCount: before.highDriftCount,
          },
          after: {
            averageConfidence: before.averageConfidence,
            maxDriftSeconds: before.maxDriftSeconds,
            lowConfidenceCount: before.lowConfidenceCount,
            highDriftCount: before.highDriftCount,
          },
          autoFixedSegments: 0,
          failedSegmentsBefore: [],
          failedSegmentsAfter: [],
          passed: true,
        },
      };
    }

    const fixedTimeline: TimelineData = {
      ...timeline,
      tracks: timeline.tracks.map((track) =>
        track.type === 'subtitle'
          ? {
              ...track,
              clips: track.clips.map((clip) => ({ ...clip })),
            }
          : track
      ),
    };
    const fixedScript: ScriptData = {
      ...script,
      segments: script.segments.map((segment) => ({ ...segment })),
      updatedAt: new Date().toISOString(),
    };

    const fixedVideoTrack = fixedTimeline.tracks.find((track) => track.type === 'video');
    const fixedSubtitleTrack = fixedTimeline.tracks.find((track) => track.type === 'subtitle');
    if (!fixedVideoTrack || !fixedSubtitleTrack) {
      throw new Error('对齐门禁修正失败：无法获取时间轴轨道');
    }

    const videoBySegmentId = new Map<string, (typeof fixedVideoTrack.clips)[number]>();
    for (const clip of fixedVideoTrack.clips) {
      if (clip.scriptSegmentId && !videoBySegmentId.has(clip.scriptSegmentId)) {
        videoBySegmentId.set(clip.scriptSegmentId, clip);
      }
    }

    let autoFixedSegments = 0;
    for (const item of lowItems) {
      const targetVideoClip = videoBySegmentId.get(item.segmentId);
      if (!targetVideoClip) continue;
      const subtitleClip = fixedSubtitleTrack.clips.find((clip) => clip.scriptSegmentId === item.segmentId);
      if (subtitleClip) {
        subtitleClip.startTime = targetVideoClip.startTime;
        subtitleClip.endTime = targetVideoClip.endTime;
      }
      const scriptSegment = fixedScript.segments.find((segment) => segment.id === item.segmentId);
      if (scriptSegment) {
        scriptSegment.startTime = targetVideoClip.startTime;
        scriptSegment.endTime = targetVideoClip.endTime;
      }
      autoFixedSegments += 1;
    }

    const after = buildAlignment(fixedTimeline, fixedScript);
    const passed = after.lowConfidenceCount === 0 && after.highDriftCount === 0;
    const failedSegmentsAfter = after.items
      .filter(
        (item) =>
          item.confidence < ALIGNMENT_GATE_THRESHOLD.minConfidence ||
          item.driftSeconds > ALIGNMENT_GATE_THRESHOLD.maxDriftSeconds
      )
      .map((item) => ({
        segmentId: item.segmentId,
        driftSeconds: item.driftSeconds,
        confidence: item.confidence,
      }));

    fixedTimeline.alignment = {
      averageConfidence: after.averageConfidence,
      maxDriftSeconds: after.maxDriftSeconds,
      items: after.items.map((item) => ({
        sceneId: item.sceneId,
        segmentId: item.segmentId,
        driftSeconds: item.driftSeconds,
        confidence: item.confidence,
      })),
    };

    return {
      timeline: fixedTimeline,
      script: fixedScript,
      report: {
        threshold: { ...ALIGNMENT_GATE_THRESHOLD },
        before: {
          averageConfidence: before.averageConfidence,
          maxDriftSeconds: before.maxDriftSeconds,
          lowConfidenceCount: before.lowConfidenceCount,
          highDriftCount: before.highDriftCount,
        },
        after: {
          averageConfidence: after.averageConfidence,
          maxDriftSeconds: after.maxDriftSeconds,
          lowConfidenceCount: after.lowConfidenceCount,
          highDriftCount: after.highDriftCount,
        },
        autoFixedSegments,
        failedSegmentsBefore: lowItems.map((item) => ({
          segmentId: item.segmentId,
          driftSeconds: item.driftSeconds,
          confidence: item.confidence,
        })),
        failedSegmentsAfter,
        passed,
      },
    };
  }

  pause(): void {
    this.updateState({ status: 'paused' });
  }

  resume(): void {
    this.updateState({ status: 'running' });
  }

  cancel(): void {
    this.abortController?.abort();
    this.updateState({ status: 'idle' });
  }

  reset(): void {
    this.state = this.getInitialState();
    this.currentConfig = null;
  }

  jumpToStep(step: WorkflowStep): void {
    const stepProgress: Record<WorkflowStep, number> = {
      upload: 0,
      analyze: 20,
      'template-select': 35,
      'script-generate': 40,
      'script-dedup': 50,
      'script-edit': 60,
      subtitle: 55,
      'ai-clip': 65,
      repurposing: 68,
      music: 63,
      'timeline-edit': 70,
      preview: 90,
      export: 95,
    };

    this.updateState({
      step,
      progress: stepProgress[step],
    });
  }
}

export const workflowService = new WorkflowService();
export default workflowService;
