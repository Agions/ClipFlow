import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Slider, Button } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import styles from './index.module.less';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  width?: number | string;
  height?: number | string;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
}

function VideoPlayer({
  src,
  poster,
  autoPlay = false,
  width = '100%',
  height = 'auto',
  onTimeUpdate,
  onEnded,
}: VideoPlayerProps): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
      onTimeUpdate?.(videoElement.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(videoElement.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('durationchange', handleDurationChange);
    videoElement.addEventListener('ended', handleEnded);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('durationchange', handleDurationChange);
      videoElement.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onEnded]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if focus is inside an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;

      const video = videoRef.current;
      if (!video) return;

      const SEEK_STEP = 5;   // seconds for arrow keys
      const SEEK_LONG = 10;  // seconds for J/L keys

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - SEEK_STEP);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + SEEK_STEP);
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - SEEK_LONG);
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + SEEK_LONG);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          video.muted = !video.muted;
          setVolume(video.muted ? 0 : video.volume);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'ArrowUp':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          setVolume(video.volume);
          break;
        case 'ArrowDown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          setVolume(video.volume);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const togglePlay = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isPlaying) {
      videoElement.pause();
    } else {
      videoElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (value: number) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.currentTime = value;
    setCurrentTime(value);
  };

  const handleVolumeChange = (value: number) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.volume = value;
    setVolume(value);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className={styles.videoPlayerContainer} ref={containerRef}>
      <div className={styles.videoWrapper}>
        <video
          ref={videoRef}
          className={styles.videoElement}
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          width={width}
          height={height}
          onClick={togglePlay}
        />
        {!isPlaying && (
          <div className={styles.centerPlayButton} onClick={togglePlay}>
            <PlayCircleOutlined />
          </div>
        )}
      </div>
      <div className={styles.controls}>
        <div className={styles.progressBar}>
          <Slider
            min={0}
            max={duration}
            value={currentTime}
            onChange={handleSliderChange}
            tooltip={{ visible: false }}
          />
        </div>
        <div className={styles.controlButtons}>
          <div>
            <Button
              type="text"
              className={styles.controlButton}
              onClick={togglePlay}
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            />
            <span className={styles.timeDisplay}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className={styles.rightControls}>
            <div
              className={styles.volumeControl}
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <Button
                type="text"
                className={styles.controlButton}
                icon={<SoundOutlined />}
              />
              {showVolumeSlider && (
                <div className={styles.volumeSlider}>
                  <Slider
                    vertical
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={handleVolumeChange}
                    tooltip={{ visible: false }}
                  />
                </div>
              )}
            </div>
            <Button
              type="text"
              className={styles.controlButton}
              onClick={toggleFullscreen}
              icon={<FullscreenOutlined />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer; 