import React, { useCallback, useMemo, memo } from 'react';
import { Card, Typography, Space, Tag, Empty } from 'antd';
import { Button } from '@/components/ui/button';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { VideoSegment } from '@/services/video';
import styles from '../index.module.less';

const { Text, Title } = Typography;

interface SegmentListProps {
  segments: VideoSegment[];
  selectedIndex: number;
  hasVideo: boolean;
  onSelectSegment: (index: number) => void;
  onDeleteSegment: (index: number) => void;
  onAddSegment: () => void;
}

interface SegmentItemProps {
  index: number;
  segment: VideoSegment;
  selected: boolean;
  onSelectSegment: (index: number) => void;
  onDeleteSegment: (index: number) => void;
}

// 格式化时间
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
      <div className={styles.segmentHeader}>
        <Text strong>片段 {index + 1}</Text>
        <Space>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
          >
            <DeleteOutlined />
          </Button>
        </Space>
      </div>

      <div className={styles.segmentTime}>
        <Tag color="blue">
          {formatTime(segment.start)} - {formatTime(segment.end)}
        </Tag>
        <Text type="secondary">
          时长: {formatTime(segment.end - segment.start)}
        </Text>
      </div>

      {'content' in segment && (segment.content as string) && (
        <div className={styles.segmentContent}>
          <Text ellipsis>{segment.content as string}</Text>
        </div>
      )}
    </Card>
  );
});

SegmentItem.displayName = 'SegmentItem';

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
        <Title level={5} className={styles.sectionTitle}>片段列表</Title>
        <Empty description="暂无片段" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        <Button
          variant="outline"
          onClick={onAddSegment}
          disabled={!hasVideo}
          className={styles.addSegmentButton}
        >
          <PlusOutlined className="mr-1" />
          添加片段
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.segmentList}>
      <Title level={5} className={styles.sectionTitle}>片段列表</Title>
      {renderedItems}

      <Button
        variant="outline"
        onClick={onAddSegment}
        disabled={!hasVideo}
        className={styles.addSegmentButton}
      >
        <PlusOutlined className="mr-1" />
        添加片段
      </Button>
    </div>
  );
};

export default memo(SegmentList);
