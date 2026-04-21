/**
 * 字幕适配剪映格式
 * 将通用 SubtitleSegment[] 转换为剪映草稿可用的字幕轨道
 */

import type { JianYingTrack, JianYingClip } from '@/core/types/jianying';

export interface SubtitleSegment {
  startMs: number;
  endMs: number;
  text: string;
}

export function toJianYingSubtitleTrack(
  segments: SubtitleSegment[],
  trackId: string
): JianYingTrack {
  return {
    id: trackId,
    type: 'subtitle',
    clips: segments.map((seg, i) => ({
      id: `subtitle-${i}`,
      trackId,
      startMs: seg.startMs,
      endMs: seg.endMs,
      sourceStartMs: seg.startMs,
      sourceEndMs: seg.endMs,
      speed: 1.0,
      color: '#FFFFFF',
      text: seg.text,
    })) as unknown as JianYingClip[],
  };
}
