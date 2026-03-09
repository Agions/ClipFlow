/**
 * SubtitleService 单元测试
 */

import { SubtitleService } from '../src/core/services/subtitle.service';

describe('SubtitleService', () => {
  let service: SubtitleService;

  beforeEach(() => {
    service = new SubtitleService();
  });

  describe('exportToSRT', () => {
    it('should export empty subtitles', () => {
      const result = service.exportToSRT({
        entries: [],
        language: 'zh',
        format: { type: 'srt' },
      });
      expect(result).toBe('');
    });

    it('should export single entry', () => {
      const subtitles = {
        entries: [
          { id: '1', startTime: 0, endTime: 2000, text: 'Hello' },
        ],
        language: 'en',
        format: { type: 'srt' },
      };
      
      const result = service.exportToSRT(subtitles);
      
      expect(result).toContain('1');
      expect(result).toContain('00:00:00,000 --> 00:00:02,000');
      expect(result).toContain('Hello');
    });

    it('should format time correctly', () => {
      const subtitles = {
        entries: [
          { id: '1', startTime: 3661000, endTime: 3665000, text: 'Test' },
        ],
        language: 'en',
        format: { type: 'srt' },
      };
      
      const result = service.exportToSRT(subtitles);
      
      expect(result).toContain('01:01:01,000 --> 01:01:05,000');
    });
  });

  describe('exportToVTT', () => {
    it('should export with VTT header', () => {
      const subtitles = {
        entries: [
          { id: '1', startTime: 0, endTime: 2000, text: 'Hello' },
        ],
        language: 'en',
        format: { type: 'vtt' },
      };
      
      const result = service.exportToVTT(subtitles);
      
      expect(result).toStartWith('WEBVTT');
    });
  });

  describe('exportToASS', () => {
    it('should export with ASS header', () => {
      const subtitles = {
        entries: [
          { id: '1', startTime: 0, endTime: 2000, text: 'Hello' },
        ],
        language: 'en',
        format: { type: 'ass' },
      };
      
      const result = service.exportToASS(subtitles);
      
      expect(result).toContain('[Script Info]');
      expect(result).toContain('[V4+ Styles]');
    });
  });

  describe('importFromSRT', () => {
    it('should import valid SRT', () => {
      const srt = `1
00:00:00,000 --> 00:00:02,000
Hello World

2
00:00:02,500 --> 00:00:05,000
Test Subtitle
`;
      
      const result = service.importFromSRT(srt);
      
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].text).toBe('Hello World');
      expect(result.entries[1].text).toBe('Test Subtitle');
    });

    it('should handle empty input', () => {
      const result = service.importFromSRT('');
      expect(result.entries).toHaveLength(0);
    });
  });
});
