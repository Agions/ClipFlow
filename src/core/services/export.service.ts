/**
 * 导出服务
 * 支持多种格式的音视频导出
 * 集成 Tauri 后端进行实际视频处理
 */

import { invoke } from '@tauri-apps/api/core';
import { logger } from '@/utils/logger';

// 导出格式
export type ExportFormat = 'mp4' | 'webm' | 'mov' | 'mkv';

// 导出质量
export type ExportQuality = 'low' | 'medium' | 'high' | 'ultra' | 'custom';

// 分辨率
export type ExportResolution = '480p' | '720p' | '1080p' | '1440p' | '4k' | 'custom';

// 编码器
export interface EncoderSettings {
  videoCodec: 'h264' | 'h265' | 'vp8' | 'vp9' | 'av1';
  audioCodec: 'aac' | 'mp3' | 'opus' | 'flac';
  bitrate?: string;
  crf?: number;
  preset?: 'ultrafast' | 'fast' | 'medium' | 'slow' | 'veryslow';
}

// 导出配置
export interface ExportConfig {
  format: ExportFormat;
  quality: ExportQuality;
  resolution: ExportResolution;
  frameRate: 24 | 25 | 30 | 60;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '21:9';
  audioCodec: 'aac' | 'mp3' | 'opus';
  audioBitrate: '64k' | '128k' | '192k' | '256k' | '320k';
  sampleRate: 44100 | 48000;
  channels: 1 | 2 | 6;
  encoder: EncoderSettings;
  subtitleEnabled: boolean;
  subtitlePath?: string;
  burnSubtitles: boolean;
  watermarkEnabled: boolean;
  watermarkText?: string;
  watermarkImage?: string;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermarkOpacity: number;
  title?: string;
  author?: string;
  copyright?: string;
}

// 预设配置
export const EXPORT_PRESETS: Record<ExportQuality, Partial<ExportConfig>> = {
  low: {
    resolution: '720p',
    frameRate: 24,
    audioBitrate: '128k',
    encoder: { videoCodec: 'h264', audioCodec: 'aac', crf: 28, preset: 'fast' },
  },
  medium: {
    resolution: '1080p',
    frameRate: 30,
    audioBitrate: '192k',
    encoder: { videoCodec: 'h264', audioCodec: 'aac', crf: 23, preset: 'medium' },
  },
  high: {
    resolution: '1080p',
    frameRate: 60,
    audioBitrate: '256k',
    encoder: { videoCodec: 'h265', audioCodec: 'aac', crf: 20, preset: 'slow' },
  },
  ultra: {
    resolution: '4k',
    frameRate: 60,
    audioBitrate: '320k',
    encoder: { videoCodec: 'h265', audioCodec: 'aac', crf: 18, preset: 'veryslow' },
  },
  custom: {},
};

export const FORMAT_MIME_TYPES: Record<ExportFormat, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
};

export const FORMAT_INFO: Record<ExportFormat, { name: string; description: string; container: string }> = {
  mp4: { name: 'MP4', description: '通用视频格式，兼容性最好', container: 'ISOBMFF' },
  webm: { name: 'WebM', description: 'Web 优化格式，支持 VP8/VP9', container: 'WebM' },
  mov: { name: 'MOV', description: 'QuickTime 格式，适合 Mac', container: 'QuickTime' },
  mkv: { name: 'MKV', description: 'Matroska 格式，灵活性高', container: 'Matroska' },
};

export interface ExportResult {
  outputPath: string;
  duration: number;
  fileSize: number;
  format: ExportFormat;
}

export class ExportService {
  private currentExportId: string | null = null;
  private config: ExportConfig | null = null;

  setConfig(config: Partial<ExportConfig>): void {
    // Merge with preset defaults for missing fields
    const quality = config.quality ?? 'medium';
    const preset = EXPORT_PRESETS[quality];
    this.config = {
      format: config.format ?? 'mp4',
      quality,
      resolution: config.resolution ?? preset.resolution ?? '1080p',
      frameRate: config.frameRate ?? preset.frameRate ?? 30,
      aspectRatio: config.aspectRatio ?? '16:9',
      audioCodec: config.audioCodec ?? preset.encoder?.audioCodec ?? 'aac',
      audioBitrate: config.audioBitrate ?? preset.audioBitrate ?? '192k',
      sampleRate: config.sampleRate ?? 48000,
      channels: config.channels ?? 2,
      encoder: config.encoder ?? preset.encoder ?? { videoCodec: 'h264', audioCodec: 'aac', crf: 23, preset: 'medium' },
      subtitleEnabled: config.subtitleEnabled ?? false,
      subtitlePath: config.subtitlePath,
      burnSubtitles: config.burnSubtitles ?? false,
      watermarkEnabled: config.watermarkEnabled ?? false,
      watermarkText: config.watermarkText,
      watermarkImage: config.watermarkImage,
      watermarkPosition: config.watermarkPosition ?? 'bottom-right',
      watermarkOpacity: config.watermarkOpacity ?? 0.8,
      title: config.title,
      author: config.author,
      copyright: config.copyright,
    };
  }

