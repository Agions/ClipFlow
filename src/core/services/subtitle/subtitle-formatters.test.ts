/**
 * Subtitle Formatters — 单元测试
 *
 * 覆盖：
 * - trackToSRT / trackToVTT / trackToASS 格式转换
 * - 空轨道、空分段边界情况
 */

import { describe, it, expect } from 'vitest';
import { trackToSRT, trackToVTT, trackToASS, type SubtitleTrack } from './subtitle-formatters';
import type { SubtitleStyle } from '@/types/subtitle';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const sampleTrack: SubtitleTrack = {
  id: 'track_1',
  language: 'zh-CN',
  entries: [
    { id: 'e1', startTime: 0, endTime: 1.5, text: '第一句' },
    { id: 'e2', startTime: 1.5, endTime: 3.0, text: '第二句' },
  ],
  style: {
    fontFamily: 'Arial',
    fontSize: 24,
    color: '#FFFFFF',
    backgroundColor: '#000000',
    outline: true,
    outlineColor: '#000000',
    position: 'bottom',
    alignment: 'center',
    opacity: 1,
  } as SubtitleStyle,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('trackToSRT', () => {
  it('produces valid SRT with index and timestamps', () => {
    const srt = trackToSRT(sampleTrack);
    expect(srt).toContain('1\n');
    expect(srt).toContain('00:00:00,000 --> 00:00:01,500');
    expect(srt).toContain('第一句');
    expect(srt).toContain('2\n');
    expect(srt).toContain('00:00:01,500 --> 00:00:03,000');
    expect(srt).toContain('第二句');
  });

  it('returns empty string for empty entries', () => {
    const empty: SubtitleTrack = { ...sampleTrack, entries: [] };
    expect(trackToSRT(empty)).toBe('');
  });
});

describe('trackToVTT', () => {
  it('prepends WEBVTT header', () => {
    const vtt = trackToVTT(sampleTrack);
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    expect(vtt).toContain('00:00:00,000 --> 00:00:01,500');
    expect(vtt).toContain('第一句');
  });

  it('returns header-only for empty entries', () => {
    const empty: SubtitleTrack = { ...sampleTrack, entries: [] };
    expect(trackToVTT(empty)).toBe('WEBVTT\n\n');
  });
});

describe('trackToASS', () => {
  it('includes ASS header and dialogue lines', () => {
    const ass = trackToASS(sampleTrack);
    expect(ass).toContain('[Script Info]');
    expect(ass).toContain('Title: Fablr Subtitles');
    expect(ass).toContain('Dialogue: 0,0:00:00.00,0:00:01.50');
    expect(ass).toContain('第一句');
  });

  it('returns only header for empty entries', () => {
    const empty: SubtitleTrack = { ...sampleTrack, entries: [] };
    expect(trackToASS(empty)).toContain('[Events]');
    expect(trackToASS(empty)).not.toContain('Dialogue:');
  });
});
