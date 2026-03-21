import { describe, it, expect } from 'vitest';
import {
  formatTime,
  formatDuration,
  formatFriendlyDuration,
  formatFileSize,
  formatDate,
  formatDateTime,
  formatDateCustom,
  formatNumber,
  formatPercent,
  truncateText,
  capitalize,
} from '../format';

describe('format utils', () => {
  describe('formatTime', () => {
    it('should format seconds to mm:ss', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(30)).toBe('00:30');
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(90)).toBe('01:30');
      expect(formatTime(3599)).toBe('59:59');
    });

    it('should format hours correctly', () => {
      expect(formatTime(3600)).toBe('01:00:00');
      expect(formatTime(3661)).toBe('01:01:01');
      expect(formatTime(7200)).toBe('02:00:00');
    });

    it('should handle invalid input', () => {
      expect(formatTime(-1)).toBe('00:00');
      expect(formatTime(NaN)).toBe('00:00');
    });

    it('should floor the seconds', () => {
      expect(formatTime(1.9)).toBe('00:01');
      expect(formatTime(59.9)).toBe('00:59');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds to mm:ss', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(30)).toBe('00:30');
      expect(formatDuration(90)).toBe('01:30');
    });

    it('should format hours correctly', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3661)).toBe('1:01:01');
    });

    it('should handle invalid input', () => {
      expect(formatDuration(-1)).toBe('00:00');
      expect(formatDuration(NaN)).toBe('00:00');
    });
  });

  describe('formatFriendlyDuration', () => {
    it('should format seconds only', () => {
      expect(formatFriendlyDuration(0)).toBe('0秒');
      expect(formatFriendlyDuration(30)).toBe('30秒');
      expect(formatFriendlyDuration(59)).toBe('59秒');
    });

    it('should format minutes and seconds', () => {
      expect(formatFriendlyDuration(60)).toBe('1分钟');
      expect(formatFriendlyDuration(90)).toBe('1分钟30秒');
      expect(formatFriendlyDuration(150)).toBe('2分钟30秒');
    });

    it('should format hours', () => {
      expect(formatFriendlyDuration(3600)).toBe('1小时0分钟');
      expect(formatFriendlyDuration(3660)).toBe('1小时1分钟');
      expect(formatFriendlyDuration(7261)).toBe('2小时1分钟'); // seconds not shown when hours > 0
    });

    it('should handle invalid input', () => {
      expect(formatFriendlyDuration(-1)).toBe('0秒');
      expect(formatFriendlyDuration(NaN)).toBe('0秒');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
    });

    it('should format KB', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(10240)).toBe('10 KB');
    });

    it('should format MB', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(104857600)).toBe('100 MB');
    });

    it('should format GB', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(2147483648)).toBe('2 GB');
    });
  });

  describe('formatDate', () => {
    it('should format Date object', () => {
      const date = new Date('2026-03-21T12:00:00');
      expect(formatDate(date)).toBe('2026-03-21');
    });

    it('should format date string', () => {
      expect(formatDate('2026-03-21')).toBe('2026-03-21');
      expect(formatDate('2026-12-25')).toBe('2026-12-25');
    });

    it('should pad single digit month/day', () => {
      const date = new Date('2026-01-05');
      expect(formatDate(date)).toBe('2026-01-05');
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime', () => {
      const date = new Date('2026-03-21T12:30:45');
      expect(formatDateTime(date)).toBe('2026-03-21 12:30:45');
    });

    it('should pad single digit values', () => {
      const date = new Date('2026-01-05T09:05:03');
      expect(formatDateTime(date)).toBe('2026-01-05 09:05:03');
    });
  });

  describe('formatDateCustom', () => {
    it('should format with default pattern', () => {
      const date = new Date('2026-03-21T12:30:45');
      expect(formatDateCustom(date)).toBe('2026-03-21 12:30');
    });

    it('should format with custom pattern', () => {
      const date = new Date('2026-03-21T12:30:45');
      expect(formatDateCustom(date, 'YYYY/MM/DD')).toBe('2026/03/21');
      expect(formatDateCustom(date, 'HH:mm:ss')).toBe('12:30:45');
      expect(formatDateCustom(date, 'YYYY-MM-DD HH:mm')).toBe('2026-03-21 12:30');
    });
  });

  describe('formatNumber', () => {
    it('should format with thousands separator', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });
  });

  describe('formatPercent', () => {
    it('should format percentage', () => {
      expect(formatPercent(0)).toBe('0%');
      expect(formatPercent(0.5)).toBe('50%');
      expect(formatPercent(1)).toBe('100%');
    });

    it('should format with decimals', () => {
      expect(formatPercent(0.333, 1)).toBe('33.3%');
      expect(formatPercent(0.333, 2)).toBe('33.30%');
    });

    it('should handle invalid input', () => {
      expect(formatPercent(NaN)).toBe('0%');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      expect(truncateText('Hello World', 8)).toBe('Hello...');
      expect(truncateText('Hello World', 5)).toBe('He...');
      expect(truncateText('Testing123', 9)).toBe('Testin...');
    });

    it('should not truncate short text', () => {
      expect(truncateText('Hi', 10)).toBe('Hi');
      expect(truncateText('Hello', 5)).toBe('Hello');
    });

    it('should use custom suffix', () => {
      expect(truncateText('Hello World', 8, '>>')).toBe('Hello >>');
    });

    it('should handle empty text', () => {
      expect(truncateText('', 10)).toBe('');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
    });

    it('should handle single character', () => {
      expect(capitalize('h')).toBe('H');
    });

    it('should not modify already capitalized', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });
  });
});
