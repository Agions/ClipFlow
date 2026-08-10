/**
 * generateSEOStep — 单元测试（PR-M2.3）
 *
 * 覆盖：
 *  1. 批量生成 SEO 元数据（generateBatch 透传）
 *  2. 中文 / 英文语言透传到 SEOGenerator
 *  3. onProgress 触发
 *  4. 空数组返回空
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/shared/utils/logging', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import type { ClipScore } from '../../services/pipeline/clip-pipeline/clip-scorer';
import { generateSEOStep } from './generate-seo-step';

function makeScoredClip(): ClipScore {
  return {
    clip: {
      startTime: 0,
      endTime: 30,
      sceneType: 'dialog',
      transcript: 'demo transcript',
    },
    totalScore: 75,
    laughterDensity: 0.5,
    emotionPeak: 0.7,
    speechCompleteness: 0.8,
    silenceRatio: 0.1,
    speakingPace: 1.0,
    keywordBoost: 0.3,
    reasons: ['emotion'],
  };
}

describe('generateSEOStep', () => {
  it('generates SEO metadata for each clip', async () => {
    const clips = [makeScoredClip(), makeScoredClip(), makeScoredClip()];
    const result = await generateSEOStep.execute(
      { clips, platform: 'youtube' },
      { stepIndex: 0, completedSteps: [], meta: {} },
      {}
    );

    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('title');
    expect(result[0].platform).toBe('youtube');
  });

  it('uses default language=zh when not provided', async () => {
    const clips = [makeScoredClip()];
    const result = await generateSEOStep.execute(
      { clips, platform: 'douyin' },
      { stepIndex: 0, completedSteps: [], meta: {} },
      {}
    );

    expect(result[0].hashtags.length).toBeGreaterThan(0);
  });

  it('accepts explicit language=en', async () => {
    const clips = [makeScoredClip()];
    const result = await generateSEOStep.execute(
      { clips, platform: 'instagram', language: 'en' },
      { stepIndex: 0, completedSteps: [], meta: {} },
      {}
    );

    expect(result[0].platform).toBe('instagram');
  });

  it('returns empty array when no clips', async () => {
    const result = await generateSEOStep.execute(
      { clips: [], platform: 'youtube' },
      { stepIndex: 0, completedSteps: [], meta: {} },
      {}
    );

    expect(result).toEqual([]);
  });

  it('emits onProgress callbacks', async () => {
    const onProgress = vi.fn();
    await generateSEOStep.execute(
      { clips: [makeScoredClip()], platform: 'tiktok' },
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
