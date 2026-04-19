import React, { memo } from 'react';
import type { TimelineTrack, TimelineClip, DragType } from './types';
import { TRACK_COLORS } from './constants';
import styles from './Timeline.module.less';

interface ClipRendererProps {
  clip: TimelineClip;
  track: TimelineTrack;
  zoom: number;
  scrollX: number;
  duration: number;
  selectedClipId?: string;
  onClipClick: (clipId: string, trackId: string, e: React.MouseEvent) => void;
  onClipDoubleClick: (clip: TimelineClip) => void;
  onDragStart: (clipId: string, trackId: string, type: DragType, e: React.MouseEvent) => void;
}

export const ClipRenderer = memo<ClipRendererProps>(({
  clip,
  track,
  zoom,
  scrollX,
  duration,
  selectedClipId,
  onClipClick,
  onClipDoubleClick,
  onDragStart,
}) => {
  const msPerPixel = 1000 / zoom;
  const clipLeft = clip.startMs / msPerPixel - scrollX;
  const clipWidth = Math.max(4, (clip.endMs - clip.startMs) / msPerPixel);
  const color = clip.color || TRACK_COLORS[track.type] || '#1890ff';
  const isSelected = selectedClipId === clip.id;

  return (
    <div
      className={`${styles.clip} ${isSelected ? styles.selected : ''} ${track.locked ? styles.locked : ''}`}
      style={{
        left: clipLeft,
        width: clipWidth,
        backgroundColor: color,
        top: 4,
        height: track.height - 8,
      }}
      onClick={(e) => onClipClick(clip.id, track.id, e)}
      onDoubleClick={() => onClipDoubleClick(clip)}
      onMouseDown={(e) => {
        if (track.locked || e.button !== 0) return;
        onDragStart(clip.id, track.id, 'move', e);
      }}
    >
      <div
        className={styles.clipHandleLeft}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (!track.locked) onDragStart(clip.id, track.id, 'start', e);
        }}
      />
      <div className={styles.clipContent}>
        <span className={styles.clipName}>{clip.name}</span>
        {clip.keyframes && clip.keyframes.length > 0 && (
          <div className={styles.keyframeIndicators}>
            {clip.keyframes.map((kf) => (
              <div
                key={kf.id}
                className={styles.keyframeDot}
                style={{ left: `${(kf.timeOffset / Math.max(1, clip.endMs - clip.startMs)) * 100}%` }}
              />
            ))}
          </div>
        )}
      </div>
      <div
        className={styles.clipHandleRight}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (!track.locked) onDragStart(clip.id, track.id, 'end', e);
        }}
      />
    </div>
  );
});
ClipRenderer.displayName = 'ClipRenderer';
