/**
 * TimelineToolbar — 时间线工具栏
 * 缩放控制 + 播放/暂停按钮
 * 使用 shadcn Button (small, variant=outline) + Tooltip
 */
import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

interface TimelineToolbarProps {
  zoomPercent: number;       // e.g. 100
  isPlaying: boolean;
  currentTimecode: string;   // "00:00:00:00"
  totalTimecode: string;     // "00:00:00:00"
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitAll: () => void;
  onPlayPause: () => void;
}

export const TimelineToolbar = memo<TimelineToolbarProps>(({
  zoomPercent,
  isPlaying,
  currentTimecode,
  totalTimecode,
  onZoomIn,
  onZoomOut,
  onFitAll,
  onPlayPause,
}) => {
  return (
    <div className="flex items-center justify-between px-3 h-10 bg-bg-secondary border-b border-border-subtle shrink-0">
      {/* Left: Play controls */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="icon-sm" onClick={onPlayPause} className="text-text-primary" />} />
          <TooltipContent side="bottom">
            <p>{isPlaying ? '暂停 (Space)' : '播放 (Space)'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Timecode display */}
        <div className="flex items-center gap-2 ml-2 font-mono text-xs">
          <span className="text-accent-primary font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {currentTimecode}
          </span>
          <span className="text-text-disabled">/</span>
          <span className="text-text-secondary" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {totalTimecode}
          </span>
        </div>
      </div>

      {/* Right: Zoom controls */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="icon-sm" onClick={onZoomOut} className="text-text-secondary" />} />
          <TooltipContent side="bottom"><p>缩小</p></TooltipContent>
        </Tooltip>

        <span
          className="text-[11px] text-text-secondary min-w-[44px] text-center"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {zoomPercent}%
        </span>

        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="icon-sm" onClick={onZoomIn} className="text-text-secondary" />} />
          <TooltipContent side="bottom"><p>放大</p></TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border-subtle mx-1" />

        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="icon-sm" onClick={onFitAll} className="text-text-secondary" />} />
          <TooltipContent side="bottom"><p>适应全部</p></TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

TimelineToolbar.displayName = 'TimelineToolbar';