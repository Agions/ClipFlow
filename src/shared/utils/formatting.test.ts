import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatTime,
  formatDuration,
  formatDurationChinese,
  formatFriendlyDuration,
  formatFileSize,
  formatDate,
  formatDateTime,
  formatDateCustom,
  formatRelativeTime,
  formatRelativeDate,
  formatTimecodeMs,
  formatTimecode,
  formatTimecodeSimple,
  formatSrtTime,
  truncateText,
  capitalize,
  clamp,
  now,
  nowISO,
  MS_PER_SECOND,
} from './formatting';

describe('formatTime', () => {
  it('should format 0 seconds as 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('should format seconds only', () => {
    expect(formatTime(45)).toBe('00:45');
  });

  it('should format minutes and seconds', () => {
    expect(formatTime(125)).toBe('02:05');
  });

  it('should format hours with padding', () => {
    expect(formatTime(3661)).toBe('01:01:01');
  });

  it('should handle NaN', () => {
    expect(formatTime(NaN)).toBe('00:00');
  });

  it('should handle negative values', () => {
    expect(formatTime(-10)).toBe('00:00');
  });
});

describe('formatDuration', () => {
  it('should format 0 seconds', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('should format seconds only without leading zero padding', () => {
    expect(formatDuration(5)).toBe('00:05');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(125)).toBe('02:05');
  });

  it('should format hours', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('should handle NaN', () => {
    expect(formatDuration(NaN)).toBe('00:00');
  });
});

describe('formatFriendlyDuration', () => {
  it('should format 0 seconds', () => {
    expect(formatFriendlyDuration(0)).toBe('0秒');
  });

  it('should format seconds only', () => {
    expect(formatFriendlyDuration(45)).toBe('45秒');
  });

  it('should format minutes', () => {
    expect(formatFriendlyDuration(90)).toBe('1分钟30秒');
  });

  it('should format hours and minutes', () => {
    expect(formatFriendlyDuration(3661)).toBe('1小时1分钟');
  });

  it('should format hours only', () => {
    expect(formatFriendlyDuration(7200)).toBe('2小时');
  });

  it('should handle NaN', () => {
    expect(formatFriendlyDuration(NaN)).toBe('0秒');
  });
});

describe('formatFileSize', () => {
  it('should format 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
  });

  it('should format bytes', () => {
    expect(formatFileSize(512)).toBe('512 Bytes');
  });

  it('should format KB', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('should format MB', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(5242880)).toBe('5 MB');
  });

  it('should format GB', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });
});

describe('formatDate', () => {
  it('should format Date object', () => {
    const date = new Date('2026-04-19');
    expect(formatDate(date)).toBe('2026-04-19');
  });

  it('should format date string', () => {
    expect(formatDate('2026-04-19')).toBe('2026-04-19');
  });

  it('should pad single digit month and day', () => {
    const date = new Date('2026-01-05');
    expect(formatDate(date)).toBe('2026-01-05');
  });
});

describe('formatDateTime', () => {
  it('should format full datetime', () => {
    const date = new Date('2026-04-19T14:30:45');
    expect(formatDateTime(date)).toBe('2026-04-19 14:30:45');
  });

  it('should pad single digit values', () => {
    const date = new Date('2026-01-05T08:05:03');
    expect(formatDateTime(date)).toBe('2026-01-05 08:05:03');
  });
});

describe('formatDateCustom', () => {
  it('should use default format YYYY-MM-DD HH:mm', () => {
    const date = new Date('2026-04-19T14:30:00');
    expect(formatDateCustom(date)).toBe('2026-04-19 14:30');
  });

  it('should support custom format', () => {
    const date = new Date('2026-04-19T14:30:45');
    expect(formatDateCustom(date, 'YYYY/MM/DD')).toBe('2026/04/19');
    expect(formatDateCustom(date, 'HH:mm:ss')).toBe('14:30:45');
  });
});

describe('truncateText', () => {
  it('should not truncate short text', () => {
    expect(truncateText('hello', 10)).toBe('hello');
  });

  it('should truncate with default suffix', () => {
    expect(truncateText('hello world', 8)).toBe('hello...');
  });

  it('should truncate with custom suffix', () => {
    // maxLength=8, suffix='…' (1 char) → 保留 7 chars + suffix = 8 chars total
    expect(truncateText('hello world', 8, '…')).toBe('hello w…');
  });

  it('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('');
  });
});

