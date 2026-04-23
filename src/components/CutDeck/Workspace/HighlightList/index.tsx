/**
 * HighlightList — 高光时刻列表
 *
 * 基于 Rust highlight_detector.rs 的音频能量+场景切换分析结果，
 * 以深色面板呈现，点击定位到 Timeline 播放头。
 *
 * 设计风格：AI Cinema Studio Dark
 * - bg-base: #0C0D14 | accent: #FF9F43 | cyan: #00D4FF
 */
import React, { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Zap, Crosshair, Lightbulb } from 'lucide-react';
import { visionService } from '@/core/services/vision.service';
import { useEditorStore } from '@/store/editorStore';
import { notify } from '@/shared/utils/notify';
import type { VideoInfo } from '@/core/types';
import styles from './HighlightList.module.css';

interface Highlight {
  startTime: number;  // seconds
  endTime: number;    // seconds
  score: number;      // 0-1
  reason: string;
  audioScore?: number;
  sceneScore?: number;
  motionScore?: number;
}

const REASON_CONFIG: Record<string, { label: string; cls: string }> = {
  audio_energy: { label: 'Audio', cls: 'audio' },
  scene_change:  { label: 'Scene', cls: 'scene'  },
  motion_burst:  { label: 'Motion', cls: 'motion' },
  combined:      { label: 'Combo', cls: 'combo'  },
};

function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const cs = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

interface HighlightListProps {
  videoInfo: VideoInfo;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
}

const HighlightList: React.FC<HighlightListProps> = ({ videoInfo, defaultExpanded: _defaultExpanded = false }) => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [detected, setDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(1.5);
  const [topN, setTopN] = useState(10);
  const setPlayheadMs = useEditorStore((s) => s.setPlayheadMs);

  const handleThresholdChange = (value: number | readonly number[]) => {
    const val = Array.isArray(value) ? value[0] : value;
    setThreshold(val);
  };

  const handleTopNChange = (value: number | readonly number[]) => {
    const val = Array.isArray(value) ? value[0] : value;
    setTopN(val);
  };

  const detect = useCallback(async () => {
    if (!videoInfo?.path) {
      notify.warning('视频路径不可用');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await visionService.detectHighlights(videoInfo, {
        threshold,
        topN,
        minDurationMs: 500,
        detectScene: true,
      });
      setHighlights(result);
      setDetected(true);
      notify.success(`检测到 ${result.length} 个高光`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      notify.error(err, `高光检测失败: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [videoInfo, threshold, topN]);

  const handleSeek = useCallback((h: Highlight) => {
    setPlayheadMs(h.startTime * 1000);
  }, [setPlayheadMs]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Zap size={16} className={styles.headerIcon} />
          <span className={styles.headerTitle}>高光时刻</span>
          {detected && highlights.length > 0 && (
            <span className={styles.countBadge}>{highlights.length}</span>
          )}
        </div>

        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>阈值</span>
            <Slider
              min={1.0} max={3.0} step={0.1} value={threshold}
              onValueChange={handleThresholdChange}
              className={styles.slider}
              disabled={loading}
            />
          </div>
          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>Top</span>
            <Slider
              min={3} max={30} step={1} value={topN}
              onValueChange={handleTopNChange}
              className={styles.slider}
              disabled={loading}
            />
          </div>
          <button
            className={styles.detectBtn}
            onClick={detect}
            disabled={loading || !videoInfo?.path}
          >
            {loading ? <div className="animate-spin text-sm">⟳</div> : <Zap size={14} />}
            {loading ? '分析中…' : '自动检测'}
          </button>
        </div>
      </div>

      {/* Content */}
      {error && (
        <div className={styles.errorState} role="alert">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {detected && highlights.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <Lightbulb size={20} />
          <p>暂无高光数据，尝试降低阈值</p>
        </div>
      )}

      {highlights.length > 0 && (
        <ul className={styles.list}>
          {highlights.map((h, i) => {
            const id = `hl_${i}`;
            const scorePct = Math.round(h.score * 100);
            const reasonCfg = REASON_CONFIG[h.reason] ?? { label: h.reason, cls: 'default' };

            return (
              <li
                key={id}
                className={styles.item}
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => handleSeek(h)}
                role="listitem"
              >
                <div className={styles.itemHeader}>
                  <span className={styles.timecode} aria-label={`开始时间 ${formatTime(h.startTime)}`}>
                    {formatTime(h.startTime)}
                  </span>
                  <div className={styles.scoreGroup}>
                    <div
                      className={styles.scoreBar}
                      role="progressbar"
                      aria-valuenow={scorePct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className={styles.scoreFill} style={{ width: `${scorePct}%` }} />
                    </div>
                    <span className={styles.scoreValue}>{scorePct}%</span>
                  </div>
                </div>

                <div className={styles.itemMeta}>
                  <span className={styles.duration}>→ {formatTime(h.endTime)}</span>
                  <span className={`${styles.reasonTag} ${styles[`reason_${reasonCfg.cls}`]}`}>
                    {reasonCfg.label}
                  </span>
                  {h.audioScore != null && (
                    <span className={styles.subScore}>A {Math.round(h.audioScore * 100)}%</span>
                  )}
                  {h.sceneScore != null && (
                    <span className={styles.subScore}>S {Math.round(h.sceneScore * 100)}%</span>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.seekBtn}
                  onClick={(e) => { e.stopPropagation(); handleSeek(h); }}
                  aria-label="定位到此高光"
                >
                  <Crosshair size={12} /> 定位
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default HighlightList;
