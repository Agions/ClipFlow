export const JIANYING_DRAFT_VERSION = '1.4.0';

export interface JianYingClip {
  id: string;
  trackId: string;
  startMs: number;
  endMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  speed: number;
  color: string;
  /** 字幕文本（字幕轨道专用） */
  text?: string;
}

export interface JianYingTrack {
  id: string;
  type: 'video' | 'audio' | 'subtitle';
  clips: JianYingClip[];
}

export interface JianYingDraft {
  version: string;
  tracks: JianYingTrack[];
  duration: number;
}