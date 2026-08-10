/**
 * useProjects — 项目列表 hook（Stage 12.5）
 *
 * 替代 v2 use-project-list.ts（基于 fs plugin 的文件列表）。
 * v3 走 SQLite-backed `tauri.project.list()`。
 *
 * 用法：
 * ```tsx
 * const { projects, loading, error, refresh } = useProjects();
 * ```
 */

import { useCallback, useEffect, useState } from 'react';
import { project, type Project } from '@/core/tauri/methods/project';
import { logger } from '@/shared/utils/logging';

export interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await project.list();
      setProjects(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('[useProjects] list failed:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { projects, loading, error, refresh };
}
