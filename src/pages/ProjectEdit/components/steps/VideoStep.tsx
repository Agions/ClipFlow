/**
 * VideoStep — 选择视频步骤
 */
import React from 'react';
import { Card } from '@/components/ui/card';
import { Video, FileVideo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import VideoSelector from '@/components/VideoSelector';
import type { VideoMetadata } from '@/services/video';
import styles from '../../index.module.less';

interface VideoStepProps {
  videoPath: string;
  videoSelected: boolean;
  loading: boolean;
  onVideoSelect: (path: string, metadata?: VideoMetadata) => void;
  onVideoRemove: () => void;
  onNext: () => void;
}

export const VideoStep: React.FC<VideoStepProps> = ({
  videoPath,
  videoSelected,
  loading,
  onVideoSelect,
  onVideoRemove,
  onNext,
}) => (
  <Card className={styles.stepCard}>
    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Video size={18} /> 选择视频</h3>
    <p className="text-sm text-muted-foreground mb-4">请选择要编辑的视频文件，支持 MP4、MOV、AVI 等常见格式。</p>
    <VideoSelector
      initialVideoPath={videoPath}
      onVideoSelect={onVideoSelect}
      onVideoRemove={onVideoRemove}
      loading={loading}
    />
    <div className={cn(styles.stepActions, 'flex items-center gap-2')}>
      <Button className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white" onClick={onNext} disabled={!videoSelected}>下一步</Button>
    </div>
  </Card>
);
