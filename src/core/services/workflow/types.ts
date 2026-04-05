import type {
  VideoInfo,
  VideoAnalysis,
  ScriptData,
  ScriptTemplate,
  ExportSettings,
  AIModel,
  Scene,
} from '@/core/types';
import type { OriginalityReport } from '@/core/templates/dedup';
import type { ContentFingerprint, UniquenessCheckResult } from '@/core/services/uniqueness.service';
import type { WorkflowMode } from '@/core/workflow/featureBlueprint';

// 工作流步骤
export type WorkflowStep =
  | 'upload'
  | 'analyze'
  | 'template-select'
  | 'script-generate'
  | 'script-dedup'
  | 'script-edit'
  | 'subtitle'
  | 'ai-clip'
  | 'timeline-edit'
  | 'preview'
  | 'export';

// 时间轴数据
export interface TimelineData {
  tracks: Array<{
    id: string;
    type: 'video' | 'audio' | 'subtitle' | 'effect';
    clips: Array<{
      id: string;
      startTime: number;
      endTime: number;
      sourceStart: number;
      sourceEnd: number;
      sourceId: string;
      scriptSegmentId?: string;
      transition?: string;
    }>;
  }>;
  duration: number;
  alignment?: {
    averageConfidence: number;
    maxDriftSeconds: number;
    items: Array<{
      sceneId: string;
      segmentId: string;
      driftSeconds: number;
      confidence: number;
    }>;
  };
  originalOverlayPlan?: Array<{
    sceneId: string;
    startTime: number;
    endTime: number;
    reason: 'motion' | 'emotion' | 'transition' | 'anchor';
  }>;
  directorPlan?: {
    pacingFactor: number;
    beatCount: number;
    preferredTransition: 'fade' | 'cut' | 'dissolve';
    confidence: number;
  };
  overlayQuality?: {
    score: number;
    riskLevel: 'low' | 'medium' | 'high';
    overlapRatio: number;
    denseOverlayRatio: number;
    suggestions: string[];
  };
  overlayOptimizationPreview?: {
    predictedScore: number;
    passes: number;
    enableOverlay: boolean;
  };
}

// 工作流数据
export interface WorkflowData {
  projectId?: string;
  videoInfo?: VideoInfo;
  videoAnalysis?: VideoAnalysis;
  selectedTemplate?: ScriptTemplate;
  generatedScript?: ScriptData;
  dedupedScript?: ScriptData;
  uniqueScript?: ScriptData;
  editedScript?: ScriptData;
  timeline?: TimelineData;
  exportSettings?: ExportSettings;
  originalityReport?: OriginalityReport;
  uniquenessReport?: {
    fingerprint: ContentFingerprint;
    check: UniquenessCheckResult;
    history: {
      totalScripts: number;
      recentScripts: number;
    };
  };
  alignmentReport?: TimelineData['alignment'];
  alignmentGateReport?: {
    threshold: {
      minConfidence: number;
      maxDriftSeconds: number;
    };
    before: {
      averageConfidence: number;
      maxDriftSeconds: number;
      lowConfidenceCount: number;
      highDriftCount: number;
    };
    after: {
      averageConfidence: number;
      maxDriftSeconds: number;
      lowConfidenceCount: number;
      highDriftCount: number;
    };
    autoFixedSegments: number;
    failedSegmentsBefore: Array<{
      segmentId: string;
      driftSeconds: number;
      confidence: number;
    }>;
    failedSegmentsAfter: Array<{
      segmentId: string;
      driftSeconds: number;
      confidence: number;
    }>;
    passed: boolean;
  };
  originalOverlayPlan?: TimelineData['originalOverlayPlan'];
}

// 工作流状态
export interface WorkflowState {
  step: WorkflowStep;
  progress: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  error?: string;
  data: WorkflowData;
}

// 工作流配置
export interface WorkflowConfig {
  mode?: WorkflowMode;
  autoOriginalOverlay?: boolean;
  overlayMixMode?: 'pip' | 'full';
  overlayOpacity?: number;
  commentarySyncStrategy?: 'strict' | 'balanced';
  autoAnalyze: boolean;
  autoGenerateScript: boolean;
  autoDedup: boolean;
  enforceUniqueness: boolean;
  preferredTemplate?: string;
  model: AIModel;
  scriptParams: {
    style: string;
    tone: string;
    length: 'short' | 'medium' | 'long';
    targetAudience: string;
    language: string;
  };
  dedupConfig?: {
    enabled: boolean;
    autoFix: boolean;
    threshold: number;
    autoVariant?: boolean;
    variantIntensity?: number;
  };
  uniquenessConfig?: {
    enabled: boolean;
    autoRewrite: boolean;
    similarityThreshold: number;
    addRandomness: boolean;
  };
  aiClipConfig?: {
    enabled: boolean;
    autoClip: boolean;
    detectSceneChange: boolean;
    detectSilence: boolean;
    removeSilence: boolean;
    targetDuration?: number;
    pacingStyle: 'fast' | 'normal' | 'slow';
  };
}

// 工作流事件回调
export interface WorkflowCallbacks {
  onStepChange?: (step: WorkflowStep, prevStep: WorkflowStep) => void;
  onProgress?: (progress: number) => void;
  onStatusChange?: (status: WorkflowState['status']) => void;
  onError?: (error: string) => void;
  onComplete?: (result: WorkflowData) => void;
}

// 步骤进度映射
export const STEP_PROGRESS: Record<WorkflowStep, number> = {
  upload: 0,
  analyze: 20,
  'template-select': 35,
  'script-generate': 40,
  'script-dedup': 50,
  'script-edit': 60,
  subtitle: 63,
  'ai-clip': 65,
  'timeline-edit': 70,
  preview: 90,
  export: 95,
};
