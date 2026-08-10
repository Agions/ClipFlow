/**
 * core/services/ai-clip/analyzer-utils.ts — 单元测试
 */
import { describe, it, expect } from 'vitest';
import {
  calculateKeyframeImportance,
  deduplicateCutPoints,
  determineSegmentType,
  calculateSegmentConfidence,
  estimateFinalDuration,
  msToSeconds,
} from './analyzer-utils';
import type { CutPoint, ClipSegment } from './types';

type SilenceSegment = { start: number; end: number; duration: number };

const makeCutPoint = (overrides: Partial<CutPoint> = {}): CutPoint =>
  ({
    id: 'cp-1',
    timestamp: 0,
    confidence: 0.5,
    type: 'scene',
    description: '',
    ...overrides,
  }) as CutPoint;

// ─── calculateKeyframeImportance ──────────────────────────────────────────────

describe('calculateKeyframeImportance', () => {
  it('returns values in [0, 1] for normal indices', () => {
    for (let i = 0; i <= 10; i++) {
      const v = calculateKeyframeImportance(i, 10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('peaks near the middle (position 0.5)', () => {
    const mid = calculateKeyframeImportance(5, 10);
    const edge = calculateKeyframeImportance(0, 10);
    expect(mid).toBeGreaterThan(edge);
  });

  it('handles total=0 by treating it as 1 (safe default)', () => {
    // index=0, safeTotal=1 → position=0 → sin(0) = 0
    const v = calculateKeyframeImportance(0, 0);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('caps result at 1 even if math overflows', () => {
    const v = calculateKeyframeImportance(5, 10);
    expect(v).toBeLessThanOrEqual(1);
  });
});

// ─── deduplicateCutPoints ─────────────────────────────────────────────────────

describe('deduplicateCutPoints', () => {
  it('keeps the higher-confidence point within gap', () => {
    const points = [
      makeCutPoint({ id: '1', timestamp: 0, confidence: 0.5 }),
      makeCutPoint({ id: '2', timestamp: 0.1, confidence: 0.6 }),
      makeCutPoint({ id: '3', timestamp: 5, confidence: 0.7 }),
    ];
    const result = deduplicateCutPoints(points, 0.5);
    // 0 与 0.1 间距<0.5，保留高置信度的 '2'
    expect(result.map(p => p.id)).toEqual(['2', '3']);
  });

  it('replaces lower-confidence neighbor when within gap', () => {
    const points = [
      makeCutPoint({ id: '1', timestamp: 0, confidence: 0.3 }),
      makeCutPoint({ id: '2', timestamp: 0.1, confidence: 0.9 }),
    ];
    const result = deduplicateCutPoints(points, 0.5);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.9);
    expect(result[0].id).toBe('2');
  });

  it('keeps higher-confidence original within gap', () => {
    const points = [
      makeCutPoint({ id: '1', timestamp: 0, confidence: 0.9 }),
      makeCutPoint({ id: '2', timestamp: 0.1, confidence: 0.3 }),
    ];
    const result = deduplicateCutPoints(points, 0.5);
    expect(result[0].id).toBe('1');
  });

  it('uses default minGap = 0.5', () => {
    const points = [
      makeCutPoint({ id: 'a', timestamp: 0 }),
      makeCutPoint({ id: 'b', timestamp: 0.4 }), // within 0.5 gap
    ];
    expect(deduplicateCutPoints(points)).toHaveLength(1);
  });

  it('passes through empty array', () => {
    expect(deduplicateCutPoints([])).toEqual([]);
  });
});

// ─── determineSegmentType ─────────────────────────────────────────────────────

describe('determineSegmentType', () => {
  it('returns "silence" if any cutpoint is silence', () => {
    expect(determineSegmentType([makeCutPoint({ type: 'silence' })])).toBe('silence');
  });

  it('returns "keyframe" if any cutpoint is keyframe', () => {
    expect(determineSegmentType([makeCutPoint({ type: 'keyframe' })])).toBe('keyframe');
  });

  it('returns "video" when no special types', () => {
    expect(determineSegmentType([makeCutPoint({ type: 'scene' })])).toBe('video');
  });

  it('prefers silence > keyframe > video', () => {
    const points = [
      makeCutPoint({ type: 'keyframe' }),
      makeCutPoint({ type: 'silence' }),
      makeCutPoint({ type: 'scene' }),
    ];
    expect(determineSegmentType(points)).toBe('silence');
  });
});

// ─── calculateSegmentConfidence ───────────────────────────────────────────────

describe('calculateSegmentConfidence', () => {
  it('returns 0.5 for empty list', () => {
    expect(calculateSegmentConfidence([])).toBe(0.5);
  });

  it('weights scene-type 0.4, audio (default) 0.4, emotion 0.2', () => {
    const points = [
      makeCutPoint({ type: 'scene', confidence: 1 }), // scene: 1*0.4 = 0.4
      makeCutPoint({ type: 'emotion', confidence: 1 }), // emotion: 1*0.2 = 0.2
      makeCutPoint({ type: 'silence', confidence: 1 }), // audio: 1*0.4 = 0.4
    ];
    expect(calculateSegmentConfidence(points)).toBeCloseTo(1.0, 5);
  });

  it('handles scene-only', () => {
    const points = [makeCutPoint({ type: 'scene', confidence: 0.8 })];
    expect(calculateSegmentConfidence(points)).toBeCloseTo(0.32, 5);
  });

  it('handles emotion-only', () => {
    const points = [makeCutPoint({ type: 'emotion', confidence: 0.5 })];
    expect(calculateSegmentConfidence(points)).toBeCloseTo(0.1, 5);
  });

  it('caps at 1', () => {
    const points = Array(10)
      .fill(0)
      .map(() => makeCutPoint({ confidence: 1 }));
    expect(calculateSegmentConfidence(points)).toBeLessThanOrEqual(1);
  });
});

// ─── estimateFinalDuration ────────────────────────────────────────────────────

describe('estimateFinalDuration', () => {
  it('returns original duration when all flags false', () => {
    expect(estimateFinalDuration(60, [], [], {})).toBe(60);
  });

  it('subtracts silence when removeSilence=true', () => {
    const silences: SilenceSegment[] = [
      { start: 10, end: 20, duration: 10 },
      { start: 30, end: 35, duration: 5 },
    ];
    expect(estimateFinalDuration(60, silences, [], { removeSilence: true })).toBe(45);
  });

  it('subtracts short segments when trimDeadTime=true', () => {
    const segments: ClipSegment[] = [makeSegment(0.3), makeSegment(0.4), makeSegment(5)];
    // 0.3 + 0.4 = 0.7 trimmed
    expect(estimateFinalDuration(60, [], segments, { trimDeadTime: true })).toBeCloseTo(59.3, 5);
  });

  it('adds transition cost when autoTransition=true (segments.length - 1) * 0.3', () => {
    const segments = [makeSegment(10), makeSegment(10), makeSegment(10)];
    // transitions: 2 * 0.3 = 0.6 added
    expect(estimateFinalDuration(60, [], segments, { autoTransition: true })).toBeCloseTo(60.6, 5);
  });

  it('combines all three flags correctly', () => {
    const silences: SilenceSegment[] = [{ start: 0, end: 5, duration: 5 }];
    const segments = [makeSegment(0.4), makeSegment(0.4)]; // 0.8 trimmed, 1 transition
    // 60 - 5 - 0.8 + 0.3 = 54.5
    expect(
      estimateFinalDuration(60, silences, segments, {
        removeSilence: true,
        trimDeadTime: true,
        autoTransition: true,
      })
    ).toBeCloseTo(54.5, 5);
  });

  it('clamps to 0 when over-trimmed', () => {
    const silences: SilenceSegment[] = [{ start: 0, end: 100, duration: 100 }];
    expect(estimateFinalDuration(60, silences, [], { removeSilence: true })).toBe(0);
  });
});

function makeSegment(duration: number, overrides: Partial<ClipSegment> = {}): ClipSegment {
  return {
    id: 'seg-1',
    startTime: 0,
    endTime: duration,
    duration,
    cutPoints: [],
    ...overrides,
  } as ClipSegment;
}

// ─── msToSeconds ──────────────────────────────────────────────────────────────

describe('msToSeconds', () => {
  it('divides by 1000', () => {
    expect(msToSeconds(1000)).toBe(1);
    expect(msToSeconds(500)).toBe(0.5);
    expect(msToSeconds(0)).toBe(0);
  });
});
