/**
 * TimelineControls - 时间线控制栏
 * 包含播放控制、缩放控制、工具选择等
 */
import React, { memo, useCallback } from 'react'
import { Button, Tooltip, Slider, Switch, Select, Space, Divider, Dropdown } from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ForwardOutlined,
  BackwardOutlined,
  PlusOutlined,
  MinusOutlined,
  ScissorOutlined,
  ThunderboltOutlined,
  AimOutlined,
  LockOutlined,
  UnlockOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  FontSizeOutlined,
  PictureOutlined,
} from '@ant-design/icons'

export type TimelineTool = 'select' | 'cut' | 'trim' | 'speed' | 'volume' | 'text' | 'effect'

export interface TimelineControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  zoom: number
  snapEnabled: boolean
  currentTool: TimelineTool
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSeek: (time: number) => void
  onZoomChange: (zoom: number) => void
  onSnapToggle: (enabled: boolean) => void
  onToolChange: (tool: TimelineTool) => void
  onAddTrack: (type: 'video' | 'audio' | 'subtitle') => void
}

// 工具配置
const TOOLS: Array<{ key: TimelineTool; icon: React.ReactNode; label: string }> = [
  { key: 'select', icon: <AimOutlined />, label: '选择工具 (V)' },
  { key: 'cut', icon: <ScissorOutlined />, label: '剪切工具 (C)' },
  { key: 'trim', icon: <StopOutlined />, label: '裁剪工具 (T)' },
  { key: 'speed', icon: <ThunderboltOutlined />, label: '速度调整 (S)' },
  { key: 'volume', icon: <AudioOutlined />, label: '音量调整 (A)' },
  { key: 'text', icon: <FontSizeOutlined />, label: '文字工具 (X)' },
  { key: 'effect', icon: <PictureOutlined />, label: '特效工具 (E)' },
]

// 格式化时间
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const frames = Math.floor((seconds % 1) * 30)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
}

const TimelineControls: React.FC<TimelineControlsProps> = memo(({
  isPlaying,
  currentTime,
  duration,
  zoom,
  snapEnabled,
  currentTool,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onZoomChange,
  onSnapToggle,
  onToolChange,
  onAddTrack,
}) => {
  // 键盘快捷键
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    switch (e.key.toLowerCase()) {
      case ' ':
        e.preventDefault()
        if (isPlaying) { onPause() } else { onPlay() }
        break
      case 'v':
        onToolChange('select')
        break
      case 'c':
        onToolChange('cut')
        break
      case 't':
        onToolChange('trim')
        break
      case 's':
        if (!e.metaKey && !e.ctrlKey) {
          onToolChange('speed')
        }
        break
      case 'delete':
      case 'backspace':
        // 删除选中 clip
        break
    }
  }, [isPlaying, onPlay, onPause, onToolChange])

  // 添加轨道下拉菜单
  const addTrackMenuItems = [
    {
      key: 'video',
      icon: <VideoCameraOutlined />,
      label: '视频轨道',
      onClick: () => onAddTrack('video'),
    },
    {
      key: 'audio',
      icon: <AudioOutlined />,
      label: '音频轨道',
      onClick: () => onAddTrack('audio'),
    },
    {
      key: 'subtitle',
      icon: <FontSizeOutlined />,
      label: '字幕轨道',
      onClick: () => onAddTrack('subtitle'),
    },
  ]

  return (
    <div
      className="timeline-controls"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{
        height: 56,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      {/* 播放控制 */}
      <Space size={4}>
        <Tooltip title="跳到开头">
          <Button
            type="text"
            icon={<BackwardOutlined />}
            onClick={() => onSeek(0)}
            disabled={currentTime === 0}
          />
        </Tooltip>

        {isPlaying ? (
          <Tooltip title="暂停 (Space)">
            <Button
              type="text"
              icon={<PauseCircleOutlined />}
              onClick={onPause}
              style={{ fontSize: 24 }}
            />
          </Tooltip>
        ) : (
          <Tooltip title="播放 (Space)">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={onPlay}
              style={{ fontSize: 24 }}
            />
          </Tooltip>
        )}

        <Tooltip title="停止">
          <Button
            type="text"
            icon={<StopOutlined />}
            onClick={onStop}
          />
        </Tooltip>

        <Tooltip title="跳到结尾">
          <Button
            type="text"
            icon={<ForwardOutlined />}
            onClick={() => onSeek(duration)}
            disabled={currentTime >= duration}
          />
        </Tooltip>
      </Space>

      {/* 时间显示 */}
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: 14,
          color: 'var(--text-primary)',
          minWidth: 120,
          textAlign: 'center',
        }}
      >
        <span style={{ color: 'var(--primary-color)' }}>{formatTime(currentTime)}</span>
        <span style={{ color: 'var(--text-tertiary)', margin: '0 8px' }}>/</span>
        <span>{formatTime(duration)}</span>
      </div>

      <Divider type="vertical" style={{ height: 32, margin: '0 8px' }} />

      {/* 工具选择 */}
      <Space size={4}>
        {TOOLS.map(tool => (
          <Tooltip key={tool.key} title={tool.label}>
            <Button
              type={currentTool === tool.key ? 'primary' : 'text'}
              icon={tool.icon}
              onClick={() => onToolChange(tool.key)}
              size="small"
            />
          </Tooltip>
        ))}
      </Space>

      <Divider type="vertical" style={{ height: 32, margin: '0 8px' }} />

      {/* 吸附开关 */}
      <Space size={8}>
        <Tooltip title="吸附到刻度">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <AimOutlined style={{ fontSize: 14, color: snapEnabled ? 'var(--primary-color)' : 'var(--text-tertiary)' }} />
            <Switch
              size="small"
              checked={snapEnabled}
              onChange={onSnapToggle}
            />
          </div>
        </Tooltip>
      </Space>

      <div style={{ flex: 1 }} />

      {/* 缩放控制 */}
      <Space size={8}>
        <Tooltip title="缩小">
          <Button
            type="text"
            icon={<MinusOutlined />}
            onClick={() => onZoomChange(Math.max(10, zoom - 10))}
            disabled={zoom <= 10}
          />
        </Tooltip>

        <Slider
          value={zoom}
          min={10}
          max={200}
          step={5}
          onChange={onZoomChange}
          style={{ width: 100 }}
          tooltip={{ formatter: (v) => `${v}%` }}
        />

        <Tooltip title="放大">
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={() => onZoomChange(Math.min(200, zoom + 10))}
            disabled={zoom >= 200}
          />
        </Tooltip>

        <Button
          type="text"
          onClick={() => onZoomChange(100)}
          style={{ fontSize: 11, width: 40 }}
        >
          100%
        </Button>
      </Space>

      <Divider type="vertical" style={{ height: 32, margin: '0 8px' }} />

      {/* 添加轨道 */}
      <Dropdown menu={{ items: addTrackMenuItems }} trigger={['click']}>
        <Button type="primary" icon={<PlusOutlined />}>
          添加轨道
        </Button>
      </Dropdown>
    </div>
  )
})

TimelineControls.displayName = 'TimelineControls'

export default TimelineControls

