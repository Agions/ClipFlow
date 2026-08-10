/**
 * Projects 页面类型 — 统一从项目唯一类型源 `@/types/project` 导入。
 *
 * 历史曾存在 `shared/types` 的并行类型（ProjectUIStatus、ProjectView、ProjectUIStats）。
 * 现全部经由 `@/types/project` 重导出，保持页面导入路径不变以便低摩擦迁移。
 *
 * 注：`ProjectUIStatus` 现位于 `@/shared/types`（`UIStatus = 'draft' | 'processing' | 'completed'`），
 *     未被 `@/types/project` 重导出。这里独立从 `@/shared/types` 导入。
 */
export type {
  ProjectStatus,
  ProjectData,
  ProjectView,
  ProjectUIStats,
  ProjectStatusFilter,
} from '@/types/project';

export type { ProjectUIStatus } from '@/shared/types';
