/**
 * EffectsPanel — Redesigned for AI Cinema Studio
 *
 * 4×3 filter grid with thumbnail previews, amber glow selection,
 * parameter sliders, live preview, and deep charcoal textured background.
 *
 * @design-system AI Cinema Studio
 *   bg-base: #0C0D14 | accent: #FF9F43 | cyan: #00D4FF
 *   font: Outfit + Figtree + JetBrains Mono
 *   glassmorphism: rgba(20, 21, 32, 0.8) + backdrop-filter: blur(20px)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import styles from './EffectsPanel.module.scss';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface EffectsPanelProps {
  videoPath?: string;
  videoDuration?: number;
  thumbnailUrl?: string;
  onApply?: (outputPath: string) => void;
  loading?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FilterType =
  | 'Sepia'
  | 'Vintage'
  | 'Contrast'
  | 'Brightness'
  | 'Saturation'
  | 'Blur'
  | 'Sharpen'
  | 'Vignette'
  | 'Grain'
  | 'Cinema'
  | 'Cool'
  | 'Warm';

interface FilterNode {
  id: string;
  type: FilterType;
  value: number;
  description: string;
}

interface FilterCatalogItem {
  type: FilterType;
  label: string;
  description: string;
  cssFilter: string;
  hasSlider: boolean;
  sliderConfig?: { min: number; max: number; step: number; default: number };
  icon: string;
  tagColor: string;
  /** Short label for grid cell */
  shortLabel: string;
}

