/**
 * Services 统一导出
 */

// 导出基类和错误类型
export { BaseService, ServiceError } from './base.service';
export type { RequestConfig as BaseRequestConfig } from './base.service';

// 导出各个服务
export { aiService } from './ai.service';
export { videoService } from './video.service';
export { storageService } from './storage.service';
export { visionService } from './vision.service';
export { workflowService } from './workflow.service';
export { scriptTemplateService } from '../templates/script.templates';
export { editorService, EditorService } from './editor.service';
export { costService, CostService } from './cost.service';
export { aiClipService, AIClipService } from './aiClip.service';
export { clipWorkflowService, ClipWorkflowService } from './clip-workflow.service';
export { commentaryMixService, CommentaryMixService } from './commentary-mix.service';
export { audioVideoSyncService, AudioVideoSyncService } from './audio-sync.service';
export { subtitleService, SubtitleService } from './subtitle.service';
export { sceneCommentaryAlignmentService, SceneCommentaryAlignmentService } from './scene-commentary-alignment.service';
export { aiDirectorService, AIDirectorService } from './ai-director.service';
export { overlayQualityService, OverlayQualityService } from './overlay-quality.service';
export { optimizeOverlayIteratively } from './overlay-optimization.service';
export { voiceSynthesisService, VoiceSynthesisService } from './voice-synthesis.service';
export { videoEffectService, VideoEffectService } from './video-effect.service';
export { exportService, ExportService } from './export.service';
export { pipelineService, PipelineService } from './pipeline.service';

// 新增服务
export { smartCutService, SmartCutService } from './smart-cut.service';
export { videoEnhanceService, VideoEnhanceService } from './videoEnhance.service';
export { performanceService, PerformanceService } from './performance.service';

// 重新导出类型
export type { AIResponse, RequestConfig } from './ai.service';
export type {
  WorkflowState,
  WorkflowData,
  WorkflowConfig,
  WorkflowCallbacks,
  TimelineData,
  WorkflowStep
} from './workflow.service';
export type {
  EditorConfig,
  EditorAction,
  EditorHistory
} from './editor.service';
export type {
  CostRecord,
  CostStats,
  CostBudget
} from './cost.service';
export type {
  CutPoint,
  CutPointType,
  ClipSuggestion,
  ClipSegment,
  AIClipConfig,
  ClipAnalysisResult,
  BatchClipTask
} from './aiClip.service';
export type { ClipSegment as WorkflowClipSegment, ClipResult } from './clip-workflow.service';
export type { MixResult } from './commentary-mix.service';
export type { SyncConfig, SyncResult, SyncIssue, SyncTimeline } from './audio-sync.service';
export type { SubtitleConfig, SubtitleEntry, SubtitleData, SpeechRecognitionResult } from './subtitle.service';
export type { SceneCommentaryAlignment, OriginalOverlayPlanItem } from './scene-commentary-alignment.service';
export type { AIDirectorPlanInput, AIDirectorPlanOutput, AutonomousRenderInput } from './ai-director.service';
export type { OverlayWindow, SubtitleWindow, OverlayQualityReport } from './overlay-quality.service';
export type { OverlayMarker, OverlayOptimizationInput, OverlayOptimizationResult } from './overlay-optimization.service';
export type { VoiceConfig, VoiceItem, SynthesisResult } from './voice-synthesis.service';
export type { EffectConfig, FilterEffect, TransitionEffect, AnimationEffect, ColorCorrection, EffectPreset } from './video-effect.service';
export type { 
  ExportFormat, ExportQuality, ExportResolution, EncoderSettings, ExportConfig, 
  ExportResult, ExportProgress 
} from './export.service';
export type {
  PipelineConfig, PipelineState, WorkflowStep as PipelineWorkflowStep, WorkflowEventType, WorkflowEvent, WorkflowResult
} from './pipeline.service';

export { unifiedWorkflowService, UnifiedWorkflowService } from './unified-workflow.service';
export type { WorkflowMode, WorkflowState, WorkflowStep, WorkflowResult, VideoClip, SceneInfo, AudioPeak, ScriptData, ScriptSegment, SubtitleData, SubtitleEntry } from './unified-workflow.service';
