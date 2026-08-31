/**
 * Fablr Workflow Dirty Notification System
 * 上下游工坊脏标记通知系统
 *
 * 管理 Asset Hub / Script Studio / Workspace / Export Hub 之间的跨工坊状态变更与提示
 */

export type StageName = 'asset' | 'script' | 'workspace' | 'export';

export interface DirtyState {
  isDirty: boolean;
  message: string;
  sourceStage: StageName;
  updatedAt: string;
}

const STORAGE_PREFIX = 'fablr_dirty_stage_';

export function setStageDirty(projectId: string, targetStage: StageName, sourceStage: StageName, message: string): void {
  try {
    const key = `${STORAGE_PREFIX}${projectId || 'default'}_${targetStage}`;
    const payload: DirtyState = {
      isDirty: true,
      message,
      sourceStage,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* ignore localStorage errors */
  }
}

export function getStageDirty(projectId: string, targetStage: StageName): DirtyState | null {
  try {
    const key = `${STORAGE_PREFIX}${projectId || 'default'}_${targetStage}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DirtyState;
    return parsed.isDirty ? parsed : null;
  } catch {
    return null;
  }
}

export function clearStageDirty(projectId: string, targetStage: StageName): void {
  try {
    const key = `${STORAGE_PREFIX}${projectId || 'default'}_${targetStage}`;
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
