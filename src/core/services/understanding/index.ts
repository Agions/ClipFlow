/**
 * understanding — L0 内容理解层服务出口
 *
 * 对齐行业三层模型的 L0（内容理解）：视频导入 → 元数据提取 → 场景切分
 * → 字幕提取 → 剧情时间线（Storyline）。
 *
 * 使用约定：
 * - 全链路编排：`analyzeStoryline`（Rust 端一步完成 + 进度事件）
 * - 单步能力：`analyzeMetadata` / `detectScenes` / `transcribeSubtitles`
 *   / `detectHighlights`（M2+「单步重跑」场景使用）
 */

export * from './types';
export { analyzeStoryline } from './storyline-service';
export { analyzeMetadata } from './metadata-service';
export { detectScenes, sceneTypeOf, type SegmentOptions } from './segment-service';
export { transcribeSubtitles, type TranscribeOptions } from './subtitle-service';
export { detectHighlights, type HighlightDetectOptions } from './highlight-service';
