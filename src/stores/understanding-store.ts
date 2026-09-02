/**
 * understanding-store — L0 内容理解层状态分片（v3）
 *
 * 职责边界（对齐计划 3.4 状态管理策略）：
 *  - 保存 L0 产物（storyline 领域模型 + artifacts 落盘引用）
 *  - 保存分析进度（progress/stage/message）与失败信息
 *  - `startAnalysis` 编排全链路分析；`loadStoryline` 从落盘 JSON 恢复产物
 *
 * 不持久化：storyline.json 的主真源在磁盘
 * （appData/Fablr/productions/{id}/artifacts/storyline.json），
 * store 仅持有轻量引用，启动扫描恢复逻辑在 M4 落地。
 */

import { create } from 'zustand';
import { analyzeStoryline, type UnderstandingStage } from '@/core/services/understanding';
import { parseStoryline, type Storyline } from '@/core/models/storyline';
import { tauri } from '@/core/tauri';

export type UnderstandingStatus = 'idle' | 'running' | 'done' | 'failed';

export interface UnderstandingState {
  // ─── L0 产物 ───
  /** 当前分析的工程 ID（供 L1 衔接使用） */
  productionId: string | null;
  /** 源视频路径（供 L2 渲染使用） */
  videoPath: string | null;
  /** 剧情时间线（分析完成后由 loadStoryline 填充） */
  storyline: Storyline | null;
  /** storyline.json 落盘路径 */
  artifactPath: string | null;
  /** 分析统计（Rust 端返回，供列表页展示） */
  stats: {
    scenesCount: number;
    subtitlesCount: number;
    highlightsCount: number;
    durationSecs: number;
  } | null;

  // ─── 分析进度 ───
  status: UnderstandingStatus;
  /** 整体进度 0-100 */
  progress: number;
  /** 当前阶段 */
  stage: UnderstandingStage | null;
  /** 当前阶段描述 */
  message: string | null;
  /** 失败信息 */
  error: string | null;

  // ─── actions ───
  /** 启动 L0 全链路分析（元数据 → 场景 → 字幕 → 高光） */
  startAnalysis: (input: {
    productionId: string;
    videoPath: string;
    whisperModel?: string;
    language?: string;
  }) => Promise<void>;
  /** 从落盘 storyline.json 恢复产物明细 */
  loadStoryline: (path: string) => Promise<void>;
  /** 重置为初始状态 */
  reset: () => void;
}

const initialState = {
  productionId: null,
  videoPath: null,
  storyline: null,
  artifactPath: null,
  stats: null,
  status: 'idle' as const,
  progress: 0,
  stage: null,
  message: null,
  error: null,
};

export const useUnderstandingStore = create<UnderstandingState>()((set, get) => ({
  ...initialState,

  startAnalysis: async input => {
    // 防止重复启动
    if (get().status === 'running') return;

    set({
      status: 'running',
      productionId: input.productionId,
      videoPath: input.videoPath,
      progress: 0,
      stage: null,
      message: '正在启动分析...',
      error: null,
      storyline: null,
      artifactPath: null,
      stats: null,
    });

    try {
      const result = await analyzeStoryline({
        ...input,
        onProgress: p => set({ progress: p.percent, stage: p.stage, message: p.message }),
      });

      set({
        status: 'done',
        progress: 100,
        stage: 'done',
        message: '剧情时间线构建完成',
        artifactPath: result.storylinePath,
        stats: {
          scenesCount: result.scenesCount,
          subtitlesCount: result.subtitlesCount,
          highlightsCount: result.highlightsCount,
          durationSecs: result.durationSecs,
        },
      });
    } catch (error) {
      set({
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        message: '分析失败',
      });
    }
  },

  loadStoryline: async path => {
    if (!path?.trim()) return;
    try {
      const raw = await tauri.readTextFile(path);
      const parsed = parseStoryline(JSON.parse(raw));
      if (!parsed) {
        set({ storyline: null, error: '剧情时间线格式无效，请重新分析' });
        return;
      }
      set({ storyline: parsed, error: null });
    } catch (error) {
      set({
        storyline: null,
        error: error instanceof Error ? error.message : '读取剧情时间线失败',
      });
    }
  },

  reset: () => set({ ...initialState }),
}));
