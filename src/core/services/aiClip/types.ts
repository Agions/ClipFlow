import type { VideoInfo } from '../../types';

// 剪辑点类型
export type CutPointType = 'scene' | 'silence' | 'keyframe' | 'emotion' | 'manual' | 'ai-suggested' | 'zcr-burst';

// 剪辑点
export interface CutPoint {
  id: string;
  timestamp: number;
  type: CutPointType;
  confidence: number;
  description: string;
  suggestedAction?: 'keep' | 'remove' | 'trim' | 'transition';
  metadata?: {
    sceneChange?: number;
    audioLevel?: number;
    motionScore?: number;
    emotionScore?: number;
  };
}

// 剪辑建议
export interface ClipSuggestion {
  id: string;
  type: 'trim' | 'cut' | 'merge' | 'reorder' | 'effect';
  startTime: number;
  endTime: number;
  description: string;
  reason: string;
  confidence: number;
  previewThumbnail?: string;
  autoApplicable: boolean;
}

// 智能剪辑配置
export interface AIClipConfig {
  // 检测配置
  detectSceneChange: boolean;
  detectSilence: boolean;
  detectKeyframes: boolean;
  detectEmotion: boolean;

  // 阈值配置
  sceneThreshold: number;      // 场景切换阈值 (0-1)
  silenceThreshold: number;    // 静音阈值 (dB)
  minSilenceDuration: number;  // 最小静音时长 (秒)
  keyframeInterval: number;    // 关键帧间隔 (秒)

  // 剪辑配置
  removeSilence: boolean;
  trimDeadTime: boolean;
  autoTransition: boolean;
  transitionType: 'fade' | 'cut' | 'dissolve' | 'slide';

  // AI 增强
  aiOptimize: boolean;
  targetDuration?: number;
  pacingStyle: 'fast' | 'normal' | 'slow';
}

// 默认配置
export const DEFAULT_CLIP_CONFIG: AIClipConfig = {
  detectSceneChange: true,
  detectSilence: true,
  detectKeyframes: true,
  detectEmotion: true,

  sceneThreshold: 0.3,
  silenceThreshold: -40,
  minSilenceDuration: 0.5,
  keyframeInterval: 5,

  removeSilence: true,
  trimDeadTime: true,
  autoTransition: true,
  transitionType: 'fade',

  aiOptimize: true,
  pacingStyle: 'normal'
};

// 剪辑片段
export interface ClipSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  type: 'video' | 'audio' | 'silence' | 'keyframe';
  content: string;
  thumbnail?: string;
  confidence: number;
  cutPoints: CutPoint[];
  suggestions: ClipSuggestion[];
}

// 批量处理任务
export interface BatchClipTask {
  id: string;
  projectId: string;
  videos: VideoInfo[];
  config: AIClipConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  results: ClipSegment[][];
  errors: string[];
  createdAt: string;
  completedAt?: string;
}

// 剪辑分析结果
export interface ClipAnalysisResult {
  videoId: string;
  duration: number;
  cutPoints: CutPoint[];
  segments: ClipSegment[];
  suggestions: ClipSuggestion[];
  silenceSegments: Array<{ start: number; end: number; duration: number }>;
  keyframeTimestamps: number[];
  sceneBoundaries: Array<{ start: number; end: number; type: string }>;
  estimatedFinalDuration: number;
  /** ZCR-burst enhanced emotion peaks: timestamp(s), energy(0-100), type */
  emotionPeaks?: Array<{ timestamp: number; energy: number; type: string }>;
}

// 关键帧
export interface Keyframe {
  timestamp: number;
  thumbnail: string;
  importance: number;
}