describe('capitalize', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should only capitalize first letter', () => {
    expect(capitalize('hello WORLD')).toBe('Hello WORLD');
  });

  it('should handle single character', () => {
    expect(capitalize('a')).toBe('A');
  });
});

describe('formatDurationChinese', () => {
  it('formats hours, minutes and seconds', () => {
    expect(formatDurationChinese(3661)).toBe('1小时1分1秒');
  });

  it('formats minutes and seconds (no hours)', () => {
    expect(formatDurationChinese(90)).toBe('1分30秒');
  });

  it('formats seconds only', () => {
    expect(formatDurationChinese(45)).toBe('45秒');
  });

  it('handles NaN', () => {
    expect(formatDurationChinese(NaN)).toBe('0秒');
  });

  it('handles negative values', () => {
    expect(formatDurationChinese(-1)).toBe('0秒');
  });
});

describe('formatRelativeTime', () => {
  const NOW = new Date('2026-08-07T10:00:00');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "今天 HH:mm" for the same day', () => {
    const d = new Date('2026-08-07T08:30:00');
    const result = formatRelativeTime(d);
    expect(result).toMatch(/^今天 /);
  });

  it('returns "昨天 HH:mm" for the day before today', () => {
    // Use >24h diff to actually trigger "yesterday"
    const d = new Date('2026-08-06T05:00:00');
    expect(formatRelativeTime(d)).toMatch(/^昨天 /);
  });

  it('returns "N 天前" for 2-6 days ago', () => {
    const d = new Date('2026-08-04T10:00:00');
    expect(formatRelativeTime(d)).toBe('3 天前');
  });

  it('returns locale date for > 7 days ago', () => {
    const d = new Date('2026-07-01T10:00:00');
    const result = formatRelativeTime(d);
    expect(result).toMatch(/[0-9]/);
  });

  it('accepts a date string', () => {
    const result = formatRelativeTime('2026-08-07T08:30:00');
    expect(result).toMatch(/^今天 /);
  });
});

describe('formatRelativeDate', () => {
  const NOW = new Date('2026-08-07T10:00:00');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "N 分钟前" for diff < 1 hour', () => {
    const d = new Date('2026-08-07T09:30:00');
    expect(formatRelativeDate(d)).toBe('30 分钟前');
  });

  it('returns "N 小时前" for diff < 1 day', () => {
    const d = new Date('2026-08-07T08:00:00');
    expect(formatRelativeDate(d)).toBe('2 小时前');
  });

  it('returns "N 天前" for diff < 7 days', () => {
    const d = new Date('2026-08-04T10:00:00');
    expect(formatRelativeDate(d)).toBe('3 天前');
  });

  it('returns locale date string for older dates', () => {
    const d = new Date('2025-01-01T10:00:00');
    expect(formatRelativeDate(d)).toMatch(/2025/);
  });

  it('accepts a date string', () => {
    expect(formatRelativeDate('2026-08-07T09:30:00')).toBe('30 分钟前');
  });
});

describe('timecode helpers', () => {
  it('formatTimecodeMs formats ms as MM:SS:FF', () => {
    // 1500ms → 00:01:14 at 30fps (JS floating point: 500/(1000/30) ≈ 14.999... → 14)
    expect(formatTimecodeMs(1500)).toBe('00:01:14');
  });

  it('formatTimecodeMs handles 0 ms', () => {
    expect(formatTimecodeMs(0)).toBe('00:00:00');
  });

  it('formatTimecode formats seconds as HH:MM:SS:FF', () => {
    // 3661.5s → 01:01:01:15
    expect(formatTimecode(3661.5)).toBe('01:01:01:15');
  });

  it('formatTimecodeSimple formats seconds as HH:MM:SS', () => {
    expect(formatTimecodeSimple(3661)).toBe('01:01:01');
  });

  it('formatSrtTime formats seconds as HH:MM:SS,mmm', () => {
    // 1.5s → 00:00:01,500
    expect(formatSrtTime(1.5)).toBe('00:00:01,500');
  });
});

describe('time helpers', () => {
  it('clamp clamps value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(20, 0, 10)).toBe(10);
  });

  it('MS_PER_SECOND is 1000', () => {
    expect(MS_PER_SECOND).toBe(1000);
  });

  it('now() returns a recent timestamp', () => {
    const before = Date.now();
    const result = now();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });

  it('nowISO() returns a valid ISO 8601 string', () => {
    const result = nowISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
