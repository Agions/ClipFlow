/**
 * ClipRepurposingPipeline — 长视频 → 多短片段自动拆条
 *
 * 完整管道：
 *   1. 分析视频 → 识别高光候选片段
 *   2. 多维评分 → 排序选择最佳片段
 *   3. SEO 元数据生成 → 每片段标题/描述/hashtags
 *   4. 多格式导出 → 9:16 / 1:1 / 16:9
 *
 * 使用方式：
 *   const pipeline = new ClipRepurposingPipeline();
 *   const result = await pipeline.run(videoInfo, analysis, options);
 */

import { logger } from '@/utils/logger';
import type { VideoInfo, VideoAnalysis } from '@/core/types';
import type { CandidateClip, ClipScore } from './clipScorer';
import type { SEOMetadata, SocialPlatform } from './seoGenerator';
import type { AspectRatio, ExportTask } from './multiFormatExport';

// Step-based pipeline components
import {
  buildCandidatesStep,
  scoreClipsStep,
  generateSEOStep,
  prepareExportStep,
} from '@/core/pipeline/steps';
import type { PipelineContext, StepOptions } from '@/core/pipeline/Step';

// ============================================================
// Types
// ============================================================

export interface RepurposingOptions {
  /** 目标片段数量 */
  targetClipCount?: number;
  /** 最短片段时长（秒） */
  minClipDuration?: number;
  /** 最长片段时长（秒） */
  maxClipDuration?: number;
  /** 目标平台 */
  platform?: SocialPlatform;
  /** 导出格式列表 */
  exportFormats?: AspectRatio[];
  /** 是否启用多格式导出 */
  multiFormat?: boolean;
  /** 是否生成 SEO 元数据 */
  generateSEO?: boolean;
  /** 导出目录（默认调用 Rust get_export_dir） */
  outputDir?: string;
  /** 进度回调 */
  onProgress?: (stage: PipelineStage, progress: number, message?: string) => void;
}

export type PipelineStage =
  | 'analyzing'
  | 'scoring'
  | 'generating_seo'
  | 'exporting';

export interface RepurposingClip {
  clip: CandidateClip;
  score: ClipScore;
  seo?: SEOMetadata;
  exportTasks?: ExportTask[];
}

export interface RepurposingResult {
  clips: RepurposingClip[];
  totalInputDuration: number;
  totalOutputDuration: number;
  platform: SocialPlatform;
  exportedFormats: AspectRatio[];
}

export const DEFAULT_REPURPOSING_OPTIONS: Required<RepurposingOptions> = {
  targetClipCount: 5,
  minClipDuration: 15,
  maxClipDuration: 120,
  platform: 'youtube',
  exportFormats: ['9:16'],
  multiFormat: false,
  generateSEO: true,
  outputDir: '',
  onProgress: () => {},
};

// ============================================================
// Pipeline
// ============================================================

