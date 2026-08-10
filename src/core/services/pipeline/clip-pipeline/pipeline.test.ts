/**
 * pipeline.ts — 单元测试
 *
 * 覆盖：
 *  - ClipRepurposingPipeline.run() 完整 4 step 流程
 *  - 默认选项 / 自定义选项合并
 *  - candidates 为空时均匀切分 fallback
 *  - generateSEO=false / multiFormat=false 分支
 *  - exportFormats为空时不调用 prepareExportStep
 *  - Clips 时间 key 用 toFixed(3) 精度
 *  - totalOutputDuration 累加
 *  - exportedFormats 决策
 *  - onProgress 4 阶段回调
 *  - clipRepurposingPipeline 单例
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VideoInfo, VideoAnalysis, Scene } from '@/types';
import type { CandidateClip } from './clip-scorer';
import type { SEOMetadata } from './seo-generator';
import type { AspectRatio, ExportTask } from './multi-export';
import type { ASRSegment } from '../../asr/asr-types';

vi.mock('@/shared/utils/logging', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/core/pipeline/steps', () => ({
  buildCandidatesStep: { execute: vi.fn(), meta: { name: 'build-candidates' } },
  scoreClipsStep: { execute: vi.fn(), meta: { name: 'score-clips' } },
  generateSEOStep: { execute: vi.fn(), meta: { name: 'generate-seo' } },
  prepareExportStep: { execute: vi.fn(), meta: { name: 'prepare-export' } },
}));

import {
  ClipRepurposingPipeline,
  clipRepurposingPipeline,
  DEFAULT_REPURPOSING_OPTIONS,
  type RepurposingOptions,
} from './pipeline';
import {
  buildCandidatesStep,
  scoreClipsStep,
  generateSEOStep,
  prepareExportStep,
} from '@/core/pipeline/steps';
import type { ClipScore } from './clip-scorer';

const mockedBuild = vi.mocked(buildCandidatesStep.execute);
const mockedScore = vi.mocked(scoreClipsStep.execute);
const mockedSEO = vi.mocked(generateSEOStep.execute);
const mockedExport = vi.mocked(prepareExportStep.execute);

beforeEach(() => {
  mockedBuild.mockReset();
  mockedScore.mockReset();
  mockedSEO.mockReset();
  mockedExport.mockReset();
});

function makeVideoInfo(overrides: Partial<VideoInfo> = {}): VideoInfo {
  return {
    id: 'video-1',
    path: '/video.mp4',
    duration: 60,
    width: 1920,
    height: 1080,
    ...overrides,
  } as VideoInfo;
}

function makeScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: 'scene-1',
    startTime: 0,
    endTime: 30,
    ...overrides,
  } as Scene;
}

function makeAnalysis(overrides: Partial<VideoAnalysis> = {}): VideoAnalysis {
  return {
    scenes: [makeScene()],
    ...overrides,
  } as VideoAnalysis;
}

function makeCandidate(startTime: number, endTime: number): CandidateClip {
  return {
    id: `clip-${startTime}`,
    startTime,
    endTime,
    sceneType: 'highlight',
    transcript: 'text',
  };
}

function makeScored(clip: CandidateClip, totalScore = 80): ClipScore {
  return {
    clip,
    totalScore,
    laughterDensity: 0.5,
    emotionPeak: 0.5,
    speechCompleteness: 0.5,
    silenceRatio: 0.5,
    speakingPace: 0.5,
    keywordBoost: 0.5,
    reasons: [],
  };
}

function makeSEO(clip: CandidateClip): SEOMetadata {
  return {
    title: `Title for ${clip.id}`,
    description: 'desc',
    hashtags: ['tag1'],
    platform: 'youtube',
  };
}

// ─── Pipeline.run() ─────────────────────────────────────────────────────────

describe('ClipRepurposingPipeline.run()', () => {
  it('runs all 4 steps with default options', async () => {
    const candidates = [makeCandidate(0, 30), makeCandidate(30, 60)];
    const scored = candidates.map(makeScored);
    const seoResults = candidates.map(makeSEO);

    mockedBuild.mockResolvedValue(candidates);
    mockedScore.mockResolvedValue(scored);
    mockedSEO.mockResolvedValue(seoResults);
    mockedExport.mockResolvedValue(new Map());

    const pipeline = new ClipRepurposingPipeline();
    const result = await pipeline.run(makeVideoInfo(), makeAnalysis());

    expect(result.clips).toHaveLength(2);
    expect(totalDur(result)).toBe(60);
    expect(result.platform).toBe('youtube');
    expect(result.exportedFormats).toEqual(['9:16']); // multiFormat=false
    expect(result.totalInputDuration).toBe(60);
    expect(mockedBuild).toHaveBeenCalledTimes(1);
    expect(mockedScore).toHaveBeenCalledTimes(1);
    expect(mockedSEO).toHaveBeenCalledTimes(1);
    expect(mockedExport).not.toHaveBeenCalled();
  });

  it('falls back to uniform segmentation when no candidates returned', async () => {
    mockedBuild.mockResolvedValue([]); // empty
    mockedScore.mockResolvedValue([
      makeScored({ id: 'u1', startTime: 0, endTime: 30, sceneType: 'uniform', transcript: '' }),
      makeScored({ id: 'u2', startTime: 30, endTime: 60, sceneType: 'uniform', transcript: '' }),
      makeScored({ id: 'u3', startTime: 60, endTime: 70, sceneType: 'uniform', transcript: '' }),
    ]);
    mockedSEO.mockResolvedValue([]);
    mockedExport.mockResolvedValue(new Map());

    const pipeline = new ClipRepurposingPipeline();
    const result = await pipeline.run(makeVideoInfo({ duration: 70 }), makeAnalysis());

    expect(result.clips.length).toBeGreaterThanOrEqual(2);
    // The fallback uniform candidates should be in scored
    expect(mockedBuild).toHaveBeenCalled();
  });

  it('skips SEO step when generateSEO=false', async () => {
    const candidates = [makeCandidate(0, 30)];
    const scored = [makeScored(candidates[0])];
    mockedBuild.mockResolvedValue(candidates);
    mockedScore.mockResolvedValue(scored);

    const pipeline = new ClipRepurposingPipeline();
    const result = await pipeline.run(makeVideoInfo(), makeAnalysis(), {
      generateSEO: false,
    } as RepurposingOptions);

    expect(mockedSEO).not.toHaveBeenCalled();
    expect(result.clips[0].seo).toBeUndefined();
  });

  it('runs prepExportStep when multiFormat=true with formats', async () => {
    const candidates = [makeCandidate(0, 30)];
    const scored = [makeScored(candidates[0])];
    const seoResults = scored.map(s => makeSEO(s.clip));
    const exportMap = new Map<string, ExportTask[]>([
      [
        '0.000',
        [
          {
            clipId: 'c0',
            aspectRatio: '9:16',
            outputPath: '/out/0/9x16.mp4',
            ffmpegArgs: [],
            width: 540,
            height: 960,
            duration: 30,
          },
        ],
      ],
    ]);

    mockedBuild.mockResolvedValue(candidates);
    mockedScore.mockResolvedValue(scored);
    mockedSEO.mockResolvedValue(seoResults);
    mockedExport.mockResolvedValue(exportMap);

    const pipeline = new ClipRepurposingPipeline();
    const result = await pipeline.run(makeVideoInfo(), makeAnalysis(), {
      multiFormat: true,
      exportFormats: ['9:16', '1:1'] as AspectRatio[],
    });

    expect(mockedExport).toHaveBeenCalledTimes(1);
    expect(result.exportedFormats).toEqual(['9:16', '1:1']);
    expect(result.clips[0].exportTasks).toBeDefined();
  });

  it('does not run prepExportStep when exportFormats is empty', async () => {
    const candidates = [makeCandidate(0, 30)];
    const scored = [makeScored(candidates[0])];
    mockedBuild.mockResolvedValue(candidates);
    mockedScore.mockResolvedValue(scored);
    mockedSEO.mockResolvedValue([]);

    const pipeline = new ClipRepurposingPipeline();
    await pipeline.run(makeVideoInfo(), makeAnalysis(), { multiFormat: true, exportFormats: [] });

    expect(mockedExport).not.toHaveBeenCalled();
  });

  it('does not run prepExportStep when multiFormat=false', async () => {
    const candidates = [makeCandidate(0, 30)];
    const scored = [makeScored(candidates[0])];
    mockedBuild.mockResolvedValue(candidates);
    mockedScore.mockResolvedValue(scored);
    mockedSEO.mockResolvedValue([]);

    const pipeline = new ClipRepurposingPipeline();
    await pipeline.run(makeVideoInfo(), makeAnalysis(), { multiFormat: false });

    expect(mockedExport).not.toHaveBeenCalled();
  });

  it('uses toFixed(3) for time key precision', async () => {
    const candidates = [makeCandidate(0.1234, 30.5678)];
    const scored = [makeScored(candidates[0])];
    const exportMap = new Map<string, ExportTask[]>([
      [
        '0.123',
        [
          {
            clipId: 'c0',
            aspectRatio: '9:16',
            outputPath: '/out/0.123_9x16.mp4',
            ffmpegArgs: [],
            width: 540,
            height: 960,
            duration: 30,
          },
        ],
      ],
    ]);

    mockedBuild.mockResolvedValue(candidates);
    mockedScore.mockResolvedValue(scored);
    mockedSEO.mockResolvedValue([makeSEO(candidates[0])]);
    mockedExport.mockResolvedValue(exportMap);

    const pipeline = new ClipRepurposingPipeline();
    const result = await pipeline.run(makeVideoInfo(), makeAnalysis(), {
      multiFormat: true,
      exportFormats: ['9:16'],
    });

    expect(result.clips[0].exportTasks).toBeDefined();
    expect(result.clips[0].exportTasks![0].outputPath).toContain('0.123');
  });

  it('handles undefined endTime in totalOutputDuration (uses 0)', async () => {
    const candidates = [makeCandidate(0, 30)];
    const scored = [
      {
        ...makeScored(candidates[0]),
        clip: { ...candidates[0], endTime: undefined } as unknown as CandidateClip,
      },
    ];
    mockedBuild.mockResolvedValue(candidates);
    mockedScore.mockResolvedValue(scored);
    mockedSEO.mockResolvedValue([]);

    const pipeline = new ClipRepurposingPipeline();
    const result = await pipeline.run(makeVideoInfo(), makeAnalysis());

    expect(result.totalOutputDuration).toBe(0);
  });

  it('merges custom options with defaults', async () => {
    const candidates = [makeCandidate(0, 30)];
    const scored = [makeScored(candidates[0])];
    mockedBuild.mockResolvedValue(candidates);
    mockedScore.mockResolvedValue(scored);
    mockedSEO.mockResolvedValue([]);

    const pipeline = new ClipRepurposingPipeline();
    const onProgress = vi.fn();
    await pipeline.run(makeVideoInfo(), makeAnalysis(), {
      targetClipCount: 99,
      platform: 'tiktok',
      onProgress,
    });

    expect(onProgress).toHaveBeenCalledWith('analyzing', 10, expect.any(String));
    expect(onProgress).toHaveBeenCalledWith('scoring', 30, expect.any(String));
    expect(onProgress).toHaveBeenCalledWith('generating_seo', 50, expect.any(String));
  });

  it('accepts asrSegments parameter', async () => {
    const candidates = [makeCandidate(0, 30)];
    const scored = [makeScored(candidates[0])];
    const asrSegments: ASRSegment[] = [
      { id: 's1', startTime: 0, endTime: 30, text: 'hello', confidence: 0.9 } as ASRSegment,
    ];

    mockedBuild.mockResolvedValue(candidates);
    mockedScore.mockResolvedValue(scored);
    mockedSEO.mockResolvedValue([]);

    const pipeline = new ClipRepurposingPipeline();
    await pipeline.run(makeVideoInfo(), makeAnalysis(), {}, asrSegments);

    expect(mockedBuild).toHaveBeenCalledWith(
      expect.objectContaining({ asrSegments }),
      expect.anything(),
      expect.anything()
    );
  });

  it('exposes clip and score on each RepurposingClip', async () => {
    const candidates = [makeCandidate(0, 30)];
    const scored = [makeScored(candidates[0])];
    mockedBuild.mockResolvedValue(candidates);
    mockedScore.mockResolvedValue(scored);
    mockedSEO.mockResolvedValue([]);

    const pipeline = new ClipRepurposingPipeline();
    const result = await pipeline.run(makeVideoInfo(), makeAnalysis());

    expect(result.clips[0].clip).toBe(candidates[0]);
    expect(result.clips[0].score).toBe(scored[0]);
  });

  it('passes through to exportTasks when key not found', async () => {
    const candidates = [makeCandidate(0, 30)];
    const scored = [makeScored(candidates[0])];
    mockedBuild.mockResolvedValue(candidates);
    mockedScore.mockResolvedValue(scored);
    mockedSEO.mockResolvedValue([]);
    mockedExport.mockResolvedValue(new Map());

    const pipeline = new ClipRepurposingPipeline();
    const result = await pipeline.run(makeVideoInfo(), makeAnalysis(), {
      multiFormat: true,
      exportFormats: ['9:16'],
    });

    expect(result.clips[0].exportTasks).toBeUndefined();
  });
});

// ─── Constants ──────────────────────────────────────────────────────────────

describe('DEFAULT_REPURPOSING_OPTIONS', () => {
  it('has expected values', () => {
    expect(DEFAULT_REPURPOSING_OPTIONS.targetClipCount).toBe(5);
    expect(DEFAULT_REPURPOSING_OPTIONS.minClipDuration).toBe(15);
    expect(DEFAULT_REPURPOSING_OPTIONS.maxClipDuration).toBe(120);
    expect(DEFAULT_REPURPOSING_OPTIONS.platform).toBe('youtube');
    expect(DEFAULT_REPURPOSING_OPTIONS.exportFormats).toEqual(['9:16']);
    expect(DEFAULT_REPURPOSING_OPTIONS.multiFormat).toBe(false);
    expect(DEFAULT_REPURPOSING_OPTIONS.generateSEO).toBe(true);
    expect(DEFAULT_REPURPOSING_OPTIONS.outputDir).toBe('');
    expect(typeof DEFAULT_REPURPOSING_OPTIONS.onProgress).toBe('function');
  });

  it('onProgress default is a noop', () => {
    expect(() => DEFAULT_REPURPOSING_OPTIONS.onProgress('analyzing', 50)).not.toThrow();
  });
});

// ─── Singleton ───────────────────────────────────────────────────────────────

describe('clipRepurposingPipeline', () => {
  it('is an instance of ClipRepurposingPipeline', () => {
    expect(clipRepurposingPipeline).toBeInstanceOf(ClipRepurposingPipeline);
  });
});

// helper
function totalDur(result: { clips: Array<{ clip: { startTime: number; endTime?: number } }> }) {
  return result.clips.reduce(
    (sum, c) => sum + ((c.clip.endTime ?? 0) - (c.clip.startTime ?? 0)),
    0
  );
}
