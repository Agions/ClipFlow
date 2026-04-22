/**
 * TimelineClip — 单个片段方块
 * 渲染为圆角矩形，左侧带颜色边框
 * 宽度 = (endTime - startTime) * pixelsPerSecond
 * 支持拖拽，文字截断显示
 */
import React, { memo, useCallback } from 'react';

export interface ClipData {
  id: string;
  startTime: number;  // 秒
  endTime: number;     // 秒
  label: string;
  color?: string;
}

interface TimelineClipProps {
  clip: ClipData;
  pixelsPerSecond: number;
  trackType: 'video' | 'audio' | 'subtitle';
  isSelected: boolean;
  onClick: (clipId: string, e: React.MouseEvent) => void;
  onDragStart: (clipId: string, e: React.PointerEvent, edge?: 'start' | 'end') => void;
}

const TRACK_COLORS = {
  video: 'var(--timeline-video, #8b5cf6)',
  audio: 'var(--timeline-audio, #06b6d4)',
  subtitle: 'var(--timeline-subtitle, #f59e0b)',
};

export const TimelineClip = memo<TimelineClipProps>(({
  clip,
  pixelsPerSecond,
  trackType,
  isSelected,
  onClick,
  onDragStart,
}) => {
  const width = Math.max(4, (clip.endTime - clip.startTime) * pixelsPerSecond);
  const baseColor = clip.color || TRACK_COLORS[trackType] || '#8b5cf6';

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(clip.id, e);
  }, [clip.id, onClick]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    onDragStart(clip.id, e);
  }, [clip.id, onDragStart]);

  const handleEdgePointerDown = useCallback((e: React.PointerEvent, edge: 'start' | 'end') => {
    e.stopPropagation();
    onDragStart(clip.id, e, edge);
  }, [clip.id, onDragStart]);

  return (
    <div
      className={`
        absolute top-1 rounded flex items-center overflow-hidden cursor-pointer
        transition-shadow duration-150
        ${isSelected ? 'ring-2 ring-accent-primary z-10' : 'z-[1]'}
      `}
      style={{
        left: clip.startTime * pixelsPerSecond,
        width,
        height: 'calc(100% - 8px)',
        backgroundColor: `${baseColor}22`,
        borderLeft: `3px solid ${baseColor}`,
      }}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
    >
      {/* Resize handles */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 hover:opacity-100 hover:bg-white/20 transition-opacity"
        onPointerDown={(e) => handleEdgePointerDown(e, 'start')}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 hover:opacity-100 hover:bg-white/20 transition-opacity"
        onPointerDown={(e) => handleEdgePointerDown(e, 'end')}
      />

      {/* Label */}
      <span
        className="px-2 text-[11px] text-text-primary truncate select-none"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}
      >
        {clip.label}
      </span>
    </div>
  );
});

TimelineClip.displayName = 'TimelineClip';
