/**
 * VideoProcessingController Types
 * Shared types for the VideoProcessingController module
 */
import type { VideoSegment } from '@/core/types';

export interface BatchItem {
  id: string;
  segments: Array<{ start: number; end: number; type?: string; content?: string }>;
  name: string;
  completed: boolean;
}

export interface CustomQualitySettings {
  resolution: string;
  bitrate: number;
  framerate: number;
  useHardwareAcceleration: boolean;
}

export interface VideoProcessingControllerProps {
  videoPath: string;
  segments: Array<{ start: number; end: number; type?: string; content?: string }>;
  onProcessingComplete?: (outputPath: string) => void;
  defaultQuality?: string;
  defaultFormat?: string;
  defaultTransition?: string;
  defaultAudioProcess?: string;
}
