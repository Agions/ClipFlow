/**
 * VideoStep — 选择视频步骤
 */
import React from 'react';
import { Card, Typography } from 'antd';
const { Title, Paragraph } = Typography;
import { Button } from 'antd';
import { VideoCameraOutlined } from '@ant-design/icons';
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
    <Title level={4}><VideoCameraOutlined /> 选择视频</Title>
    <Paragraph>请选择要编辑的视频文件，支持 MP4、MOV、AVI 等常见格式。</Paragraph>
    <VideoSelector
      initialVideoPath={videoPath}
      onVideoSelect={onVideoSelect}
      onVideoRemove={onVideoRemove}
      loading={loading}
    />
    <div className={styles.stepActions}>
      <Button type="primary" onClick={onNext} disabled={!videoSelected}>下一步</Button>
    </div>
  </Card>
);
