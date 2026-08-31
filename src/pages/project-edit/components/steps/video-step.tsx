/**
 * VideoStep — 选择视频步骤
 */
import React from 'react';
import { Video, ArrowRight } from 'lucide-react';
import VideoSelector from '@/components/video-selector/video-selector';
import type { VideoMetadata } from '@/core/video';
import styles from '@/pages/project-edit/index.module.less';

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
  <div className={styles.stepCard}>
    <div className={styles.stepCardHeader}>
      <div className={styles.stepCardTitle}>
        <Video size={16} className="text-purple-400" />
        <span>1. 导入待剪辑影视原片</span>
      </div>
      <p className={styles.stepCardDesc}>
        支持 MP4、MOV、AVI、MKV、WEBM 等常见 4K/1080P 影视格式，导入后将自动提取元数据与音频流。
      </p>
    </div>

    <VideoSelector
      initialVideoPath={videoPath}
      onVideoSelect={onVideoSelect}
      onVideoRemove={onVideoRemove}
      loading={loading}
    />

    <div className={styles.stepBottomActions}>
      <button
        className={styles.nextStepBtn}
        onClick={onNext}
        disabled={!videoSelected || loading}
      >
        <span>下一步：启动 AI 智能拆条与分析</span>
        <ArrowRight size={14} />
      </button>
    </div>
  </div>
);
