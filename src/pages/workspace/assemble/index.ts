/** @see docs/architecture-audit-2026.md P3 step⑥ — assemble 包 */

export { default as ClipRippling } from './clip-rippling';
export { default as VideoComposing } from './video-composing';
export { default as AIVisualizer } from './ai-visualizer';
export { Highlights } from './highlights/highlights';

// PR-4.1b 实验性 UX 组件（feature flag 灰度）
// 仅当 useFeatureFlag('experimental.tts-page') === true 时挂载
// 关闭 flag 自动回落 video-composing
export { default as TtsPage } from './tts-page';
export { default as SubtitleTable } from './subtitle-table';

export {
  aiVisualizerReducer,
  initialAIVisualizerState,
  type AIVisualizerState,
} from './ai-visualizer-reducer';
export {
  clipRipplingReducer,
  initialClipRipplingState,
  type ClipRipplingState,
  type ClipRipplingAction,
} from './clip-rippling-reducer';
export { useClipRippling } from './use-clip-rippling';
