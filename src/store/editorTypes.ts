/**
 * Editor Store 类型定义
 */
import type { VideoSegment, EditorPanel } from '@/core/types';
import type { TimelineTrack, TimelineClip, Keyframe, TrackType } from '@/components/Timeline/types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
export const MAX_HISTORY_SIZE = 19;
export const DEFAULT_SNAP_THRESHOLD_MS = 100;
export const DEFAULT_ZOOM = 1;
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 10;
export const VOLUME_MIN = 0;
export const VOLUME_MAX = 1;
export const SEEK_STEP_SECONDS = 5;
export const SEEK_LONG_SECONDS = 10;
export const VOLUME_STEP = 0.1;

// =========================================
// Shared types
// =========================================
export interface VideoData {
  id: string;
  url: string;
  duration: number;
}

export interface ScriptData {
  id: string;
  content: string;
}

export interface VoiceData {
  id: string;
  url: string;
}

export interface TimelineSelection {
  segmentId?: string;
  multipleIds: string[];
}

export interface EditorHistory {
  past: VideoSegment[][];
  future: VideoSegment[][];
}

// =========================================
// EditorStore full state & actions
// =========================================
export interface EditorState {
  video: VideoData | null;
  script: ScriptData | null;
  voice: VoiceData | null;
  segments: VideoSegment[];
  activePanel: EditorPanel;
  previewPlaying: boolean;
  currentTime: number;
  volume: number;
  muted: boolean;
  selection: TimelineSelection;
  zoom: number;
  scrollPosition: number;
  playheadMs: number;
  timelineTracks: TimelineTrack[];
  timelineDuration: number;
  snapEnabled: boolean;
  snapThreshold: number;
  selectedClipId?: string;
  selectedTrackId?: string;
  inPointMs?: number;
  outPointMs?: number;
  history: EditorHistory;
  trackHistory: { past: TimelineTrack[][]; future: TimelineTrack[][] };
}

export type EditorActions = {
  // Media
  setVideo: (video: VideoData | null) => void;
  setScript: (script: ScriptData | null) => void;
  setVoice: (voice: VoiceData | null) => void;
  setActivePanel: (panel: EditorPanel) => void;
  setPreviewPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  // Segments
  addSegment: (segment: VideoSegment) => void;
  updateSegment: (id: string, data: Partial<VideoSegment>) => void;
  deleteSegment: (id: string) => void;
  reorderSegments: (fromIndex: number, toIndex: number) => void;
  clearSegments: () => void;
  // UI
  setSelection: (selection: Partial<TimelineSelection>) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setScrollPosition: (position: number) => void;
  // Timeline
  setPlayheadMs: (ms: number) => void;
  setTimelineTracks: (tracks: TimelineTrack[]) => void;
  addTimelineTrack: (type: TrackType, name?: string) => string;
  removeTimelineTrack: (trackId: string) => void;
  updateTimelineTrack: (trackId: string, updates: Partial<TimelineTrack>) => void;
  addClipToTrack: (trackId: string, clip: Omit<TimelineClip, 'id' | 'trackId'>) => string;
  removeClipFromTrack: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  moveClip: (clipId: string, targetTrackId: string, newStartMs: number, newEndMs?: number) => void;
  splitClip: (clipId: string, splitMs: number) => void;
  addKeyframe: (clipId: string, keyframe: Omit<Keyframe, 'id'>) => string;
  removeKeyframe: (clipId: string, keyframeId: string) => void;
  updateKeyframe: (clipId: string, keyframeId: string, updates: Partial<Keyframe>) => void;
  setTimelineSelection: (clipId?: string, trackId?: string) => void;
  clearTimelineSelection: () => void;
  setInPoint: () => void;
  setOutPoint: () => void;
  selectAllClips: () => void;
  setTimelineDuration: (ms: number) => void;
  setSnapEnabled: (enabled: boolean) => void;
  // History
  undo: () => void;
  redo: () => void;
  undoTrack: () => void;
  redoTrack: () => void;
  saveHistory: () => void;
  saveTrackHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  canUndoTrack: () => boolean;
  canRedoTrack: () => boolean;
  reset: () => void;
};

export type EditorStore = EditorState & EditorActions;
