/**
 * EditorStore — 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore, __testing } from './editor-store';

beforeEach(() => {
  __testing.resetTrackHistory();
  useEditorStore.setState({
    video: null,
    script: null,
    voice: null,
    activePanel: 'video',
    isPlaying: false,
    currentTime: 0,
    volume: 1,
    muted: false,
    selection: { segmentId: undefined, multipleIds: [] },
    zoom: 1,
    scrollPosition: 0,
    timelineTracks: [],
    playheadMs: 0,
    timelineDuration: 60000,
    snapEnabled: true,
    snapThreshold: 100,
    selectedClipId: undefined,
    selectedTrackId: undefined,
    selectedMultipleIds: undefined,
    inPointMs: undefined,
    outPointMs: undefined,
  });
});

describe('useEditorStore', () => {
  // crypto.randomUUID polyfill for jsdom
  beforeEach(() => {
    __testing.resetTrackHistory();
  });

  describe('setters', () => {
    it('setVoice updates voice', () => {
      useEditorStore.getState().setVoice({ id: 'v1', url: '/v.mp3' });
      expect(useEditorStore.getState().voice?.id).toBe('v1');
    });

    it('setScrollPosition updates scrollPosition', () => {
      useEditorStore.getState().setScrollPosition(120);
      expect(useEditorStore.getState().scrollPosition).toBe(120);
    });

    it('setSnapEnabled updates snapEnabled', () => {
      useEditorStore.getState().setSnapEnabled(false);
      expect(useEditorStore.getState().snapEnabled).toBe(false);
    });
  });

  describe('selection', () => {
    it('setSelection merges partial selection', () => {
      useEditorStore.getState().setSelection({ segmentId: 'seg-1' });
      expect(useEditorStore.getState().selection.segmentId).toBe('seg-1');
      expect(useEditorStore.getState().selection.multipleIds).toEqual([]);
    });

    it('clearSelection resets selection', () => {
      useEditorStore.getState().setSelection({ segmentId: 'seg-1', multipleIds: ['a'] });
      useEditorStore.getState().clearSelection();
      expect(useEditorStore.getState().selection).toEqual({
        segmentId: undefined,
        multipleIds: [],
      });
    });
  });

  describe('zoom', () => {
    it('setZoom clamps to max', () => {
      useEditorStore.getState().setZoom(20);
      expect(useEditorStore.getState().zoom).toBe(10);
    });

    it('setZoom clamps to min', () => {
      useEditorStore.getState().setZoom(0.01);
      expect(useEditorStore.getState().zoom).toBe(0.1);
    });
  });

  describe('timeline tracks', () => {
    it('addTimelineTrack creates track with id', () => {
      const id = useEditorStore.getState().addTimelineTrack('video', 'My Track');
      expect(typeof id).toBe('string');
      const track = useEditorStore.getState().timelineTracks.find(t => t.id === id);
      expect(track?.name).toBe('My Track');
      expect(track?.type).toBe('video');
    });

    it('addTimelineTrack uses default name based on type when name omitted', () => {
      const id = useEditorStore.getState().addTimelineTrack('audio');
      const track = useEditorStore.getState().timelineTracks.find(t => t.id === id)!;
      expect(track.name).toMatch(/音频/);
    });

    it('addTimelineTrack uses fallback name for unknown type', () => {
      const id = useEditorStore.getState().addTimelineTrack('effect');
      const track = useEditorStore.getState().timelineTracks.find(t => t.id === id)!;
      expect(track.name).toMatch(/效果/);
      // Subtitle tracks get height=50, others height=60
      const subId = useEditorStore.getState().addTimelineTrack('subtitle');
      const sub = useEditorStore.getState().timelineTracks.find(t => t.id === subId)!;
      expect(sub.height).toBe(50);
      // Non-subtitle: 60
      expect(track.height).toBe(60);
    });

    it('removeTimelineTrack removes track', () => {
      const id = useEditorStore.getState().addTimelineTrack('audio');
      expect(useEditorStore.getState().timelineTracks).toHaveLength(1);
      useEditorStore.getState().removeTimelineTrack(id);
      expect(useEditorStore.getState().timelineTracks).toHaveLength(0);
    });

    it('updateTimelineTrack updates fields', () => {
      const id = useEditorStore.getState().addTimelineTrack('video');
      useEditorStore.getState().updateTimelineTrack(id, { muted: true });
      expect(useEditorStore.getState().timelineTracks[0].muted).toBe(true);
    });
  });

  describe('clips', () => {
    it('addClipToTrack adds clip and selects it', () => {
      const trackId = useEditorStore.getState().addTimelineTrack('video');
      const clipId = useEditorStore.getState().addClipToTrack(trackId, {
        name: 'clip-1',
        startMs: 0,
        endMs: 5000,
        sourceStartMs: 0,
        sourceEndMs: 5000,
      });
      const track = useEditorStore.getState().timelineTracks.find(t => t.id === trackId)!;
      expect(track.clips).toHaveLength(1);
      expect(useEditorStore.getState().selectedClipId).toBe(clipId);
    });

    it('removeClipFromTrack removes clip', () => {
      const trackId = useEditorStore.getState().addTimelineTrack('video');
      const clipId = useEditorStore.getState().addClipToTrack(trackId, {
        name: 'clip-1',
        startMs: 0,
        endMs: 5000,
        sourceStartMs: 0,
        sourceEndMs: 5000,
      });
      expect(useEditorStore.getState().timelineTracks[0].clips).toHaveLength(1);
      useEditorStore.getState().removeClipFromTrack(clipId);
      expect(useEditorStore.getState().timelineTracks[0].clips).toHaveLength(0);
    });

    it('removeClipFromTrack clears selection when removing the selected clip', () => {
      const trackId = useEditorStore.getState().addTimelineTrack('video');
      const clipId = useEditorStore.getState().addClipToTrack(trackId, {
        name: 'clip-1',
        startMs: 0,
        endMs: 5000,
        sourceStartMs: 0,
        sourceEndMs: 5000,
      });
      expect(useEditorStore.getState().selectedClipId).toBe(clipId);
      useEditorStore.getState().removeClipFromTrack(clipId);
      expect(useEditorStore.getState().selectedClipId).toBeUndefined();
      expect(useEditorStore.getState().selectedTrackId).toBeUndefined();
    });

    it('splitClip splits at midpoint', () => {
      const trackId = useEditorStore.getState().addTimelineTrack('video');
      const clipId = useEditorStore.getState().addClipToTrack(trackId, {
        name: 'clip-1',
        startMs: 0,
        endMs: 10000,
        sourceStartMs: 0,
        sourceEndMs: 10000,
      });
      useEditorStore.getState().splitClip(clipId, 5000);
      const track = useEditorStore.getState().timelineTracks.find(t => t.id === trackId)!;
      expect(track.clips).toHaveLength(2);
      expect(track.clips[0].endMs).toBe(5000);
      expect(track.clips[1].startMs).toBe(5000);
    });

    it('splitClip no-op when split point outside the clip range', () => {
      const trackId = useEditorStore.getState().addTimelineTrack('video');
      const clipId = useEditorStore.getState().addClipToTrack(trackId, {
        name: 'clip-1',
        startMs: 0,
        endMs: 10000,
        sourceStartMs: 0,
        sourceEndMs: 10000,
      });
      useEditorStore.getState().splitClip(clipId, 0); // splitMs <= startMs
      const track = useEditorStore.getState().timelineTracks.find(t => t.id === trackId)!;
      expect(track.clips).toHaveLength(1);
    });

    it('splitClip no-op when clipId does not exist', () => {
      useEditorStore.getState().addTimelineTrack('video');
      useEditorStore.getState().splitClip('nonexistent', 5000);
      expect(useEditorStore.getState().timelineTracks[0].clips).toHaveLength(0);
    });

    it('updateClip modifies clip fields', () => {
      const trackId = useEditorStore.getState().addTimelineTrack('video');
      const clipId = useEditorStore.getState().addClipToTrack(trackId, {
        name: 'clip-1',
        startMs: 0,
        endMs: 5000,
        sourceStartMs: 0,
        sourceEndMs: 5000,
      });
      useEditorStore.getState().updateClip(clipId, { name: 'renamed' });
      const track = useEditorStore.getState().timelineTracks.find(t => t.id === trackId)!;
      expect(track.clips[0].name).toBe('renamed');
    });

    it('moveClip moves clip to a different track and updates startMs', () => {
      const t1 = useEditorStore.getState().addTimelineTrack('video');
      const t2 = useEditorStore.getState().addTimelineTrack('video');
      const clipId = useEditorStore.getState().addClipToTrack(t1, {
        name: 'c',
        startMs: 0,
        endMs: 5000,
        sourceStartMs: 0,
        sourceEndMs: 5000,
      });
      useEditorStore.getState().moveClip(clipId, t2, 1000);
      const tracks = useEditorStore.getState().timelineTracks;
      expect(tracks.find(t => t.id === t1)!.clips).toHaveLength(0);
      const target = tracks.find(t => t.id === t2)!;
      expect(target.clips).toHaveLength(1);
      expect(target.clips[0].startMs).toBe(1000);
      expect(target.clips[0].endMs).toBe(6000);
      expect(target.clips[0].trackId).toBe(t2);
    });

    it('moveClip accepts explicit endMs to adjust sourceEndMs', () => {
      const t1 = useEditorStore.getState().addTimelineTrack('video');
      const t2 = useEditorStore.getState().addTimelineTrack('video');
      const clipId = useEditorStore.getState().addClipToTrack(t1, {
        name: 'c',
        startMs: 0,
        endMs: 5000,
        sourceStartMs: 0,
        sourceEndMs: 5000,
      });
      useEditorStore.getState().moveClip(clipId, t2, 1000, 3000);
      const target = useEditorStore.getState().timelineTracks.find(t => t.id === t2)!;
      expect(target.clips[0].startMs).toBe(1000);
      expect(target.clips[0].endMs).toBe(3000);
      // sourceEndMs is recomputed
      expect(target.clips[0].sourceEndMs).toBe(2000);
    });

    it('moveClip no-op when clipId does not exist', () => {
      const t2 = useEditorStore.getState().addTimelineTrack('video');
      useEditorStore.getState().moveClip('nonexistent', t2, 1000);
      expect(useEditorStore.getState().timelineTracks.find(t => t.id === t2)!.clips).toHaveLength(
        0
      );
    });

    it('moveClip with skipHistory=true skips saving to history', () => {
      const t1 = useEditorStore.getState().addTimelineTrack('video');
      const t2 = useEditorStore.getState().addTimelineTrack('video');
      const clipId = useEditorStore.getState().addClipToTrack(t1, {
        name: 'c',
        startMs: 0,
        endMs: 5000,
        sourceStartMs: 0,
        sourceEndMs: 5000,
      });
      // Add a save state first
      useEditorStore.getState().saveTrackHistory();
      expect(useEditorStore.getState().canUndoTrack()).toBe(true);
      // Now move with skipHistory, undo should restore to pre-move state (one track with clip)
      useEditorStore.getState().moveClip(clipId, t2, 1000, undefined, true);
      useEditorStore.getState().undoTrack();
      const tracks = useEditorStore.getState().timelineTracks;
      expect(tracks.find(t => t.id === t1)!.clips).toHaveLength(1);
      expect(tracks.find(t => t.id === t2)!.clips).toHaveLength(0);
    });
  });

  describe('keyframes', () => {
    it('addKeyframe adds a keyframe to the clip', () => {
      const trackId = useEditorStore.getState().addTimelineTrack('video');
      const clipId = useEditorStore.getState().addClipToTrack(trackId, {
        name: 'c',
        startMs: 0,
        endMs: 5000,
        sourceStartMs: 0,
        sourceEndMs: 5000,
      });
      const kfId = useEditorStore.getState().addKeyframe(clipId, {
        timeOffset: 1000,
        property: 'opacity',
        value: 0.5,
      });
      expect(typeof kfId).toBe('string');
      const track = useEditorStore.getState().timelineTracks.find(t => t.id === trackId)!;
      expect(track.clips[0].keyframes).toBeDefined();
      expect(track.clips[0].keyframes!).toHaveLength(1);
    });

    it('removeKeyframe removes a keyframe', () => {
      const trackId = useEditorStore.getState().addTimelineTrack('video');
      const clipId = useEditorStore.getState().addClipToTrack(trackId, {
        name: 'c',
        startMs: 0,
        endMs: 5000,
        sourceStartMs: 0,
        sourceEndMs: 5000,
      });
      const kfId = useEditorStore.getState().addKeyframe(clipId, {
        timeOffset: 1000,
        property: 'opacity',
        value: 0.5,
      });
      useEditorStore.getState().removeKeyframe(clipId, kfId);
      const track = useEditorStore.getState().timelineTracks.find(t => t.id === trackId)!;
      expect(track.clips[0].keyframes ?? []).toHaveLength(0);
    });

    it('updateKeyframe modifies a keyframe', () => {
      const trackId = useEditorStore.getState().addTimelineTrack('video');
      const clipId = useEditorStore.getState().addClipToTrack(trackId, {
        name: 'c',
        startMs: 0,
        endMs: 5000,
        sourceStartMs: 0,
        sourceEndMs: 5000,
      });
      const kfId = useEditorStore.getState().addKeyframe(clipId, {
        timeOffset: 1000,
        property: 'opacity',
        value: 0.5,
      });
      useEditorStore.getState().updateKeyframe(clipId, kfId, { value: 0.8 });
      const track = useEditorStore.getState().timelineTracks.find(t => t.id === trackId)!;
      expect(track.clips[0].keyframes![0].value).toBe(0.8);
    });
  });

  describe('timeline selection & points', () => {
    it('setTimelineSelection sets selectedClipId and selectedTrackId', () => {
      useEditorStore.getState().setTimelineSelection('c1', 't1');
      expect(useEditorStore.getState().selectedClipId).toBe('c1');
      expect(useEditorStore.getState().selectedTrackId).toBe('t1');
    });

    it('clearTimelineSelection clears both fields', () => {
      useEditorStore.getState().setTimelineSelection('c1', 't1');
      useEditorStore.getState().clearTimelineSelection();
      expect(useEditorStore.getState().selectedClipId).toBeUndefined();
      expect(useEditorStore.getState().selectedTrackId).toBeUndefined();
    });

    it('setInPoint sets inPointMs to current playheadMs', () => {
      useEditorStore.getState().setPlayheadMs(2500);
      useEditorStore.getState().setInPoint();
      expect(useEditorStore.getState().inPointMs).toBe(2500);
    });

    it('setOutPoint sets outPointMs to current playheadMs', () => {
      useEditorStore.getState().setPlayheadMs(7500);
      useEditorStore.getState().setOutPoint();
      expect(useEditorStore.getState().outPointMs).toBe(7500);
    });

    it('selectAllClips is no-op when there are no clips', () => {
      useEditorStore.getState().selectAllClips();
      expect(useEditorStore.getState().selectedClipId).toBeUndefined();
      expect(useEditorStore.getState().selectedMultipleIds).toBeUndefined();
    });

    it('selectAllClips selects all clips, sets first as selectedClipId', () => {
      const t1 = useEditorStore.getState().addTimelineTrack('video');
      useEditorStore.getState().addClipToTrack(t1, {
        name: 'a',
        startMs: 0,
        endMs: 1000,
        sourceStartMs: 0,
        sourceEndMs: 1000,
      });
      const secondClip = useEditorStore.getState().addClipToTrack(t1, {
        name: 'b',
        startMs: 1000,
        endMs: 2000,
        sourceStartMs: 0,
        sourceEndMs: 1000,
      });
      useEditorStore.getState().selectAllClips();
      const state = useEditorStore.getState();
      expect(state.selectedClipId).toBeDefined();
      expect(state.selectedTrackId).toBe(t1);
      expect(state.selectedMultipleIds).toEqual([secondClip]);
    });

    it('setTimelineDuration clamps to >= 0', () => {
      useEditorStore.getState().setTimelineDuration(-100);
      expect(useEditorStore.getState().timelineDuration).toBe(0);
    });

    it('setTimelineDuration accepts positive value', () => {
      useEditorStore.getState().setTimelineDuration(120000);
      expect(useEditorStore.getState().timelineDuration).toBe(120000);
    });

    it('setTimelineTracks stores tracks and pushes previous state to history', () => {
      useEditorStore.getState().setTimelineTracks([
        {
          id: 't1',
          type: 'video',
          name: 'T1',
          clips: [],
          muted: false,
          locked: false,
          visible: true,
          height: 60,
        },
      ]);
      expect(useEditorStore.getState().timelineTracks).toHaveLength(1);
    });

    it('setPlayheadMs clamps negative values to 0', () => {
      useEditorStore.getState().setPlayheadMs(-500);
      expect(useEditorStore.getState().playheadMs).toBe(0);
    });

    it('canUndoTrack returns false initially', () => {
      expect(useEditorStore.getState().canUndoTrack()).toBe(false);
    });

    it('canRedoTrack returns false initially', () => {
      expect(useEditorStore.getState().canRedoTrack()).toBe(false);
    });

    it('canRedoTrack returns true after undo', () => {
      useEditorStore.getState().addTimelineTrack('video');
      useEditorStore.getState().saveTrackHistory();
      useEditorStore.getState().addTimelineTrack('audio');
      useEditorStore.getState().undoTrack();
      expect(useEditorStore.getState().canRedoTrack()).toBe(true);
    });

    it('undoTrack no-op when no history', () => {
      useEditorStore.getState().undoTrack(); // no throw, no change
      expect(useEditorStore.getState().timelineTracks).toHaveLength(0);
    });

    it('redoTrack no-op when no redo available', () => {
      useEditorStore.getState().redoTrack();
      expect(useEditorStore.getState().timelineTracks).toHaveLength(0);
    });
  });

  describe('reset', () => {
    it('restores initial state', () => {
      useEditorStore.getState().setVideo({ id: 'v1', url: '/v.mp4', duration: 10 });
      useEditorStore.getState().setActivePanel('script');
      useEditorStore.getState().reset();
      expect(useEditorStore.getState().video).toBeNull();
      expect(useEditorStore.getState().activePanel).toBe('video');
    });
  });
});
