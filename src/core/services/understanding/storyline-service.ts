/**
 * storyline-service — L0 内容理解层编排（v3 新链路入口）
 *
 * 职责：调用 Rust 端 `analyze_production` 命令完成
 * 元数据 → 场景切分 → 字幕转录 → 高光检测 全链路编排，
 * 监听 `understanding-progress` 事件转发进度给调用方。
 *
 * storyline.json 由 Rust 端落盘到
 * `appData/StoryFab/productions/{id}/artifacts/storyline.json`，
 * 本服务只返回落盘引用，不持有产物内容。
 *
 * 注：单步能力（metadata/segment/subtitle/highlight）见同目录
 * 独立服务，供 M2+ 阶段「单步重跑」场景直接调用。
 */

import { invoke } from '@/core/tauri/invoke';
import { TauriCommand } from '@/core/tauri/invoke';
import type { UnderstandingProgress } from './types';
import type { AnalyzeStorylineInput, AnalyzeStorylineResult } from './types';

/** understanding-progress 事件通道（与 Rust 端约定一致） */
const UNDERSTANDING_PROGRESS_EVENT = 'understanding-progress';

/**
 * 执行 L0 全链路分析（元数据 → 场景 → 字幕 → 高光 → storyline 落盘）
 *
 * @param input 分析输入（productionId + videoPath + 可选 whisper 参数）
 * @returns storyline 产物落盘引用与统计
 */
export async function analyzeStoryline(
  input: AnalyzeStorylineInput
): Promise<AnalyzeStorylineResult> {
  const { productionId, videoPath, whisperModel, language, onProgress } = input;

  if (!videoPath?.trim()) {
    throw new Error('视频路径不能为空');
  }
  if (!productionId?.trim()) {
    throw new Error('productionId 不能为空');
  }

  let unlisten: (() => void) | undefined;
  if (onProgress) {
    try {
      const { listen } = await import('@tauri-apps/api/event');
      unlisten = await listen<UnderstandingProgress>(UNDERSTANDING_PROGRESS_EVENT, event => {
        onProgress(event.payload);
      });
    } catch {
      // 事件监听失败不阻塞主流程（进度回调为可选能力）
    }
  }

  try {
    return await invoke(TauriCommand.ANALYZE_PRODUCTION, {
      productionId,
      videoPath,
      whisperModel,
      language,
    });
  } finally {
    unlisten?.();
  }
}
