/**
 * Timeline 组件 - 模块化重构版
 * 
 * 重构自 src/components/editor/Timeline.tsx (1362 行)
 * 拆分为多个子组件以提高可维护性
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Button,
  Space,
  Tooltip,
  Dropdown,
  Switch,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  PartitionOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import styles from './Timeline.module.less';
import { notify } from '@/shared';

// Types, Constants, Utils
import type { TimelineProps, Track, Clip, TrackType, Keyframe, TimelineScale, Transition, ClipProperties, TimelineClip } from './types';
import { isTimelineClip } from './types';
import { TRACK_COLORS, TRANSITION_TYPES } from './constants';
import { generateId, formatTime } from './utils';

// 子组件
import TimelineRuler from './TimelineRuler';
import TimelineTrack from './TimelineTrack';
import TimelineControls, { TimelineTool } from './TimelineControls';
import TimelinePlayhead from './TimelinePlayhead';
import KeyframePanel from './KeyframePanel';

// ==============================================
// Re-export types for external use
// ==============================================
export type { TrackType, Track, Clip, Keyframe } from './types';
export type { TimelineProps } from './types';
export type { TimelineTool } from './TimelineControls';

// ==============================================
// Main Component
// ==============================================

const Timeline: React.FC<TimelineProps> = ({
  currentTime,
  duration,
  tracks: initialTracks,
  onTimeUpdate,
  onPlay,
  onPause,
  onTrackUpdate,
  onClipSelect,
  onClipUpdate
}) => {
  // State
  const [tracks, setTracks] = useState<Track[]>(initialTracks || []);
  const [zoom, setZoom] = useState(100); // 缩放比例
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [copiedClip, setCopiedClip] = useState<TimelineClip | null>(null);
  const [showKeyframePanel, setShowKeyframePanel] = useState(false);
  const [currentTool, setCurrentTool] = useState<TimelineTool>('select');
  const [isPlaying, setIsPlaying] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0); // 用于虚拟化
  const [scrollLeft, setScrollLeft] = useState(0);

  // Refs
  const timelineRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const scrollLeftRef = useRef(0);

  // Computed scale
  const scale: TimelineScale = useMemo(() => ({
    pixelsPerSecond: zoom * 2, // 基准：100% = 200px/s
    pixelsPerFrame: zoom * 2 / 30,
  }), [zoom]);

  const timelineWidth = Math.max(2000, duration * scale.pixelsPerSecond);
  const playheadPosition = currentTime * scale.pixelsPerSecond;

  // Normalize tracks
  const normalizedTracks = useMemo(() => {
    return (tracks || []).map(track => ({
      id: track.id,
      name: track.name,
      type: track.type as TrackType,
      clips: (track.clips || []).map((clip): TimelineClip => {
        const clipStartMs = isTimelineClip(clip) ? clip.startMs : (clip.startTime ?? 0) * 1000;
        const clipEndMs = isTimelineClip(clip) ? clip.endMs : (clip.endTime ?? 0) * 1000;
        const sourceStartVal = isTimelineClip(clip) ? clip.sourceStart : 0;
        const sourceEndVal = isTimelineClip(clip) ? clip.sourceEnd : 0;
        return {
          id: clip.id || '',
          trackId: clip.trackId || track.id,
          name: clip.name || '未命名片段',
          type: clip.type || 'video',
          startTime: clip.startTime ?? clipStartMs / 1000,
          endTime: clip.endTime ?? clipEndMs / 1000,
          startMs: clipStartMs,
          endMs: clipEndMs,
          sourceStart: sourceStartVal,
          sourceEnd: sourceEndVal,
          duration: clip.duration || Math.max(0, clipEndMs - clipStartMs),
          color: clip.color || TRACK_COLORS[track.type as TrackType] || '#3b82f6',
          thumbnail: clip.thumbnail,
          keyframes: clip.keyframes || [],
          transitions: clip.transitions || {},
          properties: clip.properties || {
            scale: 100,
            rotation: 0,
            opacity: 100,
            x: 0,
            y: 0,
          },
        };
      }),
      height: 60,
      muted: track.muted ?? false,
      locked: track.locked ?? false,
      visible: track.visible ?? true,
      volume: track.volume ?? 100,
      selected: false,
    }));
  }, [tracks]);

  // Get selected clip
  const selectedClip = useMemo(() => {
    if (!selectedClipId) return null;
    for (const track of normalizedTracks) {
      const clip = track.clips.find(c => c.id === selectedClipId);
      if (clip) return clip;
    }
    return null;
  }, [selectedClipId, normalizedTracks]);

  // Build clip lookup map for O(1) access
  const clipMap = useMemo(() => {
    const map = new Map<string, { clip: typeof normalizedTracks[0]['clips'][0]; trackId: string }>();
    for (const track of normalizedTracks) {
      for (const clip of track.clips) {
        map.set(clip.id, { clip, trackId: track.id });
      }
    }
    return map;
  }, [normalizedTracks]);

  // Update tracks when initial tracks change
  useEffect(() => {
    if (initialTracks) {
      setTracks(initialTracks);
    }
  }, [initialTracks]);

  // Auto-scroll to keep playhead visible
  useEffect(() => {
    if (tracksContainerRef.current) {
      const container = tracksContainerRef.current;
      const playheadX = playheadPosition;
      const scrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;

      if (playheadX < scrollLeft || playheadX > scrollLeft + containerWidth - 50) {
        container.scrollLeft = playheadX - containerWidth / 2;
      }
    }
  }, [playheadPosition]);

  // ── 虚拟化：监听容器宽度变化 ─────────────────────────────────────────
  useEffect(() => {
    const el = tracksContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  // ── 虚拟化：监听滚动位置变化 ─────────────────────────────────────────
  const handleTracksScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const left = e.currentTarget.scrollLeft;
    scrollLeftRef.current = left;
    setScrollLeft(left); // 触发虚拟化重算
  }, []);

  // ==============================================
  // Event Handlers
  // ==============================================

  const handleSeek = useCallback((time: number) => {
    onTimeUpdate?.(time);
  }, [onTimeUpdate]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onPlay?.();
  }, [onPlay]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    onTimeUpdate?.(0);
  }, [onTimeUpdate]);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const handleSnapToggle = useCallback((enabled: boolean) => {
    setSnapEnabled(enabled);
  }, []);

  const handleToolChange = useCallback((tool: TimelineTool) => {
    setCurrentTool(tool);
  }, []);

  const handleClipSelect = useCallback((clipId: string) => {
    setSelectedClipId(clipId);

    // 使用 clipMap 快速查找（O(1)）
    const found = clipMap.get(clipId);
    if (found) {
      onClipSelect?.({
        ...found.clip,
        trackId: found.trackId,
      } as Clip);
    }
  }, [clipMap, onClipSelect]);

  const handleClipUpdate = useCallback((clipId: string, updates: Partial<Clip>) => {
    const newTracks = tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip => 
        clip.id === clipId ? { ...clip, ...updates } : clip
      ),
    }));
    setTracks(newTracks);
    onTrackUpdate?.(newTracks);
  }, [tracks, onTrackUpdate]);

  const handleTrackUpdate = useCallback((trackId: string, updates: Partial<Track>) => {
    const newTracks = tracks.map(track =>
      track.id === trackId ? { ...track, ...updates } : track
    );
    setTracks(newTracks);
    onTrackUpdate?.(newTracks);
  }, [tracks, onTrackUpdate]);

  const handleAddTrack = useCallback((type: 'video' | 'audio' | 'subtitle') => {
    const typeCount = tracks.filter(t => t.type === type).length + 1;
    const typeNames: Record<string, string> = {
      video: '视频',
      audio: '音频',
      subtitle: '字幕',
    };

    const newTrack: Track = {
      id: generateId(),
      name: `${typeNames[type]}轨道 ${typeCount}`,
      type,
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      volume: 100,
    };

    const newTracks = [...tracks, newTrack];
    setTracks(newTracks);
    onTrackUpdate?.(newTracks);
  }, [tracks, onTrackUpdate]);

  const handleKeyframeAdd = useCallback((clipId: string, keyframe: Omit<Keyframe, 'id'>) => {
    const newKeyframe: Keyframe = {
      ...keyframe,
      id: generateId(),
    };
    handleClipUpdate(clipId, {
      keyframes: [...(selectedClip?.keyframes || []), newKeyframe],
    } as Partial<Clip>);
  }, [selectedClip, handleClipUpdate]);

  const handleKeyframeUpdate = useCallback((clipId: string, keyframeId: string, updates: Partial<Keyframe>) => {
    const clip = selectedClip;
    if (!clip) return;

    const newKeyframes = clip.keyframes.map(kf =>
      kf.id === keyframeId ? { ...kf, ...updates } : kf
    );
    handleClipUpdate(clipId, { keyframes: newKeyframes } as Partial<Clip>);
  }, [selectedClip, handleClipUpdate]);

  const handleKeyframeDelete = useCallback((clipId: string, keyframeId: string) => {
    const clip = selectedClip;
    if (!clip) return;

    const newKeyframes = clip.keyframes.filter(kf => kf.id !== keyframeId);
    handleClipUpdate(clipId, { keyframes: newKeyframes } as Partial<Clip>);
  }, [selectedClip, handleClipUpdate]);

  // ==============================================
  // Clip Actions
  // ==============================================

  const handleCopyClip = useCallback(() => {
    if (selectedClip) {
      setCopiedClip({ ...selectedClip });
      message.success('已复制片段');
    }
  }, [selectedClip]);

  const handlePasteClip = useCallback(() => {
    if (!copiedClip) {
      message.warning('请先复制片段');
      return;
    }

    // 从 clipMap 获取原片段所在轨道类型
    const original = clipMap.get(copiedClip.id);
    if (!original) return;

    const newClip: TimelineClip = {
      ...copiedClip,
      id: generateId(),
      name: `${copiedClip.name} (副本)`,
      startTime: currentTime,
      endTime: currentTime + (copiedClip.endTime - copiedClip.startTime),
      startMs: currentTime * 1000,
      endMs: (currentTime + (copiedClip.endTime - copiedClip.startTime)) * 1000,
    };

    // 找到对应轨道并添加
    const insertIndex = tracks.findIndex(t => t.id === original.trackId);
    if (insertIndex >= 0) {
      const newTracks = [...tracks];
      newTracks[insertIndex] = {
        ...newTracks[insertIndex],
        clips: [...newTracks[insertIndex].clips, newClip],
      };
      setTracks(newTracks);
      onTrackUpdate?.(newTracks);
      setSelectedClipId(newClip.id);
      message.success('已粘贴片段');
    }
  }, [copiedClip, clipMap, currentTime, tracks, onTrackUpdate]);

  const handleDeleteClip = useCallback(() => {
    if (!selectedClipId) return;

    const newTracks = tracks.map(track => ({
      ...track,
      clips: track.clips.filter(clip => clip.id !== selectedClipId),
    }));
    setTracks(newTracks);
    onTrackUpdate?.(newTracks);
    setSelectedClipId(null);
    message.success('已删除片段');
  }, [selectedClipId, tracks, onTrackUpdate]);

  // ==============================================
  // Render
  // ==============================================

  return (
    <div className={styles.timelineContainer} ref={timelineRef}>
      {/* 控制栏 - 使用新的 TimelineControls 组件 */}
      <TimelineControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        zoom={zoom}
        snapEnabled={snapEnabled}
        currentTool={currentTool}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSeek={handleSeek}
        onZoomChange={handleZoomChange}
        onSnapToggle={handleSnapToggle}
        onToolChange={handleToolChange}
        onAddTrack={handleAddTrack}
      />

      {/* 时间标尺 - 使用新的 TimelineRuler 组件 */}
      <TimelineRuler
        scale={scale}
        duration={duration}
        currentTime={currentTime}
        scrollLeft={scrollLeft}
        onSeek={handleSeek}
      />

      {/* 轨道容器 */}
      <div
        ref={tracksContainerRef}
        className={styles.tracksContainer}
        onScroll={handleTracksScroll}
        onClick={(e) => {
          // 点击空白区域取消选中
          if (e.target === e.currentTarget) {
            setSelectedClipId(null);
          }
        }}
        style={{
          width: '100%',
          flex: 1,
          overflow: 'auto',
          position: 'relative',
        }}
      >
        <div
          className={styles.tracksContent}
          style={{ width: `${timelineWidth}px`, position: 'relative' }}
        >
          {/* 播放头 */}
          <TimelinePlayhead
            currentTime={currentTime}
            scale={scale}
            scrollLeft={scrollLeftRef.current}
            containerHeight={400}
            onSeek={handleSeek}
          />

          {/* 轨道列表 */}
          {normalizedTracks.map((track) => (
            <TimelineTrack
              key={track.id}
              track={track}
              clips={track.clips}
              scale={scale}
              selectedClipId={selectedClipId || undefined}
              onClipSelect={handleClipSelect}
              onClipUpdate={handleClipUpdate}
              onTrackUpdate={handleTrackUpdate}
              virtualContainerWidth={containerWidth}
              virtualScrollLeft={scrollLeft}
            />
          ))}

          {/* 空白提示 */}
          {normalizedTracks.length === 0 && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
              }}
            >
              <p>暂无轨道</p>
              <Space>
                <Button icon={<PlusOutlined />} onClick={() => handleAddTrack('video')}>
                  添加视频轨道
                </Button>
                <Button icon={<PlusOutlined />} onClick={() => handleAddTrack('audio')}>
                  添加音频轨道
                </Button>
              </Space>
            </div>
          )}
        </div>
      </div>

      {/* 选中 clip 的操作栏 */}
      {selectedClip && (
        <div
          className={styles.clipActionsBar}
          style={{
            height: 48,
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space>
            <span style={{ fontWeight: 500 }}>已选中:</span>
            <span>{selectedClip.name}</span>
            <span style={{ color: 'var(--text-tertiary)' }}>
              {formatTime(selectedClip.startTime)} - {formatTime(selectedClip.endTime)}
            </span>
          </Space>

          <Space>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={handleCopyClip}
            >
              复制
            </Button>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={handlePasteClip}
              disabled={!copiedClip}
            >
              粘贴
            </Button>
            <Dropdown
              menu={{
                items: TRANSITION_TYPES.map(t => ({
                  key: t.value,
                  label: t.label,
                  onClick: () => {
                    if (selectedClip) {
                      handleClipUpdate(selectedClip.id, {
                        transitions: {
                          ...selectedClip.transitions,
                          out: { type: t.value as Transition['type'], duration: 0.5 },
                        },
                      } as Partial<Clip>);
                    }
                  },
                })),
              }}
            >
              <Button size="small" icon={<PartitionOutlined />}>
                转场
              </Button>
            </Dropdown>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={handleDeleteClip}
            >
              删除
            </Button>
            <Button
              size="small"
              onClick={() => setShowKeyframePanel(true)}
            >
              关键帧
            </Button>
          </Space>
        </div>
      )}

      {/* 关键帧面板 */}
      {showKeyframePanel && selectedClip && (
        <KeyframePanel
          clipId={selectedClip.id}
          keyframes={selectedClip.keyframes || []}
          onKeyframeAdd={handleKeyframeAdd}
          onKeyframeUpdate={handleKeyframeUpdate}
          onKeyframeDelete={handleKeyframeDelete}
          onClose={() => setShowKeyframePanel(false)}
        />
      )}

      {/* 时间显示 */}
      <div
        className={styles.timeDisplay}
        style={{
          height: 32,
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        <span style={{ color: 'var(--primary-color)' }}>
          {formatTime(currentTime)}
        </span>
        <span style={{ color: 'var(--text-tertiary)', margin: '0 8px' }}>/</span>
        <span>{formatTime(duration)}</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--text-tertiary)' }}>
          {normalizedTracks.length} 轨道 | {normalizedTracks.reduce((sum, t) => sum + t.clips.length, 0)} 片段
        </span>
      </div>
    </div>
  );
};

export default Timeline;