interface PreviewResult {
  path: string;
  duration: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter catalog
// ─────────────────────────────────────────────────────────────────────────────

const CATALOG: FilterCatalogItem[] = [
  {
    type: 'Sepia',
    label: '复古滤镜',
    shortLabel: '复古',
    description: '温暖的棕褐色调，经典复古感',
    cssFilter: 'sepia(1)',
    hasSlider: false,
    icon: '🟫',
    tagColor: '#92400e',
  },
  {
    type: 'Vintage',
    label: '复古电影感',
    shortLabel: '电影',
    description: '褪色黑色 + 暖色调 + 轻微噪点',
    cssFilter: 'sepia(0.4) saturate(0.85) brightness(1.06) contrast(0.9)',
    hasSlider: false,
    icon: '🎞️',
    tagColor: '#b45309',
  },
  {
    type: 'Contrast',
    label: '对比度',
    shortLabel: '对比',
    description: '调整明暗对比强度',
    cssFilter: 'contrast(1.3)',
    hasSlider: true,
    sliderConfig: { min: 0.5, max: 2.5, step: 0.05, default: 1.3 },
    icon: '◐',
    tagColor: '#1d4ed8',
  },
  {
    type: 'Brightness',
    label: '亮度',
    shortLabel: '亮度',
    description: '调整画面整体明暗',
    cssFilter: 'brightness(1.1)',
    hasSlider: true,
    sliderConfig: { min: -0.5, max: 0.5, step: 0.02, default: 0.1 },
    icon: '☀️',
    tagColor: '#d97706',
  },
  {
    type: 'Saturation',
    label: '饱和度',
    shortLabel: '饱和',
    description: '调整色彩鲜艳程度',
    cssFilter: 'saturate(1.5)',
    hasSlider: true,
    sliderConfig: { min: 0, max: 3.0, step: 0.05, default: 1.2 },
    icon: '🌈',
    tagColor: '#7c3aed',
  },
  {
    type: 'Blur',
    label: '模糊',
    shortLabel: '模糊',
    description: '高斯模糊效果',
    cssFilter: 'blur(3px)',
    hasSlider: true,
    sliderConfig: { min: 0.5, max: 20, step: 0.5, default: 3 },
    icon: '💧',
    tagColor: '#0891b2',
  },
  {
    type: 'Sharpen',
    label: '锐化',
    shortLabel: '锐化',
    description: '增强边缘细节清晰度',
    cssFilter: 'contrast(1.15) saturate(1.1)',
    hasSlider: true,
    sliderConfig: { min: 0.5, max: 5.0, step: 0.1, default: 1.5 },
    icon: '🔪',
    tagColor: '#dc2626',
  },
  {
    type: 'Vignette',
    label: '暗角',
    shortLabel: '暗角',
    description: '在画面角落添加阴影边框',
    cssFilter: 'brightness(0.9) contrast(1.05)',
    hasSlider: false,
    icon: '🕳️',
    tagColor: '#44403c',
  },
  {
    type: 'Grain',
    label: '胶片颗粒',
    shortLabel: '颗粒',
    description: '模拟胶片电影的质感噪点',
    cssFilter: 'contrast(1.05) saturate(0.95)',
    hasSlider: true,
    sliderConfig: { min: 0.01, max: 0.3, step: 0.01, default: 0.08 },
    icon: '🎲',
    tagColor: '#78716c',
  },
  {
    type: 'Cinema',
    label: '电影感',
    shortLabel: '电影',
    description: '青阴影 + 橙高光的电影色调',
    cssFilter: 'saturate(1.1) sepia(0.15) contrast(1.05)',
    hasSlider: false,
    icon: '🎬',
    tagColor: '#1e3a8a',
  },
  {
    type: 'Cool',
    label: '冷色调',
    shortLabel: '冷色',
    description: '偏蓝的冷色温',
    cssFilter: 'saturate(0.9) hue-rotate(15deg) brightness(1.02)',
    hasSlider: false,
    icon: '❄️',
    tagColor: '#0369a1',
  },
  {
    type: 'Warm',
    label: '暖色调',
    shortLabel: '暖色',
    description: '偏黄的暖色温',
    cssFilter: 'saturate(1.1) sepia(0.1) brightness(1.03)',
    hasSlider: false,
    icon: '🍂',
    tagColor: '#b45309',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const catalogItem = (type: FilterType): FilterCatalogItem =>
  CATALOG.find((f) => f.type === type)!;

function toRustFilter(node: FilterNode): { type: string; value?: number } {
  const item = catalogItem(node.type);
  if (item.hasSlider) return { type: node.type, value: node.value };
  return { type: node.type };
}

function nodeToCssFilter(node: FilterNode): string {
  const item = catalogItem(node.type);
  switch (node.type) {
    case 'Contrast':   return `contrast(${node.value})`;
    case 'Brightness': return `brightness(${1 + node.value})`;
    case 'Saturation': return `saturate(${node.value})`;
    case 'Blur':       return `blur(${node.value}px)`;
    case 'Sharpen':    return `contrast(${1 + (node.value - 1) * 0.1}) saturate(${1 + (node.value - 1) * 0.05})`;
    case 'Grain':      return `contrast(${1 + node.value * 0.5})`;
    default:           return item.cssFilter;
  }
}

function chainLabel(chain: FilterNode[]): string {
  if (chain.length === 0) return '无';
  if (chain.length === 1) return chain[0].description;
  return `${chain.length} 个滤镜`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface FilterThumbProps {
  item: FilterCatalogItem;
  isActive: boolean;
  isSelected: boolean;
  onClick: () => void;
}

const FilterThumb: React.FC<FilterThumbProps> = React.memo(
  ({ item, isActive, isSelected, onClick }) => (
    <button
      type="button"
      className={`${styles.filterThumb} ${isSelected ? styles.filterThumbSelected : ''} ${isActive ? styles.filterThumbActive : ''}`}
      onClick={onClick}
      title={item.description}
      aria-pressed={isSelected}
    >
      {/* Thumbnail preview area */}
      <div
        className={styles.filterThumbPreview}
        style={{ filter: item.cssFilter }}
        aria-hidden="true"
      >
        {/* Gradient thumbnail simulating video frame */}
        <div className={styles.filterThumbBg} />
        <span className={styles.filterThumbIcon} aria-hidden="true">{item.icon}</span>
      </div>

      {/* Name label */}
      <span className={styles.filterThumbLabel}>{item.shortLabel}</span>

      {/* Active in chain indicator */}
      {isActive && (
        <span className={styles.filterThumbBadge} aria-label="已在滤镜链">
          ✓
        </span>
      )}
    </button>
  )
);
FilterThumb.displayName = 'FilterThumb';

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const EffectsPanel: React.FC<EffectsPanelProps> = ({
  videoPath,
  videoDuration = 10,
  thumbnailUrl,
  onApply,
  loading: externalLoading = false,
}) => {
  const [chain, setChain] = useState<FilterNode[]>([]);
  const [selectedType, setSelectedType] = useState<FilterType>('Sepia');
  const [sliderDraft, setSliderDraft] = useState<Record<string, number>>({});
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [msgApi, setMsgApi] = useState<{ info: (m: string) => void; success: (m: string) => void; warning: (m: string) => void; error: (m: string) => void } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Message API (must be called after mount)
  const msg = msgApi;

  useEffect(() => {
    // Lazy-load antd message to avoid SSR issues
    import('antd').then(({ message }) => {
      setMsgApi({
        info: (m) => message.info(m),
        success: (m) => message.success(m),
        warning: (m) => message.warning(m),
        error: (m) => message.error(m),
      });
    });
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!CATALOG.find((f) => f.type === selectedType)?.hasSlider) {
      setSliderDraft({});
    }
  }, [selectedType]);

  const isInChain = (type: FilterType) => chain.some((n) => n.type === type);

  const addToChain = useCallback(() => {
    const item = catalogItem(selectedType);
    const value = item.sliderConfig?.default ?? 1.0;
    const node: FilterNode = {
      id: `${selectedType}-${Date.now()}`,
      type: selectedType,
      value,
      description: item.label,
    };
    setChain((prev) => [...prev, node]);
    msg?.info(`已添加「${item.label}」到滤镜链`);
  }, [selectedType, msg]);

  const removeFromChain = useCallback((id: string) => {
    setChain((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateChainNode = useCallback((id: string, value: number) => {
    setChain((prev) =>
      prev.map((n) => (n.id === id ? { ...n, value } : n))
    );
  }, []);

  const clearChain = useCallback(() => {
    setChain([]);
    setPreviewPath(null);
    msg?.info('已清空滤镜链');
  }, [msg]);

  const handlePreview = useCallback(async () => {
    if (!videoPath) { msg?.warning('请先加载视频文件'); return; }
    if (chain.length === 0) { msg?.warning('请先添加至少一个滤镜'); return; }

    setPreviewing(true);
    setPreviewPath(null);
    try {
      const startTime = Math.min(videoDuration * 0.25, Math.max(0, videoDuration - 5));
      if (chain.length === 1) {
        const result = await invoke<PreviewResult>('generate_filter_preview', {
          inputPath: videoPath,
          filter: toRustFilter(chain[0]),
          startTime,
        });
        setPreviewPath(result.path);
        msg?.success('预览生成成功');
      } else {
        const result = await invoke<PreviewResult>('generate_chain_preview', {
          inputPath: videoPath,
          filters: chain.map(toRustFilter),
          startTime,
        });
        setPreviewPath(result.path);
        msg?.success('滤镜链预览生成成功');
      }
    } catch (err) {
      msg?.error(`预览生成失败: ${err}`);
    } finally {
      setPreviewing(false);
    }
  }, [videoPath, chain, videoDuration, msg]);

  const handleApply = useCallback(async () => {
    if (!videoPath) { msg?.warning('请先加载视频文件'); return; }
    if (chain.length === 0) { msg?.warning('请先添加至少一个滤镜'); return; }

    try {
      const savePath = await save({
        defaultPath: videoPath.replace(/\.[^.]+$/, '_filtered.mp4'),
        filters: [{ name: 'MP4 视频', extensions: ['mp4'] }],
      });
      if (!savePath) return;

      setApplying(true);
      if (chain.length === 1) {
        await invoke<string>('apply_filter', {
          input: {
            inputPath: videoPath,
            outputPath: savePath,
            filter: toRustFilter(chain[0]),
            startTime: null,
            endTime: null,
          },
        });
      } else {
        await invoke<string>('apply_filter_chain', {
          input: {
            inputPath: videoPath,
            outputPath: savePath,
            filters: chain.map(toRustFilter),
            startTime: null,
            endTime: null,
          },
        });
      }
      msg?.success('滤镜已应用到视频');
      onApply?.(savePath);
    } catch (err) {
      msg?.error(`应用滤镜失败: ${err}`);
    } finally {
      setApplying(false);
    }
  }, [videoPath, chain, msg, onApply]);

  const previewCssFilter = chain.length > 0
    ? chain.map(nodeToCssFilter).join(' ')
    : 'none';

  const selectedItem = catalogItem(selectedType);
  const currentSliderValue = sliderDraft[selectedType] ?? selectedItem.sliderConfig?.default ?? 1;

  return (
    <div className={styles.panel} role="region" aria-label="视频特效面板">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon} aria-hidden="true">🎨</span>
          <h2 className={styles.headerTitle}>视频特效</h2>
        </div>
        <div className={styles.headerRight}>
          {chain.length > 0 && (
            <span className={styles.chainBadge}>
              <span className={styles.chainBadgeDot} />
              {chainLabel(chain)}
            </span>
          )}
          {chain.length > 0 && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={clearChain}
              aria-label="清空滤镜链"
            >
              清空
            </button>
          )}
        </div>
      </header>

      <div className={styles.body}>
        {/* ── Left: Filter grid + controls ──────────────────── */}
        <section className={styles.catalogSection} aria-label="滤镜目录">
          <p className={styles.sectionLabel}>选择滤镜</p>

          <div className={styles.filterGrid} role="listbox" aria-label="滤镜列表">
            {CATALOG.map((item) => (
              <FilterThumb
                key={item.type}
                item={item}
                isActive={isInChain(item.type)}
                isSelected={selectedType === item.type}
                onClick={() => !isInChain(item.type) && setSelectedType(item.type)}
              />
            ))}
          </div>

          {/* Selected filter info + slider */}
          <div className={styles.selectedInfo}>
            <div className={styles.selectedHeader}>
              <span
                className={styles.selectedIcon}
                aria-hidden="true"
              >
                {selectedItem.icon}
              </span>
              <div>
                <p className={styles.selectedName}>{selectedItem.label}</p>
                <p className={styles.selectedDesc}>{selectedItem.description}</p>
              </div>
            </div>

            {selectedItem.hasSlider && (
              <div className={styles.sliderArea}>
                <div className={styles.sliderLabel}>
                  <span className={styles.sliderLabelText}>强度</span>
                  <span className={styles.sliderValue}>{currentSliderValue.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  className={styles.slider}
                  min={selectedItem.sliderConfig!.min}
                  max={selectedItem.sliderConfig!.max}
                  step={selectedItem.sliderConfig!.step}
                  value={currentSliderValue}
                  onChange={(e) =>
                    setSliderDraft((prev) => ({
                      ...prev,
                      [selectedType]: parseFloat(e.target.value),
                    }))
                  }
                  aria-label={`${selectedItem.label} 强度`}
                  aria-valuemin={selectedItem.sliderConfig!.min}
                  aria-valuemax={selectedItem.sliderConfig!.max}
                  aria-valuenow={currentSliderValue}
                />
              </div>
            )}

            <button
              type="button"
              className={`${styles.addBtn} ${isInChain(selectedType) ? styles.addBtnDisabled : ''}`}
              onClick={addToChain}
              disabled={isInChain(selectedType)}
              aria-disabled={isInChain(selectedType)}
            >
              {isInChain(selectedType)
                ? '✓ 已在滤镜链中'
                : `+ 添加「${selectedItem.label}」`}
            </button>
          </div>
        </section>

        {/* ── Right: Preview + chain ─────────────────────────── */}
        <aside className={styles.previewSection}>
          <p className={styles.sectionLabel}>实时预览</p>

          <div className={styles.previewPane}>
            <div
              className={styles.previewImage}
              style={{
                backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : undefined,
                filter: previewCssFilter,
              }}
              aria-label="滤镜预览"
              role="img"
            >
              {!thumbnailUrl && (
                <div className={styles.previewPlaceholder}>
                  <span className={styles.previewPlaceholderIcon} aria-hidden="true">👁️</span>
                  <span className={styles.previewPlaceholderText}>加载视频后预览</span>
                </div>
              )}
            </div>

            {chain.length > 0 && (
              <div className={styles.previewCssLabel} aria-hidden="true">
                {previewCssFilter}
              </div>
            )}
          </div>

          <div className={styles.previewActions}>
            <button
              type="button"
              className={`${styles.previewBtn} ${previewing ? styles.loading : ''}`}
              onClick={handlePreview}
              disabled={chain.length === 0 || !videoPath || externalLoading || previewing}
              aria-busy={previewing}
            >
              {previewing ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  生成中…
                </>
              ) : <><span aria-hidden="true">⚡</span> 生成预览</>}
            </button>
            <button
              type="button"
              className={`${styles.applyBtn} ${applying ? styles.loading : ''}`}
              onClick={handleApply}
              disabled={chain.length === 0 || !videoPath || externalLoading || applying}
              aria-busy={applying}
            >
              {applying ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  应用中…
                </>
              ) : '💾 应用到视频'}
            </button>
          </div>

          {/* Chain list */}
          {chain.length > 0 && (
            <div className={styles.chainSection}>
              <p className={styles.sectionLabel}>滤镜链 ({chain.length})</p>
              <ul className={styles.chainList} role="list">
                {chain.map((node) => {
                  const item = catalogItem(node.type);
                  return (
                    <li key={node.id} className={styles.chainNode}>
                      <span className={styles.chainNodeIcon} aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className={styles.chainNodeName}>{item.label}</span>
                      {item.hasSlider && (
                        <input
                          type="range"
                          className={`${styles.slider} ${styles.chainSlider}`}
                          min={item.sliderConfig!.min}
                          max={item.sliderConfig!.max}
                          step={item.sliderConfig!.step}
                          value={node.value}
                          onChange={(e) =>
                            updateChainNode(node.id, parseFloat(e.target.value))
                          }
                          aria-label={`调整 ${item.label} 强度`}
                        />
                      )}
                      <button
                        type="button"
                        className={styles.chainRemoveBtn}
                        onClick={() => removeFromChain(node.id)}
                        aria-label={`移除 ${item.label}`}
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* Loading overlay */}
      {(previewing || applying) && (
        <div className={styles.loadingOverlay} aria-live="polite" role="status">
          <span className={styles.spinnerLarge} aria-hidden="true" />
          <span>{applying ? '正在应用滤镜…' : '正在生成预览…'}</span>
        </div>
      )}
    </div>
  );
};

export default EffectsPanel;
