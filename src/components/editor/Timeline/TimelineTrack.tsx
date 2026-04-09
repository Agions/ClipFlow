/**
 * TimelineTrack - 轨道组件
 * 渲染单个轨道及其上的 clips
 */
import React, { memo, useCallback, useMemo } from 'react'
import { Badge } from 'antd'
import { LockOutlined, UnlockOutlined } from '@ant-design/icons'
import type { TimelineTrack as TimelineTrackType, TimelineClip as TimelineClipType, TimelineScale } from './types'
import TimelineClip from './TimelineClip'

interface TimelineTrackProps {
  track: TimelineTrackType
  clips: TimelineClipType[]
  scale: TimelineScale
  selectedClipId?: string
  onClipSelect: (clipId: string) => void
  onClipUpdate: (clipId: string, updates: Partial<TimelineClipType>) => void
  onTrackUpdate: (trackId: string, updates: Partial<TimelineTrackType>) => void
  /** 虚拟化模式：容器宽度（px），传入时启用虚拟化 */
  virtualContainerWidth?: number
  /** 虚拟化模式：滚动位置（px） */
  virtualScrollLeft?: number
}

// 轨道类型对应的颜色
const TRACK_TYPE_COLORS: Record<string, string> = {
  video: '#3b82f6',
  audio: '#22c55e',
  subtitle: '#f59e0b',
  effect: '#8b5cf6',
  title: '#ec4899',
}

const TimelineTrack: React.FC<TimelineTrackProps> = memo(({
  track,
  clips,
  scale,
  selectedClipId,
  onClipSelect,
  onClipUpdate,
  onTrackUpdate,
  virtualContainerWidth,
  virtualScrollLeft = 0,
}) => {
  // 处理 clip 选中
  const handleClipSelect = useCallback((clipId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onClipSelect(clipId)
  }, [onClipSelect])

  // 处理 clip 更新
  const handleClipUpdate = useCallback((clipId: string, updates: Partial<TimelineClipType>) => {
    onClipUpdate(clipId, updates)
  }, [onClipUpdate])

  // 处理轨道点击（空白区域）
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    // 取消选中
    if (e.target === e.currentTarget) {
      onClipSelect('')
    }
  }, [onClipSelect])

  // 静音/取消静音
  const handleMuteToggle = useCallback(() => {
    onTrackUpdate(track.id, { muted: !track.muted })
  }, [track.id, track.muted, onTrackUpdate])

  // 锁定/解锁
  const handleLockToggle = useCallback(() => {
    onTrackUpdate(track.id, { locked: !track.locked })
  }, [track.id, track.locked, onTrackUpdate])

  const trackColor = TRACK_TYPE_COLORS[track.type] || TRACK_TYPE_COLORS.video

  // ── 虚拟化：计算可见 clip 范围 ────────────────────────────────────────
  const visibleClips = useMemo(() => {
    if (!virtualContainerWidth || !clips.length) return clips;

    const buffer = 3; // 每侧额外渲染 buffer 个 clips
    const visibleStartMs = virtualScrollLeft / scale.pixelsPerSecond;
    const visibleEndMs = (virtualScrollLeft + virtualContainerWidth) / scale.pixelsPerSecond;

    // 二分查找第一个可能可见的 clip
    let lo = 0, hi = clips.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (clips[mid].endMs <= visibleStartMs) lo = mid + 1;
      else hi = mid;
    }
    const startIdx = Math.max(0, lo - buffer);

    // 二分查找最后一个可能可见的 clip
    lo = startIdx;
    hi = clips.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (clips[mid].startMs >= visibleEndMs) hi = mid - 1;
      else lo = mid;
    }
    const endIdx = Math.min(clips.length - 1, lo + buffer);

    return clips.slice(startIdx, endIdx + 1);
  }, [clips, scale, virtualContainerWidth, virtualScrollLeft]);

  return (
    <div
      className={`timeline-track timeline-track-${track.type}`}
      data-track-id={track.id}
      onClick={handleTrackClick}
      style={{
        height: `${track.height || 60}px`,
        background: track.selected 
          ? 'var(--bg-hover)' 
          : 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        opacity: track.locked ? 0.6 : 1,
        position: 'relative',
      }}
    >
      {/* 轨道标签区域 */}
      <div
        className="track-header"
        style={{
          width: '120px',
          minWidth: '120px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          padding: '4px 8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              width: 4,
              height: 16,
              borderRadius: 2,
              background: trackColor,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {track.name}
          </span>
        </div>

        {/* 轨道控制按钮 */}
        <div style={{ display: 'flex', gap: 4 }}>
          {track.type === 'audio' && (
            <button
              onClick={handleMuteToggle}
              aria-label={track.muted ? '取消静音' : '静音'}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                border: 'none',
                borderRadius: 4,
                background: track.muted ? 'var(--error-color)' : 'var(--bg-tertiary)',
                color: track.muted ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {track.muted ? 'M' : 'S'}
            </button>
          )}
          <button
            onClick={handleLockToggle}
            aria-label={track.locked ? '解锁轨道' : '锁定轨道'}
            style={{
              padding: '4px 8px',
              fontSize: 12,
              border: 'none',
              borderRadius: 4,
              background: track.locked ? 'var(--warning-color)' : 'var(--bg-tertiary)',
              color: track.locked ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {track.locked ? <LockOutlined /> : <UnlockOutlined />}
          </button>
        </div>
      </div>

      {/* 轨道内容区域 */}
      <div
        className="track-content"
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 轨道背景 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            background: `linear-gradient(90deg, transparent 0%, ${trackColor}08 100%)`,
          }}
        />

        {/* Clips（虚拟化：渲染可见区域 clips，超出容器 hidden 截断）*/}
        {visibleClips.map(clip => (
          <TimelineClip
            key={clip.id}
            clip={clip}
            scale={scale}
            isSelected={clip.id === selectedClipId}
            isLocked={track.locked}
            onSelect={handleClipSelect}
            onUpdate={handleClipUpdate}
          />
        ))}

        {/* 选中高亮 */}
        {track.selected && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              border: '2px solid var(--primary-color)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </div>
  )
})

TimelineTrack.displayName = 'TimelineTrack'

export default TimelineTrack

export type { TimelineTrackProps }
