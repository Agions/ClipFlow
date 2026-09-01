import React from 'react';
import {
  Download,
  MousePointer,
  Redo2,
  Scissors,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { MediaSourceItem } from '../types';
import styles from '../workspace.module.less';

interface MultiTrackTimelineProps {
  activeSource: MediaSourceItem | null;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  onExportJianying: () => void;
}

export const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({
  activeSource,
  zoomLevel,
  onZoomChange,
  onExportJianying,
}) => {
  return (
    <section className={styles.multiTrackStudio}>
      {/* 时间轴顶部工具条 */}
      <div className={styles.timelineToolbar}>
        <div className={styles.toolGroupLeft}>
          <span className={styles.timecodePill}>00:00:15:18</span>
          <div className={styles.dividerLine} />
          <button className={styles.iconToolBtn} title="撤销 (Cmd+Z)">
            <Undo2 size={13} />
          </button>
          <button className={styles.iconToolBtn} title="重做 (Cmd+Shift+Z)">
            <Redo2 size={13} />
          </button>
          <button className={styles.iconToolBtn} title="删除片段 (Delete)">
            <Trash2 size={13} />
          </button>
          <div className={styles.dividerLine} />
          <button className={`${styles.iconToolBtn} ${styles.activeToolBtn}`} title="选择工具 (V)">
            <MousePointer size={13} />
          </button>
          <button className={styles.iconToolBtn} title="剃刀切割工具 (C)">
            <Scissors size={13} />
          </button>
        </div>

        <div className={styles.toolGroupRight}>
          <div className={styles.zoomControlBox}>
            <ZoomOut size={13} className="text-text-tertiary" />
            <input
              type="range"
              min="10"
              max="100"
              value={zoomLevel}
              onChange={e => onZoomChange(parseInt(e.target.value, 10))}
              className="w-20 accent-purple-500"
            />
            <ZoomIn size={13} className="text-text-tertiary" />
          </div>

          <button className={styles.exportJianyingBtn} onClick={onExportJianying}>
            <Download size={13} />
            <span>导出剪映工程</span>
          </button>
        </div>
      </div>

      {/* 5 轨主视口 */}
      <div className={styles.timelineTracksContainer}>
        {/* 刻度尺 */}
        <div className={styles.rulerRow}>
          <div className={styles.trackHeaderLabel}>轨道信息</div>
          <div className={styles.rulerTicksArea}>
            <span style={{ left: '0%' }}>00:00:00</span>
            <span style={{ left: '20%' }}>00:00:45</span>
            <span style={{ left: '40%' }}>00:01:30</span>
            <span style={{ left: '60%' }}>00:02:15</span>
            <span style={{ left: '80%' }}>00:03:00</span>
            <span style={{ left: '100%' }}>00:03:30</span>
          </div>
        </div>

        {/* 轨道 1: V1 主视频 */}
        <div className={styles.trackLane}>
          <div className={styles.trackHeaderLabel}>
            <span className={styles.laneTagV}>V1</span>
            <span>主视频轨</span>
          </div>
          <div className={styles.laneContent}>
            <div className={`${styles.clipBlock} ${styles.v1Clip}`} style={{ left: '0%', width: '45%' }}>
              <span>{activeSource ? activeSource.name : '主视频镜头01'}</span>
            </div>
            <div className={`${styles.clipBlock} ${styles.v1Clip}`} style={{ left: '46%', width: '38%' }}>
              <span>主视频镜头02</span>
            </div>
          </div>
        </div>

        {/* 轨道 2: V2 空镜与特写 */}
        <div className={styles.trackLane}>
          <div className={styles.trackHeaderLabel}>
            <span className={styles.laneTagV}>V2</span>
            <span>AI 空镜轨</span>
          </div>
          <div className={styles.laneContent}>
            <div className={`${styles.clipBlock} ${styles.v2Clip}`} style={{ left: '22%', width: '18%' }}>
              <span>空镜_特写插帧</span>
            </div>
            <div className={`${styles.clipBlock} ${styles.v2Clip}`} style={{ left: '65%', width: '15%' }}>
              <span>特写_环境氛围</span>
            </div>
          </div>
        </div>

        {/* 轨道 3: A1 人声解说 */}
        <div className={styles.trackLane}>
          <div className={styles.trackHeaderLabel}>
            <span className={styles.laneTagA}>A1</span>
            <span>人声解说 TTS</span>
          </div>
          <div className={styles.laneContent}>
            <div className={`${styles.clipBlock} ${styles.a1Clip}`} style={{ left: '0%', width: '84%' }}>
              <span>TTS 解说音轨（智能倒叙 Hook 对齐）</span>
            </div>
          </div>
        </div>

        {/* 轨道 4: A2 背景配乐 */}
        <div className={styles.trackLane}>
          <div className={styles.trackHeaderLabel}>
            <span className={styles.laneTagA}>A2</span>
            <span>背景音乐 BGM</span>
          </div>
          <div className={styles.laneContent}>
            <div className={`${styles.clipBlock} ${styles.a2Clip}`} style={{ left: '0%', width: '100%' }}>
              <span>BGM 悬疑交响乐 (动态闪避 -12dB)</span>
            </div>
          </div>
        </div>

        {/* 轨道 5: A3 音效 FX */}
        <div className={styles.trackLane}>
          <div className={styles.trackHeaderLabel}>
            <span className={styles.laneTagA}>A3</span>
            <span>动作音效 FX</span>
          </div>
          <div className={styles.laneContent}>
            <div className={`${styles.clipBlock} ${styles.a3Clip}`} style={{ left: '15%', width: '8%' }}>
              <span>重击_FX</span>
            </div>
            <div className={`${styles.clipBlock} ${styles.a3Clip}`} style={{ left: '46%', width: '7%' }}>
              <span>反转_FX</span>
            </div>
          </div>
        </div>

        {/* 播放游标线 */}
        <div className={styles.playheadLine} style={{ left: '32%' }}>
          <div className={styles.playheadHandle} />
        </div>
      </div>
    </section>
  );
};
