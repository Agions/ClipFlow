/**
 * ClipRepurpose — AI 长视频 → 多短片段自动拆条
 *
 * 使用 ClipRepurposingPipeline：
 *   1. 分析视频 → 识别高光候选片段
 *   2. 多维评分 → 排序选择最佳片段（6维：笑声/情感/完整度/静默/节奏/关键词）
 *   3. SEO 元数据生成 → 每片段标题/描述/hashtags
 *   4. 多格式导出 → 9:16 / 1:1 / 16:9（新增）
 *
 * @design-system AI Cinema Studio
 *   bg-base: #0C0D14 | accent: #FF9F43 | cyan: #00D4FF
 */

import React, { useState, useCallback, memo } from 'react';
import { useCutDeck } from '../AIEditorContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tag, Checkbox, Select, message } from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { motion } from '@/components/common/motion-shim';
import { ClipRepurposingPipeline } from '@/core/services/clipRepurposing/pipeline';
import type { VideoInfo, VideoAnalysis } from '@/core/types';
import type {
  RepurposingClip,
  PipelineStage,
  RepurposingOptions,
} from '@/core/services/clipRepurposing/pipeline';
import type { SocialPlatform } from '@/core/services/clipRepurposing/seoGenerator';
import { transcodeWithCrop, type AspectRatio } from '@/services/tauri';
import styles from './ClipRippling.module.css';

const { Option } = Select;

// 平台选项
const PLATFORM_OPTIONS: { value: SocialPlatform; label: string; emoji: string }[] = [
  { value: 'douyin', label: '抖音', emoji: '🎵' },
  { value: 'xiaohongshu', label: '小红书', emoji: '📕' },
  { value: 'bilibili', label: 'B站', emoji: '📺' },
  { value: 'youtube_shorts', label: 'YouTube Shorts', emoji: '▶️' },
  { value: 'tiktok', label: 'TikTok', emoji: '🌐' },
];

// 导出格式选项
const FORMAT_OPTIONS: { value: AspectRatio; label: string; emoji: string }[] = [
  { value: '9:16', label: '9:16 竖屏', emoji: '📱' },
  { value: '1:1', label: '1:1 方屏', emoji: '🖼️' },
  { value: '16:9', label: '16:9 横屏', emoji: '🖥️' },
];

interface ClipRepurposeProps {
  onNext?: () => void;
}

