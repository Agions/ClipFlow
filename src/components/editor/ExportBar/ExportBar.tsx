/**
 * ExportBar — 底部导出工具栏
 * 56px 高度，固定底部
 * Layout: [Format buttons] | [Progress] | [Export button]
 */
import React, { memo } from 'react';
import { FormatSelector } from './FormatSelector';
import { ExportProgress } from './ExportProgress';
import { ExportButton } from './ExportButton';

export type AspectRatio = '9:16' | '1:1' | '16:9';

interface ExportBarProps {
  selectedFormat: AspectRatio;
  onFormatChange: (format: AspectRatio) => void;
  exportState: 'idle' | 'processing' | 'complete' | 'error';
  progress?: number;       // 0-100
  currentClip?: number;
  totalClips?: number;
  onExport: () => void;
  onCancel?: () => void;
}

export const ExportBar = memo<ExportBarProps>(({
  selectedFormat,
  onFormatChange,
  exportState,
  progress = 0,
  currentClip = 0,
  totalClips = 0,
  onExport,
  onCancel,
}) => {
  return (
    <div className="flex items-center justify-between h-14 px-4 bg-bg-secondary border-t border-border-subtle shrink-0">
      {/* Format selector */}
      <FormatSelector
        selected={selectedFormat}
        onChange={onFormatChange}
        disabled={exportState === 'processing'}
      />

      {/* Progress */}
      <div className="flex-1 flex items-center justify-center px-8">
        <ExportProgress
          state={exportState}
          progress={progress}
          currentClip={currentClip}
          totalClips={totalClips}
        />
      </div>

      {/* Export button */}
      <ExportButton
        state={exportState}
        onClick={exportState === 'processing' ? (onCancel ?? onExport) : onExport}
      />
    </div>
  );
});

ExportBar.displayName = 'ExportBar';
