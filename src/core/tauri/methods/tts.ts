/**
 * tts — Tauri IPC 方法（v3 + Stage 14.1/14.2）
 *
 * 3 个核心入口：
 * - tts.synthesizeSpeech({ text })        纯文本合成（plain）
 * - tts.synthesizeSpeechSsml({ doc, ... }) 结构化 SSML 合成（带停顿/角色/情感）
 * - tts.batch({ segments, maxConcurrency }) 批量并发合成（默认 3 并行，2 重试）
 *
 * 数据模型：
 * - SsmlDocument / SsmlInline 见 `src/core/domain/ssml.ts`
 * - 后端实现见 `src-tauri/src/commands/ai/tts.rs` / `tts_core.rs`
 */

import { invoke, TauriCommand } from '../invoke';
import type { SsmlDocument } from '../../domain/ssml';

// ─── 公共类型 ──────────────────────────────────────────────

/** 合成输出（与 Rust SynthesizeSpeechOutput 对齐） */
export interface SynthesizeSpeechResult {
  audioPath: string;
  durationSecs: number;
}

/** 批量合成单段输入（与 Rust TtsBatchSegmentInput 对齐） */
export interface TtsBatchSegment {
  id: string;
  /** plain text 路径（与 ssml 二选一；都传时优先 ssml） */
  text?: string | null;
  /** SSML 结构化路径（可选；提供时跳过 raw text） */
  ssml?: SsmlDocument | null;
  voice: string;
  speed: number;
  format: string;
  backend: string;
}

/** 批量合成单段结果 */
export interface TtsBatchItem {
  id: string;
  audioPath: string | null;
  durationSecs: number;
  error: string | null;
  retries: number;
}

/** 批量合成总输出 */
export interface TtsBatchResult {
  results: TtsBatchItem[];
  totalSecs: number;
}

/** SSML 合成输入 */
export interface SynthesizeSsmlInput {
  doc: SsmlDocument;
  voice: string;
  speed: number;
  format: string;
  backend: string;
}

// ─── 统一导出 ──────────────────────────────────────────────

export const tts = {
  /** plain text 合成 */
  async synthesizeSpeech(input: {
    text: string;
    voice: string;
    speed?: number;
    format?: string;
    backend?: string;
  }): Promise<string> {
    const result = await invoke(TauriCommand.SYNTHESIZE_SPEECH, {
      text: input.text,
      voice: input.voice,
      speed: input.speed ?? 1.0,
      format: input.format ?? 'mp3',
      backend: input.backend ?? 'edge',
    });
    return result.audioPath;
  },

  /** SSML 合成（结构化节点 → 标准 SSML 1.1 XML → edge-tts --ssml） */
  async synthesizeSpeechSsml(input: SynthesizeSsmlInput): Promise<SynthesizeSpeechResult> {
    return invoke(TauriCommand.SYNTHESIZE_SPEECH_SSML, {
      doc: input.doc,
      voice: input.voice,
      speed: input.speed,
      format: input.format,
      backend: input.backend,
    });
  },

  /**
   * 批量并发合成
   * - maxConcurrency: 1-8（默认 3）
   * - maxRetries: 0-3（默认 2）
   * - 部分失败：返回完整 results 数组，error 字段标记；不抛错
   */
  async batch(input: {
    segments: TtsBatchSegment[];
    maxConcurrency?: number;
    maxRetries?: number;
  }): Promise<TtsBatchResult> {
    return invoke(TauriCommand.SYNTHESIZE_SPEECH_BATCH, {
      segments: input.segments,
      maxConcurrency: input.maxConcurrency ?? 3,
      maxRetries: input.maxRetries ?? 2,
    });
  },

  /** 列出可用的 TTS 后端 */
  async listTTSBackends() {
    return invoke(TauriCommand.LIST_TTS_BACKENDS, undefined);
  },

  /** 检查 TTS 是否可用（任一后端） */
  async checkTTSAvailable(): Promise<boolean> {
    return invoke(TauriCommand.CHECK_TTS_AVAILABLE, undefined);
  },
};
