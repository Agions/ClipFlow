/**
 * use-timeline.ts - 时间线 Hook
 * 包含单轨和多轨时间线操作
 */
import { useCallback, useRef, useState } from 'react';
import { useEditorStore, type TimelineSelection } from '@/store/editorStore';
import type { VideoSegment } from '@/core/types';
import type { TimelineTrack, TimelineClip, Keyframe, DragType } from '@/components/Timeline/types';

// ============================================
// 现有单轨 Hooks (保持向后兼容)
// ============================================

/**
 * 时间线 Hook (单轨)
 */
export function useTimeline() {
  const {
    segments,
    selection,
    zoom,
    scrollPosition,
    addSegment,
    updateSegment,
    deleteSegment,
    reorderSegments,
    clearSegments,
    setSelection,
    clearSelection,
    setZoom,
    setScrollPosition,
  } = useEditorStore();

  return {
    segments,
    selection,
    zoom,
    scrollPosition,
    addSegment,
    updateSegment,
    deleteSegment,
    reorderSegments,
    clearSegments,
    setSelection,
    clearSelection,
    setZoom,
    setScrollPosition,
  };
}

/**
 * 播放控制 Hook
 */
export function usePlayback() {
  const {
    previewPlaying,
    currentTime,
    volume,
    muted,
    setPreviewPlaying,
    setCurrentTime,
    setVolume,
    setMuted,
  } = useEditorStore();

  const play = useCallback(() => setPreviewPlaying(true), [setPreviewPlaying]);
  const pause = useCallback(() => setPreviewPlaying(false), [setPreviewPlaying]);
  const togglePlay = useCallback(() => setPreviewPlaying(!previewPlaying), [setPreviewPlaying, previewPlaying]);
  const toggleMute = useCallback(() => setMuted(!muted), [setMuted, muted]);
  const seek = useCallback((time: number) => setCurrentTime(time), [setCurrentTime]);
  const setVideoVolume = useCallback((v: number) => setVolume(v), [setVolume]);

  return {
    playing: previewPlaying,
    currentTime,
    volume,
    muted,
    play,
    pause,
    togglePlay,
    toggleMute,
    seek,
    setVolume: setVideoVolume,
  };
}

/**
 * 撤销/重做 Hook
 */
export function useHistory() {
  const { undo, redo, canUndo, canRedo } = useEditorStore();
  return { undo, redo, canUndo: canUndo(), canRedo: canRedo() };
}

/**
 * 选中片段操作 Hook
 */
export function useSelection() {
  const { selection, setSelection, clearSelection } = useEditorStore();

  const selectSegment = useCallback((segmentId: string) => {
    setSelection({ segmentId });
  }, [setSelection]);

  const addToSelection = useCallback((segmentId: string) => {
    const current = selection.multipleIds || [];
    if (!current.includes(segmentId)) {
      setSelection({ multipleIds: [...current, segmentId] });
    }
  }, [selection, setSelection]);

  const removeFromSelection = useCallback((segmentId: string) => {
    const current = selection.multipleIds || [];
    setSelection({ multipleIds: current.filter(id => id !== segmentId) });
  }, [selection, setSelection]);

  const isSelected = useCallback((segmentId: string) => {
    return selection.segmentId === segmentId ||
           (selection.multipleIds || []).includes(segmentId);
  }, [selection]);

  return { selection, selectSegment, addToSelection, removeFromSelection, isSelected, clearSelection };
}

/**
 * 缩放控制 Hook
 */
export function useZoom() {
  const { zoom, setZoom } = useEditorStore();

  const zoomIn = useCallback(() => setZoom(Math.min(10, zoom * 1.2)), [zoom, setZoom]);
  const zoomOut = useCallback(() => setZoom(Math.max(0.1, zoom / 1.2)), [zoom, setZoom]);
  const resetZoom = useCallback(() => setZoom(1), [setZoom]);

  return { zoom, setZoom, zoomIn, zoomOut, resetZoom };
}

// ============================================
// 多轨道时间线 Hooks
// ============================================

/** 生成唯一 ID */
function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 多轨道时间线状态 Hook
 * 提供多轨道时间线的完整状态管理
 */