  getConfig(): ExportConfig | null {
    return this.config;
  }

  async exportVideo(
    inputPath: string,
    outputPath: string,
    config: Partial<ExportConfig>,
    onProgress?: (percent: number) => void
  ): Promise<ExportResult> {
    // Always merge with current config + preset defaults
    const quality = config.quality ?? this.config?.quality ?? 'medium';
    const preset = EXPORT_PRESETS[quality];
    const fullConfig: ExportConfig = {
      format: config.format ?? this.config?.format ?? 'mp4',
      quality,
      resolution: config.resolution ?? this.config?.resolution ?? preset.resolution ?? '1080p',
      frameRate: config.frameRate ?? this.config?.frameRate ?? preset.frameRate ?? 30,
      aspectRatio: config.aspectRatio ?? this.config?.aspectRatio ?? '16:9',
      audioCodec: config.audioCodec ?? this.config?.audioCodec ?? preset.encoder?.audioCodec ?? 'aac',
      audioBitrate: config.audioBitrate ?? this.config?.audioBitrate ?? preset.audioBitrate ?? '192k',
      sampleRate: config.sampleRate ?? this.config?.sampleRate ?? 48000,
      channels: config.channels ?? this.config?.channels ?? 2,
      encoder: config.encoder ?? this.config?.encoder ?? preset.encoder ?? { videoCodec: 'h264', audioCodec: 'aac', crf: 23, preset: 'medium' },
      subtitleEnabled: config.subtitleEnabled ?? this.config?.subtitleEnabled ?? false,
      subtitlePath: config.subtitlePath ?? this.config?.subtitlePath,
      burnSubtitles: config.burnSubtitles ?? this.config?.burnSubtitles ?? false,
      watermarkEnabled: config.watermarkEnabled ?? this.config?.watermarkEnabled ?? false,
      watermarkText: config.watermarkText ?? this.config?.watermarkText,
      watermarkImage: config.watermarkImage ?? this.config?.watermarkImage,
      watermarkPosition: config.watermarkPosition ?? this.config?.watermarkPosition ?? 'bottom-right',
      watermarkOpacity: config.watermarkOpacity ?? this.config?.watermarkOpacity ?? 0.8,
      title: config.title ?? this.config?.title,
      author: config.author ?? this.config?.author,
      copyright: config.copyright ?? this.config?.copyright,
    };

    const exportId = crypto.randomUUID();
    this.currentExportId = exportId;

    logger.info('[ExportService] 开始导出:', {
      exportId,
      input: inputPath,
      output: outputPath,
      format: fullConfig.format,
    });

    try {
      const result = await invoke<{
        outputPath: string;
        duration: number;
        fileSize: number;
      }>('export_video', {
        inputPath,
        outputPath,
        format: fullConfig.format,
        resolution: fullConfig.resolution,
        frameRate: fullConfig.frameRate,
        videoCodec: fullConfig.encoder.videoCodec,
        audioCodec: fullConfig.audioCodec,
        crf: fullConfig.encoder.crf ?? 23,
        subtitleEnabled: fullConfig.subtitleEnabled,
        subtitlePath: fullConfig.subtitlePath,
        burnSubtitles: fullConfig.burnSubtitles,
      });

      logger.info('[ExportService] 导出完成:', { exportId, result });

      return {
        outputPath: result.outputPath,
        duration: result.duration,
        fileSize: result.fileSize,
        format: fullConfig.format,
      };
    } catch (error) {
      logger.error('[ExportService] 导出失败:', { exportId, error });
      throw error;
    } finally {
      this.currentExportId = null;
    }
  }

  async cancelExport(): Promise<void> {
    if (this.currentExportId) {
      logger.info('[ExportService] 取消导出:', { exportId: this.currentExportId });
      try {
        await invoke('cancel_export', { exportId: this.currentExportId });
      } catch (error) {
        logger.warn('[ExportService] 取消导出失败:', { error });
      }
      this.currentExportId = null;
    }
  }

  getExportPresets(): Record<ExportQuality, Partial<ExportConfig>> {
    return EXPORT_PRESETS;
  }

  getFormatInfo(format: ExportFormat) {
    return FORMAT_INFO[format];
  }
}

export const exportService = new ExportService();
export default exportService;
