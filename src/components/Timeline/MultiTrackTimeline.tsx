/**
 * MultiTrackTimeline - 多轨道时间线组件
 * 支持视频轨、音频轨、字幕轨分离渲染
 * 支持片段拖拽、边缘调整、吸附、双击属性面板
 */
import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  memo,
  useMemo,
} from 'react';
import {
  Button,
  Space,
  Slider,
  Tooltip,
  Dropdown,
  Divider,
  InputNumber,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  PlusOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SoundOutlined,
  SoundFilled,
  SendOutlined,
  FastBackwardOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type {
  TimelineTrack,
  TimelineClip,
  DragType,
} from './types';
import styles from './MultiTrackTimeline.module.less';

// ============================================
// 常量
// ============================================
const MIN_CLIP_DURATION = 100; // ms
const DEFAULT_TRACK_HEIGHT = 60;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const SNAP_THRESHOLD_PX = 8;

// 轨道类型颜色映射
const TRACK_COLORS: Record<string, string> = {
  video: '#1890ff',
  audio: '#52c41a',
  subtitle: '#fa8c16',
  effect: '#722ed1',
};

// ============================================
// 工具函数
// ============================================
function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = Math.floor((ms % 1000) / (1000 / 30));
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function generateId(prefix = 'clip'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ============================================
// TrackHeader 子组件
// ============================================
interface TrackHeaderProps {
  track: TimelineTrack;
  onToggleMute: (trackId: string) => void;
  onToggleLock: (trackId: string) => void;
  onToggleVisible: (trackId: string) => void;
  onResizeTrack: (trackId: string, deltaY: number) => void;
  onAddClip: (trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
}

const TrackHeader = memo<TrackHeaderProps>(({
  track,
  onToggleMute,
  onToggleLock,
  onToggleVisible,
  onResizeTrack,
  onAddClip,
  onDeleteTrack,
}) => {
  const [resizing, setResizing] = useState(false);
  const startYRef = useRef(0);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    startYRef.current = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startYRef.current;
      onResizeTrack(track.id, deltaY);
    };

    const handleMouseUp = () => {
      setResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [track.id, onResizeTrack]);

  const trackMenuItems: MenuProps['items'] = [
    { key: 'add', label: '添加片段', icon: <PlusOutlined />, onClick: () => onAddClip(track.id) },
    { type: 'divider' },
    { key: 'delete', label: '删除轨道', icon: <DeleteOutlined />, danger: true, onClick: () => onDeleteTrack(track.id) },
  ];

  return (
    <div
      className={styles.trackHeader}
      style={{
        height: track.height,
        borderLeftColor: TRACK_COLORS[track.type] || '#999',
      }}
    >
      <div className={styles.trackName}>{track.name}</div>
      <div className={styles.trackControls}>
        <Tooltip title={track.muted ? '取消静音' : '静音'}>
          <button
            className={`${styles.iconBtn} ${track.muted ? styles.active : ''}`}
            onClick={() => onToggleMute(track.id)}
          >
            {track.muted ? <SoundFilled /> : <SoundOutlined />}
          </button>
        </Tooltip>
        <Tooltip title={track.locked ? '解锁' : '锁定'}>
          <button
            className={`${styles.iconBtn} ${track.locked ? styles.active : ''}`}
            onClick={() => onToggleLock(track.id)}
          >
            {track.locked ? <LockOutlined /> : <UnlockOutlined />}
          </button>
        </Tooltip>
        <Tooltip title={track.visible ? '隐藏轨道' : '显示轨道'}>
          <button
            className={`${styles.iconBtn} ${!track.visible ? styles.active : ''}`}
            onClick={() => onToggleVisible(track.id)}
          >
            {track.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          </button>
        </Tooltip>
        <Tooltip title="添加片段">
          <button className={styles.iconBtn} onClick={() => onAddClip(track.id)}>
            <PlusOutlined />
          </button>
        </Tooltip>
      </div>
      <div
        className={`${styles.resizeHandle} ${resizing ? styles.resizing : ''}`}
        onMouseDown={handleResizeStart}
      />
      <Dropdown menu={{ items: trackMenuItems }} trigger={['contextMenu']}>
        <div className={styles.trackMenuTrigger} />
      </Dropdown>
    </div>
  );
});
TrackHeader.displayName = 'TrackHeader';

// ============================================
// TimeRuler 子组件
// ============================================
interface TimeRulerProps {
  duration: number;
  zoom: number;
  scrollX: number;
  width: number;
}

const TimeRuler = memo<TimeRulerProps>(({ duration, zoom, scrollX, width }) => {
  const msPerPixel = 1000 / zoom;
  let majorInterval = 1000;
  let minorDivisions = 4;
  if (msPerPixel > 500) { majorInterval = 5000; minorDivisions = 5; }
  else if (msPerPixel > 200) { majorInterval = 2000; minorDivisions = 4; }
  else if (msPerPixel > 100) { majorInterval = 1000; minorDivisions = 4; }
  else if (msPerPixel > 50) { majorInterval = 500; minorDivisions = 5; }
  else if (msPerPixel > 20) { majorInterval = 200; minorDivisions = 4; }
  else if (msPerPixel > 10) { majorInterval = 100; minorDivisions = 4; }
  else { majorInterval = 50; minorDivisions = 5; }

  const minorInterval = majorInterval / minorDivisions;
  const totalMs = Math.max(duration, 60000);
  const visibleStartMs = scrollX * msPerPixel;
  const visibleEndMs = visibleStartMs + width * msPerPixel;

  const ticks: { ms: number; major: boolean }[] = [];
  const startMs = Math.floor(visibleStartMs / minorInterval) * minorInterval;

  for (let ms = startMs; ms <= visibleEndMs + majorInterval; ms += minorInterval) {
    if (ms < 0) continue;
    const major = Math.abs(ms % majorInterval) < 1;
    ticks.push({ ms, major });
  }

  return (
    <div className={styles.timeRuler}>
      {ticks.map(({ ms, major }) => {
        const x = (ms / msPerPixel) - scrollX;
        return (
          <div key={ms} className={`${styles.tick} ${major ? styles.major : styles.minor}`} style={{ left: x }}>
            {major && <span className={styles.tickLabel}>{formatTime(ms)}</span>}
          </div>
        );
      })}
    </div>
  );
});
TimeRuler.displayName = 'TimeRuler';

// ============================================
// Playhead 子组件
// ============================================
interface PlayheadProps {
  playheadMs: number;
  zoom: number;
  scrollX: number;
  height: number;
  onSeek: (ms: number) => void;
}

const Playhead = memo<PlayheadProps>(({ playheadMs, zoom, scrollX, height, onSeek }) => {
  const msPerPixel = 1000 / zoom;
  const x = playheadMs / msPerPixel - scrollX;

  return (
    <div
      className={styles.playhead}
      style={{ left: x, height }}
      onMouseDown={(e) => {
        e.preventDefault();
        const container = e.currentTarget.parentElement;
        if (!container) return;
        const rect = container.getBoundingClientRect();

        const handleMouseMove = (moveEvent: MouseEvent) => {
          const newX = moveEvent.clientX - rect.left + scrollX;
          const newMs = clamp(newX * msPerPixel, 0, Infinity);
          onSeek(newMs);
        };

        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }}
    >
      <div className={styles.playheadHead} />
      <div className={styles.playheadLine} />
    </div>
  );
});
Playhead.displayName = 'Playhead';

// ============================================
// ClipRenderer 子组件
// ============================================
interface ClipRendererProps {
  clip: TimelineClip;
  track: TimelineTrack;
  zoom: number;
  scrollX: number;
  duration: number;
  selectedClipId?: string;
  onClipClick: (clipId: string, trackId: string, e: React.MouseEvent) => void;
  onClipDoubleClick: (clip: TimelineClip) => void;
  onDragStart: (clipId: string, trackId: string, type: DragType, e: React.MouseEvent) => void;
}

const ClipRenderer = memo<ClipRendererProps>(({
  clip,
  track,
  zoom,
  scrollX,
  duration,
  selectedClipId,
  onClipClick,
  onClipDoubleClick,
  onDragStart,
}) => {
  const msPerPixel = 1000 / zoom;
  const clipLeft = clip.startMs / msPerPixel - scrollX;
  const clipWidth = Math.max(4, (clip.endMs - clip.startMs) / msPerPixel);
  const color = clip.color || TRACK_COLORS[track.type] || '#1890ff';
  const isSelected = selectedClipId === clip.id;

  return (
    <div
      className={`${styles.clip} ${isSelected ? styles.selected : ''} ${track.locked ? styles.locked : ''}`}
      style={{
        left: clipLeft,
        width: clipWidth,
        backgroundColor: color,
        top: 4,
        height: track.height - 8,
      }}
      onClick={(e) => onClipClick(clip.id, track.id, e)}
      onDoubleClick={() => onClipDoubleClick(clip)}
      onMouseDown={(e) => {
        if (track.locked || e.button !== 0) return;
        onDragStart(clip.id, track.id, 'move', e);
      }}
    >
      <div
        className={styles.clipHandleLeft}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (!track.locked) onDragStart(clip.id, track.id, 'start', e);
        }}
      />
      <div className={styles.clipContent}>
        <span className={styles.clipName}>{clip.name}</span>
        {clip.keyframes && clip.keyframes.length > 0 && (
          <div className={styles.keyframeIndicators}>
            {clip.keyframes.map((kf) => (
              <div
                key={kf.id}
                className={styles.keyframeDot}
                style={{ left: `${(kf.timeOffset / Math.max(1, clip.endMs - clip.startMs)) * 100}%` }}
              />
            ))}
          </div>
        )}
      </div>
      <div
        className={styles.clipHandleRight}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (!track.locked) onDragStart(clip.id, track.id, 'end', e);
        }}
      />
    </div>
  );
});
ClipRenderer.displayName = 'ClipRenderer';

