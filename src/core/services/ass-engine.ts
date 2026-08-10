/**
 * ASS (Advanced SubStation Alpha) 字幕引擎（Stage 15.3）
 *
 * 用途：把 SubtitleTrack + SubtitleStyle 序列化为标准 ASS 字幕文件，
 * 供 FFmpeg libass 滤镜烧录到视频帧上。
 *
 * ASS 文件结构：
 * - [Script Info]   元信息（分辨率、脚本类型、标题）
 * - [V4+ Styles]    样式表（字体/颜色/描边/对齐）
 * - [Events]        字幕事件（Dialogue 行）
 *
 * 详见 https://github.com/libass/libass/blob/master/doc/ASSspecs.txt
 *
 * 与 SSML 引擎风格一致：纯函数 + 零依赖 + 双端镜像。
 * 数据源：`src/core/domain/assembly.ts` (SubtitleStyle / SubtitleCue / SubtitleTrack)
 * Rust 镜像：`src-tauri/src/commands/render/ass_engine.rs`
 */

import type { SubtitleCue, SubtitleStyle, SubtitleTrack } from '@/core/domain/assembly';

// ─── 颜色转换 ─────────────────────────────────────────────────

/** ASS 颜色格式：&HAABBGGRR（alpha + BGR，hex 大写） */
function toAssColor(hex: string, opacity: number = 1.0): string {
  // 输入 #RRGGBB → 拆 RGB
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return '&H00FFFFFF';
  const rgb = m[1];
  const r = rgb.slice(0, 2);
  const g = rgb.slice(2, 4);
  const b = rgb.slice(4, 6);
  // alpha: opacity=1.0 → 0x00 (完全可见), opacity=0.0 → 0xFF (完全透明)
  const alpha = Math.round((1.0 - Math.max(0, Math.min(1, opacity))) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  // ASS 是 BGRA 顺序
  return `&H${alpha}${b.toUpperCase()}${g.toUpperCase()}${r.toUpperCase()}`;
}

// ─── 时间格式 ─────────────────────────────────────────────────

/** 秒数 → ASS 时间格式 H:MM:SS.CC（百分秒） */
export function toAssTime(secs: number): string {
  if (secs < 0) secs = 0;
  const total_cs = Math.round(secs * 100); // 厘秒（1/100 秒）
  const h = Math.floor(total_cs / 360_000);
  const m = Math.floor((total_cs % 360_000) / 6_000);
  const s = Math.floor((total_cs % 6_000) / 100);
  const cs = total_cs % 100;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

// ─── Alignment 映射 ───────────────────────────────────────────

/**
 * ASS 对齐码：1=bottom-left, 2=bottom-center, 3=bottom-right,
 *            4=middle-left, 5=middle-center, 6=middle-right,
 *            7=top-left, 8=top-center, 9=top-right
 */
function positionToAlignment(position: SubtitleStyle['position']): number {
  switch (position) {
    case 'top':
      return 8; // top-center
    case 'middle':
      return 5; // middle-center
    case 'bottom':
      return 2; // bottom-center
  }
}

// ─── Style 序列化 ─────────────────────────────────────────────

/**
 * 单个 SubtitleStyle → ASS V4+ Style 行
 * 例：Style: douyin-default,Source Han Sans,24,&H00FFFFFF,...
 */
export function serializeAssStyle(style: SubtitleStyle): string {
  const primary = toAssColor(style.color, style.opacity);
  const outline = toAssColor(style.strokeColor, 1.0);
  const back = '&H00000000'; // 阴影透明（v3 默认不画阴影）
  const alignment = positionToAlignment(style.position);
  const outlineWidth = style.strokeWidth;
  return `Style: ${style.id},${[
    style.fontFamily,
    style.fontSize.toString(),
    primary,
    '&H000000FF', // SecondaryColour: 卡拉OK效果颜色（v3 不用）
    outline,
    back,
    '-1', // Bold
    '0', // Italic
    '0', // Underline
    '0', // StrikeOut
    '100', // ScaleX
    '100', // ScaleY
    '0', // Spacing
    '0', // Angle
    '1', // BorderStyle: 1=描边
    outlineWidth.toString(),
    '0', // Shadow
    alignment.toString(),
    '10', // MarginL
    '10', // MarginR
    '10', // MarginV
    '1', // Encoding: 1=默认
  ].join(',')}`;
}

// ─── Dialogue 序列化 ──────────────────────────────────────────

/**
 * 单个 SubtitleCue → ASS Dialogue 行
 * 例：Dialogue: 0,0:00:00.00,0:00:03.50,Default,,0,0,0,,Hello world
 *
 * 注意：ASS 不支持 \n 多行；要换行用 \N（libass 兼容）
 */
export function serializeAssDialogue(cue: SubtitleCue, defaultStyleId: string): string {
  const styleId = cue.styleId || defaultStyleId;
  // 替换 \n → \N（ASS 换行）
  const text = cue.text.replace(/\r\n|\r|\n/g, '\\N');
  return `Dialogue: 0,${toAssTime(cue.startSecs)},${toAssTime(cue.endSecs)},${styleId},,0,0,0,,${text}`;
}

// ─── 完整 ASS 文件 ─────────────────────────────────────────────

export interface AssBuildOptions {
  /** 视频宽（默认 1920） */
  width?: number;
  /** 视频高（默认 1080） */
  height?: number;
  /** 脚本标题（默认 "StoryFab Export"） */
  title?: string;
  /** 默认 style ID（cues 没指定时用） */
  defaultStyleId?: string;
}

/** 完整 SubtitleTrack → 标准 ASS 字幕文件内容 */
export function buildAssFile(track: SubtitleTrack, options: AssBuildOptions = {}): string {
  const width = options.width ?? 1920;
  const height = options.height ?? 1080;
  const title = options.title ?? 'StoryFab Export';
  const defaultStyleId = options.defaultStyleId ?? track.styles[0]?.id ?? 'Default';

  const lines: string[] = [];

  // [Script Info]
  lines.push('[Script Info]');
  lines.push('ScriptType: V4.00+');
  lines.push('Collisions: Normal');
  lines.push(`Title: ${title}`);
  lines.push(`PlayResX: ${width}`);
  lines.push(`PlayResY: ${height}`);
  lines.push('ScaledBorderAndShadow: yes');
  lines.push('WrapStyle: 0');
  lines.push('');

  // [V4+ Styles]
  lines.push('[V4+ Styles]');
  lines.push(
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding'
  );
  for (const s of track.styles) {
    lines.push(serializeAssStyle(s));
  }
  lines.push('');

  // [Events]
  lines.push('[Events]');
  lines.push(
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
  );
  for (const cue of track.cues) {
    lines.push(serializeAssDialogue(cue, defaultStyleId));
  }
  lines.push('');

  return lines.join('\n');
}

// ─── 简单 SRT 兼容（fallback） ─────────────────────────────────

/** 简化的 SRT 序列化（一些播放器/FFmpeg filter 偏好 SRT） */
export function buildSrtFile(track: SubtitleTrack): string {
  return track.cues
    .map((cue, i) => {
      return [
        (i + 1).toString(),
        `${toSrtTime(cue.startSecs)} --> ${toSrtTime(cue.endSecs)}`,
        cue.text,
        '',
      ].join('\n');
    })
    .join('\n');
}

/** 秒 → SRT 时间格式 HH:MM:SS,mmm */
function toSrtTime(secs: number): string {
  if (secs < 0) secs = 0;
  const total_ms = Math.round(secs * 1000);
  const h = Math.floor(total_ms / 3_600_000);
  const m = Math.floor((total_ms % 3_600_000) / 60_000);
  const s = Math.floor((total_ms % 60_000) / 1000);
  const ms = total_ms % 1000;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
    .toString()
    .padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}
