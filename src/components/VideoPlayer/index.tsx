import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  Volume2,
  Maximize,
} from 'lucide-react';
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

  const handleSliderChange = (value: number | readonly number[]) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    const val = Array.isArray(value) ? value[0] : value;
    videoElement.currentTime = val;
    setCurrentTime(val);
  };

  const handleVolumeChange = (value: number | readonly number[]) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    const val = Array.isArray(value) ? value[0] : value;
    videoElement.volume = val;
    setVolume(val);
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
            <PlayCircle />
          </div>
        )}
      </div>
      <div className={styles.controls}>
        <div className={styles.progressBar}>
          <Slider
            min={0}
            max={duration}
            value={currentTime}
            onValueChange={handleSliderChange}
          />
        </div>
        <div className={styles.controlButtons}>
          <div>
            <Button variant="ghost" className={styles.controlButton} onClick={togglePlay}>
              {isPlaying ? <PauseCircle /> : <PlayCircle />}
            </Button>
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
              <Button variant="ghost" className={styles.controlButton}>
                <Volume2 />
              </Button>
              {showVolumeSlider && (
                <div className={styles.volumeSlider}>
                  <Slider
                    className="vertical-slider"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onValueChange={handleVolumeChange}
                  />
                </div>
              )}
            </div>
            <Button variant="ghost" className={styles.controlButton} onClick={toggleFullscreen}>
              <Maximize />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer; 