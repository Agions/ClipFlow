/**
 * story-fab Workspace — AI 视频剪辑工作流组件导出
 *
 * 包三分 (edit-step / assemble / export / shared) 完成后，此 barrel
 * 作为兼容 Shim 继续 Re-export；新代码推荐从各子包导入。
 * @see docs/architecture-audit-2026.md P3 step⑥
 */
export { default as Workspace } from './workspace';
export { default } from './workspace';
export { default as ProjectSetup } from './edit-step/project-setup';
export { default as VideoUpload } from './edit-step/video-upload';
export { default as AIVisualizer } from './assemble/ai-visualizer';
export { default as ScriptWriting } from './edit-step/script-writing';
export { default as VideoComposing } from './assemble/video-composing';
export { default as ClipRippling } from './assemble/clip-rippling';
export { default as VideoExport } from './export/video-export';
export { default as StepList } from './edit-step/step-list';
export { Highlights, type Highlight, type HighlightsProps } from './assemble/highlights/highlights';

// 导出类型
export type { AIFunctionType } from './shared/function-mode-map';

// ── 子包 re-export（新代码推荐入口）──
export * as editStep from './edit-step';
export * as assemble from './assemble';
export * as export_ from './export/video-export';
export * as shared from './shared';
