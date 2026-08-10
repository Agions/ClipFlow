/**
 * useProject — 单项目 hook（Stage 12.5）
 *
 * 加载单个项目 + 配套的 save/create/delete 操作。
 * 替代 v2 use-project-detail.ts（基于文件存储的 CRUD）。
 *
 * 用法：
 * ```tsx
 * const { project, loading, error, save, remove } = useProject(projectId);
 * ```
 */

import { useCallback, useEffect, useState } from 'react';
import {
  project,
  type Project,
  type SaveProjectInput,
} from '@/core/tauri/methods/project';
import { logger } from '@/shared/utils/logging';

export interface UseProjectResult {
  project: Project | null;
  loading: boolean;
  error: string | null;
  /** 重新加载当前项目 */
  refresh: () => Promise<void>;
  /** 保存项目元数据 */
  save: (input: SaveProjectInput) => Promise<void>;
  /** 删除项目 */
  remove: () => Promise<void>;
}

export function useProject(projectId: string | null): UseProjectResult {
  const [projectState, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const p = await project.load(projectId);
      setProject(p);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('[useProject] load failed:', msg);
      setError(msg);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (input: SaveProjectInput) => {
      try {
        const updated = await project.save(input);
        setProject(updated);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('[useProject] save failed:', msg);
        setError(msg);
        throw e;
      }
    },
    [],
  );

  const remove = useCallback(async () => {
    if (!projectId) return;
    try {
      await project.delete(projectId);
      setProject(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('[useProject] delete failed:', msg);
      setError(msg);
      throw e;
    }
  }, [projectId]);

  return { project: projectState, loading, error, refresh, save, remove };
}