// ============================================
// ClipPropertiesPanel 子组件
// ============================================
interface ClipPropertiesPanelProps {
  clip: TimelineClip;
  onUpdate: (clipId: string, data: Partial<TimelineClip>) => void;
  onClose: () => void;
  onDelete: (clipId: string) => void;
}

const ClipPropertiesPanel = memo<ClipPropertiesPanelProps>(({ clip, onUpdate, onClose, onDelete }) => {
  const [startSec, setStartSec] = useState(clip.startMs / 1000);
  const [endSec, setEndSec] = useState(clip.endMs / 1000);
  const [volume, setVolume] = useState(100);

  useEffect(() => {
    setStartSec(clip.startMs / 1000);
    setEndSec(clip.endMs / 1000);
  }, [clip]);

  const handleApply = () => {
    const newStartMs = startSec * 1000;
    const newEndMs = endSec * 1000;
    if (newEndMs > newStartMs + MIN_CLIP_DURATION) {
      onUpdate(clip.id, { startMs: newStartMs, endMs: newEndMs });
    }
    onClose();
  };

  return (
    <div className={styles.propertiesPanel}>
      <div className={styles.propertiesHeader}>
        <span>片段属性</span>
        <Button size="small" type="text" onClick={onClose}>×</Button>
      </div>
      <div className={styles.propertiesBody}>
        <div className={styles.propRow}>
          <label>名称</label>
          <span className={styles.propValue}>{clip.name}</span>
        </div>
        <div className={styles.propRow}>
          <label>开始 (s)</label>
          <InputNumber size="small" value={startSec} onChange={(v) => setStartSec(v ?? 0)} step={0.1} min={0} />
          <label>结束 (s)</label>
          <InputNumber size="small" value={endSec} onChange={(v) => setEndSec(v ?? 1)} step={0.1} min={0} />
        </div>
        <div className={styles.propRow}>
          <label>音量</label>
          <Slider min={0} max={200} value={volume} onChange={setVolume} tooltip={{ formatter: (v) => `${v}%` }} />
        </div>
        <div className={styles.propRow}>
          <label>时长</label>
          <span className={styles.propTime}>{formatTime(clip.endMs - clip.startMs)}</span>
          <label>源</label>
          <span className={styles.propTime}>{formatTime(clip.sourceEndMs - clip.sourceStartMs)}</span>
        </div>
      </div>
      <div className={styles.propertiesFooter}>
        <Button size="small" danger onClick={() => { onDelete(clip.id); onClose(); }}>
          删除片段
        </Button>
        <Space>
          <Button size="small" onClick={onClose}>取消</Button>
          <Button size="small" type="primary" onClick={handleApply}>应用</Button>
        </Space>
      </div>
    </div>
  );
});
ClipPropertiesPanel.displayName = 'ClipPropertiesPanel';

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
  const addTrackMenuItems: MenuProps['items'] = [
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
        <Space>
          <Tooltip title={isPlaying ? '暂停 (Space)' : '播放 (Space)'}>
            <Button icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}>
              {isPlaying ? '暂停' : '播放'}
            </Button>
          </Tooltip>
          <Tooltip title="跳转开头">
            <Button icon={<FastBackwardOutlined />} onClick={() => { setLocalPlayhead(0); onPlayheadChange?.(0); }} />
          </Tooltip>
          <Divider type="vertical" />
          <Dropdown menu={{ items: addTrackMenuItems }} trigger={['click']}>
            <Button icon={<PlusOutlined />}>添加轨道</Button>
          </Dropdown>
          <Tooltip title={selectedClipId ? '删除片段 (Delete)' : '请先选择片段'}>
            <Button icon={<DeleteOutlined />} danger disabled={!selectedClipId} onClick={() => selectedClipId && handleClipDelete(selectedClipId)} />
          </Tooltip>
          <Divider type="vertical" />
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button icon={<SendOutlined style={{ transform: 'rotate(180deg)' }} />} disabled={!canUndo} onClick={onUndo} />
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Y)">
            <Button icon={<SendOutlined />} disabled={!canRedo} onClick={onRedo} />
          </Tooltip>
          <Divider type="vertical" />
          <Space>
            <Tooltip title="缩小">
              <Button icon={<ZoomOutOutlined />} onClick={() => {
                const newZoom = clamp(localZoom / 1.2, MIN_ZOOM, MAX_ZOOM);
                setLocalZoom(newZoom);
                onZoomChange?.(newZoom);
              }} />
            </Tooltip>
            <span className={styles.zoomLabel}>{Math.round(localZoom * 100)}%</span>
            <Tooltip title="放大">
              <Button icon={<ZoomInOutlined />} onClick={() => {
                const newZoom = clamp(localZoom * 1.2, MIN_ZOOM, MAX_ZOOM);
                setLocalZoom(newZoom);
                onZoomChange?.(newZoom);
              }} />
            </Tooltip>
          </Space>
        </Space>
      </div>

      {/* 时间显示 */}
      <div className={styles.timeDisplay}>
        <span className={styles.currentTime}>{formatTime(localPlayhead)}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.totalTime}>{formatTime(duration)}</span>
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
                    clip={                    clip={clip}
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

export default MultiTrackTimeline;
