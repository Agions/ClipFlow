import React, { memo, useState, useRef, useCallback } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Plus,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
} from 'lucide-react';

import type { TimelineTrack } from './types';
import { TRACK_COLORS } from './constants';
import styles from './Timeline.module.less';

interface TrackHeaderProps {
  track: TimelineTrack;
  onToggleMute: (trackId: string) => void;
  onToggleLock: (trackId: string) => void;
  onToggleVisible: (trackId: string) => void;
  onResizeTrack: (trackId: string, deltaY: number) => void;
  onAddClip: (trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
}

export const TrackHeader = memo<TrackHeaderProps>(({
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
    { key: 'add', label: '添加片段', icon: <Plus size={16} />, onClick: () => onAddClip(track.id) },
    { type: 'divider' },
    { key: 'delete', label: '删除轨道', icon: <Trash2 size={16} />, danger: true, onClick: () => onDeleteTrack(track.id) },
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
            {track.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </Tooltip>
        <Tooltip title={track.locked ? '解锁' : '锁定'}>
          <button
            className={`${styles.iconBtn} ${track.locked ? styles.active : ''}`}
            onClick={() => onToggleLock(track.id)}
          >
            {track.locked ? <Lock size={16} /> : <Unlock size={16} />}
          </button>
        </Tooltip>
        <Tooltip title={track.visible ? '隐藏轨道' : '显示轨道'}>
          <button
            className={`${styles.iconBtn} ${!track.visible ? styles.active : ''}`}
            onClick={() => onToggleVisible(track.id)}
          >
            {track.visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </Tooltip>
        <Tooltip title="添加片段">
          <button className={styles.iconBtn} onClick={() => onAddClip(track.id)}>
            <Plus size={16} />
          </button>
        </Tooltip>
      </div>
      <div
        className={`${styles.resizeHandle} ${resizing ? styles.resizing : ''}`}
        onMouseDown={handleResizeStart}
      />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <div className={styles.trackMenuTrigger} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className={styles.dropdownContent}>
            {trackMenuItems.map(item => (
              item.type === 'divider' ? (
                <DropdownMenu.Separator key="divider" />
              ) : (
                <DropdownMenu.Item key={item.key} className={item.danger ? styles.dangerItem : ''} onClick={item.onClick}>
                  {item.icon} {item.label}
                </DropdownMenu.Item>
              )
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
});
TrackHeader.displayName = 'TrackHeader';
