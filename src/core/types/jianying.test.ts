import { describe, it, expect } from 'vitest';
import { JIANYING_DRAFT_VERSION, JianYingClip, JianYingTrack, JianYingDraft } from './jianying';

describe('JianYing types', () => {
  it('JIANYING_DRAFT_VERSION should be a string', () => {
    expect(typeof JIANYING_DRAFT_VERSION).toBe('string');
    expect(JIANYING_DRAFT_VERSION).toBeTruthy();
  });

  describe('JianYingClip', () => {
    it('should have all required fields', () => {
      const clip: JianYingClip = {
        id: 'clip-1',
        trackId: 'track-1',
        startMs: 0,
        endMs: 5000,
        sourceStartMs: 0,
        sourceEndMs: 5000,
        speed: 1.0,
        color: '#FFFFFF',
      };
      expect(clip.id).toBe('clip-1');
      expect(clip.trackId).toBe('track-1');
      expect(clip.startMs).toBe(0);
      expect(clip.endMs).toBe(5000);
      expect(clip.sourceStartMs).toBe(0);
      expect(clip.sourceEndMs).toBe(5000);
      expect(clip.speed).toBe(1.0);
      expect(clip.color).toBe('#FFFFFF');
    });
  });

  describe('JianYingTrack', () => {
    it('should have all required fields', () => {
      const clip: JianYingClip = {
        id: 'clip-1',
        trackId: 'track-1',
        startMs: 0,
        endMs: 5000,
        sourceStartMs: 0,
        sourceEndMs: 5000,
        speed: 1.0,
        color: '#FFFFFF',
      };
      const track: JianYingTrack = {
        id: 'track-1',
        type: 'video',
        clips: [clip],
      };
      expect(track.id).toBe('track-1');
      expect(track.type).toBe('video');
      expect(track.clips).toHaveLength(1);
    });
  });

  describe('JianYingDraft', () => {
    it('should have all required fields', () => {
      const clip: JianYingClip = {
        id: 'clip-1',
        trackId: 'track-1',
        startMs: 0,
        endMs: 5000,
        sourceStartMs: 0,
        sourceEndMs: 5000,
        speed: 1.0,
        color: '#FFFFFF',
      };
      const track: JianYingTrack = {
        id: 'track-1',
        type: 'video',
        clips: [clip],
      };
      const draft: JianYingDraft = {
        version: JIANYING_DRAFT_VERSION,
        tracks: [track],
        duration: 5000,
      };
      expect(draft.version).toBeTruthy();
      expect(draft.tracks).toHaveLength(1);
      expect(draft.duration).toBe(5000);
    });
  });
});