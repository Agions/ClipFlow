/**
 * TauriVideoProcessor - 基于 Tauri invoke 的视频处理实现
 *
 * 继承 BaseVideoProcessor，只实现 Tauri 平台相关方法。
 * 错误归一化、FFmpeg 缓存、参数校验等通用逻辑由基类处理。
 */
import { listen, UnlistenFn } from '@tauri-apps/api/event';

import { BaseVideoProcessor } from './base-video-processor';
import { tauri } from '../tauri';
import type {
  VideoMetadata,
  KeyFrame,
  SimpleVideoSegment,
  ExtractKeyFramesOptions,
  CutOptions,
  FFmpegStatus,
  ProcessingProgress,
} from '@/types';

export class TauriVideoProcessor extends BaseVideoProcessor {
  // ---------- FFmpeg ----------

  protected async doCheckStatus(): Promise<FFmpegStatus> {
    const result = await tauri.checkFFmpeg();
    return { installed: result.installed, version: result.version || undefined };
  }

  protected async doGetHardwareAcceleration(): Promise<string | null> {
    // get_hw_acceleration is an internal Rust util not exposed as a tauri command
    return null;
  }

  // ---------- Analysis ----------

  protected async doAnalyze(videoPath: string): Promise<VideoMetadata> {
    const info = await tauri.analyzeVideo(videoPath);
    return {
      duration: info.duration,
      width: info.width,
      height: info.height,
      fps: info.fps,
      codec: info.codec,
      bitrate: info.bitrate,
    };
  }

  // ---------- Extraction ----------

  protected async doExtractKeyFrames(
    _videoPath: string,
    options: ExtractKeyFramesOptions,
    duration?: number
  ): Promise<KeyFrame[]> {
    const { maxFrames: _maxFrames = 10, sceneThreshold: _sceneThreshold = 0.3 } = options ?? {};
    // NOTE: `framePaths` is intentionally hard-coded to an empty array because
    // `extract_key_frames` is not yet exposed as a Tauri command. The `.map()`
    // callback and the `framePaths.length > 0` truthy arm are dead code paths
    // kept for the day the upstream command lands; do not "simplify" without
    // first wiring up a real implementation.
    const framePaths: string[] = [];
    const totalDuration = duration ?? 0;
    const interval = framePaths.length > 0 ? totalDuration / framePaths.length : 0;
    return framePaths.map((path, index) => ({
      id: crypto.randomUUID(),
      timestamp: index * interval,
      path,
      description: '',
    }));
  }

  protected async doGenerateThumbnail(_videoPath: string, _time: number): Promise<string> {
    // generate_thumbnail is a VideoProcessor internal method, not a tauri command
    return '';
  }

  // ---------- Editing ----------

  protected async doCut(
    inputPath: string,
    outputPath: string,
    segments: SimpleVideoSegment[],
    options: CutOptions
  ): Promise<string> {
    let unlisten: UnlistenFn | null = null;

    if (options?.onProgress) {
      unlisten = await listen<ProcessingProgress>('processing-progress', event => {
        options.onProgress?.(event.payload);
      });
    }

    try {
      return await tauri.cutVideo(
        inputPath,
        outputPath,
        segments.map(s => ({ start: s.start, end: s.end }))
      );
    } finally {
      unlisten?.();
    }
  }

  protected async doPreview(inputPath: string, segment: SimpleVideoSegment): Promise<string> {
    return tauri.generatePreview(inputPath, { start: segment.start, end: segment.end });
  }

  // ---------- Export ----------

  protected async doExport(
    inputPath: string,
    outputPath: string,
    format: string,
    options?: {
      resolution?: string;
      frameRate?: number;
      videoCodec?: string;
      audioCodec?: string;
      crf?: number;
      subtitleEnabled?: boolean;
      subtitlePath?: string;
      burnSubtitles?: boolean;
    }
  ): Promise<string> {
    const result = await tauri.exportVideo({
      inputPath,
      outputPath,
      format,
      ...options,
    });
    return (result as { outputPath: string }).outputPath;
  }

  protected async doCancelExport(exportId: string): Promise<void> {
    await tauri.cancelExport(exportId);
  }
}

/** 默认视频处理器单例（Tauri 平台实现） */
export const videoProcessor = new TauriVideoProcessor();
