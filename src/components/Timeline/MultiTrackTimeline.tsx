/**
 * MultiTrackTimeline - 多轨道时间线组件
 * 支持视频轨、音频轨、字幕轨分离渲染
 * 支持片段拖拽、边缘调整、吸附、双击属性面板
 *
 * 子模块:
 * - TrackHeader       轨道头（静音/锁定/可见性控制）
 * - TimeRuler         时间刻度尺
 * - Playhead          播放头
 * - ClipRenderer      片段渲染器
 * - ClipPropertiesPanel 片段属性面板
 */
import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  memo,
  useMemo,
} from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  PlayCircle,
  PauseCircle,
  ZoomIn,
  ZoomOut,
  Plus,
  Trash2,
  Send,
  Rewind,
} from 'lucide-react';
import type { TimelineTrack, TimelineClip, DragType } from './types';

import { TrackHeader } from './TrackHeader';
import { TimeRuler } from './TimeRuler';
import { Playhead } from './Playhead';
import { ClipRenderer } from './ClipRenderer';
import { ClipPropertiesPanel } from './ClipPropertiesPanel';
import { clamp, generateId } from './utils';
import { MIN_CLIP_DURATION, DEFAULT_TRACK_HEIGHT, MIN_ZOOM, MAX_ZOOM, SNAP_THRESHOLD_PX, TRACK_COLORS } from './constants';

import styles from './Timeline.module.less';