const ClipRepurpose: React.FC<ClipRepurposeProps> = memo(({ onNext }) => {
  const { state } = useCutDeck();
  const { currentVideo, analysis } = state;
  const videoPath = currentVideo?.path ?? '';
  const videoInfo: VideoInfo = currentVideo
    ? {
        id: currentVideo.id || `video_${Date.now()}`,
        name: currentVideo.name || 'video',
        path: currentVideo.path,
        duration: currentVideo.duration,
        width: currentVideo.width ?? 1920,
        height: currentVideo.height ?? 1080,
        size: currentVideo.size || 0,
        fps: 30,
        format: 'mp4',
      }
    : { id: '', name: '', path: '', duration: 0, width: 1920, height: 1080, size: 0, fps: 30, format: 'mp4' };
  const [platform, setPlatform] = useState<SocialPlatform>('douyin');
  const [selectedFormats, setSelectedFormats] = useState<AspectRatio[]>(['9:16', '1:1']);
  const [targetCount, setTargetCount] = useState(5);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<PipelineStage | ''>('');
  const [results, setResults] = useState<RepurposingClip[]>([]);
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportedPaths, setExportedPaths] = useState<string[]>([]);

  const handleRun = useCallback(async () => {
    if (!videoPath || !videoInfo) {
      message.warning('请先上传视频并完成分析');
      return;
    }

    setRunning(true);
    setProgress(0);
    setResults([]);
    setExportedPaths([]);

    try {
      const pipeline = new ClipRepurposingPipeline();
      const options: RepurposingOptions = {
        targetClipCount: targetCount,
        minClipDuration: 15,
        maxClipDuration: 120,
        platform,
        exportFormats: selectedFormats,
        multiFormat: false, // 前端自行调用 transcodeWithCrop
        generateSEO: true,
        onProgress: (stg, prog, msg) => {
          setStage(stg);
          setProgress(prog);
          if (msg) message.info(msg);
        },
      };

      const result = await pipeline.run(
        videoInfo,
        analysis ?? ({} as VideoAnalysis),
        options
      );

      setResults(result.clips);
      // 默认全选
      setSelectedClips(new Set(result.clips.map(c => c.clip.id).filter((id): id is string => id !== undefined)));
      message.success(`生成 ${result.clips.length} 个短片段`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      message.error(`拆条失败: ${msg}`);
    } finally {
      setRunning(false);
    }
  }, [videoPath, videoInfo, analysis, platform, selectedFormats, targetCount]);

  const handleExport = useCallback(async () => {
    if (selectedClips.size === 0) {
      message.warning('请先选择要导出的片段');
      return;
    }
    if (selectedFormats.length === 0) {
      message.warning('请至少选择一种导出格式');
      return;
    }

    setExporting(true);
    const exported: string[] = [];
    const clipsToExport = results.filter(c => c.clip.id !== undefined && selectedClips.has(c.clip.id));

    // 动态获取导出目录
    const exportDir = await invoke<string>('get_export_dir').catch(() => '/tmp/CutDeck');

    try {
      for (const clip of clipsToExport) {
        for (const fmt of selectedFormats) {
          const filename = `clip_${clip.clip.id}_${fmt.replace(':', 'x')}.mp4`;
          const outputPath = await transcodeWithCrop({
            inputPath: videoPath,
            outputPath: `${exportDir}/${filename}`,
            aspect: fmt,
            startTime: clip.clip.startTime,
            endTime: clip.clip.endTime,
            quality: 'high',
          });
          exported.push(outputPath);
        }
      }
      setExportedPaths(exported);
      message.success(`导出完成！共 ${exported.length} 个文件`);
      if (exported.length > 0) onNext?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      message.error(`导出失败: ${msg}`);
    } finally {
      setExporting(false);
    }
  }, [results, selectedClips, selectedFormats, videoPath, onNext]);

  const toggleClip = (id: string) => {
    setSelectedClips(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}><span aria-hidden="true">🎬</span> AI 智能拆条</h2>
        <p className={styles.subtitle}>长视频 → 多段精彩短片段，自动识别高光 · 多维评分 · 多格式导出</p>
      </div>

      {/* 控制面板 */}
      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <label className={styles.label}>目标平台</label>
          <Select
            value={platform}
            onChange={v => setPlatform(v)}
            className={styles.select}
            size="large"
          >
            {PLATFORM_OPTIONS.map(o => (
              <Option key={o.value} value={o.value}>
                {o.emoji} {o.label}
              </Option>
            ))}
          </Select>
        </div>

        <div className={styles.controlRow}>
          <label className={styles.label}>目标片段数</label>
          <Select
            value={targetCount}
            onChange={setTargetCount}
            className={styles.select}
            size="large"
          >
            {[3, 5, 8, 10, 15].map(n => (
              <Option key={n} value={n}>{n} 个</Option>
            ))}
          </Select>
        </div>

        <div className={styles.controlRow}>
          <label className={styles.label}>导出格式</label>
          <div className={styles.formatTags}>
            {FORMAT_OPTIONS.map(fmt => (
              <Tag
                key={fmt.value}
                color={selectedFormats.includes(fmt.value as AspectRatio) ? 'orange' : 'default'}
                onClick={() => {
                  setSelectedFormats(prev =>
                    prev.includes(fmt.value as AspectRatio)
                      ? prev.filter(f => f !== fmt.value)
                      : [...prev, fmt.value as AspectRatio]
                  );
                }}
                style={{ cursor: 'pointer', fontSize: 13, padding: '4px 10px' }}
              >
                {fmt.emoji} {fmt.label}
              </Tag>
            ))}
          </div>
        </div>
      </div>

      {/* 执行按钮 + 进度 */}
      <div className={styles.runSection}>
        {!running && results.length === 0 && (
          <Button
            onClick={handleRun}
            className={`${styles.runButton} bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white w-full`}
          >
            <ThunderboltOutlined className="mr-1" />
            开始 AI 拆条分析
          </Button>
        )}

        {running && (
          <div className={styles.progressSection}>
            <Progress
              value={Math.round(progress)}
              className="[&_[data-slot=slider-track]]:bg-accent-primary/20"
            />
            <p className={styles.progressStage}>
              {stage === 'analyzing' && <><span aria-hidden="true">🔍</span> 识别高光片段...</>}
              {stage === 'scoring' && <><span aria-hidden="true">📊</span> 多维评分中...</>}
              {stage === 'generating_seo' && <><span aria-hidden="true">✨</span> 生成 SEO 元数据...</>}
              {stage === 'exporting' && <><span aria-hidden="true">📦</span> 准备导出...</>}
            </p>
          </div>
        )}
      </div>

      {/* 片段列表 */}
      {results.length > 0 && (
        <div className={styles.clipsSection}>
          <div className={styles.clipsHeader}>
            <span className={styles.clipsTitle}>
              📋 生成 {results.length} 个短片段
              <Tag color="green" style={{ marginLeft: 8 }}>
                已选 {selectedClips.size} 个
              </Tag>
            </span>
            <Button
              className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white"
              onClick={handleExport}
              disabled={selectedClips.size === 0 || exporting}
            >
              <DownloadOutlined className="mr-1" />
              导出选中片段
            </Button>
          </div>

          <div className={styles.clipsList}>
            {results.map(clip => {
              const { clip: c, score, seo } = clip;
              const startStr = formatTime(c.startTime);
              const endStr = formatTime(c.endTime);
              const duration = c.endTime - c.startTime;
              const clipId = c.id ?? '';
              const isSelected = selectedClips.has(clipId);

              return (
                <motion.div
                  key={clipId}
                  className={`${styles.clipCard} ${isSelected ? styles.clipSelected : ''}`}
                  onClick={() => toggleClip(clipId)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className={styles.clipHeader}>
                    <Checkbox checked={isSelected} />
                    <span className={styles.clipTime}>
                      ⏱ {startStr} → {endStr}
                      <Tag style={{ marginLeft: 6 }}>{duration.toFixed(0)}s</Tag>
                    </span>
                    <span
                      className={styles.clipScore}
                      style={{ color: scoreColor(score.totalScore) }}
                    >
                      {score.totalScore.toFixed(0)}
                    </span>
                  </div>

                  {/* 评分雷达 */}
                  <div className={styles.scoreDims}>
                    {Object.entries(score.dimensions ?? {}).map(([dim, val]) => (
                      <div key={dim} className={styles.dimBar}>
                        <span className={styles.dimLabel}>{dimLabel(dim)}</span>
                        <Progress
                          value={Math.round(val)}
                          className="flex-1 min-w-[60px]"
                        />
                        <span className={styles.dimScore}>{Math.round(val)}</span>
                      </div>
                    ))}
                  </div>

                  {/* SEO 元数据 */}
                  {seo && (
                    <div className={styles.seoSection}>
                      <p className={styles.seoTitle}>📝 {seo.title}</p>
                      <p className={styles.seoDesc}>{seo.description?.slice(0, 80)}...</p>
                      <div className={styles.hashtags}>
                        {seo.hashtags?.slice(0, 5).map(tag => (
                          <Tag key={tag} color="blue" style={{ fontSize: 11 }}>
                            #{tag}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* 已导出文件 */}
          {exportedPaths.length > 0 && (
            <div className={styles.exportedSection}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span style={{ marginLeft: 8 }}>已导出 {exportedPaths.length} 个文件</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Helper: 时间格式化
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Helper: 维度中文名
function dimLabel(dim: string): string {
  const map: Record<string, string> = {
    laughterDensity: '笑声',
    emotionPeak: '情感',
    speechCompleteness: '完整度',
    silenceRatio: '静默比',
    speakingPace: '节奏',
    keywordBoost: '关键词',
  };
  return map[dim] ?? dim;
}

ClipRepurpose.displayName = 'ClipRepurpose';
export default ClipRepurpose;
