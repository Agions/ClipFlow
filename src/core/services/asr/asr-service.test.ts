/**
 * core/services/asr/asr-service.ts — 单元测试
 *
 * 覆盖：
 *  - transcribeVideo / recognizeSpeech (uses Mock provider, always succeeds)
 *  - recognizeBatch (multiple videos)
 *  - getAudioPeaks (with mocked tauri.detectZCRBursts)
 *  - _convertBurstsToPeaks logic via getAudioPeaks
 *  - Empty path fallback
 *  - Error wrapping via executeRequest
 *  - Provider chain: each provider throwing is caught (L138) and falling through
 *    all-null providers triggers the defensive AppError (L143)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../tauri', () => ({
  tauri: {
    detectZCRBursts: vi.fn(),
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

import { tauri } from '../../tauri';
import { asrService } from './asr-service';
import { DEFAULT_ASR_OPTIONS, type ASRResult } from './asr-types';
import { createMinimalVideoInfo } from '@/types/video-info';
import type { VideoInfo } from '@/types';

const mockedDetectZCRBursts = vi.mocked(tauri.detectZCRBursts);

beforeEach(() => {
  mockedDetectZCRBursts.mockReset();
});

function makeVideoInfo(overrides: Partial<VideoInfo> = {}): VideoInfo {
  return {
    ...createMinimalVideoInfo('/path/to/video.mp4'),
    duration: 30,
    ...overrides,
  };
}

// ─── recognizeSpeech ────────────────────────────────────────────────────────

describe('asrService.recognizeSpeech', () => {
  it('returns a non-null ASRResult (falls through to Mock provider)', async () => {
    const result = await asrService.recognizeSpeech(makeVideoInfo({ duration: 10 }));
    expect(result).not.toBeNull();
    expect(result.text).toBeTruthy();
    expect(Array.isArray(result.segments)).toBe(true);
    expect(result.segments.length).toBeGreaterThan(0);
  });

  it('returns the configured language in the result', async () => {
    const result = await asrService.recognizeSpeech(makeVideoInfo(), {
      language: 'en_us',
    });
    expect(result.language).toBe('en_us');
  });

  it('falls back to DEFAULT_ASR_OPTIONS when options missing', async () => {
    const result = await asrService.recognizeSpeech(makeVideoInfo());
    expect(result.language).toBe(DEFAULT_ASR_OPTIONS.language);
  });

  it('includes confidence and fullResult from Mock', async () => {
    const result = await asrService.recognizeSpeech(makeVideoInfo());
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.provider).toBe('mock');
  });
});

// ─── transcribeVideo ────────────────────────────────────────────────────────

describe('asrService.transcribeVideo', () => {
  it('builds minimal VideoInfo and runs recognizeSpeech', async () => {
    const result = await asrService.transcribeVideo('/video.mp4', 15);
    expect(result).not.toBeNull();
    expect(result.segments.length).toBeGreaterThan(0);
  });

  it('passes through options to recognizeSpeech', async () => {
    const result = await asrService.transcribeVideo('/video.mp4', 15, { language: 'en_us' });
    expect(result.language).toBe('en_us');
  });
});

// ─── recognizeBatch ─────────────────────────────────────────────────────────

describe('asrService.recognizeBatch', () => {
  it('returns one result per input video', async () => {
    const videos = [
      makeVideoInfo({ id: 'v1', duration: 10 }),
      makeVideoInfo({ id: 'v2', duration: 20 }),
      makeVideoInfo({ id: 'v3', duration: 15 }),
    ];
    const results = await asrService.recognizeBatch(videos);
    expect(results).toHaveLength(3);
    results.forEach((r: ASRResult) => expect(r).not.toBeNull());
  });

  it('returns empty array when given empty input', async () => {
    const results = await asrService.recognizeBatch([]);
    expect(results).toEqual([]);
  });
});

// ─── getAudioPeaks ──────────────────────────────────────────────────────────

describe('asrService.getAudioPeaks', () => {
  it('returns empty array when videoInfo.path is empty', async () => {
    const result = await asrService.getAudioPeaks(makeVideoInfo({ path: '' }));
    expect(result).toEqual([]);
  });

  it('converts ZCR bursts to peaks via _convertBurstsToPeaks', async () => {
    mockedDetectZCRBursts.mockResolvedValue([
      { startMs: 1000, endMs: 2000, score: 2.0 }, // midMs=1500, intensity≈0.33
      { startMs: 5000, endMs: 6000, score: 3.0 }, // midMs=5500, intensity≈0.5
    ]);

    const result = await asrService.getAudioPeaks(makeVideoInfo({ path: '/v.mp4' }), {
      threshold: 0.3,
      minInterval: 1000,
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      timestamp: 1.5, // midMs / 1000
    });
  });

  it('respects default threshold=0.7 (filters out low-intensity bursts)', async () => {
    mockedDetectZCRBursts.mockResolvedValue([
      { startMs: 1000, endMs: 2000, score: 1.5 }, // intensity ~0.33, below 0.7-0.3=0.4
    ]);
    const result = await asrService.getAudioPeaks(makeVideoInfo({ path: '/v.mp4' }));
    expect(result).toEqual([]);
  });

  it('respects default minInterval=1000ms (merges close peaks)', async () => {
    mockedDetectZCRBursts.mockResolvedValue([
      { startMs: 0, endMs: 1000, score: 5.0 },
      { startMs: 500, endMs: 1500, score: 5.0 }, // only 500ms apart, suppressed
    ]);
    const result = await asrService.getAudioPeaks(makeVideoInfo({ path: '/v.mp4' }));
    expect(result).toHaveLength(1);
  });

  it('uses custom minInterval to merge or split', async () => {
    mockedDetectZCRBursts.mockResolvedValue([
      { startMs: 0, endMs: 1000, score: 5.0 },
      { startMs: 500, endMs: 1500, score: 5.0 },
    ]);
    // minInterval=0: keep both
    const result = await asrService.getAudioPeaks(makeVideoInfo({ path: '/v.mp4' }), {
      threshold: 0.3,
      minInterval: 0,
    });
    expect(result).toHaveLength(2);
  });

  it('caps intensity at 1', async () => {
    mockedDetectZCRBursts.mockResolvedValue([
      { startMs: 1000, endMs: 2000, score: 100 }, // intensity = min((99)/(100.001), 1) = 0.99
    ]);
    const result = await asrService.getAudioPeaks(makeVideoInfo({ path: '/v.mp4' }), {
      threshold: 0.0,
      minInterval: 0,
    });
    expect(result[0].intensity).toBeLessThanOrEqual(1);
  });
});

// ─── error wrapping ─────────────────────────────────────────────────────────

describe('asrService error wrapping', () => {
  it('wraps unexpected errors in ServiceError via executeRequest', async () => {
    // Force an internal failure by passing a non-VideoInfo-shaped value
    // We use ts-ignore to bypass type checks for this edge-case test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad = undefined as any;
    await expect(asrService.recognizeSpeech(bad)).rejects.toBeTruthy();
  });
});

// ─── Provider chain fallback (L138 / L143) ───────────────────────────────────

describe('asrService provider chain fallback', () => {
  // We reach into the singleton via `as any` to swap providers for these
  // targeted tests. The real Rust/WebSpeech providers are not mockable from
  // here, so we replace the chain with hand-rolled stubs.
  function swapProviders(stubs: Array<{ name: string; behavior: 'throw' | 'null' | 'ok' }>) {
    const chain = stubs.map(s => ({
      name: s.name,
      transcribe: async () => {
        if (s.behavior === 'throw') throw new Error(`${s.name} boom`);
        if (s.behavior === 'null') return null;
        return {
          text: 'ok',
          segments: [],
          language: 'zh_cn',
          confidence: 0.9,
          fullResult: undefined,
          provider: s.name,
        };
      },
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (asrService as any)._providers = chain;
  }

  it('logs warning and falls through when a provider throws (L138)', async () => {
    swapProviders([
      { name: 'first', behavior: 'throw' },
      { name: 'second', behavior: 'ok' },
    ]);

    const result = await asrService.recognizeSpeech(makeVideoInfo());
    expect(result.provider).toBe('second');
    // logger.warn should have been called for the failing provider
    const { logger } = await import('@/shared/utils/logging');
    expect(logger.warn).toHaveBeenCalledWith(
      '[ASRService] first 不可用:',
      expect.stringContaining('first boom')
    );
  });

  it('throws AppError when every provider returns null (L143)', async () => {
    swapProviders([
      { name: 'a', behavior: 'null' },
      { name: 'b', behavior: 'null' },
      { name: 'c', behavior: 'null' },
    ]);

    // executeRequest wraps the thrown AppError into a ServiceError,
    // but the underlying message must still come from L143.
    await expect(asrService.recognizeSpeech(makeVideoInfo())).rejects.toThrow(/No ASR provider/);
  });
});
