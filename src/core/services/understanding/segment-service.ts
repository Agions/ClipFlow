/**
 * segment-service — L0 内容理解层：场景切分
 *
 * 封装 Rust `detect_smart_segments`（场景检测 + 语义分类），
 * 输出统一为 `Scene[]`（秒制时间，与 Storyline 领域模型对齐）。
 */

import { tauri } from '@/core/tauri';
import type { Scene } from '@/types';

export interface SegmentOptions {
  minDurationMs?: number;
  maxDurationMs?: number;
  sceneThreshold?: number;
  silenceThresholdDb?: number;
  detectDialogue?: boolean;
  detectTransitions?: boolean;
}

/** segment 语义类型 → 前端 SceneType 映射（与 Rust storyline_builder 保持一致） */
export function sceneTypeOf(segmentType: string): Scene['type'] {
  switch (segmentType) {
    case 'dialogue':
      return 'dialog';
    case 'action':
      return 'action';
    case 'transition':
      return 'action';
    default:
      return 'text';
  }
}

/**
 * 场景切分：检测视频中的语义段落
 *
 * @param videoPath 视频绝对路径
 * @param options 切分参数（可选，缺省用 Rust 端默认值）
 * @returns 场景列表（秒制时间）
 */
export async function detectScenes(
  videoPath: string,
  options: SegmentOptions = {}
): Promise<Scene[]> {
  if (!videoPath?.trim()) {
    throw new Error('视频路径不能为空');
  }
  // 旧封装签名为 Record<string, unknown>，此处显式收窄为选项对象
  const segments = await tauri.detectSmartSegments(videoPath, options as Record<string, unknown>);

  return segments.map((seg, index) => ({
    id: `scene-${index}`,
    startTime: seg.startMs / 1000,
    endTime: seg.endMs / 1000,
    type: sceneTypeOf(seg.segmentType),
    score: seg.confidence,
    confidence: seg.confidence,
    duration: seg.durationMs / 1000,
  }));
}