export function useMultiTrackTimeline() {
  const {
    zoom,
    scrollPosition,
    setZoom,
    setScrollPosition,
    saveHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorStore();

  // 多轨状态
  const [tracks, setTracks] = useState<TimelineTrack[]>([
    {
      id: 'video-1',
      type: 'video',
      name: '视频轨道 1',
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      height: 60,
    },
    {
      id: 'audio-1',
      type: 'audio',
      name: '音频轨道 1',
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      height: 60,
    },
    {
      id: 'subtitle-1',
      type: 'subtitle',
      name: '字幕轨道 1',
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      height: 50,
    },
  ]);

  const [playheadMs, setPlayheadMs] = useState(0);
  const [duration, setDuration] = useState(60000); // 默认60秒
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [selectedClipId, setSelectedClipId] = useState<string | undefined>();
  const [selectedTrackId, setSelectedTrackId] = useState<string | undefined>();

  // ========== 轨道操作 ==========
  const addTrack = useCallback((type: TimelineTrack['type']) => {
    const trackCount = tracks.filter(t => t.type === type).length;
    const typeNames: Record<string, string> = {
      video: '视频',
      audio: '音频',
      subtitle: '字幕',
      effect: '效果',
    };
    const newTrack: TimelineTrack = {
      id: generateId('track'),
      type,
      name: `${typeNames[type] || type}轨道 ${trackCount + 1}`,
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      height: type === 'subtitle' ? 50 : 60,
    };
    setTracks(prev => [...prev, newTrack]);
    return newTrack.id;
  }, [tracks]);

  const removeTrack = useCallback((trackId: string) => {
    setTracks(prev => prev.filter(t => t.id !== trackId));
  }, []);

  const updateTrackProperty = useCallback((trackId: string, updates: Partial<TimelineTrack>) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, ...updates } : t));
  }, []);

  // ========== 片段操作 ==========
  const addClipToTrack = useCallback((
    trackId: string,
    clip: Omit<TimelineClip, 'id' | 'trackId'>
  ) => {
    const newClip: TimelineClip = {
      ...clip,
      id: generateId('clip'),
      trackId,
    };
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t
    ));
    setSelectedClipId(newClip.id);
    setSelectedTrackId(trackId);
    return newClip.id;
  }, []);

  const removeClipFromTrack = useCallback((clipId: string) => {
    setTracks(prev => prev.map(t => ({
      ...t,
      clips: t.clips.filter(c => c.id !== clipId),
    })));
    if (selectedClipId === clipId) {
      setSelectedClipId(undefined);
      setSelectedTrackId(undefined);
    }
  }, [selectedClipId]);

  const updateClip = useCallback((clipId: string, updates: Partial<TimelineClip>) => {
    setTracks(prev => prev.map(t => ({
      ...t,
      clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c),
    })));
  }, []);

  const moveClip = useCallback((
    clipId: string,
    targetTrackId: string,
    newStartMs: number,
    newEndMs?: number
  ) => {
    setTracks(prev => {
      let clipToMove: TimelineClip | undefined;
      // 从原轨道移除
      const afterRemove = prev.map(t => {
        const clip = t.clips.find(c => c.id === clipId);
        if (clip) {
          clipToMove = { ...clip, trackId: targetTrackId };
          return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
        }
        return t;
      });
      if (!clipToMove) return prev;
      // 添加到目标轨道
      return afterRemove.map(t => {
        if (t.id === targetTrackId) {
          const updatedClip = {
            ...clipToMove!,
            startMs: newStartMs,
            endMs: newEndMs ?? (newStartMs + (clipToMove!.endMs - clipToMove!.startMs)),
          };
          return { ...t, clips: [...t.clips, updatedClip] };
        }
        return t;
      });
    });
  }, []);

  const splitClip = useCallback((clipId: string, splitMs: number) => {
    setTracks(prev => prev.map(t => {
      const clipIndex = t.clips.findIndex(c => c.id === clipId);
      if (clipIndex === -1) return t;
      const clip = t.clips[clipIndex];
      if (splitMs <= clip.startMs || splitMs >= clip.endMs) return t;

      const duration = clip.endMs - clip.startMs;
      const splitOffset = splitMs - clip.startMs;
      const sourceSplit = clip.sourceStartMs + splitOffset;

      const leftClip: TimelineClip = {
        ...clip,
        endMs: splitMs,
        sourceEndMs: sourceSplit,
      };
      const rightClip: TimelineClip = {
        ...clip,
        id: generateId('clip'),
        startMs: splitMs,
        endMs: clip.endMs,
        sourceStartMs: sourceSplit,
      };

      const newClips = [...t.clips];
      newClips.splice(clipIndex, 1, leftClip, rightClip);
      return { ...t, clips: newClips };
    }));
  }, []);

  // ========== 关键帧操作 ==========
  const addKeyframe = useCallback((
    clipId: string,
    keyframe: Omit<Keyframe, 'id'>
  ) => {
    const newKeyframe: Keyframe = { ...keyframe, id: generateId('kf') };
    setTracks(prev => prev.map(t => ({
      ...t,
      clips: t.clips.map(c =>
        c.id === clipId
          ? { ...c, keyframes: [...(c.keyframes || []), newKeyframe] }
          : c
      ),
    })));
    return newKeyframe.id;
  }, []);

  const removeKeyframe = useCallback((clipId: string, keyframeId: string) => {
    setTracks(prev => prev.map(t => ({
      ...t,
      clips: t.clips.map(c =>
        c.id === clipId
          ? { ...c, keyframes: (c.keyframes || []).filter(kf => kf.id !== keyframeId) }
          : c
      ),
    })));
  }, []);

  const updateKeyframe = useCallback((
    clipId: string,
    keyframeId: string,
    updates: Partial<Keyframe>
  ) => {
    setTracks(prev => prev.map(t => ({
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
    })));
  }, []);

  // ========== 选择操作 ==========
  const selectClip = useCallback((clipId?: string, trackId?: string) => {
    setSelectedClipId(clipId);
    setSelectedTrackId(trackId);
  }, []);

  const clearClipSelection = useCallback(() => {
    setSelectedClipId(undefined);
    setSelectedTrackId(undefined);
  }, []);

  // ========== 播放操作 ==========
  const seekPlayhead = useCallback((ms: number) => {
    setPlayheadMs(Math.max(0, Math.min(ms, duration)));
  }, [duration]);

  const setTimelineDuration = useCallback((ms: number) => {
    setDuration(Math.max(0, ms));
  }, []);

  return {
    // 状态
    tracks,
    playheadMs,
    zoom,
    scrollPosition,
    duration,
    snapEnabled,
    selectedClipId,
    selectedTrackId,

    // 轨道操作
    addTrack,
    removeTrack,
    updateTrackProperty,

    // 片段操作
    addClipToTrack,
    removeClipFromTrack,
    updateClip,
    moveClip,
    splitClip,

    // 关键帧操作
    addKeyframe,
    removeKeyframe,
    updateKeyframe,

    // 选择操作
    selectClip,
    clearClipSelection,

    // 播放操作
    seekPlayhead,
    setTimelineDuration,
    setSnapEnabled,

    // 视图操作
    setZoom,
    setScrollPosition,

    // 历史操作
    undo,
    redo,
    canUndo: canUndo(),
    canRedo: canRedo(),

    // 直接更新轨道 (用于组件回调)
    setTracks,
    setPlayheadMs,
  };
}

