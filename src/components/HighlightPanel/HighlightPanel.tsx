/**
 * HighlightPanel — Redesigned for AI Cinema Studio
 *
 * Deep charcoal card style, JetBrains Mono timecodes,
 * amber progress bars for heat/score, click-to-seek.
 *
 * @design-system AI Cinema Studio
 *   bg-base: #0C0D14 | accent: #FF9F43 | cyan: #00D4FF
 *   font: Outfit + Figtree + JetBrains Mono
 */

import React, { useState, useCallback } from 'react';
import { Button, Slider, Tooltip, Spin, message } from 'antd';
import {
  ThunderboltOutlined,
  AimOutlined,
  PlayCircleOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import type { HighlightSegment } from '@/core/video/highlight.types';
import styles from './HighlightPanel.module.scss';

interface HighlightPanelProps {
  videoPath?: string;
  onSeekTo?: (timeMs: number) => void;
  onPreviewHighlight?: (highlight: HighlightSegment) => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
}

const REASON_CONFIG: Record<string, { label: string; cls: string }> = {
  audio_energy: { label: 'Audio', cls: 'audio' },
  scene_change:  { label: 'Scene',  cls: 'scene'  },
  motion_burst:  { label: 'Motion', cls: 'motion' },
  combined:      { label: 'Combo',  cls: 'combo'  },
};

const HighlightPanel: React.FC<HighlightPanelProps> = ({
  videoPath,
  onSeekTo,
  onPreviewHighlight,
}) => {
  const [highlights, setHighlights] = useState<HighlightSegment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(1.5);
  const [topN, setTopN] = useState(10);

  const detectHighlights = useCallback(async () => {
    if (!videoPath) {
      message.warning('请先加载视频文件');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const input = {
        videoPath,
        threshold,
        minDurationMs: 500,
        topN,
        windowMs: 100,
        detectScene: true,
        sceneThreshold: 0.3,
      };
      const result = await invoke<HighlightSegment[]>('detect_highlights', { input });
      setHighlights(result);
      message.success(`检测到 ${result.length} 个高光时刻`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      message.error(`高光检测失败: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  }, [videoPath, threshold, topN]);

  const handleItemClick = useCallback((highlight: HighlightSegment) => {
    setSelectedId(`${highlight.startMs}`);
    onSeekTo?.(highlight.startMs);
  }, [onSeekTo]);

  const handlePreviewClick = useCallback(
    (e: React.MouseEvent, highlight: HighlightSegment) => {
      e.stopPropagation();
      onPreviewHighlight?.(highlight);
    },
    [onPreviewHighlight]
  );

  return (
    <div className={styles.container} role="region" aria-label="高光检测面板">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon} aria-hidden="true">⚡</span>
          <h2 className={styles.headerTitle}>高光检测</h2>
          {highlights.length > 0 && (
            <span className={styles.countBadge} aria-label={`共 ${highlights.length} 个高光`}>
              {highlights.length}
            </span>
          )}
        </div>

        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>阈值</span>
            <Slider
              className={styles.slider}
              min={1.0}
              max={3.0}
              step={0.1}
              value={threshold}
              onChange={setThreshold}
              tooltip={{ formatter: (v: number) => `${v.toFixed(1)}x` }}
            />
          </div>
          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>Top</span>
            <Slider
              className={styles.slider}
              min={3}
              max={30}
              step={1}
              value={topN}
              onChange={setTopN}
              tooltip={{ formatter: (v: number) => `${v}` }}
            />
          </div>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={detectHighlights}
            loading={isLoading}
            disabled={!videoPath}
            size="small"
            className={styles.detectBtn}
          >
            自动检测
          </Button>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────── */}
      <main className={styles.content} role="list" aria-label="高光列表">
        {error && (
          <div className={styles.errorState} role="alert">
            <span className={styles.errorIcon} aria-hidden="true">⚠️</span>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {isLoading && (
          <div className={styles.loadingState} role="status" aria-live="polite">
            <Spin size="large" />
            <span className={styles.loadingText}>正在分析视频音频能量…</span>
          </div>
        )}

        {!isLoading && !error && highlights.length === 0 && (
          <div className={styles.emptyState}>
            <BulbOutlined className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyTitle}>暂无高光数据</p>
            <p className={styles.emptyHint}>
              点击「自动检测」按钮<br />基于音频能量分析自动识别精彩片段
            </p>
          </div>
        )}

        {!isLoading && highlights.length > 0 && (
          <ul className={styles.list}>
            {highlights.map((h, i) => {
              const id = `${h.startMs}`;
              const isSelected = selectedId === id;
              const scorePct = Math.round(h.score * 100);
              const reasonCfg = REASON_CONFIG[h.reason] ?? { label: h.reason, cls: 'default' };

              return (
                <li
                  key={id}
                  className={`${styles.item} ${isSelected ? styles.itemSelected : ''}`}
                  onClick={() => handleItemClick(h)}
                  role="listitem"
                  aria-selected={isSelected}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {/* Card header: timecode + score */}
                  <div className={styles.itemHeader}>
                    <span className={styles.timecode} aria-label={`开始时间 ${formatTime(h.startMs)}`}>
                      {formatTime(h.startMs)}
                    </span>
                    <div className={styles.scoreGroup}>
                      <div
                        className={styles.scoreBar}
                        role="progressbar"
                        aria-valuenow={scorePct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`热度 ${scorePct}%`}
                      >
                        <div
                          className={styles.scoreFill}
                          style={{ width: `${scorePct}%` }}
                        />
                      </div>
                      <span className={styles.scoreValue}>{scorePct}%</span>
                    </div>
                  </div>

                  {/* Duration range */}
                  <div className={styles.itemMeta}>
                    <span className={styles.duration}>
                      → {formatTime(h.endMs)}
                    </span>
                    <span className={`${styles.reasonTag} ${styles[`reason_${reasonCfg.cls}`]}`}>
                      {reasonCfg.label}
                    </span>
                    {h.audioScore !== undefined && (
                      <Tooltip title="音频分数">
                        <span className={styles.subScore}>A {Math.round(h.audioScore * 100)}%</span>
                      </Tooltip>
                    )}
                    {h.sceneScore !== undefined && (
                      <Tooltip title="场景分数">
                        <span className={styles.subScore}>S {Math.round(h.sceneScore * 100)}%</span>
                      </Tooltip>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={(e) => { e.stopPropagation(); handleItemClick(h); }}
                      aria-label="定位到此高光"
                    >
                      <AimOutlined /> 定位
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={(e) => handlePreviewClick(e, h)}
                      aria-label="预览此高光"
                    >
                      <PlayCircleOutlined /> 预览
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
};

export default HighlightPanel;
