/**
 * platform — Tauri IPC 方法（v3 · Stage 15.2）
 *
 * 2 个入口：
 * - platform.listPresets()  列出所有平台预设（UI 下拉 / 平台选择面板）
 * - platform.export(input)  按平台预设一键导出（preset → ExportVideoInput → ffmpeg）
 *
 * 数据模型：见 `src/core/domain/platform.ts` (PlatformPreset / RenderConfig)
 * 后端实现：见 `src-tauri/src/commands/platform.rs`
 */

import { invoke, TauriCommand } from '../invoke';
import type { PlatformId, PlatformPreset } from '../../domain/platform';

// ─── 公共类型 ──────────────────────────────────────────────

/** 一键导出入参 */
export interface PlatformExportInput {
  platformId: PlatformId;
  inputPath: string;
  outputPath: string;
  /** 字幕路径（SRT/VTT/ASS），不传则不烧录 */
  subtitlePath?: string | null;
  /** 是否烧录字幕，null = 用 preset 的 burnSubtitleByDefault */
  burnSubtitles?: boolean | null;
}

/** 一键导出结果 */
export interface PlatformExportResult {
  outputPath: string;
  duration: number;
  fileSize: number;
  /** 实际使用的预设（前端展示用） */
  platform: PlatformPreset;
}

// ─── 统一导出 ──────────────────────────────────────────────

export const platform = {
  /** 列出所有平台预设（8 个：抖音/快手/小红书/视频号/TikTok/B站/YouTube/Shorts） */
  async listPresets(): Promise<PlatformPreset[]> {
    return invoke(TauriCommand.LIST_PLATFORM_PRESETS, undefined);
  },

  /**
   * 按平台预设一键导出
   * - 自动从 preset 推导编码参数（width/height/fps/bitrate/codec/container）
   * - burnSubtitles: null 时用 preset.burnSubtitleByDefault
   */
  async export(input: PlatformExportInput): Promise<PlatformExportResult> {
    return invoke(TauriCommand.PLATFORM_EXPORT, {
      platformId: input.platformId,
      inputPath: input.inputPath,
      outputPath: input.outputPath,
      subtitlePath: input.subtitlePath ?? null,
      burnSubtitles: input.burnSubtitles ?? null,
    });
  },
};

/** Re-export domain types */
export type { PlatformId, PlatformPreset };
