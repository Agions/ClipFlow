import React from 'react';
import { Plus, Upload, Video } from 'lucide-react';
import type { MediaSourceItem } from '../types';
import styles from '../workspace.module.less';

interface SourceLibraryPanelProps {
  sources: MediaSourceItem[];
  activeSource: MediaSourceItem | null;
  onSelectSource: (id: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SourceLibraryPanel: React.FC<SourceLibraryPanelProps> = ({
  sources,
  activeSource,
  onSelectSource,
  onFileUpload,
}) => {
  return (
    <aside className={styles.sourcePanel}>
      <div className={styles.panelTitleRow}>
        <span className={styles.panelTitle}>视听素材库</span>
        <label className="text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer flex items-center gap-0.5">
          <Plus size={12} />
          <span>导入</span>
          <input
            type="file"
            multiple
            accept="video/*,audio/*"
            className="hidden"
            onChange={onFileUpload}
          />
        </label>
      </div>

      {sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center text-text-tertiary flex-1 min-h-[160px]">
          <Video size={24} className="mb-2 opacity-40 text-purple-400" />
          <div className="text-xs font-semibold text-white mb-1">素材列表为空</div>
          <div className="text-[10px] text-text-tertiary mb-3">导入原片或空镜即可启动剪辑</div>
          <label className="text-xs text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1">
            <Upload size={12} />
            <span>导入视听文件</span>
            <input
              type="file"
              multiple
              accept="video/*,audio/*"
              className="hidden"
              onChange={onFileUpload}
            />
          </label>
        </div>
      ) : (
        <div className={styles.sourceList}>
          {sources.map(s => {
            const isSelected = s.id === (activeSource?.id || '');
            return (
              <div
                key={s.id}
                className={`${styles.sourceCard} ${isSelected ? styles.activeSource : ''}`}
                onClick={() => onSelectSource(s.id)}
              >
                <div
                  className={styles.sourceThumb}
                  style={{ background: s.bgGradient }}
                >
                  <span className={styles.sourceDuration}>{s.duration}</span>
                </div>
                <div className={styles.sourceInfo}>
                  <div className={styles.sourceName}>{s.name}</div>
                  <div className={styles.sourceMeta}>
                    {s.type === 'video' ? '4K 视频素材' : '高保真音频'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};
