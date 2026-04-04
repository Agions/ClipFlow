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
  
  // 视频片段
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
  
  // 历史记录 (撤销/重做)
  history: EditorHistory;

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
  
  // Actions - 历史记录
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
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
  history: {
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
      
      // 历史记录
      saveHistory: () =>
        set((state) => ({
          history: {
            past: [...state.history.past.slice(-19), state.segments],
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
      
      canUndo: () => get().history.past.length > 0,
      canRedo: () => get().history.future.length > 0,
      
      reset: () => set(initialState),
    }),
    {
      name: 'storyforge-editor',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        video: state.video,
        zoom: state.zoom,
        volume: state.volume,
      }),
    }
  )
);
