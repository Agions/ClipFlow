/**
 * 步骤6: 导出视频 — AI Cinema Studio Redesign
 */
import React, { useState, useEffect } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useCutDeck } from '../AIEditorContext';
import { notify } from '@/shared';
import type { ExportSettings } from '@/core/types';
import styles from './VideoExport.module.less';

interface VideoExportProps {
  onComplete?: () => void;
}

// 导出格式
const FORMAT_OPTIONS = [
  { value: 'mp4', label: 'MP4', desc: '通用格式', emoji: '🎬' },
  { value: 'mov', label: 'MOV', desc: 'Apple 高质量', emoji: '🍎' },
  { value: 'gif', label: 'GIF', desc: '动画格式', emoji: '🎞️' },
] as const;

// 质量选项
const QUALITY_OPTIONS = [
  { value: '1080p', label: 'Full HD' },
  { value: '720p', label: 'HD' },
  { value: '480p', label: 'SD' },
] as const;

// 分辨率选项
const RESOLUTION_OPTIONS = [
  { value: '1080p', label: '1080p Full HD', res: '1920×1080' },
  { value: '720p', label: '720p HD', res: '1280×720' },
  { value: '480p', label: '480p SD', res: '854×480' },
  { value: '2k', label: '2K QHD', res: '2560×1440' },
] as const;

// 帧率选项
const FPS_OPTIONS = [
  { value: 24, label: '24 fps' },
  { value: 30, label: '30 fps' },
  { value: 60, label: '60 fps' },
] as const;