// ============================================
// MultiTrackTimeline 主组件
// ============================================
export interface MultiTrackTimelineProps {
  tracks: TimelineTrack[];
  playheadMs: number;
  zoom: number;
  scrollX: number;
  duration: number;
  snapEnabled?: boolean;
  selectedClipId?: string;
  selectedTrackId?: string;
  isPlaying?: boolean;
  onTracksChange?: (tracks: TimelineTrack[]) => void;
  onPlayheadChange?: (ms: number) => void;
  onZoomChange?: (zoom: number) => void;
  onScrollXChange?: (scrollX: number) => void;
  onSelectionChange?: (clipId?: string, trackId?: string) => void;
  onClipUpdate?: (clipId: string, data: Partial<TimelineClip>) => void;
  onClipDelete?: (clipId: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = memo(({
  tracks: initialTracks,
  playheadMs,
  zoom,
  scrollX,
  duration,
  snapEnabled = true,
  selectedClipId,
  selectedTrackId,
  isPlaying = false,
  onTracksChange,
  onPlayheadChange,
  onZoomChange,
  onScrollXChange,
  onSelectionChange,
  onClipUpdate,
  onClipDelete,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const [tracks, setTracks] = useState<TimelineTrack[]>(initialTracks);
  const [localPlayhead, setLocalPlayhead] = useState(playheadMs);
  const [localZoom, setLocalZoom] = useState(zoom);
  const [localScrollX, setLocalScrollX] = useState(scrollX);
  const [isDragging, setIsDragging] = useState(false);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [dragTrackId, setDragTrackId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<DragType | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOriginalStart, setDragOriginalStart] = useState(0);
  const [dragOriginalEnd, setDragOriginalEnd] = useState(0);
  const [propertiesClip, setPropertiesClip] = useState<TimelineClip | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const msPerPixel = 1000 / localZoom;

  useEffect(() => { setTracks(initialTracks); }, [initialTracks]);
  useEffect(() => { setLocalPlayhead(playheadMs); }, [playheadMs]);
  useEffect(() => { setLocalZoom(zoom); }, [zoom]);
  useEffect(() => { setLocalScrollX(scrollX); }, [scrollX]);

  // 播放头跟随
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setLocalPlayhead((prev) => {
        const next = prev + 33;
        if (next >= duration) { clearInterval(interval); return duration; }
        return next;
      });
    }, 33);
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); onUndo?.(); }
        else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); onRedo?.(); }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId) {
        handleClipDelete(selectedClipId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, onUndo, onRedo]);

  // 吸附
  const getSnapPoints = useCallback((excludeClipId: string): number[] => {
    const points: number[] = [0, duration];
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        if (clip.id !== excludeClipId) {
          points.push(clip.startMs, clip.endMs);
        }
      });
    });
    return [...new Set(points)].sort((a, b) => a - b);
  }, [tracks, duration]);

  const snapToBoundary = useCallback((ms: number, excludeClipId: string): number => {
    if (!snapEnabled) return ms;
    const points = getSnapPoints(excludeClipId);
    const threshold = SNAP_THRESHOLD_PX * msPerPixel;
    for (const point of points) {
      if (Math.abs(ms - point) <= threshold) return point;
    }
    return ms;
  }, [snapEnabled, getSnapPoints, msPerPixel]);

  const allClips = useMemo(() => tracks.flatMap((t) => t.clips), [tracks]);

  // 轨道操作
  const updateTrack = useCallback((trackId: string, updates: Partial<TimelineTrack>) => {
    const updated = tracks.map((t) => t.id === trackId ? { ...t, ...updates } : t);
    setTracks(updated);
    onTracksChange?.(updated);
  }, [tracks, onTracksChange]);

  const handleToggleMute = useCallback((trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track) updateTrack(trackId, { muted: !track.muted });
  }, [tracks, updateTrack]);

  const handleToggleLock = useCallback((trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track) updateTrack(trackId, { locked: !track.locked });
  }, [tracks, updateTrack]);

  const handleToggleVisible = useCallback((trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track) updateTrack(trackId, { visible: !track.visible });
  }, [tracks, updateTrack]);

  const handleResizeTrack = useCallback((trackId: string, deltaY: number) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track) {
      const newHeight = Math.max(30, Math.min(200, track.height + deltaY));
      updateTrack(trackId, { height: newHeight });
    }
  }, [tracks, updateTrack]);

  const handleAddTrack = useCallback((type: TimelineTrack['type']) => {
    const newTrack: TimelineTrack = {
      id: generateId('track'),
      type,
      name: `${type === 'video' ? '视频' : type === 'audio' ? '音频' : type === 'subtitle' ? '字幕' : '效果'}轨 ${tracks.filter((t) => t.type === type).length + 1}`,
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      height: DEFAULT_TRACK_HEIGHT,
      color: TRACK_COLORS[type],
    };
    const updated = [...tracks, newTrack];
    setTracks(updated);
    onTracksChange?.(updated);
  }, [tracks, onTracksChange]);

  const handleDeleteTrack = useCallback((trackId: string) => {
    const updated = tracks.filter((t) => t.id !== trackId);
    setTracks(updated);
    onTracksChange?.(updated);
  }, [tracks, onTracksChange]);

  const handleAddClip = useCallback((trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track || track.locked) return;
    const newClip: TimelineClip = {
      id: generateId('clip'),
      trackId,
      startMs: localPlayhead,
      endMs: localPlayhead + 5000,
      sourceStartMs: 0,
      sourceEndMs: 5000,
      name: `片段 ${allClips.length + 1}`,
      color: TRACK_COLORS[track.type],
    };
    updateTrack(trackId, { clips: [...track.clips, newClip] });
    onSelectionChange?.(newClip.id, trackId);
  }, [tracks, localPlayhead, allClips.length, updateTrack, onSelectionChange]);

  // 片段操作
  const handleClipClick = useCallback((clipId: string, trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange?.(clipId, trackId);
  }, [onSelectionChange]);

  const handleClipDoubleClick = useCallback((clip: TimelineClip) => {
    setPropertiesClip(clip);
  }, []);

  const handleClipUpdate = useCallback((clipId: string, data: Partial<TimelineClip>) => {
    tracks.forEach((track) => {
      const clipIndex = track.clips.findIndex((c) => c.id === clipId);
      if (clipIndex !== -1) {
        const updatedClips = [...track.clips];
        updatedClips[clipIndex] = { ...updatedClips[clipIndex], ...data };
        updateTrack(track.id, { clips: updatedClips });
      }
    });
    onClipUpdate?.(clipId, data);
  }, [tracks, updateTrack, onClipUpdate]);

  const handleClipDelete = useCallback((clipId: string) => {
    tracks.forEach((track) => {
      const clipIndex = track.clips.findIndex((c) => c.id === clipId);
      if (clipIndex !== -1) {
        const updatedClips = track.clips.filter((c) => c.id !== clipId);
        updateTrack(track.id, { clips: updatedClips });
        onClipDelete?.(clipId);
        onSelectionChange?.(undefined, undefined);
      }
    });
  }, [tracks, updateTrack, onClipDelete, onSelectionChange]);

  // 拖拽
  const handleDragStart = useCallback((
    clipId: string,
    trackId: string,
    type: DragType,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    const track = tracks.find((t) => t.id === trackId);
    const clip = track?.clips.find((c) => c.id === clipId);
    if (!clip || track?.locked) return;

    setIsDragging(true);
    setDragClipId(clipId);
    setDragTrackId(trackId);
    setDragType(type);
    setDragStartX(e.clientX);
    setDragOriginalStart(clip.startMs);
    setDragOriginalEnd(clip.endMs);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - e.clientX;
      const deltaMs = deltaX * msPerPixel;

      setTracks((prevTracks) => {
        return prevTracks.map((t) => {
          if (t.id !== trackId) return t;
          return {
            ...t,
            clips: t.clips.map((c) => {
              if (c.id !== clipId) return c;
              let newStartMs = dragOriginalStart;
              let newEndMs = dragOriginalEnd;

              if (type === 'move') {
                newStartMs = snapToBoundary(dragOriginalStart + deltaMs, clipId);
                newEndMs = newStartMs + (dragOriginalEnd - dragOriginalStart);
              } else if (type === 'start') {
                newStartMs = Math.max(0, snapToBoundary(dragOriginalStart + deltaMs, clipId));
                if (newStartMs >= newEndMs - MIN_CLIP_DURATION) {
                  newStartMs = newEndMs - MIN_CLIP_DURATION;
                }
              } else if (type === 'end') {
                newEndMs = Math.max(newStartMs + MIN_CLIP_DURATION, snapToBoundary(dragOriginalEnd + deltaMs, clipId));
              }

              return { ...c, startMs: newStartMs, endMs: newEndMs };
            }),
          };
        });
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragClipId(null);
      setDragTrackId(null);
      setDragType(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const finalTrack = tracks.find((t) => t.id === trackId);
      const finalClip = finalTrack?.clips.find((c) => c.id === clipId);
      if (finalClip) {
        onClipUpdate?.(clipId, { startMs: finalClip.startMs, endMs: finalClip.endMs });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [tracks, msPerPixel, snapToBoundary, onClipUpdate]);

  // 时间线点击
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;
    const container = tracksContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + localScrollX;
    const ms = clamp(x * msPerPixel, 0, duration);
    setLocalPlayhead(ms);
    onPlayheadChange?.(ms);
  }, [isDragging, localScrollX, msPerPixel, duration, onPlayheadChange]);

  // 滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = clamp(localZoom * delta, MIN_ZOOM, MAX_ZOOM);
      setLocalZoom(newZoom);
      onZoomChange?.(newZoom);
    } else {
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      const newScrollX = Math.max(0, localScrollX + delta * 0.5);
      setLocalScrollX(newScrollX);
      onScrollXChange?.(newScrollX);
    }
  }, [localZoom, localScrollX, onZoomChange, onScrollXChange]);

  // 添加轨道菜单
  const trackMenuItems = [
    { key: 'video', label: '视频轨道', onClick: () => handleAddTrack('video') },
    { key: 'audio', label: '音频轨道', onClick: () => handleAddTrack('audio') },
    { key: 'subtitle', label: '字幕轨道', onClick: () => handleAddTrack('subtitle') },
    { key: 'effect', label: '效果轨道', onClick: () => handleAddTrack('effect') },
  ];

  const containerWidth = containerRef.current?.clientWidth || 800;
  const totalHeight = tracks.reduce((sum, t) => sum + t.height, 0);
  const totalWidth = duration / msPerPixel;

  return (
    <div className={styles.multiTrackTimeline} ref={containerRef}>
      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <div className="flex gap-2 items-center">
          <Tooltip title={isPlaying ? '暂停 (Space)' : '播放 (Space)'}>
            <Button icon={isPlaying ? <PauseCircle /> : <PlayCircle />}>
              {isPlaying ? '暂停' : '播放'}
            </Button>
          </Tooltip>
          <Tooltip title="跳转开头">
            <Button icon={<Rewind />} onClick={() => { setLocalPlayhead(0); onPlayheadChange?.(0); }} />
          </Tooltip>
          <span className="w-px h-4 bg-zinc-700" />
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button icon={<Plus />}>添加轨道</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {trackMenuItems.map(item => (
                <DropdownMenuItem key={item.key} onClick={item.onClick}>
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip title={selectedClipId ? '删除片段 (Delete)' : '请先选择片段'}>
            <Button icon={<Trash2 />} danger disabled={!selectedClipId} onClick={() => selectedClipId && handleClipDelete(selectedClipId)} />
          </Tooltip>
          <span className="w-px h-4 bg-zinc-700" />
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button icon={<Send style={{ transform: 'rotate(180deg)' }} />} disabled={!canUndo} onClick={onUndo} />
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Y)">
            <Button icon={<Send />} disabled={!canRedo} onClick={onRedo} />
          </Tooltip>
          <span className="w-px h-4 bg-zinc-700" />
          <div className="flex gap-2 items-center">
            <Tooltip title="缩小">
              <Button icon={<ZoomOut />} onClick={() => {
                const newZoom = clamp(localZoom / 1.2, MIN_ZOOM, MAX_ZOOM);
                setLocalZoom(newZoom);
                onZoomChange?.(newZoom);
              }} />
            </Tooltip>
            <span className={styles.zoomLabel}>{Math.round(localZoom * 100)}%</span>
            <Tooltip title="放大">
              <Button icon={<ZoomIn />} onClick={() => {
                const newZoom = clamp(localZoom * 1.2, MIN_ZOOM, MAX_ZOOM);
                setLocalZoom(newZoom);
                onZoomChange?.(newZoom);
              }} />
            </Tooltip>
          </div>
        </div>
      </div>

      {/* 时间显示 */}
      <div className={styles.timeDisplay}>
        <span className={styles.currentTime}>{formatTimeDisplay(localPlayhead)}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.totalTime}>{formatTimeDisplay(duration)}</span>
      </div>

      {/* 时间轴主体 */}
      <div className={styles.timelineWrapper} onWheel={handleWheel}>
        {/* 左侧：轨道头区域 */}
        <div className={styles.trackHeadersColumn}>
          <div className={styles.rulerHeaderSpacer} />
          {tracks.map((track) => (
            <TrackHeader
              key={track.id}
              track={track}
              onToggleMute={handleToggleMute}
              onToggleLock={handleToggleLock}
              onToggleVisible={handleToggleVisible}
              onResizeTrack={handleResizeTrack}
              onAddClip={handleAddClip}
              onDeleteTrack={handleDeleteTrack}
            />
          ))}
        </div>

        {/* 右侧：轨道内容区域 */}
        <div
          className={styles.tracksContentArea}
          ref={tracksContainerRef}
          onClick={handleTimelineClick}
        >
          {/* 时间刻度 */}
          <TimeRuler
            duration={duration}
            zoom={localZoom}
            scrollX={localScrollX}
            width={containerWidth - 150}
          />

          {/* 轨道内容 */}
          <div className={styles.tracksScrollArea} style={{ width: totalWidth }}>
            {/* 播放头 */}
            <Playhead
              playheadMs={localPlayhead}
              zoom={localZoom}
              scrollX={localScrollX}
              height={totalHeight + 32}
              onSeek={(ms) => { setLocalPlayhead(ms); onPlayheadChange?.(ms); }}
            />

            {/* 轨道列表 */}
            {tracks.map((track) => (
              <div
                key={track.id}
                className={`${styles.trackRow} ${!track.visible ? styles.trackHidden : ''}`}
                style={{ height: track.height }}
              >
                {track.clips.map((clip) => (
                  <ClipRenderer
                    key={clip.id}
                    clip={clip}
                    track={track}
                    zoom={localZoom}
                    scrollX={localScrollX}
                    duration={duration}
                    selectedClipId={selectedClipId}
                    onClipClick={handleClipClick}
                    onClipDoubleClick={handleClipDoubleClick}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 属性面板 */}
      {propertiesClip && (
        <ClipPropertiesPanel
          clip={propertiesClip}
          onUpdate={handleClipUpdate}
          onClose={() => setPropertiesClip(null)}
          onDelete={handleClipDelete}
        />
      )}
    </div>
  );
});
MultiTrackTimeline.displayName = 'MultiTrackTimeline';

// 格式化时间（内部使用，从 utils 导入会循环依赖）
function formatTimeDisplay(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = Math.floor((ms % 1000) / (1000 / 30));
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

export default MultiTrackTimeline;