export class ClipRepurposingPipeline {
  /**
   * 执行完整的拆条管道（基于 Step 架构）
   *
   * Step 序列：
   *   BuildCandidates → ScoreClips → [GenerateSEO] → [PrepareExport]
   *
   * @deprecated 外部可直接使用 Step 对象组合以获得更好的可测试性
   */
  async run(
    videoInfo: VideoInfo,
    analysis: VideoAnalysis,
    options?: RepurposingOptions,
  ): Promise<RepurposingResult> {
    const opts: Required<RepurposingOptions> = {
      ...DEFAULT_REPURPOSING_OPTIONS,
      ...options,
    };

    const ctx: PipelineContext = {
      stepIndex: 0,
      completedSteps: [],
      meta: { videoId: videoInfo.id },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stepOptions = { onProgress: opts.onProgress } as any;

    logger.info('[ClipRepurposingPipeline] 开始执行', {
      videoDuration: videoInfo.duration,
      targetClips: opts.targetClipCount,
      platform: opts.platform,
    });

    // ── Step 1: 构建候选片段 ──────────────────────────────
    ctx.stepIndex = 0;
    opts.onProgress('analyzing', 10, '识别高光候选片段...');
    const candidates = await buildCandidatesStep.execute(
      { videoInfo, analysis },
      ctx,
      stepOptions,
    );

    if (candidates.length === 0) {
      logger.warn('[ClipRepurposingPipeline] 无候选片段，按均匀时长切分');
      // Fallback：均匀切分
      const uniform = buildUniformCandidates(videoInfo.duration, 30, 90);
      candidates.push(...uniform);
    }

    logger.info(`[ClipRepurposingPipeline] 生成 ${candidates.length} 个候选片段`);
    ctx.completedSteps.push(buildCandidatesStep.meta.name);

    // ── Step 2: 多维评分 ─────────────────────────────────
    ctx.stepIndex = 1;
    opts.onProgress('scoring', 30, '多维评分排序...');
    const scored = await scoreClipsStep.execute(
      { candidates, targetCount: opts.targetClipCount },
      ctx,
      stepOptions,
    );
    logger.info(`[ClipRepurposingPipeline] 评分完成，top ${scored.length} 个片段`);
    ctx.completedSteps.push(scoreClipsStep.meta.name);

    // ── Step 3: SEO 元数据生成 ───────────────────────────
    let seoResults: SEOMetadata[] = [];
    if (opts.generateSEO) {
      ctx.stepIndex = 2;
      opts.onProgress('generating_seo', 50, '生成 SEO 元数据...');
      seoResults = await generateSEOStep.execute(
        { clips: scored, platform: opts.platform },
        ctx,
        stepOptions,
      );
      logger.info('[ClipRepurposingPipeline] SEO 元数据生成完成');
      ctx.completedSteps.push(generateSEOStep.meta.name);
    }

    // ── Step 4: 准备导出任务 ─────────────────────────────
    let exportTasks = new Map<string, ExportTask[]>();
    if (opts.multiFormat && opts.exportFormats.length > 0) {
      ctx.stepIndex = 3;
      opts.onProgress('exporting', 70, '准备导出任务...');
      exportTasks = await prepareExportStep.execute(
        {
          videoInfo,
          clips: scored,
          formats: opts.exportFormats,
          outputDir: opts.outputDir,
          quality: 'high',
        },
        ctx,
        stepOptions,
      );
      logger.info('[ClipRepurposingPipeline] 导出任务准备完成');
      ctx.completedSteps.push(prepareExportStep.meta.name);
    }

    // ── 组装结果 ──────────────────────────────────────────
    const repurposingClips: RepurposingClip[] = scored.map((s, i) => ({
      clip: s.clip,
      score: s,
      seo: seoResults[i],
      exportTasks: exportTasks.get(s.clip.startTime.toString()),
    }));

    const totalOutputDuration = scored.reduce(
      (sum, s) => sum + ((s.clip.endTime ?? 0) - (s.clip.startTime ?? 0)), 0
    );

    logger.info('[ClipRepurposingPipeline] 管道完成', {
      outputClips: scored.length,
      totalOutputDuration,
    });

    return {
      clips: repurposingClips,
      totalInputDuration: videoInfo.duration,
      totalOutputDuration,
      platform: opts.platform,
      exportedFormats: opts.multiFormat ? opts.exportFormats : ['9:16'],
    };
  }
}

// ============================================================
// Fallback: 均匀切分（无任何候选数据时）
// ============================================================

function buildUniformCandidates(
  totalDuration: number,
  minDuration: number,
  idealDuration: number,
): CandidateClip[] {
  const clips: CandidateClip[] = [];
  let cursor = 0;

  while (cursor < totalDuration) {
    const remaining = totalDuration - cursor;
    if (remaining < minDuration) break;
    const clipDuration = Math.min(idealDuration, remaining);
    clips.push({
      startTime: cursor,
      endTime: cursor + clipDuration,
      sceneType: 'uniform',
      transcript: '',
    });
    cursor += clipDuration;
  }

  return clips;
}

export const clipRepurposingPipeline = new ClipRepurposingPipeline();
export default clipRepurposingPipeline;
