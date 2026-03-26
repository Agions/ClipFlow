/**
 * 导出服务
 * 支持多种格式的音视频导出
 * 集成 Tauri 后端进行实际视频处理
 */

import { v4 as uuidv4 } from 'uuid';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { ensureFFmpegInstalled } from '@/services/videoService';

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
  crf?: number;  // Constant Rate Factor
  preset?: 'ultrafast' | 'fast' | 'medium' | 'slow' | 'veryslow';
}

// 导出配置
export interface ExportConfig {
  // 基础设置
  format: ExportFormat;
  quality: ExportQuality;
  
  // 视频设置
  resolution: ExportResolution;
  frameRate: 24 | 25 | 30 | 60;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '21:9';
  
  // 音频设置
  audioCodec: 'aac' | 'mp3' | 'opus';
  audioBitrate: '64k' | '128k' | '192k' | '256k' | '320k';
  sampleRate: 44100 | 48000;
  channels: 1 | 2 | 6;
  
  // 高级设置
  encoder: EncoderSettings;
  
  // 字幕
  subtitleEnabled: boolean;
  subtitlePath?: string;
  burnSubtitles: boolean;
  
  // 水印
  watermarkEnabled: boolean;
  watermarkText?: string;
  watermarkImage?: string;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermarkOpacity: number;
  
  // 元数据
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

// 格式对应的 MIME 类型
export const FORMAT_MIME_TYPES: Record<ExportFormat, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
};

// 格式信息
export const FORMAT_INFO: Record<ExportFormat, { name: string; description: string; container: string }> = {
  mp4: { name: 'MP4', description: '通用视频格式，兼容性最好', container: 'ISOBMFF' },
  webm: { name: 'WebM', description: 'Web 优化格式，支持 VP8/VP9', container: 'WebM' },
  mov: { name: 'MOV', description: 'QuickTime 格式，适合 Mac', container: 'QuickTime' },
  mkv: { name: 'MKV', description: 'Matroska 格式，灵活性高', container: 'Matroska' },
};

// 导出结果
export interface ExportResult {
  id: string;
  success: boolean;
  filePath?: string;
  fileSize?: number;
  duration: number;
  format: ExportFormat;
  quality: ExportQuality;
  error?: string;
  metadata?: {
    title?: string;
    author?: string;
    createdAt: string;
  };
}

// 导出进度
export interface ExportProgress {
  stage: 'preparing' | 'encoding' | 'muxing' | 'complete' | 'error';
  progress: number;  // 0-100
  currentFrame?: number;
  totalFrames?: number;
  estimatedTimeRemaining?: number;  // 秒
}

// 默认配置
const DEFAULT_CONFIG: ExportConfig = {
  format: 'mp4',
  quality: 'high',
  resolution: '1080p',
  frameRate: 30,
  aspectRatio: '16:9',
  audioCodec: 'aac',
  audioBitrate: '256k',
  sampleRate: 48000,
  channels: 2,
  encoder: {
    videoCodec: 'h264',
    audioCodec: 'aac',
    crf: 20,
    preset: 'medium',
  },
  subtitleEnabled: false,
  burnSubtitles: false,
  watermarkEnabled: false,
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 0.7,
};

// Tauri 事件监听器集合
type ProgressListener = (progress: ExportProgress) => void;

const isMissingFFmpegError = (errorMessage: string): boolean =>
  errorMessage.includes('未安装FFmpeg') || errorMessage.includes('未安装 FFmpeg');

export class ExportService {
  private config: ExportConfig;
  private isExporting: boolean = false;
  private abortController: AbortController | null = null;
  private progressListeners: Map<string, UnlistenFn> = new Map();

