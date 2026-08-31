import React, { useRef, memo } from 'react';
import { ScriptSegment } from '@/types';
import SegmentMarker from './segment-marker';
import styles from '././video-editor.module.less';

interface TimelineProps {
  segments: ScriptSegment[];
  duration: number;
  onSegmentClick: (segment: ScriptSegment) => void;
  onDragStart: (segmentId: string, type: 'move' | 'start' | 'end', e: React.MouseEvent) => void;
}

interface SegmentStyleProps {
  left: string;
  width: string;
  color: string;
}

// 计算片段样式
const getSegmentStyle = (segment: ScriptSegment, duration: number): SegmentStyleProps => {
  const left = `${(segment.startTime / duration) * 100}%`;
  const width = `${((segment.endTime - segment.startTime) / duration) * 100}%`;

  // 根据片段类型设置颜色（使用 DESIGN.md §2.1.6 timeline 专属 token）
  let color = 'var(--timeline-video)'; // 默认为 video 蓝（旁白）
  if (segment.type === 'dialogue') {
    color = 'var(--accent-success)'; // 对话为绿色
  } else if (segment.type === 'description') {
    color = 'var(--timeline-subtitle)'; // 描述为琥珀
  }

  return { left, width, color };
};

const Timeline: React.FC<TimelineProps> = ({ segments, duration, onSegmentClick, onDragStart }) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.timelineContainer} ref={timelineRef}>
      {segments.map((segment, index) => (
        <SegmentMarker
          key={segment.id}
          segment={segment}
          index={index}
          style={getSegmentStyle(segment, duration)}
          duration={duration}
          onClick={onSegmentClick}
          onDragStart={onDragStart}
        />
      ))}
    </div>
  );
};

export default memo(Timeline);
