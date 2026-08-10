/**
 * understanding — L0 内容理解层类型定义
 *
 * 与 Rust 端 `src-tauri/src/understanding/types.rs` 对齐：
 * - `analyze_production` 命令的输入/输出
 * - `understanding-progress` 事件 payload（stage 枚举保持一致）
 */

/** L0 分析进度阶段（与 Rust UnderstandingStage 对齐） */
export type UnderstandingStage =
  | 'metadata'
  | 'segment'
  | 'transcribe'
  | 'highlight'
  | 'build'
  | 'done';

/** `understanding-progress` 事件 payload */
export interface UnderstandingProgress {
  stage: UnderstandingStage;
  /** 整体进度 0-100 */
  percent: number;
  /** 当前阶段描述 */
  message: string;
}

/** analyzeStoryline 输入 */
export interface AnalyzeStorylineInput {
  /** 解说工程 ID（产物落盘目录组成部分） */
  productionId: string;
  /** 源视频绝对路径 */
  videoPath: string;
  /** Whisper 模型大小（默认 base） */
  whisperModel?: string;
  /** 转录语言（默认 auto） */
  language?: string;
  /** 进度回调（监听 understanding-progress 事件） */
  onProgress?: (progress: UnderstandingProgress) => void;
}

/** analyze_production 命令输出 */
export interface AnalyzeStorylineResult {
  /** storyline.json 落盘绝对路径 */
  storylinePath: string;
  /** 场景切分数量 */
  scenesCount: number;
  /** 字幕条目数量 */
  subtitlesCount: number;
  /** 高光片段数量 */
  highlightsCount: number;
  /** 视频时长（秒） */
  durationSecs: number;
}
