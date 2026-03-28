/**
 * 视频服务
 * 提供视频文件操作、元数据提取、缩略图生成、视频格式转换等能力
 */

import { BaseService, ServiceError } from './base.service';
import { logger } from '@/utils/logger';
import { invoke } from '@tauri-apps/api/core';

// ============================================
// 类型定义
// ============================================

export interface VideoMetadata {
  id: string;
  name: string;
  path: string;
  duration: number;          // 时长（秒）
  width: number;
  height: number;
  size: number;             // 文件大小（字节）
  format: string;
  fps: number;
  bitrate: number;
  hasAudio: boolean;
  hasVideo: boolean;
  codec?: string;
  createdAt: string;
}

export interface ThumbnailOptions {
  /** 时间点（秒）*/
  timestamp: number;
  /** 宽度 */
  width?: number;
  /** 高度 */
  height?: number;
  /** 质量 0-100 */
  quality?: number;
  /** 格式 */
  format?: 'jpg' | 'png' | 'webp';
}

export interface VideoConversionOptions {
  /** 目标格式 */
  format: 'mp4' | 'webm' | 'gif' | 'mov';
  /** 目标分辨率 */
  resolution?: '480p' | '720p' | '1080p' | '4k';
  /** 目标帧率 */
  fps?: number;
  /** 质量 0-51（FFmpeg CRF）*/
  crf?: number;
  /** 音频码率 */
  audioBitrate?: string;
  /** 是否去除音频 */
  removeAudio?: boolean;
}

export interface TrimOptions {
  /** 开始时间（秒）*/
  startTime: number;
  /** 结束时间（秒）*/
  endTime: number;
  /** 输出路径 */
  outputPath: string;
}

export interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  path: string;
}

// ============================================
// 视频服务
// ============================================

class VideoService extends BaseService {
  constructor() {
    super('VideoService', { timeout: 300000, retries: 1 });
  }

  /**
   * 获取视频元数据
   * @param videoPath 视频文件路径
   */
  async getMetadata(videoPath: string): Promise<VideoMetadata> {
    return this.executeRequest(async () => {
      logger.info('[VideoService] 获取视频元数据:', { videoPath });

      try {
        // 通过 Tauri 命令获取元数据
        const metadata = await invoke<{
          duration: number;
          width: number;
          height: number;
          size: number;
          format: string;
          fps: number;
          bitrate: number;
          has_audio: boolean;
          has_video: boolean;
          codec?: string;
        }>('get_video_metadata', { path: videoPath });

        return {
          id: crypto.randomUUID(),
          name: videoPath.split('/').pop() || videoPath.split('\\').pop() || 'video',
          path: videoPath,
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          size: metadata.size,
          format: metadata.format,
          fps: metadata.fps,
          bitrate: metadata.bitrate,
          hasAudio: metadata.has_audio,
          hasVideo: metadata.has_video,
          codec: metadata.codec,
          createdAt: new Date().toISOString(),
        };
      } catch {
        // Tauri 不可用时返回模拟数据
        logger.warn('[VideoService] Tauri 不可用，返回模拟元数据');
        return this.getMockMetadata(videoPath);
      }
    }, '获取视频元数据失败');
  }

  /**
   * 生成缩略图
   * @param videoPath 视频路径
   * @param options 缩略图选项
   */
  async generateThumbnail(
    videoPath: string,
    options: ThumbnailOptions
  ): Promise<string> {
    return this.executeRequest(async () => {
      const { timestamp, width = 320, height, quality = 80, format = 'jpg' } = options;

      logger.info('[VideoService] 生成缩略图:', { videoPath, timestamp });

      try {
        const result = await invoke<string>('generate_thumbnail', {
          path: videoPath,
          timestamp,
          width,
          height: height ?? 0,
          quality,
          format,
        });
        return result;
      } catch {
        // Tauri 不可用
        logger.warn('[VideoService] Tauri 缩略图生成不可用');
        return '';
      }
    }, '生成缩略图失败');
  }

  /**
   * 批量生成缩略图
   * @param videoPath 视频路径
   * @param timestamps 时间点数组
   */
  async generateThumbnails(
    videoPath: string,
    timestamps: number[]
  ): Promise<string[]> {
    return this.executeRequest(async () => {
      const thumbnails: string[] = [];
      for (const ts of timestamps) {
        const thumb = await this.generateThumbnail(videoPath, {
          timestamp: ts,
          format: 'jpg',
          quality: 75,
        });
        thumbnails.push(thumb);
      }
      return thumbnails;
    }, '批量生成缩略图失败');
  }

