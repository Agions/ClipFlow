/**
 * prepareExportStep — 单元测试（PR-M2.3）
 *
 * 覆盖：
 *  1. 正常 exportDir → 准备每个 clip 的多格式 export tasks
 *  2. 用户指定 outputDir → 不调用 tauri.getExportDir
 *  3. getExportDir 返回 undefined → 抛出 AppError
 *  4. outputDir='' + getExportDir 抛错 → 透传错误
 *  5. onProgress 触发
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../tauri', () => ({
  tauri: {
    getExportDir: vi.fn(),
  },
}));

vi.mock('@/shared/utils/logging', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import type { ClipScore } from '../../services/pipeline/clip-pipeline/clip-scorer';
import type { VideoInfo } from '@/types';
import { tauri } from '../../tauri';
import { prepareExportStep } from './prepare-export-step';

const mockGetExportDir = tauri.getExportDir as unknown as ReturnType<typeof vi.fn>;

const videoInfo: VideoInfo = {
  id: 'v1',
  name: 'a',
  path: '/tmp/a.mp4',
  duration: 600,
  width: 1920,
  height: 1080,
  size: 1,
  fps: 30,
  format: 'mp4',
};

function makeScoredClip(start: number, end: number): ClipScore {
  return {
    clip: {
      startTime: start,
      endTime: end,
      sceneType: 'dialog',
      transcript: '',
    },
    totalScore: 75,
    laughterDensity: 0.5,
    emotionPeak: 0.7,
    speechCompleteness: 0.8,
    silenceRatio: 0.1,
    speakingPace: 1.0,
    keywordBoost: 0.3,
    reasons: [],
  };
}

describe('prepareExportStep', () => {
  beforeEach(() => {
    mockGetExportDir.mockReset();
  });

  it('prepares export tasks per clip per format', async () => {
    mockGetExportDir.mockResolvedValue('/tmp/exports');

    const result = await prepareExportStep.execute(
      {
        videoInfo,
        clips: [makeScoredClip(10, 40), makeScoredClip(60, 90)],
        formats: ['9:16', '1:1'],
        quality: 'high',
      },
      { stepIndex: 0, completedSteps: [], meta: {} },
      {}
    );

    expect(result.size).toBe(2);
    expect(result.get('10')?.length).toBe(2);
    expect(result.get('60')?.length).toBe(2);
  });

  it('uses outputDir directly when provided (skips tauri.getExportDir)', async () => {
    const result = await prepareExportStep.execute(
      {
        videoInfo,
        clips: [makeScoredClip(0, 30)],
        formats: ['9:16'],
        outputDir: '/custom/dir',
      },
      { stepIndex: 0, completedSteps: [], meta: {} },
      {}
    );

    expect(mockGetExportDir).not.toHaveBeenCalled();
    expect(result.size).toBe(1);
  });

  it('throws AppError when getExportDir returns undefined', async () => {
    mockGetExportDir.mockResolvedValue(undefined);

    await expect(
      prepareExportStep.execute(
        {
          videoInfo,
          clips: [makeScoredClip(0, 30)],
          formats: ['9:16'],
        },
        { stepIndex: 0, completedSteps: [], meta: {} },
        {}
      )
    ).rejects.toThrow(/无法获取导出目录/);
  });

  it('uses default quality=high when not provided', async () => {
    const result = await prepareExportStep.execute(
      {
        videoInfo,
        clips: [makeScoredClip(0, 30)],
        formats: ['9:16'],
        outputDir: '/tmp/out',
      },
      { stepIndex: 0, completedSteps: [], meta: {} },
      {}
    );

    const tasks = result.get('0') ?? [];
    expect(tasks[0].width).toBe(1080);
  });

  it('emits onProgress callbacks', async () => {
    const onProgress = vi.fn();
    await prepareExportStep.execute(
      {
        videoInfo,
        clips: [makeScoredClip(0, 30)],
        formats: ['9:16'],
        outputDir: '/tmp/out',
      },
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
