/**
 * Timeline 类型定义
 */

// Track types
export type TrackType = 'video' | 'audio' | 'subtitle' | 'effect';

// Timeline scale for pixel calculations
export interface TimelineScale {
  pixelsPerSecond: number;
  pixelsPerFrame: number;
}

// Track interface
export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  clips: TimelineClip[];
  height?: number;
  muted?: boolean;
  locked?: boolean;
  visible?: boolean;
  volume?: number;
  selected?: boolean;
}

// Type alias for backward compatibility
export type Track = TimelineTrack;

// Clip interface (internal for timeline)
export interface TimelineClip {
  id: string;
  trackId: string;
  name: string;
  type: string;
  startTime: number;
  endTime: number;
  startMs: number;
  endMs: number;
  sourceStart: number;
  sourceEnd: number;
  duration: number;
  color: string;
  thumbnail?: string;
  keyframes: Keyframe[];
  transitions: {
    in?: Transition;
    out?: Transition;
  };
  properties: ClipProperties;
}

// Clip types
export interface Clip {
  id: string;
  trackId: string;
  name: string;
  type: string;
  startTime: number;
  endTime: number;
  startMs: number;
  endMs: number;
  sourceStart: number;
  sourceEnd: number;
  duration: number;
  color: string;
  keyframes: Keyframe[];
  transitions: {
    in?: Transition;
    out?: Transition;
  };
  properties: ClipProperties;
  thumbnail?: string;
}

export interface ClipProperties {
  scale: number;
  rotation: number;
  opacity: number;
  x: number;
  y: number;
}

// Keyframe interface
export interface Keyframe {
  id: string;
  time: number;
  property: string;
  value: number;
  ease: KeyframeEase;
  label?: string;
  // Legacy support
  properties?: {
    scale?: number;
    rotation?: number;
    opacity?: number;
    x?: number;
    y?: number;
  };
}

export type KeyframeEase = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bezier';

export interface Transition {
  type: 'fade' | 'dissolve' | 'wipe' | 'slide';
  duration: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}

// Timeline props
export interface TimelineProps {
  currentTime: number;
  duration: number;
  tracks: Track[];
  onTimeUpdate: (time: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onTrackUpdate?: (tracks: Track[]) => void;
  onClipSelect?: (clip: Clip | null) => void;
  onClipUpdate?: (clip: Clip) => void;
}
