import React, { useCallback, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { ScriptSegment } from '@/types';
import styles from './VideoEditor.module.less';

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'narration': return '旁白';
    case 'dialogue': return '对话';
    case 'description': return '描述';
    default: return type;
  }
};

interface SegmentDetailsProps {
  segment: ScriptSegment;
  onPreview: (segment: ScriptSegment) => void;
}

const SegmentDetails: React.FC<SegmentDetailsProps> = ({ segment, onPreview }) => {
  const handlePreview = useCallback(() => {
    onPreview(segment);
  }, [onPreview, segment]);

  return (
    <Card className="mt-2">
      <CardContent className="p-3">
        <div className={`${styles.segmentDetails} flex flex-wrap gap-4 items-center`}>
          <div className="flex gap-1">
            <span className="font-semibold text-sm">时间:</span>
            <span className="text-sm">{formatTime(segment.startTime)} - {formatTime(segment.endTime)}</span>
          </div>
          <div className="flex gap-1">
            <span className="font-semibold text-sm">类型:</span>
            <span className="text-sm">{getTypeLabel(segment.type ?? 'text')}</span>
          </div>
          <div className="flex-1 min-w-[200px]">
            <span className="font-semibold text-sm">内容:</span>
            <span className="text-sm ml-1">{segment.content}</span>
          </div>
          <Button
            size="sm"
            onClick={handlePreview}
            className="shrink-0"
          >
            <Eye size={14} className="mr-1" />
            预览
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(SegmentDetails);
