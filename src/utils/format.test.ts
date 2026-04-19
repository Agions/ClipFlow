/**
 * 格式化工具函数测试
 */

import { formatTime, formatDuration, formatDate, formatFileSize, formatFriendlyDuration } from '../shared/utils/format';

describe('formatTime', () => {
  it('should format 0 as 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('should format seconds correctly', () => {
    expect(formatTime(1)).toBe('00:01');
    expect(formatTime(59)).toBe('00:59');
  });

  it('should format minutes correctly', () => {
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(3599)).toBe('59:59');
  });

  it('should format hours correctly', () => {
    expect(formatTime(3600)).toBe('01:00:00');
    expect(formatTime(3661)).toBe('01:01:01');
  });
});

describe('formatDuration (HH:MM:SS format)', () => {
  it('should format seconds', () => {
    expect(formatDuration(30)).toBe('00:30');
  });

  it('should format minutes', () => {
    expect(formatDuration(120)).toBe('02:00');
  });

  it('should format hours without zero-padding', () => {
    expect(formatDuration(7200)).toBe('2:00:00');
  });

  it('should format with leading zeros', () => {
    expect(formatDuration(90)).toBe('01:30');
  });
});

describe('formatFriendlyDuration (Chinese format)', () => {
  it('should format seconds only', () => {
    expect(formatFriendlyDuration(30)).toBe('30秒');
  });

  it('should format minutes only', () => {
    expect(formatFriendlyDuration(120)).toBe('2分钟');
  });

  it('should format hours and minutes (no seconds when hours present)', () => {
    expect(formatFriendlyDuration(7200)).toBe('2小时');
  });

  it('should format hours and minutes when hours present', () => {
    expect(formatFriendlyDuration(7200)).toBe('2小时');
    expect(formatFriendlyDuration(7322)).toBe('2小时2分钟'); // seconds not shown when hours present
  });
});

describe('formatFileSize', () => {
  it('should format bytes as "Bytes"', () => {
    expect(formatFileSize(500)).toBe('500 Bytes');
  });

  it('should format KB with 2 decimal places', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('should format MB with 2 decimal places', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(1572864)).toBe('1.5 MB');
  });

  it('should format GB', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });
});
