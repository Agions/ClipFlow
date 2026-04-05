/**
 * Editor Store - 编辑器状态
 * 包含: 视频、脚本、语音、预览状态、时间线操作
 *
 * 类型说明：
 * - VideoData / ScriptData / VoiceData: 编辑器会话级数据（内存，不持久化）
 * - VideoSegment: 来自 @/core/types
 * - EditorPanel: 来自 @/core/types
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { VideoSegment, EditorPanel } from '@/core/types';
import type { TimelineTrack, TimelineClip, Keyframe, TrackType } from '@/components/Timeline/types';

// ============================================
// Local types (not used outside this store)
// ============================================

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

/** 时间线选中项 */
export interface TimelineSelection {
  segmentId?: string;
  multipleIds: string[];
}

/** 编辑器历史记录 */
export interface EditorHistory {
  past: VideoSegment[][];
  future: VideoSegment[][];
}

/**
 * Editor Store 状态
 */
export interface EditorState {
  // 当前编辑状态
  video: VideoData | null;
  script: ScriptData | null;
  voice: VoiceData | null;
  
  // 视频片段 (单轨模式, 向后兼容)
  segments: VideoSegment[];
  
  // UI 状态
  activePanel: EditorPanel;
  previewPlaying: boolean;
  currentTime: number;
  volume: number;
  muted: boolean;
  
  // 时间线
  selection: TimelineSelection;
  zoom: number; // 缩放级别 0.1 - 10
  scrollPosition: number; // 滚动位置
  
  // 多轨道时间线状态
  playheadMs: number; // 播放头位置 (ms)
  timelineTracks: TimelineTrack[]; // 多轨道列表
  timelineDuration: number; // 时间线总时长 (ms)
  snapEnabled: boolean; // 是否启用吸附
  snapThreshold: number; // 吸附阈值 (ms)
  selectedClipId?: string;
  selectedTrackId?: string;
  
  // 历史记录 (撤销/重做)
  history: EditorHistory;
  // 多轨道历史
  trackHistory: { past: TimelineTrack[][]; future: TimelineTrack[][] };

  // Actions - 基本操作
  setVideo: (video: VideoData | null) => void;
  setScript: (script: ScriptData | null) => void;
  setVoice: (voice: VoiceData | null) => void;
  setActivePanel: (panel: EditorPanel) => void;
  setPreviewPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  
  // Actions - 片段操作
  addSegment: (segment: VideoSegment) => void;
  updateSegment: (id: string, data: Partial<VideoSegment>) => void;
  deleteSegment: (id: string) => void;
  reorderSegments: (fromIndex: number, toIndex: number) => void;
  clearSegments: () => void;
  
  // Actions - 时间线
  setSelection: (selection: Partial<TimelineSelection>) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setScrollPosition: (position: number) => void;
  
  // Actions - 多轨道
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
  setTimelineDuration: (ms: number) => void;
  setSnapEnabled: (enabled: boolean) => void;
  saveTrackHistory: () => void;
  
  // Actions - 历史记录
  undo: () => void;
  redo: () => void;
  undoTrack: () => void;
  redoTrack: () => void;
  saveHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  canUndoTrack: () => boolean;
  canRedoTrack: () => boolean;
  
  // Actions
  reset: () => void;
}

/**
 * 初始状态
 */
const initialState = {
  video: null,
  script: null,
  voice: null,
  segments: [] as VideoSegment[],
  activePanel: 'video' as EditorPanel,
  previewPlaying: false,
  currentTime: 0,
  volume: 1,
  muted: false,
  selection: {
    segmentId: undefined,
    multipleIds: [],
  },
  zoom: 1,
  scrollPosition: 0,
  playheadMs: 0,
  timelineTracks: [] as TimelineTrack[],
  timelineDuration: 60000,
  snapEnabled: true,
  snapThreshold: 100,
  selectedClipId: undefined,
  selectedTrackId: undefined,
  history: {
    past: [],
    future: [],
  },
  trackHistory: {
    past: [],
    future: [],
  },
};

/**
 * Editor Store
 */
