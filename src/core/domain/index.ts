/**
 * core/domain — StoryFab v3 领域模型统一出口
 *
 * 分层说明：
 * - 本层是纯类型 + 纯函数（零框架依赖），供 stores / features / services 引用。
 * - 与旧架构的关系：本层为「新架构」的真源，旧 workflow.ts 将在 M5 阶段下线。
 */

export * from './production';
export * from './storyline';
export * from './plan';
export * from './script';
export * from './job';
export * from './voice';
