import React, { useRef, useCallback, memo } from 'react';
import { Button, Progress, Typography, Tooltip } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  FullscreenOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import styles from '../index.module.less';

const { Text } = Typography;

interface VideoPlayerProps {
  videoSrc: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
  onLoadVideo: () => void;
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

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoSrc,
  currentTime,
  duration,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  onPlayStateChange,
  onLoadVideo,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSyncedTimeRef = useRef(0);

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }

    onPlayStateChange(!isPlaying);
  }, [isPlaying, onPlayStateChange]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const nextTime = videoRef.current.currentTime;
    // 控制时间轴更新频率，降低播放期间的高频重渲染压力
    if (Math.abs(nextTime - lastSyncedTimeRef.current) < 0.08) return;
    lastSyncedTimeRef.current = nextTime;
    onTimeUpdate(nextTime);
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    onDurationChange(videoRef.current.duration);
  }, [onDurationChange]);

  if (!videoSrc) {
    return (
      <div className={styles.emptyPlayer} role="region" aria-label="视频加载区域">
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={onLoadVideo}
          size="large"
          aria-label="加载视频文件"
        >
          加载视频
        </Button>
        <Text type="secondary" style={{ marginTop: 16 }}>
          支持MP4, MOV, AVI, MKV等格式
        </Text>
      </div>
    );
  }

  return (
    <div className={styles.playerWrapper} role="region" aria-label="视频播放器">
      <video
        ref={videoRef}
        src={videoSrc}
        className={styles.videoPlayer}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={togglePlayPause}
        aria-label="视频播放区域"
      />

      <div className={styles.playerControls} role="toolbar" aria-label="播放控制">
        <Button
          type="text"
          icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={togglePlayPause}
          size="large"
          aria-label={isPlaying ? "暂停" : "播放"}
        />

        <div className={styles.timeDisplay} aria-live="polite">
          <Text>{formatTime(currentTime)} / {formatTime(duration)}</Text>
        </div>

        <div className={styles.progressBar} role="slider" aria-label="播放进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((currentTime / Math.max(duration, 1)) * 100)}>
          <Progress
            percent={(currentTime / Math.max(duration, 1)) * 100}
            showInfo={false}
            strokeColor="#1E88E5"
            trailColor="#e6e6e6"
          />
        </div>

        <Tooltip title="全屏">
          <Button
            type="text"
            icon={<FullscreenOutlined />}
            aria-label="全屏"
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default memo(VideoPlayer);
