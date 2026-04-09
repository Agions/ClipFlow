/**
 * Timeline 组件 - 统一导出
 *
 * 此文件重导出模块化版本的 Timeline 组件
 * 旧版实现已迁移到 Timeline/index.tsx
 */

// 从新模块重导出组件
export { default } from './Timeline/index';

// 从新模块重导出类型
export type {
  TimelineProps,
  TrackType,
  Track,
  Clip,
  Keyframe
} from './Timeline/index';

// 兼容旧版类型导出
export type { ClipProperties, Transition } from './Timeline/types';
