/**
 * Highlight Detector — 单元测试（PR-1.3a）
 *
 * 覆盖：
 *  1. 空 videoPath → 返回 []
 *  2. 正常调用 → 转换 ms → s + reason 类型断言
 *  3. tauri 抛错 → 返回 []（不抛出）
 *  4. options 透传（threshold / topN / windowMs）
 *
 * @see docs/TECH_DEBT.md §2 @deprecated 清理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// mock tauri 模块
vi.mock('@/core/tauri', () => ({
  tauri: {
    detectHighlights: vi.fn(),
  },
}));

// mock logger
vi.mock('@/shared/utils/logging', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { tauri } from '@/core/tauri';
import { highlightDetector } from './highlight-detector';

const mockDetectHighlights = tauri.detectHighlights as unknown as ReturnType<typeof vi.fn>;

describe('highlightDetector', () => {
  beforeEach(() => {
    mockDetectHighlights.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('空 videoPath 时直接返回空数组（不调用 tauri）', async () => {
    const result = await highlightDetector.detectHighlights('');
    expect(result).toEqual([]);
    expect(mockDetectHighlights).not.toHaveBeenCalled();
  });

  it('正常调用：转换 ms → s', async () => {
    mockDetectHighlights.mockResolvedValueOnce([
      {
        startMs: 1000,
        endMs: 5000,
        score: 0.95,
        reason: 'audio_energy',
        audioScore: 0.9,
        sceneScore: 0.85,
        motionScore: 0.7,
      },
      {
        startMs: 10000,
        endMs: 15000,
        score: 0.8,
        reason: 'scene_change',
        audioScore: 0.5,
        sceneScore: 0.95,
        motionScore: 0.3,
      },
    ]);

    const result = await highlightDetector.detectHighlights('/path/to/video.mp4');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      startTime: 1, // 1000ms / 1000
      endTime: 5, // 5000ms / 1000
      score: 0.95,
      reason: 'audio_energy',
      audioScore: 0.9,
      sceneScore: 0.85,
      motionScore: 0.7,
    });
    expect(result[1].startTime).toBe(10);
    expect(result[1].endTime).toBe(15);
  });

  it('options 透传：threshold / topN / windowMs / minDurationMs', async () => {
    mockDetectHighlights.mockResolvedValueOnce([]);

    await highlightDetector.detectHighlights('/path/to/video.mp4', {
      threshold: 1.5,
      minDurationMs: 500,
      topN: 10,
      windowMs: 3000,
    });

    expect(mockDetectHighlights).toHaveBeenCalledWith('/path/to/video.mp4', {
      threshold: 1.5,
      minDurationMs: 500,
      topN: 10,
      windowMs: 3000,
    });
  });

  it('tauri 抛错时返回 []（不抛出给调用方）', async () => {
    mockDetectHighlights.mockRejectedValueOnce(new Error('IPC failed'));

    const result = await highlightDetector.detectHighlights('/path/to/video.mp4');

    expect(result).toEqual([]);
  });

  it('空结果数组 → 返回 []（无需错误处理）', async () => {
    mockDetectHighlights.mockResolvedValueOnce([]);

    const result = await highlightDetector.detectHighlights('/path/to/video.mp4');

    expect(result).toEqual([]);
  });

  it('reason 字段强制类型为 string（避免 any 泄漏）', async () => {
    mockDetectHighlights.mockResolvedValueOnce([
      {
        startMs: 1000,
        endMs: 5000,
        score: 0.95,
        reason: 'audio_energy', // string
        audioScore: 0.9,
        sceneScore: 0.85,
        motionScore: 0.7,
      },
    ]);

    const result = await highlightDetector.detectHighlights('/path/to/video.mp4');

    expect(typeof result[0].reason).toBe('string');
  });

  it('PR-1.3a 替代 visionService.detectHighlights（兼容性合约）', () => {
    // 合约：返回 HighlightSegment[] 类型，时间为秒（与原 VisionService 一致）
    // 这保证了 build-candidates-step.ts 和 highlights.tsx 迁移零成本
    // 参数约定：videoPath（必填）, options（可选，默认 {}）
    expect(typeof highlightDetector.detectHighlights).toBe('function');
    expect(highlightDetector.detectHighlights.length).toBe(1); // 仅 videoPath 为必填
  });
});
