import React, { memo, useState, useRef, useCallback } from 'react';
import { Tooltip, Dropdown } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SoundOutlined,
  SoundFilled,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
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