export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 基本操作
      setVideo: (video) => set({ video }),
      setScript: (script) => set({ script }),
      setVoice: (voice) => set({ voice }),
      setActivePanel: (activePanel) => set({ activePanel }),
      setPreviewPlaying: (previewPlaying) => set({ previewPlaying }),
      setCurrentTime: (currentTime) => set({ currentTime }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      setMuted: (muted) => set({ muted }),
      
      // 片段操作
      addSegment: (segment) => {
        get().saveHistory();
        set((state) => ({ segments: [...state.segments, segment] }));
      },
      
      updateSegment: (id, data) => {
        get().saveHistory();
        set((state) => ({
          segments: state.segments.map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        }));
      },
      
      deleteSegment: (id) => {
        get().saveHistory();
        set((state) => ({
          segments: state.segments.filter((s) => s.id !== id),
        }));
      },
      
      reorderSegments: (fromIndex, toIndex) => {
        get().saveHistory();
        set((state) => {
          const segments = [...state.segments];
          const [removed] = segments.splice(fromIndex, 1);
          segments.splice(toIndex, 0, removed);
          return { segments };
        });
      },
      
      clearSegments: () => {
        get().saveHistory();
        set({ segments: [] });
      },
      
      // 时间线
      setSelection: (selection) =>
        set((state) => ({
          selection: { ...state.selection, ...selection },
        })),
      
      clearSelection: () =>
        set({ selection: { segmentId: undefined, multipleIds: [] } }),
      
      setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
      setScrollPosition: (scrollPosition) => set({ scrollPosition }),
      
      // 多轨道时间线
      setPlayheadMs: (ms) => set({ playheadMs: Math.max(0, ms) }),
      setTimelineTracks: (tracks) => set({ timelineTracks: tracks }),
      
      addTimelineTrack: (type, name) => {
        const id = `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const typeNames: Record<string, string> = { video: '视频', audio: '音频', subtitle: '字幕', effect: '效果' };
        const count = get().timelineTracks.filter(t => t.type === type).length;
        const track: TimelineTrack = {
          id,
          type,
          name: name || `${typeNames[type] || type}轨道 ${count + 1}`,
          clips: [],
          muted: false,
          locked: false,
          visible: true,
          height: type === 'subtitle' ? 50 : 60,
        };
        set((state) => ({ timelineTracks: [...state.timelineTracks, track] }));
        return id;
      },
      
      removeTimelineTrack: (trackId) => {
        get().saveTrackHistory();
        set((state) => ({ timelineTracks: state.timelineTracks.filter(t => t.id !== trackId) }));
      },
      
      updateTimelineTrack: (trackId, updates) => {
        set((state) => ({
          timelineTracks: state.timelineTracks.map(t => t.id === trackId ? { ...t, ...updates } : t),
        }));
      },
      
      addClipToTrack: (trackId, clipData) => {
        const id = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const clip: TimelineClip = { ...clipData, id, trackId };
        get().saveTrackHistory();
        set((state) => ({
          timelineTracks: state.timelineTracks.map(t =>
            t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
          ),
          selectedClipId: id,
          selectedTrackId: trackId,
        }));
        return id;
      },
      
      removeClipFromTrack: (clipId) => {
        get().saveTrackHistory();
        set((state) => ({
          timelineTracks: state.timelineTracks.map(t => ({
            ...t,
            clips: t.clips.filter(c => c.id !== clipId),
          })),
          selectedClipId: state.selectedClipId === clipId ? undefined : state.selectedClipId,
          selectedTrackId: state.selectedClipId === clipId ? undefined : state.selectedTrackId,
        }));
      },
      
      updateClip: (clipId, updates) => {
        set((state) => ({
          timelineTracks: state.timelineTracks.map(t => ({
            ...t,
            clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c),
          })),
        }));
      },
      
      moveClip: (clipId, targetTrackId, newStartMs, newEndMs) => {
        get().saveTrackHistory();
        set((state) => {
          let clipToMove: TimelineClip | undefined;
          const afterRemove = state.timelineTracks.map(t => {
            const clip = t.clips.find(c => c.id === clipId);
            if (clip) {
              clipToMove = { ...clip, trackId: targetTrackId };
              return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
            }
            return t;
          });
          if (!clipToMove) return state;
          const duration = clipToMove.endMs - clipToMove.startMs;
          return {
            timelineTracks: afterRemove.map(t => {
              if (t.id === targetTrackId) {
                return {
                  ...t,
                  clips: [...t.clips, {
                    ...clipToMove!,
                    startMs: newStartMs,
                    endMs: newEndMs ?? (newStartMs + duration),
                  }],
                };
              }
              return t;
            }),
          };
        });
      },
      
      splitClip: (clipId, splitMs) => {
        get().saveTrackHistory();
        set((state) => ({
          timelineTracks: state.timelineTracks.map(t => {
            const idx = t.clips.findIndex(c => c.id === clipId);
            if (idx === -1) return t;
            const clip = t.clips[idx];
            if (splitMs <= clip.startMs || splitMs >= clip.endMs) return t;
            const duration = clip.endMs - clip.startMs;
            const offset = splitMs - clip.startMs;
            const sourceSplit = clip.sourceStartMs + offset;
            const leftClip: TimelineClip = { ...clip, endMs: splitMs, sourceEndMs: sourceSplit };
            const rightClip: TimelineClip = {
              ...clip,
              id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              startMs: splitMs,
              endMs: clip.endMs,
              sourceStartMs: sourceSplit,
            };
            const newClips = [...t.clips];
            newClips.splice(idx, 1, leftClip, rightClip);
            return { ...t, clips: newClips };
          }),
        }));
      },
      
      addKeyframe: (clipId, kfData) => {
        const id = `kf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const keyframe: Keyframe = { ...kfData, id };
        set((state) => ({
          timelineTracks: state.timelineTracks.map(t => ({
            ...t,
            clips: t.clips.map(c =>
              c.id === clipId
                ? { ...c, keyframes: [...(c.keyframes || []), keyframe] }
                : c
            ),
          })),
        }));
        return id;
      },
      
      removeKeyframe: (clipId, keyframeId) => {
        set((state) => ({
          timelineTracks: state.timelineTracks.map(t => ({
            ...t,
            clips: t.clips.map(c =>
              c.id === clipId
                ? { ...c, keyframes: (c.keyframes || []).filter(kf => kf.id !== keyframeId) }
                : c
            ),
          })),
        }));
      },
      
      updateKeyframe: (clipId, keyframeId, updates) => {
        set((state) => ({
          timelineTracks: state.timelineTracks.map(t => ({
            ...t,
            clips: t.clips.map(c =>
              c.id === clipId
                ? {
                    ...c,
                    keyframes: (c.keyframes || []).map(kf =>
                      kf.id === keyframeId ? { ...kf, ...updates } : kf
                    ),
                  }
                : c
            ),
          })),
        }));
      },
      
      setTimelineSelection: (clipId, trackId) =>
        set({ selectedClipId: clipId, selectedTrackId: trackId }),
      
      clearTimelineSelection: () =>
        set({ selectedClipId: undefined, selectedTrackId: undefined }),
      
      setTimelineDuration: (ms) => set({ timelineDuration: Math.max(0, ms) }),
      setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
      
      // 历史记录
      saveHistory: () =>
        set((state) => ({
          history: {
            past: [...state.history.past.slice(-19), state.segments],
            future: [],
          },
        })),
      
      saveTrackHistory: () =>
        set((state) => ({
          trackHistory: {
            past: [...state.trackHistory.past.slice(-19), state.timelineTracks],
            future: [],
          },
        })),
      
      undo: () =>
        set((state) => {
          if (state.history.past.length === 0) return state;
          const previous = state.history.past[state.history.past.length - 1];
          return {
            segments: previous,
            history: {
              past: state.history.past.slice(0, -1),
              future: [state.segments, ...state.history.future],
            },
          };
        }),
      
      redo: () =>
        set((state) => {
          if (state.history.future.length === 0) return state;
          const next = state.history.future[0];
          return {
            segments: next,
            history: {
              past: [...state.history.past, state.segments],
              future: state.history.future.slice(1),
            },
          };
        }),
      
      undoTrack: () =>
        set((state) => {
          if (state.trackHistory.past.length === 0) return state;
          const previous = state.trackHistory.past[state.trackHistory.past.length - 1];
          return {
            timelineTracks: previous,
            trackHistory: {
              past: state.trackHistory.past.slice(0, -1),
              future: [state.timelineTracks, ...state.trackHistory.future],
            },
          };
        }),
      
      redoTrack: () =>
        set((state) => {
          if (state.trackHistory.future.length === 0) return state;
          const next = state.trackHistory.future[0];
          return {
            timelineTracks: next,
            trackHistory: {
              past: [...state.trackHistory.past, state.timelineTracks],
              future: state.trackHistory.future.slice(1),
            },
          };
        }),
      
      canUndo: () => get().history.past.length > 0,
      canRedo: () => get().history.future.length > 0,
      canUndoTrack: () => get().trackHistory.past.length > 0,
      canRedoTrack: () => get().trackHistory.future.length > 0,
      
      reset: () => set({ ...initialState }),
    }),
    {
      name: 'cutdeck-editor',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        video: state.video,
        zoom: state.zoom,
        volume: state.volume,
      }),
    }
  )
);
