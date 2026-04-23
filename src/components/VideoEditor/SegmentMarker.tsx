import React, { useCallback, memo } from 'react';

import { ScriptSegment } from '@/types';
import styles from './VideoEditor.module.less';

interface SegmentStyleProps {
  left: string;
  width: string;
  color: string;
}

interface SegmentMarkerProps {
  segment: ScriptSegment;
  index: number;
  style: SegmentStyleProps;
  duration: number;
  onClick: (segment: ScriptSegment) => void;
  onDragStart: (segmentId: string, type: 'move' | 'start' | 'end', e: React.MouseEvent) => void;
}

// 格式化时间
const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SegmentMarker: React.FC<SegmentMarkerProps> = ({
  segment,
  index,
  style,
  onClick,
  onDragStart,
}) => {
  const { left, width, color } = style;

  const handleClick = useCallback(() => {
    onClick(segment);
  }, [onClick, segment]);

  const handleStartDrag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDragStart(segment.id, 'start', e);
  }, [onDragStart, segment.id]);

  const handleMoveDrag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDragStart(segment.id, 'move', e);
  }, [onDragStart, segment.id]);

  const handleEndDrag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDragStart(segment.id, 'end', e);
  }, [onDragStart, segment.id]);

  return (
    <Tooltip
      title={`${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}: ${(segment.content ?? '').substring(0, 50)}${(segment.content ?? '').length > 50 ? '...' : ''}`}
    >
      <div
        className={styles.segmentMarker}
        style={{ left, width, backgroundColor: color }}
        onClick={handleClick}
      >
        <div
          className={styles.segmentResizeHandle}
          style={{ left: 0 }}
          onMouseDown={handleStartDrag}
        />

        <div
          className={styles.segmentContent}
          onMouseDown={handleMoveDrag}
        >
          {index + 1}
        </div>

        <div
          className={styles.segmentResizeHandle}
          style={{ right: 0 }}
          onMouseDown={handleEndDrag}
        />
      </div>
    </Tooltip>
  );
};

export default memo(SegmentMarker);
