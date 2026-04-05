/**
 * Timeline Types - 多轨道时间线类型定义
 */

/** 轨道类型 */
export type TrackType = 'video' | 'audio' | 'subtitle' | 'effect';

/** 时间线片段 */
export interface TimelineClip {
  id: string;
  trackId: string;
  /** 片段在轨道上的开始时间 (ms) */
  startMs: number;
  /** 片段在轨道上的结束时间 (ms) */
  endMs: number;
  /** 源素材开始时间 (ms) */
  sourceStartMs: number;
  /** 源素材结束时间 (ms) */
  sourceEndMs: number;
  name: string;
  color?: string;
  /** 片段类型 */
  type?: string;
  /** 是否选中 */
  selected?: boolean;
  /** 关键帧 */
  keyframes?: Keyframe[];
}

/** 关键帧 */
export interface Keyframe {
  id: string;
  /** 关键帧在片段内的时间偏移 (ms) */
  timeOffset: number;
  property: string;
  value: number | string | boolean;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

/** 时间线轨道 */
export interface TimelineTrack {
  id: string;
  type: TrackType;
  name: string;
  clips: TimelineClip[];
  muted: boolean;
  locked: boolean;
  visible: boolean;
  /** 轨道高度 (px) */
  height: number;
  /** 轨道颜色 */
  color?: string;
}

/** 时间线状态 */
export interface TimelineState {
  tracks: TimelineTrack[];
  playheadMs: number;
  zoom: number;
  scrollX: number;
  duration: number;
  snapEnabled: boolean;
  snapThreshold: number; // ms
}

/** 拖拽操作类型 */
export type DragType = 'move' | 'start' | 'end';

/** 拖拽状态 */
export interface DragState {
  clipId: string;
  trackId: string;
  type: DragType;
  startX: number;
  originalStartMs: number;
  originalEndMs: number;
}

/** 时间线选择 */
export interface TimelineSelection {
  clipId?: string;
  trackId?: string;
  multipleIds: string[];
  keyframeId?: string;
}

/** 片段属性面板数据 */
export interface ClipProperties {
  clipId: string;
  name: string;
  startMs: number;
  endMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  volume?: number;
  speed?: number;
  opacity?: number;
  color?: string;
  keyframes: Keyframe[];
}

/** 时间线工具 */
export type TimelineTool = 'select' | 'razor' | 'hand';
