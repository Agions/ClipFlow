/**
 * BuildCandidatesStep — 从视频分析结果构建候选片段
 *
 * 输入：VideoInfo + VideoAnalysis
 * 输出：CandidateClip[]
 *
 * 策略：
 * 1. Rust highlight_detector 识别高光片段（音频能量峰值 + 场景切换）
 * 2. 场景边界补充候选（跳过与高光重叠的片段）
 * 3. 过长的场景自动拆分
 */

import { visionService } from '@/core/services/vision.service';
import type { VideoInfo, VideoAnalysis } from '@/core/types';
import type { CandidateClip } from '@/core/services/clipRepurposing/clipScorer';
import { createStep, type Step, type PipelineContext, type StepOptions, reportProgress } from '../Step';
import { logger } from '@/utils/logger';

// ============================================================
// Step Metadata
// ============================================================

const STEP_META = {
  name: 'build-candidates',
  description: '从高光检测和场景分析构建候选片段',
  estimatedDuration: 5,
};

// ============================================================
// Input / Output Types
// ============================================================

export interface BuildCandidatesInput {
  videoInfo: VideoInfo;
  analysis: VideoAnalysis;
  maxHighlights?: number;   // 最多高光候选，默认 15
  minDuration?: number;      // 最短片段秒数，默认 10
  maxDuration?: number;     // 最长片段秒数，默认 120
}

export type BuildCandidatesOutput = CandidateClip[];

// ============================================================
// Step Implementation
// ============================================================

export const buildCandidatesStep: Step<BuildCandidatesInput, BuildCandidatesOutput> =
  createStep(STEP_META, async (input, _ctx, options) => {
    const { videoInfo, analysis, maxHighlights = 15, minDuration = 10, maxDuration = 120 } = input;
    const candidates: CandidateClip[] = [];
    const scenes = analysis?.scenes ?? [];

    reportProgress(options?.onProgress, STEP_META.name, 0.1, '调用 Rust 高光检测...');

    // ── Stage 1: Rust 高光检测 ──────────────────────────────
    const highlights = await visionService.detectHighlights(videoInfo, {
      topN: maxHighlights,
      minDurationMs: 500,
      detectScene: true,
      threshold: 1.5,
    });

    logger.debug(`[BuildCandidatesStep] Rust 高光检测返回 ${highlights.length} 个片段`);

    for (const h of highlights) {
      candidates.push({
        startTime: h.startTime,
        endTime: h.endTime,
        sceneType: 'highlight',
        transcript: extractSceneTranscript(analysis, h.startTime, h.endTime),
        audioEnergy: h.audioScore,
      });
    }

    reportProgress(options?.onProgress, STEP_META.name, 0.6, `高光候选 ${highlights.length} 个，补充场景边界...`);

    // ── Stage 2: 场景边界补充候选 ──────────────────────────
    if (scenes.length > 0) {
      for (const scene of scenes) {
        const duration = (scene.endTime ?? 0) - (scene.startTime ?? 0);
        if (duration < minDuration) continue;

        // 跳过与高光高度重叠的场景
        const overlaps = highlights.some(
          h => h.startTime < scene.endTime && h.endTime > scene.startTime
        );
        if (overlaps) continue;

        // 时长超限 → 拆分
        if (duration > maxDuration) {
          const subClips = splitLongScene(scene.startTime, scene.endTime, maxDuration * 0.6, maxDuration);
          candidates.push(...subClips.map(sc => ({
            ...sc,
            transcript: extractSceneTranscript(analysis, sc.startTime, sc.endTime),
          })));
          continue;
        }

        candidates.push({
          startTime: scene.startTime,
          endTime: scene.endTime,
          sceneType: scene.type ?? 'scene',
          transcript: extractSceneTranscript(analysis, scene.startTime, scene.endTime),
        });
      }
    }

    reportProgress(options?.onProgress, STEP_META.name, 0.9, `共 ${candidates.length} 个候选片段`);
    logger.info(`[BuildCandidatesStep] 完成，共 ${candidates.length} 个候选片段`);

    return candidates;
  });

// ============================================================
// Helpers
// ============================================================

function splitLongScene(
  start: number,
  end: number,
  minPart: number,
  maxPart: number,
): CandidateClip[] {
  const clips: CandidateClip[] = [];
  let cursor = start;

  while (cursor < end) {
    const partEnd = Math.min(cursor + maxPart, end);
    clips.push({
      startTime: cursor,
      endTime: partEnd,
      sceneType: 'scene',
      transcript: '',
    });
    cursor = partEnd;
  }

  return clips;
}

function extractSceneTranscript(
  analysis: VideoAnalysis,
  startTime: number,
  endTime: number,
): string {
  // 从 analysis.transcript 中提取对应时间段的文本
  const transcript = (analysis as any)?.transcript;
  if (!transcript) return '';
  if (typeof transcript !== 'string') return '';

  const segments = transcript.split('\n').filter(Boolean);
  // 简单线性扫描：保留包含在 [startTime, endTime] 内的句子
  return segments
    .filter(() => {
      // TODO: 需要时间轴信息才能精确过滤
      // 暂时返回全部
      return true;
    })
    .join(' ')
    .slice(0, 500);
}
