/**
 * features — Fablr v3 功能层目录（M0 骨架 / M1 起逐步填充）
 *
 * 分层说明（对齐行业三层模型）：
 * - understanding/  L0 内容理解层页面：视频导入、分析进度、剧情时间线预览（M1 已落地）
 * - M2/M3 的 creation/ + production/ 在 v3 干净重写后落地（Stage 13-14）
 *
 * 组件组织约定：每个 feature 内使用 container（数据接入）+ view（纯展示）结构。
 */

export * from './understanding';
