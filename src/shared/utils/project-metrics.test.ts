/**
 * shared/utils/project-metrics.ts — 单元测试
 *
 * 覆盖：
 *  - readNumberField (number / string / 非法值 / fallback)
 *  - resolveProjectVideoPath (videoPath / videos[0].path / fallback)
 *  - extractProjectMediaMetrics (duration/bitrate/size 计算 + 估算公式)
 *  - pickPreferredSizeMb (优先级选择)
 */
import { describe, it, expect } from 'vitest';
import {
  readNumberField,
  resolveProjectVideoPath,
  extractProjectMediaMetrics,
  pickPreferredSizeMb,
} from './project-metrics';

// ─── readNumberField ─────────────────────────────────────────────────────────

describe('readNumberField', () => {
  it('returns the number as-is when finite', () => {
    expect(readNumberField(42)).toBe(42);
    expect(readNumberField(0)).toBe(0);
    expect(readNumberField(-3.14)).toBe(-3.14);
  });

  it('returns fallback for Infinity, NaN', () => {
    expect(readNumberField(Infinity)).toBe(0);
    expect(readNumberField(-Infinity)).toBe(0);
    expect(readNumberField(NaN)).toBe(0);
  });

  it('parses numeric strings', () => {
    expect(readNumberField('42')).toBe(42);
    expect(readNumberField('3.14')).toBe(3.14);
    expect(readNumberField('-7')).toBe(-7);
  });

  it('returns fallback for non-numeric strings', () => {
    expect(readNumberField('abc')).toBe(0);
    expect(readNumberField('')).toBe(0);
    expect(readNumberField('abc', -1)).toBe(-1);
  });

  it('returns fallback for non-number non-string values', () => {
    expect(readNumberField(null)).toBe(0);
    expect(readNumberField(undefined)).toBe(0);
    expect(readNumberField({})).toBe(0);
    expect(readNumberField([])).toBe(0);
    expect(readNumberField(true)).toBe(0);
  });

  it('uses provided fallback', () => {
    expect(readNumberField(null, 999)).toBe(999);
    expect(readNumberField('abc', 100)).toBe(100);
  });
});

// ─── resolveProjectVideoPath ─────────────────────────────────────────────────

describe('resolveProjectVideoPath', () => {
  it('returns videoPath when present and non-empty', () => {
    expect(resolveProjectVideoPath({ videoPath: '/path/to/video.mp4' })).toBe('/path/to/video.mp4');
  });

  it('trims-whitespace and still returns the path', () => {
    expect(resolveProjectVideoPath({ videoPath: '  /path.mp4  ' })).toBe('  /path.mp4  ');
  });

  it('falls back to videos[0].path when videoPath is empty', () => {
    expect(resolveProjectVideoPath({ videos: [{ path: '/a.mp4' }] })).toBe('/a.mp4');
  });

  it('falls back to videos[0].path when videoPath missing entirely', () => {
    expect(resolveProjectVideoPath({ videos: [{ path: '/b.mp4' }] })).toBe('/b.mp4');
  });

  it('returns empty string when videos array is empty', () => {
    expect(resolveProjectVideoPath({ videos: [] })).toBe('');
  });

  it('returns empty string when firstVideo has no path', () => {
    expect(resolveProjectVideoPath({ videos: [{}] })).toBe('');
  });

  it('returns empty string when firstVideo.path is empty', () => {
    expect(resolveProjectVideoPath({ videos: [{ path: '' }] })).toBe('');
  });

  it('returns empty string when no video info available', () => {
    expect(resolveProjectVideoPath({})).toBe('');
    expect(resolveProjectVideoPath({ foo: 'bar' })).toBe('');
  });

  it('returns empty string when videoPath is non-string', () => {
    expect(resolveProjectVideoPath({ videoPath: 123 })).toBe('');
    expect(resolveProjectVideoPath({ videoPath: null })).toBe('');
  });

  it('returns empty string when videos is not an array', () => {
    expect(resolveProjectVideoPath({ videos: 'not-an-array' })).toBe('');
  });

  it('prefers videoPath over videos[0].path', () => {
    expect(
      resolveProjectVideoPath({
        videoPath: '/primary.mp4',
        videos: [{ path: '/secondary.mp4' }],
      })
    ).toBe('/primary.mp4');
  });
});