/**
 * 拖拽状态 Hook
 * 管理时间线片段拖拽的状态
 */
export function useTimelineDrag() {
  const [isDragging, setIsDragging] = useState(false);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [dragTrackId, setDragTrackId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<DragType | null>(null);
  const [dragStartMs, setDragStartMs] = useState(0);
  const [dragEndMs, setDragEndMs] = useState(0);
  const dragStartXRef = useRef(0);
  const msPerPixelRef = useRef(1);

  const startDrag = useCallback((
    clipId: string,
    trackId: string,
    type: DragType,
    startMs: number,
    endMs: number,
    startX: number
  ) => {
    setIsDragging(true);
    setDragClipId(clipId);
    setDragTrackId(trackId);
    setDragType(type);
    setDragStartMs(startMs);
    setDragEndMs(endMs);
    dragStartXRef.current = startX;
  }, []);

  const endDrag = useCallback(() => {
    setIsDragging(false);
    setDragClipId(null);
    setDragTrackId(null);
    setDragType(null);
  }, []);

  return {
    isDragging,
    dragClipId,
    dragTrackId,
    dragType,
    dragStartMs,
    dragEndMs,
    dragStartXRef,
    msPerPixelRef,
    startDrag,
    endDrag,
    setIsDragging,
    setDragClipId,
    setDragTrackId,
    setDragType,
    setDragStartMs,
    setDragEndMs,
  };
}

/**
 * 吸附工具函数
 */
export function useSnap() {
  const snapToBoundary = useCallback((
    ms: number,
    allClips: TimelineClip[],
    thresholdMs: number
  ): number => {
    const points: number[] = [0];
    allClips.forEach(c => {
      points.push(c.startMs, c.endMs);
    });
    for (const point of [...new Set(points)].sort((a, b) => a - b)) {
      if (Math.abs(ms - point) <= thresholdMs) {
        return point;
      }
    }
    return ms;
  }, []);

  return { snapToBoundary };
}
