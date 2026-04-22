/**
 * TimelineTrack — 单个轨道行
 * 支持 video / audio / subtitle 三种轨道类型
 * 左侧带3px颜色边框，背景 bg-tertiary
 */
import React, { memo } from 'react';
import { TimelineClip, type ClipData } from './TimelineClip';

interface TimelineTrackProps {
  trackType: 'video' | 'audio' | 'subtitle';
  trackName: string;
  clips: ClipData[];
  pixelsPerSecond: number;
  selectedClipId?: string;
  onClipClick: (clipId: string, e: React.MouseEvent) => void;
  onClipDragStart: (clipId: string, e: React.PointerEvent, edge?: 'start' | 'end') => void;
}

const TRACK_BORDER_COLORS = {
  video: 'var(--timeline-video, #8b5cf6)',
  audio: 'var(--timeline-audio, #06b6d4)',
  subtitle: 'var(--timeline-subtitle, #f59e0b)',
};

const TRACK_HEIGHTS = {
  video: 64,
  audio: 48,
  subtitle: 40,
};

export const TimelineTrack = memo<TimelineTrackProps>(({
  trackType,
  trackName,
  clips,
  pixelsPerSecond,
  selectedClipId,
  onClipClick,
  onClipDragStart,
}) => {
  const borderColor = TRACK_BORDER_COLORS[trackType] || '#8b5cf6';
  const height = TRACK_HEIGHTS[trackType] || 60;

  return (
    <div
      className="relative flex"
      style={{ height }}
    >
      {/* Track background */}
      <div
        className="flex-1 bg-bg-tertiary border-b border-border-subtle relative"
        style={{ borderLeft: `3px solid ${borderColor}` }}
      >
        {clips.map((clip) => (
          <TimelineClip
            key={clip.id}
            clip={clip}
            pixelsPerSecond={pixelsPerSecond}
            trackType={trackType}
            isSelected={selectedClipId === clip.id}
            onClick={onClipClick}
            onDragStart={onClipDragStart}
          />
        ))}
      </div>
    </div>
  );
});

TimelineTrack.displayName = 'TimelineTrack';
