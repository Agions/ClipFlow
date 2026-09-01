/**
 * assembly — Tauri IPC 方法（v3 · Stage 16.3）
 *
 * 2 个入口：
 * - assembly.save(projectId, kit)   保存/更新项目对应的 AssemblyKit
 * - assembly.load(projectId)        加载项目对应的 AssemblyKit
 *
 * 数据契约：
 * - 整段 AssemblyKit JSON 字符串双向传输（不拆列）
 * - 后端存 SQLite 表 `assembly_kits` (project_id PK + assembly_json)
 * - 项目删除时级联（FK ON DELETE CASCADE）
 *
 * 数据模型：见 `src/core/models/assembly.ts` (AssemblyKit)
 * 后端实现：见 `src-tauri/src/commands/assembly.rs`
 */

import { invoke, TauriCommand } from '../invoke';
import type { AssemblyKit } from '../../models/assembly';

// ─── 公共类型 ──────────────────────────────────────────────

/** save 返回的元信息（前端用 updated_at 刷新本地缓存） */
export interface AssemblyKitMeta {
  projectId: string;
  createdAt: number;
  updatedAt: number;
}

/** load 返回的完整数据（null = 项目还没保存过装配图） */
export interface LoadedAssemblyKit {
  projectId: string;
  assemblyJson: string;
  createdAt: number;
  updatedAt: number;
}

// ─── 统一导出 ──────────────────────────────────────────────

export const assembly = {
  /**
   * 保存/更新 AssemblyKit
   * - 自动 JSON.stringify 转换
   * - 返回 meta 包含 createdAt/updatedAt 时间戳
   * - 已存在记录保留 createdAt，仅更新 updatedAt
   */
  async save(projectId: string, kit: AssemblyKit): Promise<AssemblyKitMeta> {
    const json = JSON.stringify(kit);
    return invoke(TauriCommand.ASSEMBLY_KIT_SAVE, {
      projectId,
      assemblyJson: json,
    });
  },

  /**
   * 加载 AssemblyKit
   * - null = 项目还没保存过装配图（首次进入时间线时）
   * - 返回值用 JSON.parse 还原为 AssemblyKit 对象
   */
  async load(projectId: string): Promise<AssemblyKit | null> {
    const loaded = await invoke(TauriCommand.ASSEMBLY_KIT_LOAD, { projectId });
    if (!loaded) return null;
    return JSON.parse(loaded.assemblyJson) as AssemblyKit;
  },
};

/** Re-export model type */
export type { AssemblyKit };
