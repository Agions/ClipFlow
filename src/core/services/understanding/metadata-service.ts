/**
 * metadata-service — L0 内容理解层：视频元数据提取
 *
 * 迁移自 `core/services/file/file-info-service` 的分析职责，
 * 统一收敛到 understanding 层；旧服务保留（新旧并存兼容期）。
 */

import { tauri } from '@/core/tauri';
import { logger } from '@/shared/utils/logging';
import type { VideoMetadataResult } from '@/types';

/**
 * 分析视频元数据（ffprobe：时长/宽高/帧率/编码/码率）
 *
 * @param videoPath 视频绝对路径
 * @returns 元数据结果
 */
export async function analyzeMetadata(videoPath: string): Promise<VideoMetadataResult> {
  if (!videoPath?.trim()) {
    throw new Error('视频路径不能为空');
  }
  try {
    const metadata = await tauri.analyzeVideo(videoPath);
    logger.info('[Understanding] 元数据提取完成', { path: videoPath, ...metadata });
    return metadata;
  } catch (error) {
    logger.error('[Understanding] 元数据提取失败', { path: videoPath, error });
    throw error;
  }
}
