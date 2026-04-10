/**
 * ScoreClipsStep — 多维评分 + 排序截断
 *
 * 输入：CandidateClip[]
 * 输出：ClipScore[]（排序后，截断到 targetCount）
 *
 * 评分维度（6 个信号）：
 *   1. laughter_density    — 笑声/鼓掌密度
 *   2. emotion_peak       — 情感峰值
 *   3. speech_completeness — 对话完整性
 *   4. silence_ratio      — 有声占比
 *   5. speaking_pace      — 语速健康度
 *   6. keyword_boost      — 关键词命中
 */

import { createStep, type Step, type PipelineContext, type StepOptions, reportProgress } from '../Step';
import type { CandidateClip, ClipScore } from '@/core/services/clipRepurposing/clipScorer';
import { ClipScorer } from '@/core/services/clipRepurposing/clipScorer';
import { logger } from '@/utils/logger';

// ============================================================
// Metadata
// ============================================================

const STEP_META = {
  name: 'score-clips',
  description: '多维评分并排序选择最佳片段',
  estimatedDuration: 2,
};

// ============================================================
// Input / Output
// ============================================================

export interface ScoreClipsInput {
  candidates: CandidateClip[];
  targetCount?: number;
  minDuration?: number;   // 秒，默认 15
  maxDuration?: number;   // 秒，默认 120
}

export type ScoreClipsOutput = ClipScore[];

// ============================================================
// Step Implementation
// ============================================================

export const scoreClipsStep: Step<ScoreClipsInput, ScoreClipsOutput> =
  createStep(STEP_META, (input, _ctx, options) => {
    const { candidates, targetCount = 5, minDuration = 15, maxDuration = 120 } = input;

    reportProgress(options?.onProgress, STEP_META.name, 0.3, `${candidates.length} 个候选片段评分中...`);

    // 过滤时长不满足约束的候选
    const filtered = candidates.filter(c => {
      const duration = (c.endTime ?? 0) - (c.startTime ?? 0);
      return duration >= minDuration && duration <= maxDuration;
    });

    if (filtered.length === 0) {
      logger.warn('[ScoreClipsStep] 没有满足时长约束的候选片段');
      return [];
    }

    // 使用独立配置的 ClipScorer 实例（传入 targetCount）
    const scorer = new ClipScorer({ targetClipCount: targetCount });
    const scored = scorer.topClips(filtered);

    reportProgress(options?.onProgress, STEP_META.name, 0.8, `评分完成，top ${scored.length} 个片段`);
    logger.info(`[ScoreClipsStep] 完成，top ${scored.length} 个`);

    return scored;
  });
