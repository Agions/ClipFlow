/**
 * stores/timeline-helpers.ts — 单元测试
 *
 * 覆盖：
 *  - updateClipInTracks
 *  - addKeyframeToClip
 *  - removeKeyframeFromClip
 *  - updateKeyframeInClip
 *  - 不可变性 / 找不到 ID 时原样返回 tracks 引用
 */
import { describe, it, expect } from 'vitest';
import {
  updateClipInTracks,
  addKeyframeToClip,
  removeKeyframeFromClip,
  updateKeyframeInClip,
} from './timeline-helpers';
import type { TimelineTrack, TimelineClip, AnimationKeyframe } from '@/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeClip(id: string, overrides: Partial<TimelineClip> = {}): TimelineClip {
  return {
    id,
    trackId: 't1',
    startMs: 0,
    endMs: 5000,
    sourceStartMs: 0,
    sourceEndMs: 5000,
    name: `clip-${id}`,
    ...overrides,
  };
}

function makeKeyframe(id: string, overrides: Partial<AnimationKeyframe> = {}): AnimationKeyframe {
  return {
    id,
    timeOffset: 0,
    property: 'opacity',
    value: 1,
    ...overrides,
  };
}

function makeTrack(id: string, clips: TimelineClip[]): TimelineTrack {
  return {
    id,
    type: 'video',
    name: `track-${id}`,
    clips,
    muted: false,
    locked: false,
    visible: true,
    height: 60,
  };
}

const track1 = makeTrack('t1', [makeClip('c1'), makeClip('c2')]);
const track2 = makeTrack('t2', [makeClip('c3')]);
const initialTracks: TimelineTrack[] = [track1, track2];

// ─── updateClipInTracks ─────────────────────────────────────────────────────

describe('updateClipInTracks', () => {
  it('updates the matching clip with the given fields', () => {
    const result = updateClipInTracks(initialTracks, 'c1', { name: 'updated' });
    const updated = result[0].clips.find(c => c.id === 'c1');
    expect(updated?.name).toBe('updated');
  });

  it('does not modify other clips', () => {
    const result = updateClipInTracks(initialTracks, 'c1', { name: 'updated' });
    expect(result[0].clips.find(c => c.id === 'c2')?.name).toBe('clip-c2');
  });

  it('does not modify other tracks', () => {
    const result = updateClipInTracks(initialTracks, 'c1', { name: 'updated' });
    expect(result[1]).toEqual(track2);
  });

  it('returns tracks with same shape when clipId not found', () => {
    const result = updateClipInTracks(initialTracks, 'nonexistent', { name: 'x' });
    // 即使找不到，也应返回新数组（不可变）
    expect(result).not.toBe(initialTracks);
    expect(result).toHaveLength(2);
    expect(result[0].clips[0].name).toBe('clip-c1'); // unchanged
  });

  it('preserves immutability of input tracks', () => {
    const before = initialTracks[0].clips[0].name;
    updateClipInTracks(initialTracks, 'c1', { name: 'updated' });
    expect(initialTracks[0].clips[0].name).toBe(before);
  });

  it('supports partial updates without overwriting unrelated fields', () => {
    const result = updateClipInTracks(initialTracks, 'c1', { startMs: 1000 });
    const updated = result[0].clips.find(c => c.id === 'c1')!;
    expect(updated.startMs).toBe(1000);
    expect(updated.name).toBe('clip-c1'); // unchanged
    expect(updated.endMs).toBe(5000); // unchanged
  });
});

// ─── addKeyframeToClip ───────────────────────────────────────────────────────

describe('addKeyframeToClip', () => {
  it('appends a keyframe to the target clip', () => {
    const kf = makeKeyframe('k1', { value: 0.5 });
    const result = addKeyframeToClip(initialTracks, 'c1', kf);
    const c1 = result[0].clips.find(c => c.id === 'c1')!;
    expect(c1.keyframes).toHaveLength(1);
    expect(c1.keyframes?.[0]).toEqual(kf);
  });

  it('preserves existing keyframes', () => {
    const tracks = [makeTrack('t1', [makeClip('c1', { keyframes: [makeKeyframe('k0')] })])];
    const result = addKeyframeToClip(tracks, 'c1', makeKeyframe('k1'));
    const c1 = result[0].clips[0];
    expect(c1.keyframes).toHaveLength(2);
    expect(c1.keyframes?.[0].id).toBe('k0');
    expect(c1.keyframes?.[1].id).toBe('k1');
  });

  it('initialises keyframes when undefined', () => {
    const result = addKeyframeToClip(initialTracks, 'c1', makeKeyframe('k1'));
    expect(result[0].clips[0].keyframes).toBeDefined();
    expect(result[0].clips[0].keyframes).toHaveLength(1);
  });

  it('does not modify other clips or tracks', () => {
    const result = addKeyframeToClip(initialTracks, 'c1', makeKeyframe('k1'));
    expect(result[1]).toEqual(track2);
    expect(result[0].clips[1].keyframes).toBeUndefined();
  });

  it('returns same track structure when clipId not found', () => {
    const result = addKeyframeToClip(initialTracks, 'missing', makeKeyframe('k1'));
    expect(result[0].clips[0].keyframes).toBeUndefined();
  });

  it('preserves immutability of input', () => {
    const before = JSON.stringify(initialTracks);
    addKeyframeToClip(initialTracks, 'c1', makeKeyframe('k1'));
    expect(JSON.stringify(initialTracks)).toBe(before);
  });
});

