import React, { memo } from 'react';
import { clamp } from './utils';
import styles from './Timeline.module.less';

interface PlayheadProps {
  playheadMs: number;
  zoom: number;
  scrollX: number;
  height: number;
  onSeek: (ms: number) => void;
}

export const Playhead = memo<PlayheadProps>(({ playheadMs, zoom, scrollX, height, onSeek }) => {
  const msPerPixel = 1000 / zoom;
  const x = playheadMs / msPerPixel - scrollX;

  return (
    <div
      className={styles.playhead}
      style={{ left: x, height }}
      onMouseDown={(e) => {
        e.preventDefault();
        const container = e.currentTarget.parentElement;
        if (!container) return;
        const rect = container.getBoundingClientRect();

        const handleMouseMove = (moveEvent: MouseEvent) => {
          const newX = moveEvent.clientX - rect.left + scrollX;
          const newMs = clamp(newX * msPerPixel, 0, Infinity);
          onSeek(newMs);
        };

        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }}
    >
      <div className={styles.playheadHead} />
      <div className={styles.playheadLine} />
    </div>
  );
});
Playhead.displayName = 'Playhead';