// ─── extractProjectMediaMetrics ──────────────────────────────────────────────

describe('extractProjectMediaMetrics', () => {
  it('returns all zeros for empty project', () => {
    expect(extractProjectMediaMetrics({})).toEqual({
      durationSec: 0,
      explicitSizeMb: 0,
      estimatedSizeMb: 0,
    });
  });

  it('reads duration from metadata', () => {
    expect(extractProjectMediaMetrics({ metadata: { duration: 120 } })).toMatchObject({
      durationSec: 120,
    });
  });

  it('reads bitrate from metadata (used internally for estimatedSizeMb)', () => {
    // bitrate 本身不返回，但用于计算 estimatedSizeMb
    const result = extractProjectMediaMetrics({
      metadata: { duration: 60, bitrate: 1_000_000 },
    });
    expect(result.estimatedSizeMb).toBeGreaterThan(0);
  });

  it('prefers project.sizeMb over project.size for explicitSizeMb', () => {
    expect(extractProjectMediaMetrics({ sizeMb: 50, size: 999 })).toMatchObject({
      explicitSizeMb: 50,
    });
  });

  it('falls back to project.size when sizeMb missing', () => {
    expect(extractProjectMediaMetrics({ size: 42 })).toMatchObject({ explicitSizeMb: 42 });
  });

  it('computes estimatedSizeMb from bitrate + duration', () => {
    // bitrate (bps) * durationSec / 8 / 1024 / 1024 = MB
    // 1_000_000 bps * 60 s / 8 / 1024 / 1024 ≈ 7.152 MB
    const result = extractProjectMediaMetrics({
      metadata: { duration: 60, bitrate: 1_000_000 },
    });
    expect(result.estimatedSizeMb).toBeCloseTo(7.152, 2);
    expect(result.durationSec).toBe(60);
  });

  it('returns estimatedSizeMb=0 when bitrate missing', () => {
    expect(extractProjectMediaMetrics({ metadata: { duration: 60 } })).toMatchObject({
      estimatedSizeMb: 0,
    });
  });

  it('returns estimatedSizeMb=0 when duration missing', () => {
    expect(extractProjectMediaMetrics({ metadata: { bitrate: 1_000_000 } })).toMatchObject({
      estimatedSizeMb: 0,
    });
  });

  it('treats non-object metadata as empty', () => {
    expect(extractProjectMediaMetrics({ metadata: 'not-an-object' })).toEqual({
      durationSec: 0,
      explicitSizeMb: 0,
      estimatedSizeMb: 0,
    });
  });

  it('handles null metadata', () => {
    expect(extractProjectMediaMetrics({ metadata: null })).toEqual({
      durationSec: 0,
      explicitSizeMb: 0,
      estimatedSizeMb: 0,
    });
  });
});

// ─── pickPreferredSizeMb ─────────────────────────────────────────────────────

describe('pickPreferredSizeMb', () => {
  it('returns exactSizeMb when > 0', () => {
    expect(pickPreferredSizeMb(100, 50, 10)).toBe(100);
  });

  it('falls back to explicitSizeMb when exactSizeMb is 0', () => {
    expect(pickPreferredSizeMb(0, 50, 10)).toBe(50);
  });

  it('falls back to estimatedSizeMb when both previous are 0', () => {
    expect(pickPreferredSizeMb(0, 0, 10)).toBe(10);
  });

  it('returns 0 when all three are 0', () => {
    expect(pickPreferredSizeMb(0, 0, 0)).toBe(0);
  });

  it('does not fall through for negative exactSizeMb (negative is not > 0)', () => {
    expect(pickPreferredSizeMb(-5, 50, 10)).toBe(50);
  });

  it('priority chain example: exact wins over explicit wins over estimated', () => {
    expect(pickPreferredSizeMb(1, 2, 3)).toBe(1);
    expect(pickPreferredSizeMb(0, 2, 3)).toBe(2);
    expect(pickPreferredSizeMb(0, 0, 3)).toBe(3);
  });
});
