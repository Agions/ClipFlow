/**
 * TimelineRuler - 时间标尺组件
 * 显示时间刻度，支持缩放和点击跳转
 */
import React, { memo, useCallback, useMemo } from 'react'
import type { TimelineScale } from './types'

interface TimelineRulerProps {
  scale: TimelineScale
  duration: number
  currentTime: number
  scrollLeft: number
  onSeek: (time: number) => void
}

// 刻度线间隔（秒）
const RULER_INTERVALS = {
  frame: 1,      // 每秒
  second: 5,    // 每5秒
  minute: 30,   // 每30秒
  hour: 300,    // 每5分钟
}

const formatRulerTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  return `${secs}s`
}

const TimelineRuler: React.FC<TimelineRulerProps> = memo(({
  scale,
  duration,
  currentTime,
  scrollLeft,
  onSeek,
}) => {
  // 容器宽度（默认 1200，与可见区域配合）
  const containerWidth = 1200

  // 计算可见范围
  const visibleStart = scrollLeft / scale.pixelsPerSecond
  const visibleEnd = (scrollLeft + containerWidth) / scale.pixelsPerSecond

  // 生成刻度点
  const ticks = useMemo(() => {
    const result: Array<{ time: number; type: 'major' | 'minor' }> = []
    let interval = RULER_INTERVALS.frame

    if (scale.pixelsPerSecond < 10) {
      interval = RULER_INTERVALS.hour
    } else if (scale.pixelsPerSecond < 30) {
      interval = RULER_INTERVALS.minute
    } else if (scale.pixelsPerSecond < 100) {
      interval = RULER_INTERVALS.second
    }

    const startTick = Math.floor(visibleStart / interval) * interval
    for (let t = startTick; t <= Math.min(visibleEnd + interval, duration); t += interval) {
      result.push({
        time: t,
        type: t % (interval * 5) === 0 ? 'major' : 'minor',
      })
    }
    return result
  }, [visibleStart, visibleEnd, duration, scale.pixelsPerSecond])

  // 处理点击跳转
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft
    const time = x / scale.pixelsPerSecond
    onSeek(Math.max(0, Math.min(time, duration)))
  }, [scale.pixelsPerSecond, scrollLeft, duration, onSeek])

  // 播放头位置
  const playheadPosition = currentTime * scale.pixelsPerSecond

  return (
    <div
      className="timeline-ruler"
      onClick={handleClick}
      style={{
        height: '32px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* 刻度线 */}
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        {ticks.map(({ time, type }) => {
          const x = time * scale.pixelsPerSecond
          const isVisible = x >= scrollLeft - 50 && x <= scrollLeft + containerWidth + 50
          if (!isVisible) return null

          return (
            <g key={time}>
              <line
                x1={x}
                y1={type === 'major' ? 16 : 24}
                x2={x}
                y2={32}
                stroke={type === 'major' ? 'var(--text-secondary)' : 'var(--border-color)'}
                strokeWidth={1}
              />
              {type === 'major' && (
                <text
                  x={x + 4}
                  y={12}
                  fill="var(--text-tertiary)"
                  fontSize={10}
                >
                  {formatRulerTime(time)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* 播放头标记 */}
      <div
        style={{
          position: 'absolute',
          left: playheadPosition,
          top: 0,
          width: 0,
          height: '100%',
          borderLeft: '2px solid var(--primary-color)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* 播放头三角形 */}
      <div
        style={{
          position: 'absolute',
          left: playheadPosition - 6,
          top: 0,
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '8px solid var(--primary-color)',
          pointerEvents: 'none',
          zIndex: 11,
        }}
      />
    </div>
  )
})

TimelineRuler.displayName = 'TimelineRuler'

export default TimelineRuler

export type { TimelineRulerProps }
