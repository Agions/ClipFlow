/**
 * analyzeVideo — 单元测试（PR-M2.3）
 *
 * 覆盖：
 *  1. 完整 happy path：scene/keyframe/silence/emotion 全部启用 → 全输出
 *  2. AbortSignal 已中断 → 立即抛 AbortError
 *  3. visionService.detectScenesAdvanced 失败 → fallback 到空场景
 *  4. detectSmartSegments 抛错 → silenceSegments 为空（不阻断）
 *  5. emotion peak 失败 → 返回空 peaks
 *  6. detectKeyframes=false → 不抽关键帧
 *  7. detectSilence=false → 不调 detectSmartSegments
 *  8. aiOptimize=false → suggestions 为空
 *  9. pacingStyle='fast' → 产生加速建议
 *
 * 注意：vitest 4 + `restoreMocks:true` 会在每个测试前重置 mock 实现。
 * 因此所有 mock 实现必须在 `beforeEach` 里重新设置，不能依赖模块顶层工厂的 `mockReturnValue`。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 用 vi.hoisted 包装 mock 变量（避免 vi.mock factory hoisting 后访问未初始化变量）
const mocks = vi.hoisted(() => ({
  mockDetectSmartSegments: vi.fn(),
  mockDetectScenesAdvanced: vi.fn(),
  mockExtractKeyframes: vi.fn(),
  mockDetectEmotionPeaks: vi.fn(),
  mockEnrichSegments: vi.fn(),
  mockLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const {
  mockDetectSmartSegments,
  mockDetectScenesAdvanced,
  mockExtractKeyframes,
  mockDetectEmotionPeaks,
  mockEnrichSegments,
  mockLogger,
} = mocks;

vi.mock('../../tauri', () => ({
  tauri: {
    detectSmartSegments: mocks.mockDetectSmartSegments,
  },
}));

vi.mock('../ai/vision-service', () => ({
  visionService: {
    detectScenesAdvanced: mocks.mockDetectScenesAdvanced,
    extractKeyframes: mocks.mockExtractKeyframes,
  },
}));

vi.mock('../video/emotion-detector', () => ({
  detectEmotionPeaks: mocks.mockDetectEmotionPeaks,
}));

vi.mock('./segment-enricher', () => ({
  enrichSegments: mocks.mockEnrichSegments,
}));

vi.mock('@/shared/utils/logging', () => ({
  logger: mocks.mockLogger,
}));

import type { VideoInfo } from '@/types';
import { analyzeVideo } from './analyzer';

const videoInfo: VideoInfo = {
  id: 'v1',
  name: 'a',
  path: '/tmp/a.mp4',
  duration: 60,
  width: 1920,
  height: 1080,
  size: 1,
  fps: 30,
  format: 'mp4',
};

describe('analyzeVideo', () => {
  beforeEach(() => {
    // 在每个测试前显式重置所有 mock 实现（覆盖 vitest 4 restoreMocks 行为）
    mockDetectScenesAdvanced.mockResolvedValue({
      scenes: [
        {
          id: 's1',
          startTime: 0,
          endTime: 30,
          type: 'dialog',
          score: 0.9,
          confidence: 0.8,
          description: 'first scene',
        },
        {
          id: 's2',
          startTime: 30,
          endTime: 60,
          type: 'action',
          score: 0.9,
          confidence: 0.7,
          description: 'second scene',
        },
      ],
      objects: [],
      emotions: [],
    });
    mockExtractKeyframes.mockResolvedValue([
      { timestamp: 0, thumbnail: '' },
      { timestamp: 15, thumbnail: '' },
      { timestamp: 30, thumbnail: '' },
      { timestamp: 45, thumbnail: '' },
    ]);
    mockDetectSmartSegments.mockResolvedValue([
      { startMs: 5000, endMs: 6000, segmentType: 'Silence', silenceRatio: 0.5, durationMs: 1000 },
    ]);
    mockDetectEmotionPeaks.mockResolvedValue({
      peaks: [
        { startMs: 10000, endMs: 12000, energy: 80, type: 'happy' },
        { startMs: 40000, endMs: 42000, energy: 50, type: 'sad' },
      ],
    });
    mockEnrichSegments.mockReturnValue([
      {
        startMs: 5000,
        endMs: 6000,
        durationMs: 1000,
        segmentType: 'Silence',
        suggestedSpeed: 1.0,
        suggestedRetain: 'remove',
      },
    ]);
    mockLogger.debug.mockReset();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.error.mockReset();
  });

  it('runs full pipeline and returns ClipAnalysisResult', async () => {
    const onProgress = vi.fn();
    const result = await analyzeVideo(
      videoInfo,
      {
        detectSceneChange: true,
        detectKeyframes: true,
        detectSilence: true,
        removeSilence: true,
        detectEmotion: true,
        aiOptimize: true,
      },
      undefined,
      onProgress
    );

    expect(result.videoId).toBe('v1');
    expect(result.cutPoints.length).toBeGreaterThan(0);
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.sceneBoundaries.length).toBe(2);
    expect(result.keyframeTimestamps.length).toBe(4);
    expect(result.silenceSegments.length).toBe(1);
    expect(result.emotionPeaks?.length).toBe(2);
    expect(result.enrichedSegments).toBeDefined();
    expect(result.enrichedSegments?.length).toBe(1);
    expect(onProgress).toHaveBeenCalled();
  });

  it('throws AbortError when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(analyzeVideo(videoInfo, {}, controller.signal)).rejects.toThrow(/Aborted/);
  });

  it('falls back to empty scenes when detectScenesAdvanced rejects', async () => {
    mockDetectScenesAdvanced.mockRejectedValueOnce(new Error('vision down'));

    const result = await analyzeVideo(videoInfo, {
      detectSceneChange: true,
      detectKeyframes: false,
    });

    expect(result.sceneBoundaries).toEqual([]);
  });

  it('returns empty silenceSegments when detectSmartSegments rejects', async () => {
    mockDetectSmartSegments.mockRejectedValueOnce(new Error('rust down'));

    const result = await analyzeVideo(videoInfo, {
      detectSilence: true,
    });

    expect(result.silenceSegments).toEqual([]);
  });

  it('returns empty emotionPeaks when detectEmotionPeaks rejects', async () => {
    mockDetectEmotionPeaks.mockRejectedValueOnce(new Error('emo down'));

    const result = await analyzeVideo(videoInfo, {
      detectEmotion: true,
    });

    expect(result.emotionPeaks).toEqual([]);
  });

  it('skips keyframes when detectKeyframes=false', async () => {
    const result = await analyzeVideo(videoInfo, {
      detectKeyframes: false,
    });

    expect(result.keyframeTimestamps).toEqual([]);
    expect(mockExtractKeyframes).not.toHaveBeenCalled();
  });

  it('skips silence when detectSilence=false', async () => {
    const result = await analyzeVideo(videoInfo, {
      detectSilence: false,
    });

    expect(result.silenceSegments).toEqual([]);
    expect(mockDetectSmartSegments).not.toHaveBeenCalled();
  });

  it('returns empty suggestions when aiOptimize=false', async () => {
    const result = await analyzeVideo(videoInfo, {
      detectSceneChange: true,
      detectKeyframes: true,
      detectSilence: true,
      removeSilence: true,
      aiOptimize: false,
    });

    expect(result.suggestions).toEqual([]);
  });

  it('produces pacing suggestions when pacingStyle=fast', async () => {
    const result = await analyzeVideo(videoInfo, {
      detectSceneChange: true,
      aiOptimize: true,
      pacingStyle: 'fast',
    });

    // segments 中若有 > 10s 长片段，会触发加速建议
    const pacingSuggestion = result.suggestions.find(s => /加速/.test(s.description));
    expect(pacingSuggestion).toBeDefined();
  });

  it('returns single full-video segment when no cut points exist (L318-330)', async () => {
    // 没有任何 cutPoints → generateSegments 返回 1 个完整视频 segment
    mockDetectScenesAdvanced.mockResolvedValue({ scenes: [], objects: [], emotions: [] });
    mockExtractKeyframes.mockResolvedValue([]);
    mockDetectSmartSegments.mockResolvedValue([]);
    mockDetectEmotionPeaks.mockResolvedValue({ peaks: [] });

    const result = await analyzeVideo(videoInfo, {
      detectSceneChange: true,
      detectKeyframes: true,
      detectSilence: true,
      removeSilence: true,
      detectEmotion: true,
      aiOptimize: true,
    });

    expect(result.cutPoints).toEqual([]);
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]).toMatchObject({
      startTime: 0,
      endTime: videoInfo.duration,
      duration: videoInfo.duration,
      type: 'video',
      content: '完整视频',
    });
  });

  it('throws AbortError when signal becomes aborted during detectScenesAdvanced (L86)', async () => {
    // 第一个 abort check 是同步的；第二个是在 detectScenesAdvanced 之后
    // 用一个 pending promise 让 abort 在 await 期间触发
    let resolveFn: () => void = () => {};
    mockDetectScenesAdvanced.mockReturnValueOnce(
      new Promise(resolve => {
        resolveFn = () => resolve({ scenes: [], objects: [], emotions: [] });
      })
    );

    const controller = new AbortController();
    const promise = analyzeVideo(videoInfo, { detectSceneChange: true }, controller.signal);
    // 等待下一个微任务让 detectScenesAdvanced promise 被 await
    await Promise.resolve();
    controller.abort();
    resolveFn(); // 让 await 返回，但 signal 已 aborted → L86 抛错

    await expect(promise).rejects.toThrow(/Aborted/);
  });

  it('produces merge suggestion for adjacent short segments (L394-407)', async () => {
    // 让 segments 中存在多个相邻短片段（间隔 < 1s，且 type !== 'silence'）
    // 用 emotionPeaks 在短时间内密集触发 cutPoints → segments 短且非 silence
    mockDetectScenesAdvanced.mockResolvedValue({ scenes: [], objects: [], emotions: [] });
    mockExtractKeyframes.mockResolvedValue([]);
    mockDetectSmartSegments.mockResolvedValue([]);
    mockDetectEmotionPeaks.mockResolvedValue({
      peaks: [
        { startMs: 500, endMs: 600, energy: 80, type: 'happy' },
        { startMs: 1000, endMs: 1100, energy: 80, type: 'happy' },
        { startMs: 1500, endMs: 1600, energy: 80, type: 'happy' },
      ],
    });

    const result = await analyzeVideo(videoInfo, {
      detectSceneChange: false,
      detectKeyframes: false,
      detectSilence: false,
      detectEmotion: true,
      aiOptimize: true,
    });

    // 找到 merge 类型的建议
    const mergeSuggestion = result.suggestions.find(s => s.type === 'merge');
    expect(mergeSuggestion).toBeDefined();
  });

  it('produces target-duration trim suggestion when current duration exceeds 1.2x (L429-444)', async () => {
    // 让 segments 总时长明显超过 targetDuration
    mockDetectScenesAdvanced.mockResolvedValue({
      scenes: [
        {
          id: 's1',
          startTime: 0,
          endTime: 30,
          type: 'action',
          score: 0.9,
          confidence: 0.8,
          description: 's1',
        },
      ],
      objects: [],
      emotions: [],
    });

    const result = await analyzeVideo(videoInfo, {
      detectSceneChange: false,
      detectKeyframes: false,
      detectSilence: false,
      detectEmotion: false,
      aiOptimize: true,
      targetDuration: 10, // 视频 60s，远超 1.2 * 10 = 12s
    });

    const targetSuggestion = result.suggestions.find(
      s => s.type === 'trim' && /压缩视频至目标时长/.test(s.description)
    );
    expect(targetSuggestion).toBeDefined();
    expect(targetSuggestion?.confidence).toBeCloseTo(0.7, 1);
  });
});
