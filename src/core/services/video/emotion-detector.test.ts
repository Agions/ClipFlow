import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock tauri module
vi.mock('../../../core/tauri', () => ({
  tauri: {
    detectHighlights: vi.fn(),
    detectZCRBursts: vi.fn(),
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

import { tauri } from '../../../core/tauri';
import { calculateEmotionScore, detectEmotionPeaks, type EmoPeak } from './emotion-detector';

const mockedDetectHighlights = vi.mocked(tauri.detectHighlights);
const mockedDetectZCRBursts = vi.mocked(tauri.detectZCRBursts);

beforeEach(() => {
  mockedDetectHighlights.mockReset();
  mockedDetectZCRBursts.mockReset();
});

describe('EmotionPeakDetector', () => {
  describe('calculateEmotionScore', () => {
    it('should return 0 for empty peaks', () => {
      const score = calculateEmotionScore([], 10000);
      expect(score).toBe(0);
    });

    it('should return 0 when totalDurationMs is 0', () => {
      const peaks: EmoPeak[] = [{ startMs: 0, endMs: 100, energy: 80, type: 'laughter' }];
      const score = calculateEmotionScore(peaks, 0);
      expect(score).toBe(0);
    });

    it('should return higher score for more peaks with high energy', () => {
      const peaks = [
        { startMs: 1000, endMs: 2000, energy: 80, type: 'laughter' as const },
        { startMs: 3000, endMs: 4000, energy: 90, type: 'excited' as const },
      ];
      const score = calculateEmotionScore(peaks, 10000);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should cap score at 100', () => {
      const peaks = [{ startMs: 0, endMs: 10000, energy: 100, type: 'laughter' as const }];
      const score = calculateEmotionScore(peaks, 10000);
      expect(score).toBe(100);
    });

    it('rounds to 2 decimal places', () => {
      const peaks = [{ startMs: 0, endMs: 3333, energy: 33, type: 'laughter' as const }];
      const score = calculateEmotionScore(peaks, 10000);
      // Verify it has at most 2 decimal places
      const decimals = score.toString().split('.')[1];
      expect(!decimals || decimals.length <= 2).toBe(true);
    });
  });

  describe('detectEmotionPeaks', () => {
    it('returns empty result when tauri.detectHighlights throws', async () => {
      mockedDetectHighlights.mockRejectedValue(new Error('rust crashed'));
      const result = await detectEmotionPeaks('/video.mp4');
      expect(result).toEqual({ peaks: [] });
    });

    it('filters highlights by reason=audio_energy and audioScore != null', async () => {
      mockedDetectHighlights.mockResolvedValue([
        { startMs: 0, endMs: 1000, score: 0.9, reason: 'audio_energy', audioScore: 0.5 },
        { startMs: 1000, endMs: 2000, score: 0.7, reason: 'motion', audioScore: 0.3 },
        { startMs: 2000, endMs: 3000, score: 0.8, reason: 'audio_energy' }, // no audioScore
        { startMs: 3000, endMs: 4000, score: 0.6, reason: 'audio_energy', audioScore: 0 },
        { startMs: 4000, endMs: 5000, score: 0.6, reason: 'audio_energy', audioScore: 0.4 },
      ] as never);
      mockedDetectZCRBursts.mockResolvedValue(null as never);

      const result = await detectEmotionPeaks('/video.mp4');
      // 3 highlights have reason=audio_energy: idx 0, 3, 4
      // idx 0 has audioScore=0.5 → energy=50
      // idx 3 has audioScore=0 → energy=0
      // idx 4 has audioScore=0.4 → energy=40
      expect(result.peaks).toHaveLength(3);
      expect(result.peaks[0].energy).toBe(50);
      expect(result.peaks[1].energy).toBe(0);
      expect(result.peaks[2].energy).toBe(40);
      result.peaks.forEach(p => expect(p.type).toBe('generic'));
    });

    it('skips ZCR bursts with score < 1.2 (insignificant)', async () => {
      mockedDetectHighlights.mockResolvedValue([]);
      mockedDetectZCRBursts.mockResolvedValue([
        { startMs: 0, endMs: 500, score: 1.0 }, // < 1.2, skipped
        { startMs: 500, endMs: 1000, score: 1.5 }, // ≥ 1.2, kept
      ]);

      const result = await detectEmotionPeaks('/video.mp4');
      expect(result.peaks).toHaveLength(1);
      expect(result.peaks[0]).toMatchObject({
        startMs: 500,
        endMs: 1000,
        type: 'laughter',
      });
    });

    it('marks non-overlapping bursts as applause when score > 2.0', async () => {
      mockedDetectHighlights.mockResolvedValue([]);
      mockedDetectZCRBursts.mockResolvedValue([{ startMs: 100, endMs: 200, score: 2.5 }]);

      const result = await detectEmotionPeaks('/video.mp4');
      expect(result.peaks[0].type).toBe('applause');
      expect(result.peaks[0].energy).toBe(Math.min(100, Math.round(2.5 * 50))); // 100 (capped)
    });

    it('marks non-overlapping bursts as laughter when 1.2 ≤ score ≤ 2.0', async () => {
      mockedDetectHighlights.mockResolvedValue([]);
      mockedDetectZCRBursts.mockResolvedValue([{ startMs: 100, endMs: 200, score: 1.5 }]);

      const result = await detectEmotionPeaks('/video.mp4');
      expect(result.peaks[0].type).toBe('laughter');
      expect(result.peaks[0].energy).toBe(Math.min(100, Math.round(1.5 * 50))); // 75
    });

    it('boosts overlapping peaks: energy += score * 15, capped at 100', async () => {
      mockedDetectHighlights.mockResolvedValue([
        { startMs: 0, endMs: 1000, score: 0.5, reason: 'audio_energy', audioScore: 0.8 }, // energy=80
      ] as never);
      mockedDetectZCRBursts.mockResolvedValue([
        { startMs: 100, endMs: 900, score: 1.5 }, // overlaps [0,1000]
      ]);

      const result = await detectEmotionPeaks('/video.mp4');
      // energy = min(100, 80 + round(1.5 * 15)) = min(100, 80 + 23) = 100
      expect(result.peaks[0].energy).toBe(100);
      // overlap score 1.5 (not > 2.0) → excited
      expect(result.peaks[0].type).toBe('excited');
    });

    it('marks overlapping bursts with score > 2.0 as applause', async () => {
      mockedDetectHighlights.mockResolvedValue([
        { startMs: 0, endMs: 1000, score: 0.5, reason: 'audio_energy', audioScore: 0.5 },
      ] as never);
      mockedDetectZCRBursts.mockResolvedValue([{ startMs: 100, endMs: 900, score: 2.5 }]);

      const result = await detectEmotionPeaks('/video.mp4');
      expect(result.peaks[0].type).toBe('applause');
    });

    it('continues when detectZCRBursts rejects (uses null fallback)', async () => {
      mockedDetectHighlights.mockResolvedValue([
        { startMs: 0, endMs: 1000, score: 0.5, reason: 'audio_energy', audioScore: 0.6 },
      ] as never);
      mockedDetectZCRBursts.mockRejectedValue(new Error('zcr failed'));

      const result = await detectEmotionPeaks('/video.mp4');
      expect(result.peaks).toHaveLength(1);
      expect(result.peaks[0].energy).toBe(60);
    });

    it('uses default threshold and minDurationMs when not provided', async () => {
      mockedDetectHighlights.mockResolvedValue([]);
      mockedDetectZCRBursts.mockResolvedValue(null as never);
      await detectEmotionPeaks('/video.mp4');
      expect(mockedDetectHighlights).toHaveBeenCalledWith('/video.mp4', {
        threshold: 1.5,
        minDurationMs: 500,
        topN: 20,
      });
    });

    it('respects custom threshold and minDurationMs', async () => {
      mockedDetectHighlights.mockResolvedValue([]);
      mockedDetectZCRBursts.mockResolvedValue(null as never);
      await detectEmotionPeaks('/video.mp4', { threshold: 2.0, minDurationMs: 1000 });
      expect(mockedDetectHighlights).toHaveBeenCalledWith('/video.mp4', {
        threshold: 2.0,
        minDurationMs: 1000,
        topN: 20,
      });
    });

    it('filters out highlights with audioScore=null (strict null check)', async () => {
      mockedDetectHighlights.mockResolvedValue([
        { startMs: 0, endMs: 1000, score: 0.5, reason: 'audio_energy' }, // audioScore missing
      ] as never);
      mockedDetectZCRBursts.mockResolvedValue(null as never);

      const result = await detectEmotionPeaks('/video.mp4');
      // audioScore 不为 null 的筛选会过滤掉该 highlight
      expect(result.peaks).toHaveLength(0);
    });

    it('caps overlapping energy boost at 100', async () => {
      mockedDetectHighlights.mockResolvedValue([
        { startMs: 0, endMs: 1000, score: 0.95, reason: 'audio_energy', audioScore: 0.95 }, // energy=95
      ] as never);
      mockedDetectZCRBursts.mockResolvedValue([{ startMs: 100, endMs: 900, score: 2.0 }]);

      const result = await detectEmotionPeaks('/video.mp4');
      // 95 + round(2.0 * 15) = 95 + 30 = 125 → capped at 100
      expect(result.peaks[0].energy).toBe(100);
    });
  });
});
