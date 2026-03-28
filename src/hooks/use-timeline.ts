/**
 * 时间线相关自定义 Hooks
 */

import { useCallback } from 'react';
import { useEditorStore, type TimelineSelection } from '@/store/editorStore';
import type { VideoSegment } from '@/core/types';

/**
 * 时间线 Hook
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
    // 数据
    segments,
    selection,
    zoom,
    scrollPosition,

    // 片段操作
    addSegment,
    updateSegment,
    deleteSegment,
    reorderSegments,
    clearSegments,

    // 选择
    setSelection,
    clearSelection,

    // 视图
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
  const {
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorStore();

  return {
    undo,
    redo,
    canUndo: canUndo(),
    canRedo: canRedo(),
  };
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

  return {
    selection,
    selectSegment,
    addToSelection,
    removeFromSelection,
    isSelected,
    clearSelection,
  };
}

/**
 * 缩放控制 Hook
 */
export function useZoom() {
  const { zoom, setZoom } = useEditorStore();

  const zoomIn = useCallback(() => {
    setZoom(Math.min(10, zoom * 1.2));
  }, [zoom, setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(Math.max(0.1, zoom / 1.2));
  }, [zoom, setZoom]);

  const resetZoom = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  return {
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
