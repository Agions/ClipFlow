import React, { useCallback, useMemo, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { VideoSegment } from '@/services/video';
import styles from '../index.module.less';

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [
    hrs > 0 ? String(hrs).padStart(2, '0') : null,
    String(mins).padStart(2, '0'),
    String(secs).padStart(2, '0'),
  ].filter(Boolean);

  return parts.join(':');
};

const getSegmentKey = (segment: VideoSegment, index: number): string => {
  return `${index}-${segment.start}-${segment.end}`;
};

interface SegmentItemProps {
  index: number;
  segment: VideoSegment;
  selected: boolean;
  onSelectSegment: (index: number) => void;
  onDeleteSegment: (index: number) => void;
}

const SegmentItem: React.FC<SegmentItemProps> = memo(({
  index,
  segment,
  selected,
  onSelectSegment,
  onDeleteSegment,
}) => {
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteSegment(index);
  }, [index, onDeleteSegment]);

  const handleSelect = useCallback(() => {
    onSelectSegment(index);
  }, [index, onSelectSegment]);

  return (
    <Card
      className={`${styles.segmentCard} ${selected ? styles.selected : ''}`}
      onClick={handleSelect}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-sm">片段 {index + 1}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
          >
            <Trash2 size={14} />
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary">
            {formatTime(segment.start)} - {formatTime(segment.end)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            时长: {formatTime(segment.end - segment.start)}
          </span>
        </div>

        {'content' in segment && (segment.content as string) && (
          <div className={styles.segmentContent}>
            <p className="text-sm truncate">{segment.content as string}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

SegmentItem.displayName = 'SegmentItem';

interface SegmentListProps {
  segments: VideoSegment[];
  selectedIndex: number;
  hasVideo: boolean;
  onSelectSegment: (index: number) => void;
  onDeleteSegment: (index: number) => void;
  onAddSegment: () => void;
}

const SegmentList: React.FC<SegmentListProps> = ({
  segments,
  selectedIndex,
  hasVideo,
  onSelectSegment,
  onDeleteSegment,
  onAddSegment,
}) => {
  const renderedItems = useMemo(() => (
    segments.map((segment, index) => (
      <SegmentItem
        key={getSegmentKey(segment, index)}
        index={index}
        segment={segment}
        selected={selectedIndex === index}
        onSelectSegment={onSelectSegment}
        onDeleteSegment={onDeleteSegment}
      />
    ))
  ), [onDeleteSegment, onSelectSegment, segments, selectedIndex]);

  if (segments.length === 0) {
    return (
      <div className={styles.segmentList}>
        <h5 className={styles.sectionTitle}>片段列表</h5>
        <div className="py-12 text-center text-muted-foreground text-sm">暂无片段</div>
        <Button
          variant="outline"
          onClick={onAddSegment}
          disabled={!hasVideo}
          className={styles.addSegmentButton}
        >
          <Plus size={14} className="mr-1" />
          添加片段
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.segmentList}>
      <h5 className={styles.sectionTitle}>片段列表</h5>
      {renderedItems}

      <Button
        variant="outline"
        onClick={onAddSegment}
        disabled={!hasVideo}
        className={styles.addSegmentButton}
      >
        <Plus size={14} className="mr-1" />
        添加片段
      </Button>
    </div>
  );
};

export default memo(SegmentList);
