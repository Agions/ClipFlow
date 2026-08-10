/**
 * highlight-service — L0 内容理解层：高光检测
 *
 * 封装 Rust `detect_highlights`（视觉 + 音频多信号融合），
 * 输出统一为 `HighlightSegment[]`（秒制时间，与 Storyline 领域模型对齐）。
 */

import { tauri } from '@/core/tauri';
import type { HighlightSegment } from '@/types';

export interface HighlightDetectOptions {
  threshold?: number;
  minDurationMs?: number;
  topN?: number;
  windowMs?: number;
  detectScene?: boolean;
  sceneThreshold?: number;
}

/**
 * 高光检测：识别视频中的精彩片段
 *
 * @param videoPath 视频绝对路径
 * @param options 检测参数（可选，缺省用 Rust 端默认值）
 * @returns 高光片段列表（秒制时间）
 */
export async function detectHighlights(
  videoPath: string,
  options: HighlightDetectOptions = {}
): Promise<HighlightSegment[]> {
  if (!videoPath?.trim()) {
    throw new Error('视频路径不能为空');
  }
  const segments = await tauri.detectHighlights(videoPath, options);

  return segments.map(seg => ({
    startTime: seg.startMs / 1000,
    endTime: seg.endMs / 1000,
    score: seg.score,
    reason: seg.reason,
    audioScore: seg.audioScore,
    sceneScore: seg.sceneScore,
    motionScore: seg.motionScore,
  }));
}
