/**
 * 字幕格式转换工具
 * 单一职责：SRT / VTT / ASS 三种字幕格式的相互转换
 *
 * 优化说明：
 * - 从 subtitleService.ts 提取，消除业务服务与格式工具的耦合
 * - 纯函数集合，无副作用，便于单测
 * - SRT/VTT 使用共享的格式转换逻辑（formatSrtTime）
 */

import { formatSrtTime } from '../../../shared/utils/formatting';
import type { SubtitleEntry, SubtitleStyle } from '@/types';

/** 字幕轨道类型（共享） */
export interface SubtitleTrack {
  id: string;
  language: string;
  entries: SubtitleEntry[];
  style?: SubtitleStyle;
}

/**
 * 转换为 SRT (SubRip) 格式
 * 格式：序号 + 时间戳（逗号分隔） + 文本
 */
export function trackToSRT(track: SubtitleTrack): string {
  return track.entries
    .map((entry, index) => {
      const start = formatSrtTime(entry.startTime);
      const end = formatSrtTime(entry.endTime);
      return `${index + 1}\n${start} --> ${end}\n${entry.text}`;
    })
    .join('\n\n');
}

/**
 * 转换为 VTT (WebVTT) 格式
 * 格式：WEBVTT 头 + 时间戳（点号分隔毫秒） + 文本
 */
export function trackToVTT(track: SubtitleTrack): string {
  const header = 'WEBVTT\n\n';
  const body = track.entries
    .map((entry, index) => {
      const start = formatSrtTime(entry.startTime);
      const end = formatSrtTime(entry.endTime);
      return `${index + 1}\n${start} --> ${end}\n${entry.text}`;
    })
    .join('\n\n');
  return header + body;
}

/**
 * ASS 时间格式化：H:MM:SS.cs (厘秒，1/100 秒)
 * 与 SRT/VTT 不同，ASS 使用厘秒而非毫秒
 */
function formatASSTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

/**
 * ASS 字幕头部（包含样式定义）
 */
const ASS_HEADER = `[Script Info]
Title: Fablr Subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,24,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

/**
 * 转换为 ASS (Advanced SubStation Alpha) 格式
 * 适用于视频编辑软件（如剪映、Premiere）
 */
export function trackToASS(track: SubtitleTrack): string {
  const events = track.entries
    .map((entry) => {
      const start = formatASSTime(entry.startTime);
      const end = formatASSTime(entry.endTime);
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${entry.text}`;
    })
    .join('\n');

  return ASS_HEADER + events;
}
