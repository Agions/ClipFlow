import React from 'react';
import { Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { notify } from '@/shared';
import type { MediaSourceItem } from '../types';
import styles from '../workspace.module.less';

interface MonitorPlayerPanelProps {
  activeSource: MediaSourceItem | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const MonitorPlayerPanel: React.FC<MonitorPlayerPanelProps> = ({
  activeSource,
  isPlaying,
  onTogglePlay,
}) => {
  return (
    <main className={styles.monitorPlayerCol}>
      <div className={styles.videoPlayerContainer}>
        {/* 16:9 视口 */}
        <div className={styles.videoViewport}>
          <div
            className={styles.viewportScreen}
            style={{ background: activeSource ? activeSource.bgGradient : '#090a14' }}
          >
            {/* 水印指示 */}
            <div className={styles.liveWatermark}>
              <span className={styles.redDot} /> 实时监看
            </div>

            {activeSource ? (
              <div className={styles.subtitleOverlay}>
                “（当前正在实时回放已编排的 5 轨视听对齐片段）”
              </div>
            ) : (
              <div className="text-center text-text-tertiary p-4">
                <div className="text-xs text-white/80 font-medium mb-1">监看视口待命</div>
                <div className="text-[10px] text-text-tertiary">导入素材后在此实时监看画面分镜与字幕对齐</div>
              </div>
            )}
          </div>
        </div>

        {/* 播放控制与时间码栏 */}
        <div className={styles.transportBar}>
          <div className={styles.transportControls}>
            <button className={styles.transportBtn} onClick={() => notify.info('跳转至上一个分镜切点')}>
              <SkipBack size={14} />
            </button>
            <button
              className={`${styles.transportBtn} ${styles.playBtn}`}
              onClick={onTogglePlay}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5 fill-white" />}
            </button>
            <button className={styles.transportBtn} onClick={() => notify.info('跳转至下一个分镜切点')}>
              <SkipForward size={14} />
            </button>
          </div>

          <div className={styles.timecodeDisplay}>
            <span className={styles.currentTime}>00:00:15:18</span>
            <span className={styles.timeDivider}>/</span>
            <span className={styles.totalTime}>00:03:30:00</span>
          </div>

          <div className={styles.volumeGroup}>
            <Volume2 size={14} className="text-text-tertiary" />
            <input type="range" min="0" max="100" defaultValue="80" className="w-16 accent-purple-500" />
          </div>
        </div>
      </div>
    </main>
  );
};
