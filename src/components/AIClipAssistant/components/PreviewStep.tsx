import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RotateCcw,
  Download,
  Clock,
} from 'lucide-react';
import type { ClipSegment } from '@/core/services/aiClip.service';
import type { VideoInfo } from '@/core/types';
import styles from '../index.module.less';

interface PreviewStepProps {
  videoInfo: VideoInfo;
  previewSegments: ClipSegment[];
  onReset: () => void;
}

const Statistic: React.FC<{ title: string; value: string | number }> = ({
  title,
  value
}) => (
  <div className={styles.statistic}>
    <div className={styles.statisticValue}>{value}</div>
    <div className={styles.statisticTitle}>{title}</div>
  </div>
);

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PreviewStep: React.FC<PreviewStepProps> = ({
  videoInfo,
  previewSegments,
  onReset
}) => {
  if (previewSegments.length === 0) {
    return (
      <Card className={styles.previewCard + ' p-6'}>
        <div className="text-center text-muted-foreground py-8">暂无预览内容，请先应用建议</div>
      </Card>
    );
  }

  const totalDuration = previewSegments.reduce((sum, s) => sum + s.duration, 0);

  return (
    <Card className={styles.previewCard + ' p-6'}>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Statistic title="原始时长" value={`${Math.round(videoInfo.duration)}秒`} />
        <Statistic title="剪辑后时长" value={`${Math.round(totalDuration)}秒`} />
        <Statistic title="片段数量" value={previewSegments.length} />
      </div>

      <div className="border-t border-border my-4" />

      <h3 className="text-lg font-semibold mb-4">剪辑片段预览</h3>
      <div className={styles.segmentsPreview}>
        {previewSegments.map((segment, index) => (
          <Card
            key={segment.id}
            className={styles.segmentCard}
            title={
              <div className="flex items-center gap-2">
                <span className="font-semibold">片段 {index + 1}</span>
                <Badge variant={segment.type === 'silence' ? 'destructive' : 'default'}>
                  {segment.type === 'silence' ? '静音' : '视频'}
                </Badge>
              </div>
            }
          >
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <Clock size={12} /> {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
            </div>
            <div className="text-sm">时长: {segment.duration.toFixed(1)}秒</div>
            {segment.thumbnail && (
              <img
                src={segment.thumbnail}
                alt={`片段 ${index + 1}`}
                className={styles.segmentThumbnail + ' mt-2'}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            )}
          </Card>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onReset}>
          <RotateCcw size={16} className="mr-1" />
          重新配置
        </Button>
        <Button className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white">
          <Download size={16} className="mr-1" />
          导出剪辑方案
        </Button>
      </div>
    </Card>
  );
};

export default PreviewStep;