  constructor(config: Partial<ExportConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 视频转码
   * 使用 Tauri 后端进行视频格式转换和质量调整
   */
  async transcodeVideo(
    inputPath: string,
    outputPath: string,
    quality?: ExportQuality,
    format?: ExportFormat,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    if (this.isExporting) {
      throw new Error('已有导出任务正在进行中');
    }

    this.isExporting = true;
    this.abortController = new AbortController();

    const startTime = Date.now();
    const result: ExportResult = {
      id: uuidv4(),
      success: false,
      duration: 0,
      format: format || this.config.format,
      quality: quality || this.config.quality,
    };

    try {
      // 检查 FFmpeg 是否安装
      if (!(await ensureFFmpegInstalled())) {
        throw new Error('未安装 FFmpeg');
      }

      // 准备阶段
      onProgress?.({ stage: 'preparing', progress: 0 });

      // 发送转码命令到 Tauri 后端
      const success = await invoke<boolean>('transcode_video', {
        inputPath,
        outputPath,
        quality: quality || this.config.quality,
        format: format || this.config.format,
      });

      if (!success) {
        throw new Error('视频转码失败');
      }

      // 获取输出文件大小
      try {
        const fileInfo = await invoke<{ size: number }>('analyze_video', { path: outputPath });
        result.fileSize = fileInfo.size as unknown as number;
      } catch {
        // 文件大小获取失败不影响导出成功
      }

      // 完成
      onProgress?.({ stage: 'complete', progress: 100 });

      result.success = true;
      result.filePath = outputPath;
      result.duration = (Date.now() - startTime) / 1000;
      result.metadata = {
        title: this.config.title,
        author: this.config.author,
        createdAt: new Date().toISOString(),
      };

      return result;
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      onProgress?.({ stage: 'error', progress: 0, estimatedTimeRemaining: 0 });

      // 友好的错误提示
      let userMessage = '视频转码失败';
      if (isMissingFFmpegError(errorMessage)) {
        userMessage = '转码失败：未检测到 FFmpeg，请确保已正确安装并配置到系统 PATH。';
      } else if (errorMessage.includes('转码失败')) {
        userMessage = '视频转码失败，请检查输入文件是否有效。';
      }
      result.error = userMessage;
      return result;
    } finally {
      this.isExporting = false;
      this.abortController = null;
    }
  }

  /**
   * 视频剪辑
   * 使用 Tauri 后端进行视频片段裁剪
   */
  async cutVideo(
    inputPath: string,
    outputPath: string,
    segments: Array<{ start: number; end: number; type?: string; content?: string }>,
    options?: {
      quality?: ExportQuality;
      format?: ExportFormat;
      transition?: string;
      transitionDuration?: number;
      volume?: number;
      addSubtitles?: boolean;
    },
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    if (this.isExporting) {
      throw new Error('已有导出任务正在进行中');
    }

    if (!inputPath) {
      throw new Error('输入视频路径不能为空');
    }

    if (!outputPath) {
      throw new Error('输出视频路径不能为空');
    }

    if (!segments || segments.length === 0) {
      throw new Error('请至少提供一个视频片段');
    }

    this.isExporting = true;
    this.abortController = new AbortController();

    const startTime = Date.now();
    const result: ExportResult = {
      id: uuidv4(),
      success: false,
      duration: 0,
      format: options?.format || this.config.format,
      quality: options?.quality || this.config.quality,
    };

    // 监听进度事件
    let unlistenProgress: UnlistenFn | null = null;

    try {
      // 检查 FFmpeg 是否安装
      if (!(await ensureFFmpegInstalled())) {
        throw new Error('未安装 FFmpeg');
      }

      // 设置进度监听
      unlistenProgress = await listen<number>('cut_progress', (event) => {
        const progress = event.payload;
        if (progress < 0.6) {
          onProgress?.({ stage: 'encoding', progress: progress * 100 });
        } else if (progress < 0.9) {
          onProgress?.({ stage: 'muxing', progress: 60 + (progress - 0.6) * 100 });
        } else {
          onProgress?.({ stage: 'complete', progress: Math.min(progress * 100, 100) });
        }
      });

      // 准备阶段
      onProgress?.({ stage: 'preparing', progress: 0 });

      // 发送剪辑命令到 Tauri 后端
      const outputFilePath = await invoke<string>('cut_video', {
        params: {
          input_path: inputPath,
          output_path: outputPath,
          segments: segments.map(s => ({
            start: s.start,
            end: s.end,
            type_field: s.type,
            content: s.content,
          })),
          quality: options?.quality || this.config.quality,
          format: options?.format || this.config.format,
          transition: options?.transition,
          transition_duration: options?.transitionDuration,
          volume: options?.volume,
          add_subtitles: options?.addSubtitles,
        },
      });

      // 完成
      onProgress?.({ stage: 'complete', progress: 100 });

      result.success = true;
      result.filePath = outputFilePath;
      result.duration = (Date.now() - startTime) / 1000;
      result.metadata = {
        title: this.config.title,
        author: this.config.author,
        createdAt: new Date().toISOString(),
      };

      return result;
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      onProgress?.({ stage: 'error', progress: 0, estimatedTimeRemaining: 0 });

      // 友好的错误提示
      let userMessage = '视频剪辑失败';
      if (isMissingFFmpegError(errorMessage)) {
        userMessage = '剪辑失败：未检测到 FFmpeg，请确保已正确安装并配置到系统 PATH。';
      } else if (errorMessage.includes('没有提供有效的片段信息')) {
        userMessage = '剪辑失败：请提供有效的视频片段信息。';
      } else if (errorMessage.includes('无效的片段时间范围')) {
        userMessage = '剪辑失败：片段时间范围无效。';
      }
      result.error = userMessage;
      return result;
    } finally {
      // 清理监听器
      if (unlistenProgress) {
        unlistenProgress();
      }
      this.isExporting = false;
      this.abortController = null;
    }
  }

  /**
   * 合并多个视频
   * 使用 Tauri 后端合并多个视频文件
   */
  async mergeVideos(
    inputPaths: string[],
    outputPath: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    if (this.isExporting) {
      throw new Error('已有导出任务正在进行中');
    }

    if (!inputPaths || inputPaths.length === 0) {
      throw new Error('请至少提供一个视频文件');
    }

    if (!outputPath) {
      throw new Error('输出视频路径不能为空');
    }

    this.isExporting = true;
    this.abortController = new AbortController();

    const startTime = Date.now();
    const result: ExportResult = {
      id: uuidv4(),
      success: false,
      duration: 0,
      format: this.config.format,
      quality: this.config.quality,
    };

    try {
      // 检查 FFmpeg 是否安装
      if (!(await ensureFFmpegInstalled())) {
        throw new Error('未安装 FFmpeg');
      }

      // 准备阶段
      onProgress?.({ stage: 'preparing', progress: 0 });
      onProgress?.({ stage: 'encoding', progress: 30 });

      // 发送合并命令到 Tauri 后端
      const success = await invoke<boolean>('merge_videos', {
        inputPaths,
        outputPath,
      });

      if (!success) {
        throw new Error('视频合并失败');
      }

      // 完成
      onProgress?.({ stage: 'muxing', progress: 80 });
      onProgress?.({ stage: 'complete', progress: 100 });

      result.success = true;
      result.filePath = outputPath;
      result.duration = (Date.now() - startTime) / 1000;
      result.metadata = {
        title: this.config.title,
        author: this.config.author,
        createdAt: new Date().toISOString(),
      };

      return result;
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      onProgress?.({ stage: 'error', progress: 0, estimatedTimeRemaining: 0 });

      // 友好的错误提示
      let userMessage = '视频合并失败';
      if (isMissingFFmpegError(errorMessage)) {
        userMessage = '合并失败：未检测到 FFmpeg，请确保已正确安装并配置到系统 PATH。';
      } else if (errorMessage.includes('输入路径列表不能为空')) {
        userMessage = '合并失败：请提供有效的视频文件列表。';
      }
      result.error = userMessage;
      return result;
    } finally {
      this.isExporting = false;
      this.abortController = null;
    }
  }

  /**
   * 批量转码多个视频
   */
  async batchTranscode(
    tasks: Array<{
      inputPath: string;
      outputPath: string;
      quality?: ExportQuality;
      format?: ExportFormat;
    }>,
    onProgress?: (completed: number, total: number, result: ExportResult) => void
  ): Promise<ExportResult[]> {
    const total = tasks.length;
    const results: ExportResult[] = new Array(total);
    const concurrency = 2; // 最多同时转码2个视频，避免资源竞争

    // 分批并行执行，每批最多2个，避免资源竞争
    const CONCURRENCY = 2;
    for (let batchStart = 0; batchStart < total; batchStart += CONCURRENCY) {
      const batchEnd = Math.min(batchStart + CONCURRENCY, total);
      const batchTasks = tasks.slice(batchStart, batchEnd);
      
      await Promise.all(
        batchTasks.map(async (task, batchIdx) => {
          const i = batchStart + batchIdx;
          // 检查是否已取消
          if (this.abortController?.signal.aborted) {
            const canceledResult: ExportResult = {
              id: uuidv4(),
              success: false,
              duration: 0,
              format: task.format || this.config.format,
              quality: task.quality || this.config.quality,
              error: '任务已取消',
            };
            results[i] = canceledResult;
            onProgress?.(i + 1, total, canceledResult);
            return;
          }

          const result = await this.transcodeVideo(
            task.inputPath,
            task.outputPath,
            task.quality,
            task.format,
            () => {
              // 单个任务的进度回调（简化，避免引用未定义的result）
              onProgress?.(i, total, { success: false } as ExportResult);
            }
          );

          results[i] = result;
          onProgress?.(i + 1, total, result);
        })
      );
    }

    return results;
  }

  /**
   * 应用预设
   */
  applyPreset(quality: ExportQuality): void {
    const preset = EXPORT_PRESETS[quality];
    if (preset) {
      this.config = { ...this.config, ...preset, quality };
    }
  }

  /**
   * 获取格式信息
   */
  getFormatInfo(format: ExportFormat): { name: string; description: string; container: string } {
    return FORMAT_INFO[format] || FORMAT_INFO.mp4;
  }

  /**
   * 获取支持的格式列表
   */
  getSupportedFormats(): Array<{ format: ExportFormat; info: typeof FORMAT_INFO[ExportFormat] }> {
    return Object.entries(FORMAT_INFO).map(([format, info]) => ({
      format: format as ExportFormat,
      info,
    }));
  }

  /**
   * 开始导出
   * 使用 Tauri 后端进行视频导出
   * @param timeline 时间轴数据，包含视频片段信息
   * @param onProgress 进度回调函数
   */
  async startExport(
    timeline: {
      segments?: Array<{ start: number; end: number; sourceFile?: string }>;
      outputPath?: string;
    },
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    if (this.isExporting) {
      throw new Error('已有导出任务正在进行中');
    }

    this.isExporting = true;
    this.abortController = new AbortController();

    const startTime = Date.now();
    const result: ExportResult = {
      id: uuidv4(),
      success: false,
      duration: 0,
      format: this.config.format,
      quality: this.config.quality,
    };

    // 监听进度事件
    let unlistenProgress: UnlistenFn | null = null;

    try {
      // 检查 FFmpeg 是否安装
      if (!(await ensureFFmpegInstalled())) {
        throw new Error('未安装 FFmpeg');
      }

      // 准备阶段
      onProgress?.({ stage: 'preparing', progress: 0 });

      // 如果有时间轴片段信息，使用剪辑功能
      if (timeline.segments && timeline.segments.length > 0) {
        const outputPath = timeline.outputPath || `export/${Date.now()}.${this.config.format}`;

        // 设置进度监听
        unlistenProgress = await listen<number>('cut_progress', (event) => {
          const progress = event.payload;
          if (progress < 0.6) {
            onProgress?.({ stage: 'encoding', progress: progress * 100 });
          } else if (progress < 0.9) {
            onProgress?.({ stage: 'muxing', progress: 60 + (progress - 0.6) * 100 });
          } else {
            onProgress?.({ stage: 'complete', progress: Math.min(progress * 100, 100) });
          }
        });

        // 编码阶段
        onProgress?.({ stage: 'encoding', progress: 10 });

        // 发送剪辑命令
        const outputFilePath = await invoke<string>('cut_video', {
          params: {
            input_path: timeline.segments[0]?.sourceFile || '',
            output_path: outputPath,
            segments: timeline.segments.map(s => ({
              start: s.start,
              end: s.end,
              type_field: null,
              content: null,
            })),
            quality: this.config.quality,
            format: this.config.format,
            transition: null,
            transition_duration: null,
            volume: null,
            add_subtitles: false,
          },
        });

        // 混流阶段
        onProgress?.({ stage: 'muxing', progress: 80 });

        // 完成
        onProgress?.({ stage: 'complete', progress: 100 });

        result.success = true;
        result.filePath = outputFilePath;
      } else {
        // 如果没有片段信息，使用转码功能
        onProgress?.({ stage: 'encoding', progress: 10 });

        const outputPath = timeline.outputPath || `export/${Date.now()}.${this.config.format}`;

        const success = await invoke<boolean>('transcode_video', {
          inputPath: '',
          outputPath,
          quality: this.config.quality,
          format: this.config.format,
        });

        if (!success) {
          throw new Error('视频导出失败');
        }

        // 混流阶段
        onProgress?.({ stage: 'muxing', progress: 80 });

        // 完成
        onProgress?.({ stage: 'complete', progress: 100 });

        result.success = true;
        result.filePath = outputPath;
      }

      result.duration = (Date.now() - startTime) / 1000;
      result.metadata = {
        title: this.config.title,
        author: this.config.author,
        createdAt: new Date().toISOString(),
      };

      return result;
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      onProgress?.({ stage: 'error', progress: 0, estimatedTimeRemaining: 0 });

      // 友好的错误提示
      let userMessage = '视频导出失败';
      if (isMissingFFmpegError(errorMessage)) {
        userMessage = '导出失败：未检测到 FFmpeg，请确保已正确安装并配置到系统 PATH。';
      } else if (errorMessage.includes('导出失败')) {
        userMessage = '视频导出失败，请检查输入文件是否有效。';
      }
      result.error = userMessage;
      return result;
    } finally {
      // 清理监听器
      if (unlistenProgress) {
        unlistenProgress();
      }
      this.isExporting = false;
      this.abortController = null;
    }
  }

  /**
   * 取消导出
   */
  cancelExport(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * 批量导出多个格式
   */
  async batchExport(
    timeline: {
      segments?: Array<{ start: number; end: number; sourceFile?: string }>;
      outputPath?: string;
    },
    formats: ExportFormat[]
  ): Promise<ExportResult[]> {
    // Parallel export for multiple formats
    const results = await Promise.all(
      formats.map(async (format) => {
        const originalFormat = this.config.format;
        this.config.format = format;
        try {
          return await this.startExport(timeline);
        } finally {
          this.config.format = originalFormat;
        }
      })
    );
    return results;
  }

  /**
   * 预估文件大小
   */
  estimateFileSize(durationSeconds: number): number {
    const resolutionSizes: Record<ExportResolution, number> = {
      '480p': 500000,
      '720p': 1500000,
      '1080p': 4000000,
      '1440p': 8000000,
      '4k': 20000000,
      'custom': 4000000,
    };

    const baseSize = resolutionSizes[this.config.resolution] || 4000000;
    const frameRateMultiplier = this.config.frameRate / 30;
    const qualityMultiplier = this.config.quality === 'ultra' ? 2 : this.config.quality === 'high' ? 1.5 : 1;
    
    return baseSize * frameRateMultiplier * qualityMultiplier * durationSeconds;
  }

  /**
   * 获取配置
   */
  getConfig(): ExportConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ExportConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 导出时间轴（完整流程）
   * 将时间轴中的所有片段合并为一个完整的视频文件
   * @param timeline 时间轴数据
   * @param onProgress 进度回调
   */
  async exportTimeline(
    timeline: {
      segments: Array<{
        start: number;
        end: number;
        sourceFile: string;
      }>;
      outputPath: string;
    },
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    if (this.isExporting) {
      throw new Error('已有导出任务正在进行中');
    }

    if (!timeline.segments || timeline.segments.length === 0) {
      throw new Error('时间轴中没有视频片段');
    }

    this.isExporting = true;
    this.abortController = new AbortController();

    const startTime = Date.now();
    const result: ExportResult = {
      id: uuidv4(),
      success: false,
      duration: 0,
      format: this.config.format,
      quality: this.config.quality,
    };

    // 监听进度事件
    let unlistenProgress: UnlistenFn | null = null;

    try {
      // 检查 FFmpeg 是否安装
      if (!(await ensureFFmpegInstalled())) {
        throw new Error('未安装 FFmpeg');
      }

      // 准备阶段
      onProgress?.({ stage: 'preparing', progress: 0 });

      const { segments, outputPath } = timeline;

      // 如果只有一个片段，直接剪辑
      if (segments.length === 1) {
        const segment = segments[0];

        // 设置进度监听
        unlistenProgress = await listen<number>('cut_progress', (event) => {
          const progress = event.payload;
          if (progress < 0.6) {
            onProgress?.({ stage: 'encoding', progress: progress * 100 });
          } else if (progress < 0.9) {
            onProgress?.({ stage: 'muxing', progress: 60 + (progress - 0.6) * 100 });
          } else {
            onProgress?.({ stage: 'complete', progress: Math.min(progress * 100, 100) });
          }
        });

        const outputFilePath = await invoke<string>('cut_video', {
          params: {
            input_path: segment.sourceFile,
            output_path: outputPath,
            segments: [{
              start: segment.start,
              end: segment.end,
              type_field: null,
              content: null,
            }],
            quality: this.config.quality,
            format: this.config.format,
            transition: null,
            transition_duration: null,
            volume: null,
            add_subtitles: false,
          },
        });

        result.success = true;
        result.filePath = outputFilePath;
      } else {
        // 多个片段：先分别剪辑，再合并

        // 设置进度监听
        unlistenProgress = await listen<number>('cut_progress', (event) => {
          const progress = event.payload;
          // 剪辑阶段占 80% 进度
          onProgress?.({ stage: 'encoding', progress: progress * 80 });
        });

        // 临时文件目录
        const tempDir = `${outputPath}.temp`;

        // 分别剪辑每个片段
        const tempFiles: string[] = [];
        for (let i = 0; i < segments.length; i++) {
          if (this.abortController?.signal.aborted) {
            throw new Error('导出已取消');
          }

          const segment = segments[i];
          const tempOutputPath = `${tempDir}/segment_${i}.${this.config.format}`;

          await invoke<string>('cut_video', {
            params: {
              input_path: segment.sourceFile,
              output_path: tempOutputPath,
              segments: [{
                start: segment.start,
                end: segment.end,
                type_field: null,
                content: null,
              }],
              quality: this.config.quality,
              format: this.config.format,
              transition: null,
              transition_duration: null,
              volume: null,
              add_subtitles: false,
            },
          });

          tempFiles.push(tempOutputPath);

          // 报告进度
          const cutProgress = ((i + 1) / segments.length) * 0.8;
          onProgress?.({ stage: 'encoding', progress: cutProgress * 100 });
        }

        // 合并阶段
        onProgress?.({ stage: 'muxing', progress: 80 });

        // 合并所有片段
        const success = await invoke<boolean>('merge_videos', {
          inputPaths: tempFiles,
          outputPath,
        });

        if (!success) {
          throw new Error('视频合并失败');
        }

        // 清理临时文件
        for (const tempFile of tempFiles) {
          try {
            await invoke('remove_file', { path: tempFile });
          } catch {
            // 忽略清理错误
          }
        }

        result.success = true;
        result.filePath = outputPath;
      }

      // 完成
      onProgress?.({ stage: 'complete', progress: 100 });

      result.duration = (Date.now() - startTime) / 1000;
      result.metadata = {
        title: this.config.title,
        author: this.config.author,
        createdAt: new Date().toISOString(),
      };

      return result;
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      onProgress?.({ stage: 'error', progress: 0, estimatedTimeRemaining: 0 });

      // 友好的错误提示
      let userMessage = '视频导出失败';
      if (isMissingFFmpegError(errorMessage)) {
        userMessage = '导出失败：未检测到 FFmpeg，请确保已正确安装并配置到系统 PATH。';
      } else if (errorMessage.includes('导出已取消')) {
        userMessage = '导出已取消';
      } else if (errorMessage.includes('合并失败')) {
        userMessage = '视频合并失败，请检查片段文件是否有效。';
      }
      result.error = userMessage;
      return result;
    } finally {
      // 清理监听器
      if (unlistenProgress) {
        unlistenProgress();
      }
      this.isExporting = false;
      this.abortController = null;
    }
  }

  /**
   * 检查当前导出状态
   */
  isCurrentlyExporting(): boolean {
    return this.isExporting;
  }
}

// 导出单例
export const exportService = new ExportService();
export default exportService;
