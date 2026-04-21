import { describe, it, expect } from 'vitest';
import { calculateEmotionScore } from './emotion-peak-detector';

describe('EmotionPeakDetector', () => {
  describe('calculateEmotionScore', () => {
    it('should return 0 for empty peaks', () => {
      const score = calculateEmotionScore([], 10000);
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
      const peaks = [
        { startMs: 0, endMs: 10000, energy: 100, type: 'laughter' as const },
      ];
      const score = calculateEmotionScore(peaks, 10000);
      expect(score).toBe(100);
    });
  });
});