const VideoExport: React.FC<VideoExportProps> = ({ onComplete }) => {
  const { state, setExportSettings, dispatch } = useCutDeck();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [exported, setExported] = useState(false);
  const [exportedFile, setExportedFile] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // 监听 Rust processing-progress 事件，驱动真实进度
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    if (exporting) {
      const startTime = Date.now();
      listen<{ stage: string; progress: number; time_remaining_secs?: number }>(
        'processing-progress',
        (event) => {
          const { stage, progress, time_remaining_secs } = event.payload;
          setProgress(Math.round(progress * 100));
          setProgressStage(stage);
          if (time_remaining_secs !== undefined) {
            setEtaSeconds(Math.round(time_remaining_secs));
          }
        }
      ).then((fn) => { unlisten = fn; });
    }
    return () => { unlisten?.(); };
  }, [exporting]);

  const [config, setConfig] = useState<ExportSettings>({
    format: state.exportSettings?.format || 'mp4',
    quality: state.exportSettings?.quality || 'high',
    resolution: state.exportSettings?.resolution || '1080p',
    fps: state.exportSettings?.fps || 30,
    frameRate: state.exportSettings?.frameRate || 30,
    includeSubtitles: state.exportSettings?.includeSubtitles ?? true,
    burnSubtitles: state.exportSettings?.burnSubtitles ?? true,
    includeWatermark: state.exportSettings?.includeWatermark ?? false,
  });

  const estimateFileSize = () => {
    if (!state.currentVideo?.duration) return '0 MB';
    const bitrateMap: Record<string, number> = { low: 1.5, medium: 4, high: 10, ultra: 30 };
    const bitrate = bitrateMap[config.quality] || 5;
    const sizeMB = (bitrate * state.currentVideo.duration) / 8;
    return sizeMB > 1000 ? `${(sizeMB / 1000).toFixed(1)} GB` : `${sizeMB.toFixed(1)} MB`;
  };

  const handleExport = async () => {
    if (!state.synthesisData?.finalVideoUrl) {
      notify.warning('请先完成视频合成');
      return;
    }

    setExporting(true);
    setProgress(0);
    setProgressStage('准备导出...');
    setEtaSeconds(null);
    setExportError(null);

    try {
      // 获取当前视频时长用于输出文件名
      const duration = state.currentVideo?.duration ?? 0;
      const outputPath = `/tmp/CutDeck/export_${Date.now()}.mp4`;

      setProgressStage('正在编码...');

      // 实际调用 Rust render_autonomous_cut
      const result = await invoke<string>('render_autonomous_cut', {
        input: {
          input: state.synthesisData.finalVideoUrl ?? '',
          outputPath,
        },
      });

      setProgress(100);
      setProgressStage('导出完成');
      setEtaSeconds(0);

      setExportSettings(config);
      setExportedFile(outputPath);
      setExported(true);
      notify.success('视频导出完成！');
      onComplete?.();

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setExportError(msg);
      notify.error(`导出失败: ${msg}`);
    } finally {
      setExporting(false);
    }
  };

  const hasSynthesis = !!state.synthesisData?.finalVideoUrl;

  // 前置检查
  if (!hasSynthesis) {
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepTitle}>
          <div className={styles.stepTitleLeft}>
            <h2>📤 导出设置</h2>
          </div>
        </div>
        <div className={styles.warningAlert}>
          ⚠️ 请先完成视频合成
          <button
            className={styles.warningAlertBtn}
            onClick={() => dispatch({ type: 'SET_STEP', payload: 'video-synthesize' })}
          >
            去合成
          </button>
        </div>
      </div>
    );
  }

  // 导出完成
  if (exported) {
    return (
      <div className={styles.stepContent}>
        <div className={styles.completeCard}>
          <svg className={styles.completeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h3 className={styles.completeTitle}>🎉 视频导出成功！</h3>
          <div className={styles.completeMeta}>
            <span className={styles.completeMetaTag}>{config.format.toUpperCase()}</span>
            <span className={styles.completeMetaTag}>{config.resolution}</span>
            <span className={styles.completeMetaTag}>{config.frameRate}fps</span>
          </div>
          <div className={styles.completeSub}>预估大小：{estimateFileSize()}</div>
          <div className={styles.completeActions}>
            <button className={`${styles.completeBtn} ${styles.completeBtnSecondary}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
              预览
            </button>
            <button className={`${styles.completeBtn} ${styles.completeBtnPrimary}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              下载视频
            </button>
            <button className={`${styles.completeBtn} ${styles.completeBtnSecondary}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              分享
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 导出中
  if (exporting) {
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <div className={styles.stepContent}>
        <div className={styles.exportingCard}>
          <div className={styles.progressCircle}>
            <svg className={styles.progressCircleSvg} viewBox="0 0 100 100">
              <circle className={styles.progressCircleTrack} cx="50" cy="50" r="45" />
              <circle
                className={styles.progressCircleFill}
                cx="50"
                cy="50"
                r="45"
                style={{ strokeDashoffset: offset }}
              />
            </svg>
            <div className={styles.progressPercent}>{progress}%</div>
          </div>
          <div className={styles.progressLabel}>
            {progressStage || (
              progress < 30 ? '🎬 视频编码中...' :
              progress < 60 ? '🔊 音频编码中...' :
              progress < 90 ? '💾 生成文件...' :
              '✨ 导出完成！'
            )}
          </div>
          <div className={styles.progressSub}>
            {etaSeconds !== null && etaSeconds > 0
              ? `预计剩余: ${etaSeconds}s`
              : etaSeconds === 0 ? '导出完成！' : '请耐心等待...'}
          </div>

          {/* 进度条 */}
          <div className={styles.progressBarSection}>
            <div className={styles.progressBarTrack}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className={styles.progressBarPercent}>{progress}%</div>
          </div>
        </div>
      </div>
    );
  }

  // 配置界面
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepTitle}>
        <div className={styles.stepTitleLeft}>
          <h2>📤 导出设置</h2>
          <div className={styles.tagGroup}>
            <span className={styles.tag}>{config.format.toUpperCase()}</span>
            <span className={styles.tag}>{config.resolution}</span>
            <span className={styles.tag}>{config.frameRate}fps</span>
          </div>
        </div>
      </div>

      <div className={styles.columns}>
        {/* ====== 左侧：设置面板 ====== */}
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <svg className={styles.cardHeaderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <h3 className={styles.cardTitle}>导出配置</h3>
          </div>

          <div className={styles.cardBody}>
            {/* 格式选择 */}
            <div className={styles.formatSection}>
              <span className={styles.sectionLabel}>输出格式</span>
              <div className={styles.formatGrid}>
                {FORMAT_OPTIONS.map(fmt => (
                  <div
                    key={fmt.value}
                    className={`${styles.formatItem} ${config.format === fmt.value ? styles.formatActive : ''}`}
                    onClick={() => setConfig({ ...config, format: fmt.value as ExportSettings['format'] })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setConfig({ ...config, format: fmt.value as ExportSettings['format'] })}
                  >
                    <div className={styles.formatCheck}>
                      <div className={styles.formatCheckDot} />
                    </div>
                    <span className={styles.formatEmoji}>{fmt.emoji}</span>
                    <span className={styles.formatName}>{fmt.label}</span>
                    <span className={styles.formatDesc}>{fmt.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 质量选择 */}
            <div className={styles.qualitySection}>
              <span className={styles.sectionLabel}>输出质量</span>
              <div className={styles.qualityGrid}>
                {QUALITY_OPTIONS.map(q => (
                  <div
                    key={q.value}
                    className={`${styles.qualityItem} ${config.resolution === q.value ? styles.qualityActive : ''}`}
                    onClick={() => setConfig({ ...config, resolution: q.value as ExportSettings['resolution'] })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setConfig({ ...config, resolution: q.value as ExportSettings['resolution'] })}
                  >
                    <span className={styles.qualityValue}>{q.value}</span>
                    <span className={styles.qualityLabel}>{q.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 分辨率和帧率 */}
            <div className={styles.rowGroup}>
              <div className={styles.optionGroup}>
                <label htmlFor="resolutionSelect">分辨率</label>
                <div className={styles.optionWrapper}>
                  <select
                    id="resolutionSelect"
                    className={styles.optionSelect}
                    value={config.resolution}
                    onChange={(e) => setConfig({ ...config, resolution: e.target.value as ExportSettings['resolution'] })}
                  >
                    {RESOLUTION_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label} ({r.res})</option>
                    ))}
                  </select>
                  <svg className={styles.optionArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              <div className={styles.optionGroup}>
                <label htmlFor="fpsSelect">帧率</label>
                <div className={styles.optionWrapper}>
                  <select
                    id="fpsSelect"
                    className={styles.optionSelect}
                    value={config.frameRate}
                    onChange={(e) => setConfig({ ...config, frameRate: Number(e.target.value) as ExportSettings['frameRate'] })}
                  >
                    {FPS_OPTIONS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <svg className={styles.optionArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 字幕选项 */}
            <div className={styles.toggleSection}>
              <div className={styles.toggleRow}>
                <div className={styles.toggleLabelGroup}>
                  <span className={styles.toggleLabel}>包含字幕文件</span>
                  <span className={styles.toggleSubLabel}>导出 .srt 字幕文件</span>
                </div>
                <button
                  className={`${styles.toggle} ${config.includeSubtitles ? styles.toggleOn : ''}`}
                  onClick={() => setConfig({ ...config, includeSubtitles: !config.includeSubtitles })}
                  role="switch"
                  aria-checked={config.includeSubtitles}
                />
              </div>
              <div className={styles.toggleRow}>
                <div className={styles.toggleLabelGroup}>
                  <span className={styles.toggleLabel}>烧录字幕到视频</span>
                  <span className={styles.toggleSubLabel}>字幕将永久显示在画面上</span>
                </div>
                <button
                  className={`${styles.toggle} ${config.burnSubtitles ? styles.toggleOn : ''}`}
                  onClick={() => setConfig({ ...config, burnSubtitles: !config.burnSubtitles })}
                  role="switch"
                  aria-checked={config.burnSubtitles}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ====== 右侧：导出信息 ====== */}
        <div className={styles.infoCard}>
          <div className={styles.infoHeader}>
            <svg className={styles.cardHeaderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <h3 className={styles.infoTitle}>导出信息</h3>
          </div>

          <div className={styles.infoBody}>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>原始视频</span>
                <span className={styles.infoValue} style={{ fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {state.currentVideo?.name || '-'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>时长</span>
                <span className={styles.infoValue}>{Math.floor(state.currentVideo?.duration || 0)} 秒</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>格式</span>
                <span className={styles.infoTag}>{config.format.toUpperCase()}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>分辨率</span>
                <span className={styles.infoTag}>{config.resolution}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>帧率</span>
                <span className={styles.infoValue}>{config.frameRate} fps</span>
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.sizeEstimate}>
              <span className={styles.sizeLabel}>预估大小</span>
              <span className={styles.sizeValue}>{estimateFileSize()}</span>
            </div>

            <div className={styles.exportActions}>
              {/* 一键导出 */}
              <button
                className={`${styles.exportBtn} ${styles.exportBtnPrimary}`}
                onClick={handleExport}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                一键导出
              </button>

              {/* 自定义导出 */}
              <button
                className={`${styles.exportBtn} ${styles.exportBtnSecondary}`}
                onClick={handleExport}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                自定义导出
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoExport;
