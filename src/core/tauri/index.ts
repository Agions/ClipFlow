/**
 * Tauri API Surface — 9 个方法分桶的统一导出（Stage 12.5 v3 重写）
 *
 * Stage 12.5：project 分桶改为 SQLite-backed（替代 v2 文件存储）
 * 未来新增方法时直接在对应分桶添加，tauri 自动包含。
 */

import { videoAnalysis } from './methods/video-analysis';
import { highlightDetection } from './methods/highlight-detection';
import { renderTranscode } from './methods/render-transcode';
import { subtitleAsr } from './methods/subtitle-asr';
import { tts } from './methods/tts';
import { mixAudio } from './methods/mix-audio';
import { fileOperations } from './methods/file-operations';
import { project } from './methods/project';
import { aiScript } from './methods/ai-script';
import { pipeline } from './methods/pipeline';

export const tauri = {
  // ─── FFmpeg / Video analysis ──────────────────────────────
  ...videoAnalysis,

  // ─── Highlight detection ──────────────────────────────────
  ...highlightDetection,

  // ─── Render / Transcode ───────────────────────────────────
  ...renderTranscode,

  // ─── Subtitles / ASR ──────────────────────────────────────
  ...subtitleAsr,

  // ─── TTS + Audio mixing ───────────────────────────────────
  ...tts,
  ...mixAudio,

  // ─── File operations + getExportDir ───────────────────────
  ...fileOperations,

  // ─── Project (v3 · SQLite-backed) ─────────────────────────
  ...project,

  // ─── Pipeline (v3 · 5 阶段流水线) ────────────────────────
  ...pipeline,

  // ─── AI Script ────────────────────────────────────────────
  ...aiScript,
} as const;

export default tauri;

// Re-export types and invoke from invoke for barrel import from index
export { TauriCommand, TauriBridgeError, invoke } from './invoke';
export type { BridgeOptions } from './invoke';
