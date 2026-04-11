import type { AudioTrack, EditorConfig, EffectTrack, TextTrack, Timeline, VideoTrack } from './types';

export function createTrack(
  timeline: Timeline,
  type: 'video' | 'audio' | 'text' | 'effect',
  config: EditorConfig
): { timeline: Timeline; trackId: string } {
  const id = `${type}_${Date.now()}`;
  let updatedTimeline = timeline;

  switch (type) {
    case 'video':
      if (timeline.videoTracks.length < config.maxVideoTracks) {
        const track: VideoTrack = {
          id,
          name: `${type} Track`,
          clips: [],
          visible: true,
          locked: false
        };
        updatedTimeline = { ...timeline, videoTracks: [...timeline.videoTracks, track] };
      }
      break;
    case 'audio':
      if (timeline.audioTracks.length < config.maxAudioTracks) {
        const track: AudioTrack = {
          id,
          name: `${type} Track`,
          clips: [],
          visible: true,
          locked: false,
          volume: 1
        };
        updatedTimeline = { ...timeline, audioTracks: [...timeline.audioTracks, track] };
      }
      break;
    case 'text':
      if (timeline.textTracks.length < config.maxTextTracks) {
        const track: TextTrack = {
          id,
          name: `${type} Track`,
          items: [],
          visible: true,
          locked: false
        };
        updatedTimeline = { ...timeline, textTracks: [...timeline.textTracks, track] };
      }
      break;
    case 'effect':
      if (timeline.effectTracks.length < config.maxEffectTracks) {
        const track: EffectTrack = {
          id,
          name: `${type} Track`,
          effects: [],
          visible: true,
          locked: false
        };
        updatedTimeline = {
          ...timeline,
          effectTracks: [...timeline.effectTracks, track]
        };
      }
      break;
  }

  return { timeline: updatedTimeline, trackId: id };
}

export function generateTimelineFromScript(
  scriptSegments: Array<{ content: string }>,
  videoSegments: Array<{ id: string; startTime: number; endTime: number }>,
  createTrackFn: (type: 'video' | 'text') => string,
  addClipFn: (
    trackId: string,
    clip: { id: string; sourceId: string; sourceStart: number; sourceEnd: number; startTime: number; endTime: number; effects: unknown[] },
    position: number
  ) => void,
  addTextFn: (
    trackId: string,
    text: { id: string; content: string; startTime: number; endTime: number; style: Record<string, unknown> },
    position: number
  ) => void
): Timeline {
  const videoTrackId = createTrackFn('video');
  const textTrackId = createTrackFn('text');

  let currentTime = 0;

  for (let i = 0; i < Math.min(scriptSegments.length, videoSegments.length); i++) {
    const script = scriptSegments[i];
    const video = videoSegments[i];

    const videoClip = {
      id: `clip_${i}`,
      sourceId: video.id,
      sourceStart: video.startTime,
      sourceEnd: video.endTime,
      startTime: currentTime,
      endTime: currentTime + (video.endTime - video.startTime),
      effects: [] as never[]
    };

    addClipFn(videoTrackId, videoClip, currentTime);

    const textItem = {
      id: `text_${i}`,
      content: script.content,
      startTime: currentTime,
      endTime: currentTime + (video.endTime - video.startTime),
      style: {
        fontSize: 24,
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'bottom'
      }
    };

    addTextFn(textTrackId, textItem, currentTime);
    currentTime += video.endTime - video.startTime;
  }

  return {
    id: `timeline_${Date.now()}`,
    duration: currentTime,
    videoTracks: [],
    audioTracks: [],
    textTracks: [],
    effectTracks: [],
    markers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
