/**
 * Highlight Detector — 高光时刻检测（PR-1.3a）
 *
 * 🎯 目标：替代 `VisionService.detectHighlights()` 的 `@deprecated` 标记
 * 🔧 实现：直接调用 Rust `tauri.detectHighlights()` 命令
 * 🔁 回滚：通过 git revert 即可恢复旧 visionService 调用
 *
 * 设计原则：
 * - 不引入新依赖（仅包装 tauri 调用）
 * - 与 emotion-detector 共用同一 Rust IPC 接口
 * - 返回类型与原 VisionService 一致（`HighlightSegment[]`）
 *
 * @see docs/TECH_DEBT.md §2 @deprecated 清理
 * @see docs/PR41_PLAN.md PR-1.3a
 */

import { tauri } from '@/core/tauri';
import { logger } from '@/shared/utils/logging';
import type { HighlightSegment, HighlightOptions } from '@/types';

/**
 * Rust highlight_detector.rs 返回的原始高光段
 *
 * 注意：所有时间字段都是毫秒，需要转换为秒（与 VisionService 一致）。
 */
interface RustHighlightSegment {
  startMs: number;
  endMs: number;
  score: number;
  reason: string;
  audioScore?: number;
  sceneScore?: number;
  motionScore?: number;
}

/**
 * Highlight Detector Helper
 *
 * 提供与原 `VisionService.detectHighlights()` 兼容的接口，
 * 但**直接调用** Rust backend（不再通过 vision 门面中转）。
 *
 * 优势：
 * 1. 去除 `@deprecated` 标记的 visionService 中转层
 * 2. 与 emotion-detector 一致使用 `tauri.detectHighlights` 直接调用
 * 3. 转换逻辑（ms → s）封装在 helper 内，调用方无需关心
 */
export const highlightDetector = {
  /**
   * 检测视频高光时刻
   *
   * @param videoPath 视频文件绝对路径
   * @param options 检测选项（与原 HighlightOptions 兼容，`detectScene`/`sceneThreshold` 由 Rust 端自动处理）
   * @returns 高光片段列表（时间为秒）
   */
  async detectHighlights(
    videoPath: string,
    options: HighlightOptions = {}
  ): Promise<HighlightSegment[]> {
    if (!videoPath) {
      logger.debug('[highlightDetector] videoPath is empty, returning []');
      return [];
    }

    try {
      const rawSegments = (await tauri.detectHighlights(videoPath, {
        threshold: options.threshold,
        minDurationMs: options.minDurationMs,
        topN: options.topN,
        windowMs: options.windowMs,
      })) as RustHighlightSegment[];

      return rawSegments.map(h => ({
        startTime: h.startMs / 1000,
        endTime: h.endMs / 1000,
        score: h.score,
        reason: h.reason as string,
        audioScore: h.audioScore,
        sceneScore: h.sceneScore,
        motionScore: h.motionScore,
      }));
    } catch (error) {
      logger.info('[highlightDetector] detectHighlights failed:', error);
      return [];
    }
  },
};
