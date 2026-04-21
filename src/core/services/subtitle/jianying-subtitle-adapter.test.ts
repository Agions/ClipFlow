import { describe, it, expect } from 'vitest';
import { toJianYingSubtitleTrack } from './jianying-subtitle-adapter';

describe('JianYingSubtitleAdapter', () => {
  it('should convert subtitle segments to JianYing track', () => {
    const segments = [
      { startMs: 0, endMs: 2000, text: 'Hello' },
      { startMs: 2000, endMs: 4000, text: 'World' },
    ];
    const track = toJianYingSubtitleTrack(segments, 'subtitle-track-1');
    expect(track.type).toBe('subtitle');
    expect(track.clips.length).toBe(2);
    expect(track.clips[0]).toHaveProperty('text', 'Hello');
    expect(track.clips[1]).toHaveProperty('text', 'World');
  });

  it('should have correct timing on clips', () => {
    const segments = [{ startMs: 500, endMs: 2500, text: 'Test' }];
    const track = toJianYingSubtitleTrack(segments, 'track');
    expect(track.clips[0].startMs).toBe(500);
    expect(track.clips[0].endMs).toBe(2500);
  });
});
