/**
 * understanding 单步服务测试：metadata / segment / highlight / subtitle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── metadata ───────────────────────────────────────────────

vi.mock('@/core/tauri', () => ({
  tauri: {
    analyzeVideo: vi.fn(),
    detectSmartSegments: vi.fn(),
    detectHighlights: vi.fn(),
  },
}));

vi.mock('@/shared/utils/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { tauri } from '@/core/tauri';
import { analyzeMetadata } from './metadata-service';
import { detectScenes, sceneTypeOf } from './segment-service';
import { detectHighlights } from './highlight-service';

const analyzeVideoMock = vi.mocked(tauri.analyzeVideo);
const detectSegmentsMock = vi.mocked(tauri.detectSmartSegments);
const detectHighlightsMock = vi.mocked(tauri.detectHighlights);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('analyzeMetadata', () => {
  it('调用 analyzeVideo 并返回元数据', async () => {
    const metadata = {
      duration: 100,
      width: 1920,
      height: 1080,
      fps: 30,
      codec: 'h264',
      bitrate: 8_000_000,
    };
    analyzeVideoMock.mockResolvedValue(metadata);

    const result = await analyzeMetadata('/tmp/movie.mp4');

    expect(tauri.analyzeVideo).toHaveBeenCalledWith('/tmp/movie.mp4');
    expect(result).toEqual(metadata);
  });

  it('空路径抛错且不调用后端', async () => {
    await expect(analyzeMetadata('')).rejects.toThrow('视频路径不能为空');
    expect(tauri.analyzeVideo).not.toHaveBeenCalled();
  });

  it('后端失败时向上抛出', async () => {
    analyzeVideoMock.mockRejectedValue(new Error('ffprobe 失败'));
    await expect(analyzeMetadata('/tmp/movie.mp4')).rejects.toThrow('ffprobe 失败');
  });
});

describe('sceneTypeOf', () => {
  it('映射语义类型到 SceneType', () => {
    expect(sceneTypeOf('dialogue')).toBe('dialog');
    expect(sceneTypeOf('action')).toBe('action');
    expect(sceneTypeOf('transition')).toBe('action');
    expect(sceneTypeOf('silence')).toBe('text');
    expect(sceneTypeOf('unknown')).toBe('text');
  });
});

describe('detectScenes', () => {
  it('调用 detectSmartSegments 并转换为秒制 Scene[]', async () => {
    detectSegmentsMock.mockResolvedValue([
      { startMs: 0, endMs: 10_000, segmentType: 'dialogue', durationMs: 10_000, confidence: 0.9 },
      {
        startMs: 10_000,
        endMs: 25_000,
        segmentType: 'action',
        durationMs: 15_000,
        confidence: 0.7,
      },
    ] as never);

    const scenes = await detectScenes('/tmp/movie.mp4');

    expect(tauri.detectSmartSegments).toHaveBeenCalledWith('/tmp/movie.mp4', {});
    expect(scenes).toEqual([
      {
        id: 'scene-0',
        startTime: 0,
        endTime: 10,
        type: 'dialog',
        score: 0.9,
        confidence: 0.9,
        duration: 10,
      },
      {
        id: 'scene-1',
        startTime: 10,
        endTime: 25,
        type: 'action',
        score: 0.7,
        confidence: 0.7,
        duration: 15,
      },
    ]);
  });

  it('空路径抛错', async () => {
    await expect(detectScenes('')).rejects.toThrow('视频路径不能为空');
  });
});

describe('detectHighlights', () => {
  it('调用 detectHighlights 并转换为秒制 HighlightSegment[]', async () => {
    detectHighlightsMock.mockResolvedValue([
      { startMs: 5_000, endMs: 9_000, score: 0.95, reason: 'audio_energy', audioScore: 0.95 },
    ] as never);

    const highlights = await detectHighlights('/tmp/movie.mp4', { topN: 5 });

    expect(tauri.detectHighlights).toHaveBeenCalledWith('/tmp/movie.mp4', { topN: 5 });
    expect(highlights).toEqual([
      {
        startTime: 5,
        endTime: 9,
        score: 0.95,
        reason: 'audio_energy',
        audioScore: 0.95,
        sceneScore: undefined,
        motionScore: undefined,
      },
    ]);
  });

  it('空路径抛错', async () => {
    await expect(detectHighlights('')).rejects.toThrow('视频路径不能为空');
  });
});
