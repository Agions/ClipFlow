/**
 * Highlight Detection Tauri Methods — 单元测试
 *
 * 测试三个 invoke 封装方法：
 *  - detectHighlights：可选 options 直接转发
 *  - detectZCRBursts：可选 onProgress 触发 listen 回调
 *  - detectSmartSegments：options 直接转发
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../invoke', () => ({
  invoke: vi.fn(),
  TauriCommand: {
    DETECT_HIGHLIGHTS: 'detect_highlights',
    DETECT_ZCR_BURSTS: 'detect_zcr_bursts',
    DETECT_SMART_SEGMENTS: 'detect_smart_segments',
  },
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

import { invoke, TauriCommand } from '../invoke';
import { listen } from '@tauri-apps/api/event';
import { highlightDetection } from './highlight-detection';

const invokeMock = vi.mocked(invoke);
const listenMock = vi.mocked(listen);

describe('highlightDetection tauri methods', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    listenMock.mockReset();
    listenMock.mockResolvedValue(() => {});
  });

  describe('highlightDetection.detectHighlights', () => {
    it('invokes DETECT_HIGHLIGHTS with the full options', async () => {
      const segments = [{ startMs: 1000, endMs: 3000, score: 0.8 }];
      invokeMock.mockResolvedValue(segments);

      const result = await highlightDetection.detectHighlights('/v/clip.mp4', {
        threshold: 0.5,
        minDurationMs: 500,
        topN: 5,
        windowMs: 2000,
      });

      expect(result).toEqual(segments);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.DETECT_HIGHLIGHTS, {
        videoPath: '/v/clip.mp4',
        threshold: 0.5,
        minDurationMs: 500,
        topN: 5,
        windowMs: 2000,
      });
    });

    it('uses empty options when not provided', async () => {
      invokeMock.mockResolvedValue([]);

      const result = await highlightDetection.detectHighlights('/v/clip.mp4');

      expect(result).toEqual([]);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.DETECT_HIGHLIGHTS, {
        videoPath: '/v/clip.mp4',
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('detector crashed'));

      await expect(highlightDetection.detectHighlights('/v/clip.mp4')).rejects.toThrow(
        'detector crashed'
      );
    });
  });

  describe('highlightDetection.detectZCRBursts', () => {
    it('skips listen when onProgress is not provided', async () => {
      const bursts = [{ startMs: 100, endMs: 400, score: 0.9 }];
      invokeMock.mockResolvedValue(bursts);

      const result = await highlightDetection.detectZCRBursts('/v/clip.mp4', { threshold: 0.3 });

      expect(result).toEqual(bursts);
      expect(listenMock).not.toHaveBeenCalled();
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.DETECT_ZCR_BURSTS, {
        videoPath: '/v/clip.mp4',
        threshold: 0.3,
      });
    });

    it('subscribes to detect-zcr-progress when onProgress is provided', async () => {
      let capturedHandler: ((event: { payload: unknown }) => void) | null = null;
      const unlisten = vi.fn();
      listenMock.mockImplementation(async (_event, handler) => {
        capturedHandler = handler as (event: { payload: unknown }) => void;
        return unlisten;
      });
      invokeMock.mockResolvedValue([{ startMs: 200, endMs: 600, score: 0.7 }]);

      const onProgress = vi.fn();
      await highlightDetection.detectZCRBursts(
        '/v/clip.mp4',
        { threshold: 0.4, topN: 3 },
        onProgress
      );

      expect(listenMock).toHaveBeenCalledWith('detect-zcr-progress', expect.any(Function));
      expect(capturedHandler).not.toBeNull();
      capturedHandler!({ payload: { stage: 'analyze', percent: 0.5 } });
      expect(onProgress).toHaveBeenCalledWith({ stage: 'analyze', percent: 0.5 });
      expect(unlisten).toHaveBeenCalled();
    });

    it('unsubscribes even when invoke throws', async () => {
      const unlisten = vi.fn();
      listenMock.mockResolvedValue(unlisten);
      invokeMock.mockRejectedValue(new Error('zcr failed'));

      await expect(highlightDetection.detectZCRBursts('/v/clip.mp4', {}, vi.fn())).rejects.toThrow(
        'zcr failed'
      );

      expect(unlisten).toHaveBeenCalled();
    });

    it('propagates errors thrown by invoke when onProgress is not provided', async () => {
      invokeMock.mockRejectedValue(new Error('zcr detector unavailable'));

      await expect(highlightDetection.detectZCRBursts('/v/clip.mp4')).rejects.toThrow(
        'zcr detector unavailable'
      );
    });
  });

  describe('highlightDetection.detectSmartSegments', () => {
    it('invokes DETECT_SMART_SEGMENTS with options', async () => {
      const segments = [{ startMs: 0, endMs: 10000, score: 0.8, reason: 'scene change' }];
      invokeMock.mockResolvedValue(segments);

      const result = await highlightDetection.detectSmartSegments('/v/clip.mp4', {
        windowMs: 2000,
        threshold: 0.4,
      });

      expect(result).toEqual(segments);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.DETECT_SMART_SEGMENTS, {
        videoPath: '/v/clip.mp4',
        windowMs: 2000,
        threshold: 0.4,
      });
    });

    it('uses empty options when not provided', async () => {
      invokeMock.mockResolvedValue([]);

      await highlightDetection.detectSmartSegments('/v/clip.mp4');

      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.DETECT_SMART_SEGMENTS, {
        videoPath: '/v/clip.mp4',
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('segmentation failed'));

      await expect(highlightDetection.detectSmartSegments('/v/clip.mp4')).rejects.toThrow(
        'segmentation failed'
      );
    });
  });
});