  /**
   * 视频格式转换
   * @param inputPath 输入路径
   * @param outputPath 输出路径
   * @param options 转换选项
   * @param onProgress 进度回调
   */
  async convertVideo(
    inputPath: string,
    outputPath: string,
    options: VideoConversionOptions,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    return this.executeRequest(async () => {
      logger.info('[VideoService] 视频格式转换:', {
        input: inputPath,
        output: outputPath,
        options,
      });

      try {
        await invoke<string>('convert_video', {
          inputPath,
          outputPath,
          format: options.format,
          resolution: options.resolution ?? '1080p',
          fps: options.fps ?? 30,
          crf: options.crf ?? 23,
          audioBitrate: options.audioBitrate ?? '192k',
          removeAudio: options.removeAudio ?? false,
        });
        return outputPath;
      } catch {
        logger.warn('[VideoService] Tauri 视频转换不可用');
        throw new ServiceError('视频转换需要 Tauri 后端支持', 'TAURI_NOT_AVAILABLE');
      }
    }, '视频格式转换失败');
  }

  /**
   * 裁剪视频片段
   * @param inputPath 输入路径
   * @param options 裁剪选项
   */
  async trimVideo(
    inputPath: string,
    options: TrimOptions
  ): Promise<string> {
    return this.executeRequest(async () => {
      const { startTime, endTime, outputPath } = options;

      if (startTime < 0) {
        throw new ServiceError('startTime 不能为负数', 'INVALID_PARAM');
      }
      if (endTime <= startTime) {
        throw new ServiceError('endTime 必须大于 startTime', 'INVALID_PARAM');
      }

      logger.info('[VideoService] 裁剪视频:', {
        input: inputPath,
        start: startTime,
        end: endTime,
      });

      try {
        await invoke<string>('trim_video', {
          inputPath,
          outputPath,
          startTime,
          endTime,
        });
        return outputPath;
      } catch {
        logger.warn('[VideoService] Tauri 视频裁剪不可用');
        throw new ServiceError('视频裁剪需要 Tauri 后端支持', 'TAURI_NOT_AVAILABLE');
      }
    }, '视频裁剪失败');
  }

  /**
   * 获取视频预览帧
   * @param videoPath 视频路径
   * @param time 时间点
   */
  async getPreviewFrame(
    videoPath: string,
    time: number
  ): Promise<string> {
    return this.generateThumbnail(videoPath, {
      timestamp: time,
      width: 640,
      format: 'jpg',
      quality: 85,
    });
  }

  /**
   * 合并多个视频片段
   * @param segments 片段列表（已按顺序排列）
   * @param outputPath 输出路径
   */
  async mergeVideos(
    segments: VideoSegment[],
    outputPath: string
  ): Promise<string> {
    return this.executeRequest(async () => {
      if (segments.length === 0) {
        throw new ServiceError('没有要合并的片段', 'INVALID_PARAM');
      }

      logger.info('[VideoService] 合并视频片段:', {
        count: segments.length,
        output: outputPath,
      });

      try {
        await invoke<string>('merge_videos', {
          segments: segments.map(s => ({
            path: s.path,
            start_time: s.startTime,
            end_time: s.endTime,
          })),
          outputPath,
        });
        return outputPath;
      } catch {
        logger.warn('[VideoService] Tauri 视频合并不可用');
        throw new ServiceError('视频合并需要 Tauri 后端支持', 'TAURI_NOT_AVAILABLE');
      }
    }, '视频合并失败');
  }

  /**
   * 生成模拟元数据（当 Tauri 不可用时）
   */
  private getMockMetadata(videoPath: string): VideoMetadata {
    const name = videoPath.split('/').pop() || videoPath.split('\\').pop() || 'video';
    const duration = 60 + Math.random() * 300; // 1-6分钟

    return {
      id: crypto.randomUUID(),
      name,
      path: videoPath,
      duration,
      width: 1920,
      height: 1080,
      size: Math.floor(duration * 1024 * 1024 / 10), // ~10MB/分钟
      format: name.split('.').pop() || 'mp4',
      fps: 30,
      bitrate: 5000000,
      hasAudio: true,
      hasVideo: true,
      createdAt: new Date().toISOString(),
    };
  }
}

// 导出单例
export const videoService = new VideoService();
export default videoService;
