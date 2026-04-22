import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Slider, Space, Row, Col, Radio, InputNumber, Statistic, Card } from 'antd';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StepBackwardOutlined, 
  StepForwardOutlined,
  
  SoundOutlined,
  SettingOutlined,
  ForwardOutlined,
  BackwardOutlined,
  ExpandOutlined,
  CompressOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import styles from './EnhancedVideoPlayer.module.less';

interface EnhancedVideoPlayerProps {
  src: string;
  initialTime?: number;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  width?: string | number;
  height?: string | number;
  autoPlay?: boolean;
  showControls?: boolean;
  allowFrameControl?: boolean;
  allowSpeedControl?: boolean;
  className?: string;
}

/**
 * 增强版视频播放器组件，提供帧级控制、速度调整、截图等高级功能
 */
const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({
  src,
  initialTime = 0,
  onTimeUpdate,
  onDurationChange,
  width = '100%',
  height = 'auto',
  autoPlay = false,
  showControls = true,
  allowFrameControl = true,
  allowSpeedControl = true,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [frameRate, setFrameRate] = useState(24); // 默认帧率，可以通过视频元数据获取
  const [videoMetadata, setVideoMetadata] = useState<{
    width: number;
    height: number;
    aspectRatio: string;
  }>({ width: 0, height: 0, aspectRatio: '16:9' });

  // 初始化播放器
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const video = videoRef.current; // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!video) return;

    // 设置初始时间
    video.currentTime = initialTime;
    
    // 监听视频元数据加载
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (onDurationChange) {
        onDurationChange(video.duration);
      }
      
      // 获取视频尺寸和宽高比
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const aspectRatio = `${videoWidth}:${videoHeight}`;
      setVideoMetadata({
        width: videoWidth,
        height: videoHeight,
        aspectRatio: aspectRatio
      });
      
      // 尝试检测视频帧率（实际上浏览器API不直接提供帧率信息）
      // 这里使用一个估计值，更准确的帧率需要通过后端获取
      estimateFrameRate(video);
    };
    
    // 监听时间更新事件
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (onTimeUpdate) {
        onTimeUpdate(video.currentTime);
      }
    };
    
    // 监听播放状态变化
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    
    // 绑定事件监听
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    
    // 自动播放（如果设置为true）
    if (autoPlay) {
      video.play().catch(_err => {
        logger.warn('自动播放失败，可能是浏览器策略限制');
      });
    }
    
    // 清理事件监听
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [src, initialTime, onTimeUpdate, onDurationChange, autoPlay]);

  // 估计视频帧率的函数
  const estimateFrameRate = (video: HTMLVideoElement) => {
    // 实际上浏览器不提供直接获取帧率的API
    // 这里设置一个合理的默认值，实际项目中应该从后端获取
    setFrameRate(24);
  };

  // 播放/暂停切换
  const togglePlay = useCallback(() => {
    const video = videoRef.current; // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(_err => {
        logger.error('播放失败');
      });
    }
  }, [isPlaying]);

  // 调整进度
  const handleSeek = useCallback((value: number) => {
    const video = videoRef.current; // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!video) return;
    
    video.currentTime = value;
    setCurrentTime(value);
    
    if (onTimeUpdate) {
      onTimeUpdate(value);
    }
  }, [onTimeUpdate]);

  // 调整音量
  const handleVolumeChange = useCallback((value: number) => {
    const video = videoRef.current; // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!video) return;
    
    setVolume(value);
    video.volume = value;
    
    if (value === 0) {
      setIsMuted(true);
      video.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      video.muted = false;
    }
  }, [isMuted]);

  // 静音切换
  const toggleMute = useCallback(() => {
    const video = videoRef.current; // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!video) return;
    
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    video.muted = newMutedState;
  }, [isMuted]);

  // 调整播放速度
  const handleRateChange = useCallback((value: number) => {
    const video = videoRef.current; // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!video) return;
    
    setPlaybackRate(value);
    video.playbackRate = value;
  }, []);

  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(_err => logger.error('全屏失败'));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(_err => logger.error('退出全屏失败'));
      }
    }
  }, [isFullscreen]);
  
  // 进入/退出全屏时更新状态
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 帧级控制：前进一帧
  const stepForward = useCallback(() => {
    const video = videoRef.current; // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!video) return;
    
    // 暂停视频
    video.pause();
    setIsPlaying(false);
    
    // 计算一帧的时长（秒）
    const frameDuration = 1 / frameRate;
    
    // 前进一帧
    video.currentTime = Math.min(video.duration, video.currentTime + frameDuration);
  }, [frameRate]);

  // 帧级控制：后退一帧
  const stepBackward = useCallback(() => {
    const video = videoRef.current; // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!video) return;
    
    // 暂停视频
    video.pause();
    setIsPlaying(false);
    
    // 计算一帧的时长（秒）
    const frameDuration = 1 / frameRate;
    
    // 后退一帧
    video.currentTime = Math.max(0, video.currentTime - frameDuration);
  }, [frameRate]);

  // 快进5秒
  const fastForward = useCallback(() => {
    const video = videoRef.current; // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!video) return;
    video.currentTime = Math.min(video.duration, video.currentTime + 5);
  }, []);

  // 快退5秒
  const fastBackward = useCallback(() => {
    const video = videoRef.current; // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 5);
  }, []);

  // 截取当前帧
  const captureFrame = useCallback(() => {
    const video = videoRef.current; // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!video) return;
    
    // 创建一个canvas元素
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // 绘制当前视频帧到canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      // 将canvas内容转换为data URL
      const dataURL = canvas.toDataURL('image/png');
      
      // 创建下载链接
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `frame_${Math.floor(video.currentTime)}.png`;
      link.click();
    } catch (e) {
      logger.error('截图失败');
    }
  }, []);

  // 格式化时间显示
  const formatTime = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (hrs > 0) {
      parts.push(hrs.toString().padStart(2, '0'));
    }
    
    parts.push(mins.toString().padStart(2, '0'));
    parts.push(secs.toString().padStart(2, '0'));
    
    return parts.join(':');
  }, []);

  return (
    <div 
      className={`${styles.playerContainer} ${className}`} 
      ref={containerRef}
      style={{ width, height }}
    >
      <div className={styles.videoWrapper}>
        <video 
          ref={videoRef}
          src={src}
          className={styles.video}
          onClick={togglePlay}
          preload="metadata"
        />
        
        {/* 中央播放/暂停按钮 */}
        <div 
          className={`${styles.centerPlayButton} ${isPlaying ? styles.playing : ''}`}
          onClick={togglePlay}
        >
          {isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
        </div>
        
        {/* 控制面板 */}
        {showControls && (
          <div className={styles.controls}>
            <div className={styles.progressBar}>
              <Slider
                value={currentTime}
                min={0}
                max={duration}
                step={0.01}
                onChange={handleSeek}
                tooltip={{ formatter: (val) => formatTime(val || 0) }}
              />
            </div>
            
            <div className={styles.controlButtons}>
              <div className={styles.leftControls}>
                <Button 
                  variant="ghost" 
                  size="icon-sm" 
                  onClick={togglePlay}
                  className={styles.controlButton}
                >
                  {isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                </Button>
                
                <div 
                  className={styles.volumeControl}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <Button 
                    variant="ghost" 
                    size="icon-sm" 
                    onClick={toggleMute}
                    className={styles.controlButton}
                  >
                    <SoundOutlined />
                  </Button>
                  {showVolumeSlider && (
                    <div className={styles.volumeSlider}>
                      <Slider
                        vertical
                        value={isMuted ? 0 : volume}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={handleVolumeChange}
                      />
                    </div>
                  )}
                </div>
                
                <span className={styles.timeDisplay}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              
              <div className={styles.rightControls}>
                <Button 
                  variant="ghost" 
                  size="icon-sm" 
                  onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                  className={styles.controlButton}
                >
                  <SettingOutlined />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon-sm" 
                  onClick={toggleFullscreen}
                  className={styles.controlButton}
                >
                  {isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
                </Button>
              </div>
            </div>
            
            {/* 高级控制面板 */}
            {showAdvancedControls && (
              <div className={styles.advancedControls}>
                <Row gutter={[16, 16]}>
                  {allowFrameControl && (
                    <Col span={12}>
                      <Card title="帧控制" className={styles.controlCard}>
                        <Space>
                          <Button variant="outline" size="sm"
                            onClick={stepBackward}
                          >
                            <StepBackwardOutlined />
                            上一帧
                          </Button>
                          <Button variant="outline" size="sm"
                            onClick={fastBackward}
                          >
                            <BackwardOutlined />
                            -5秒
                          </Button>
                          <Button variant="outline" size="sm"
                            onClick={fastForward}
                          >
                            <ForwardOutlined />
                            +5秒
                          </Button>
                          <Button variant="outline" size="sm"
                            onClick={stepForward}
                          >
                            <StepForwardOutlined />
                            下一帧
                          </Button>
                          <Button variant="outline" size="sm"
                            onClick={captureFrame}
                          >
                            <CameraOutlined />
                            截图
                          </Button>
                        </Space>
                      </Card>
                    </Col>
                  )}
                  
                  {allowSpeedControl && (
                    <Col span={12}>
                      <Card title="速度控制" className={styles.controlCard}>
                        <Radio.Group 
                          value={playbackRate} 
                          onChange={(e) => handleRateChange(e.target.value)}
                          buttonStyle="solid"
                         
                        >
                          <Radio.Button value={0.5}>0.5x</Radio.Button>
                          <Radio.Button value={1}>1.0x</Radio.Button>
                          <Radio.Button value={1.5}>1.5x</Radio.Button>
                          <Radio.Button value={2}>2.0x</Radio.Button>
                        </Radio.Group>
                        
                        <Row style={{ marginTop: 8 }}>
                          <Col span={16}>
                            <Slider
                              min={0.25}
                              max={2}
                              step={0.05}
                              value={playbackRate}
                              onChange={handleRateChange}
                            />
                          </Col>
                          <Col span={8}>
                            <InputNumber
                              min={0.25}
                              max={2}
                              step={0.05}
                              value={playbackRate}
                              onChange={(val) => val && handleRateChange(val)}
                              style={{ marginLeft: 8, width: 60 }}
                             
                            />
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  )}
                </Row>
                
                <Row style={{ marginTop: 8 }}>
                  <Col span={24}>
                    <Card title="视频信息" className={styles.controlCard}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Statistic 
                            title="分辨率" 
                            value={`${videoMetadata.width}x${videoMetadata.height}`} 
                            valueStyle={{ fontSize: '14px' }}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic 
                            title="宽高比" 
                            value={videoMetadata.aspectRatio}
                            valueStyle={{ fontSize: '14px' }}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic 
                            title="时长" 
                            value={formatTime(duration)}
                            valueStyle={{ fontSize: '14px' }}
                          />
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                </Row>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(EnhancedVideoPlayer); 