/**
 * Highlights — 高光时刻列表
 *
 * 基于 Rust highlight_detector.rs 的音频能量+场景切换分析结果，
 * 以深色面板呈现，点击定位到 Timeline 播放头。
 *
 * 设计风格：AI Cinema Studio Dark
 * - bg-base: #08080a | accent: #c8956c | cyan: #5a9e9e
 */
import { MS_PER_SECOND } from '@/shared/utils';
import React, { useCallback } from 'react';
import { useReducerHookFactory } from '@/shared/hooks/use-reducer-hook';
import { Slider } from '@/components/ui/slider';
import { Zap, Crosshair, Lightbulb } from 'lucide-react';
import { highlightDetector } from '@/core/services/video/highlight-detector';
import { useEditorStore } from '@/stores';
import { notify } from '@/shared/utils/notify';
import type { VideoInfo } from '@/types';
import { highlightsReducer, initialHighlightsState, type Highlight } from './highlights-reducer';
import styles from './highlights.module.less';
import { formatTime } from '@/shared/utils/formatting';

const REASON_CONFIG: Record<string, { label: string; cls: string }> = {
  audio_energy: { label: 'Audio', cls: 'audio' },
  scene_change: { label: 'Scene', cls: 'scene' },
  motion_burst: { label: 'Motion', cls: 'motion' },
  combined: { label: 'Combo', cls: 'combo' },
};

interface HighlightsProps {
  videoInfo: VideoInfo;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
}

const Highlights: React.FC<HighlightsProps> = ({
  videoInfo,
  defaultExpanded: _defaultExpanded = false,
}) => {
  const { state, dispatch } = useReducerHookFactory(highlightsReducer, initialHighlightsState);
  const { highlights, detected, loading, error, threshold, topN } = state;
  const setPlayheadMs = useEditorStore(s => s.setPlayheadMs);

  const handleThresholdChange = (value: number | readonly number[]) => {
    const resolvedValue = Array.isArray(value) ? value[0] : value;
    dispatch({ type: 'SET_THRESHOLD', payload: resolvedValue });
  };

  const handleTopNChange = (value: number | readonly number[]) => {
    const resolvedValue = Array.isArray(value) ? value[0] : value;
    dispatch({ type: 'SET_TOPN', payload: resolvedValue });
  };

  const detect = useCallback(async () => {
    if (!videoInfo?.path) {
      notify.warning('视频路径不可用');
      return;
    }
    dispatch({ type: 'START_DETECT', payload: undefined });
    try {
      // PR-1.3a: 迁移到 highlightDetector（去除 VisionService 中转）
      const result = await highlightDetector.detectHighlights(videoInfo.path, {
        threshold,
        topN,
        minDurationMs: 500,
      });
      dispatch({ type: 'DETECT_SUCCESS', payload: result });
      notify.success(`检测到 ${result.length} 个高光`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      dispatch({ type: 'DETECT_FAILURE', payload: msg });
      notify.error(err, `高光检测失败: ${msg}`);
    }
  }, [videoInfo, threshold, topN, dispatch]);

  const handleSeek = useCallback(
    (h: Highlight) => {
      setPlayheadMs(h.startTime * MS_PER_SECOND);
    },
    [setPlayheadMs]
  );

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
              min={1.0}
              max={3.0}
              step={0.1}
              value={threshold}
              onValueChange={handleThresholdChange}
              className={styles.slider}
              disabled={loading}
            />
          </div>
          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>Top</span>
            <Slider
              min={3}
              max={30}
              step={1}
              value={topN}
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
            // Use composite key: startTime ensures uniqueness per highlight segment
            const id = `hl_${h.startTime}_${i}`;
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
                  <span
                    className={styles.timecode}
                    aria-label={`开始时间 ${formatTime(h.startTime)}`}
                  >
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
                  onClick={e => {
                    e.stopPropagation();
                    handleSeek(h);
                  }}
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

export { Highlights };
export type { Highlight, HighlightsProps };