// ─── removeKeyframeFromClip ──────────────────────────────────────────────────

describe('removeKeyframeFromClip', () => {
  it('removes the matching keyframe by id', () => {
    const tracks = [
      makeTrack('t1', [makeClip('c1', { keyframes: [makeKeyframe('k1'), makeKeyframe('k2')] })]),
    ];
    const result = removeKeyframeFromClip(tracks, 'c1', 'k1');
    const kfs = result[0].clips[0].keyframes!;
    expect(kfs).toHaveLength(1);
    expect(kfs[0].id).toBe('k2');
  });

  it('returns empty array when removing the last keyframe', () => {
    const tracks = [makeTrack('t1', [makeClip('c1', { keyframes: [makeKeyframe('only')] })])];
    const result = removeKeyframeFromClip(tracks, 'c1', 'only');
    expect(result[0].clips[0].keyframes).toEqual([]);
  });

  it('keeps keyframes untouched when keyframeId not found', () => {
    const tracks = [makeTrack('t1', [makeClip('c1', { keyframes: [makeKeyframe('k1')] })])];
    const result = removeKeyframeFromClip(tracks, 'c1', 'missing');
    expect(result[0].clips[0].keyframes).toHaveLength(1);
  });

  it('treats undefined keyframes as empty', () => {
    const result = removeKeyframeFromClip(initialTracks, 'c1', 'any');
    expect(result[0].clips[0].keyframes).toEqual([]);
  });

  it('does not modify other clips or tracks', () => {
    const tracks = [
      makeTrack('t1', [
        makeClip('c1', { keyframes: [makeKeyframe('k1')] }),
        makeClip('c2', { keyframes: [makeKeyframe('k2')] }),
      ]),
    ];
    const result = removeKeyframeFromClip(tracks, 'c1', 'k1');
    expect(result[0].clips[1].keyframes).toHaveLength(1);
    expect(result[0].clips[1].keyframes?.[0].id).toBe('k2');
  });

  it('preserves immutability', () => {
    const tracks = [makeTrack('t1', [makeClip('c1', { keyframes: [makeKeyframe('k1')] })])];
    const before = JSON.stringify(tracks);
    removeKeyframeFromClip(tracks, 'c1', 'k1');
    expect(JSON.stringify(tracks)).toBe(before);
  });
});

// ─── updateKeyframeInClip ────────────────────────────────────────────────────

describe('updateKeyframeInClip', () => {
  it('updates the matching keyframe with given fields', () => {
    const tracks = [
      makeTrack('t1', [makeClip('c1', { keyframes: [makeKeyframe('k1', { value: 0 })] })]),
    ];
    const result = updateKeyframeInClip(tracks, 'c1', 'k1', { value: 1 });
    expect(result[0].clips[0].keyframes?.[0].value).toBe(1);
  });

  it('does not modify unrelated keyframes', () => {
    const tracks = [
      makeTrack('t1', [
        makeClip('c1', {
          keyframes: [makeKeyframe('k1'), makeKeyframe('k2', { value: 0.5 })],
        }),
      ]),
    ];
    const result = updateKeyframeInClip(tracks, 'c1', 'k1', { value: 0.9 });
    expect(result[0].clips[0].keyframes?.[1].value).toBe(0.5);
  });

  it('returns keyframes untouched when keyframeId not found', () => {
    const tracks = [makeTrack('t1', [makeClip('c1', { keyframes: [makeKeyframe('k1')] })])];
    const result = updateKeyframeInClip(tracks, 'c1', 'missing', { value: 99 });
    expect(result[0].clips[0].keyframes?.[0].value).toBe(1);
  });

  it('treats undefined keyframes as empty array', () => {
    const result = updateKeyframeInClip(initialTracks, 'c1', 'k1', { value: 99 });
    expect(result[0].clips[0].keyframes).toEqual([]);
  });

  it('supports partial keyframe updates', () => {
    const tracks = [
      makeTrack('t1', [
        makeClip('c1', {
          keyframes: [makeKeyframe('k1', { value: 0, timeOffset: 100, property: 'opacity' })],
        }),
      ]),
    ];
    const result = updateKeyframeInClip(tracks, 'c1', 'k1', { value: 1 });
    const kf = result[0].clips[0].keyframes?.[0];
    expect(kf?.value).toBe(1);
    expect(kf?.timeOffset).toBe(100); // unchanged
    expect(kf?.property).toBe('opacity'); // unchanged
  });

  it('preserves immutability', () => {
    const tracks = [makeTrack('t1', [makeClip('c1', { keyframes: [makeKeyframe('k1')] })])];
    const before = JSON.stringify(tracks);
    updateKeyframeInClip(tracks, 'c1', 'k1', { value: 99 });
    expect(JSON.stringify(tracks)).toBe(before);
  });

  it('does not modify other clips or tracks', () => {
    const result = updateKeyframeInClip(initialTracks, 'c1', 'k1', { value: 99 });
    expect(result[0].clips[1]).toEqual(track1.clips[1]);
    expect(result[1]).toEqual(track2);
  });
});
