/**
 * scoreClipsStep — 单元测试（PR-M2.3）
 *
 * 覆盖：
 *  1. 按时长过滤（minDuration / maxDuration）
 *  2. 无符合候选时返回 [] 并 logger.warn
 *  3. 评分排序后截取 targetCount
 *  4. onProgress 回调被触发
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/utils/logging', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import type { CandidateClip, ClipScore } from '../../services/pipeline/clip-pipeline/clip-scorer';
import { scoreClipsStep } from './score-clips-step';

function makeClip(start: number, end: number): CandidateClip {
  return {
    startTime: start,
    endTime: end,
    sceneType: 'dialog',
    transcript: '',
  };
}

describe('scoreClipsStep', () => {
  let onProgress: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onProgress = vi.fn();
  });

  it('filters candidates by minDuration / maxDuration', async () => {
    const clips = [
      makeClip(0, 5), // 5s → too short
      makeClip(10, 40), // 30s → ok
      makeClip(50, 200), // 150s → too long
    ];
    const result = await scoreClipsStep.execute(
      { candidates: clips, targetCount: 5 },
      { stepIndex: 0, completedSteps: [], meta: {} },
      {
        onProgress: onProgress as unknown as (
          stage: string,
          progress: number,
          message?: string
        ) => void,
      }
    );

    expect(result.length).toBe(1);
  });

  it('returns empty array when no candidates pass duration filter', async () => {
    const clips = [makeClip(0, 5), makeClip(10, 12)];

    const result = await scoreClipsStep.execute(
      { candidates: clips, targetCount: 3 },
      { stepIndex: 0, completedSteps: [], meta: {} },
      {}
    );

    expect(result).toEqual([]);
  });

  it('respects targetCount', async () => {
    const clips = Array.from({ length: 10 }, (_, i) => makeClip(i * 30, i * 30 + 20));

    const result = await scoreClipsStep.execute(
      { candidates: clips, targetCount: 3 },
      { stepIndex: 0, completedSteps: [], meta: {} },
      {}
    );

    expect(result.length).toBe(3);
  });

  it('returns scored clips with reasons and totalScore', async () => {
    const clips = [makeClip(0, 30), makeClip(40, 70)];

    const result = await scoreClipsStep.execute(
      { candidates: clips, targetCount: 5 },
      { stepIndex: 0, completedSteps: [], meta: {} },
      {}
    );

    expect(result.every((s: ClipScore) => typeof s.totalScore === 'number')).toBe(true);
    expect(result.every((s: ClipScore) => Array.isArray(s.reasons))).toBe(true);
  });

  it('emits onProgress callbacks', async () => {
    const clips = [makeClip(0, 30)];

    await scoreClipsStep.execute(
      { candidates: clips, targetCount: 1 },
      { stepIndex: 0, completedSteps: [], meta: {} },
      {
        onProgress: onProgress as unknown as (
          stage: string,
          progress: number,
          message?: string
        ) => void,
      }
    );

    expect(onProgress).toHaveBeenCalled();
  });
});
