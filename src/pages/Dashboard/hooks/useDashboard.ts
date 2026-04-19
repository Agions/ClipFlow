/**
 * useDashboard Hook - 抽取数据获取逻辑
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logger';
import {
  listProjects,
  deleteProject as deleteProjectFile,
  getFileSizeBytes,
  PROJECTS_CHANGED_EVENT,
} from '@/services/tauri';
import { useSettings } from '@/context/SettingsContext';
import {
  extractProjectMediaMetrics,
  notify,
  pickPreferredSizeMb,
  resolveProjectVideoPath,
} from '@/shared';
import { preloadProjectEditPage } from '@/core/utils/route-preload';
import { Project, DashboardStats } from '../types';

// 并发限制：避免大量文件操作同时发起
const concurrentMap = async <T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit = 8
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (index < items.length) {
        const i = index++;
        results[i] = await fn(items[i]);
      }
    })()
  );
  await Promise.all(workers);
  return results;
};

export interface UseDashboardReturn {
  // 数据
  projects: Project[];
  loading: boolean;
  stats: DashboardStats;
  
  // 操作
  loadProjects: () => Promise<void>;
  toggleStar: (id: string) => void;
  deleteProject: (id: string) => void;
  createNewProject: () => void;
  openProject: (id: string) => void;
}

export function useDashboard(): UseDashboardReturn {
  const navigate = useNavigate();
  const { addRecentProject } = useSettings();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载项目数据
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const rawProjects = await listProjects();
      const filtered = rawProjects.filter((p) => typeof p.id === 'string');
      const mapped: Project[] = await concurrentMap(
        filtered,
        async (project: RawProjectRecord) => {
          const metrics = extractProjectMediaMetrics(project);
          const videoPath = resolveProjectVideoPath(project);
          const exactSizeMb = videoPath
            ? (await getFileSizeBytes(videoPath)) / 1024 / 1024
            : 0;
          const size = pickPreferredSizeMb(
            exactSizeMb,
            metrics.explicitSizeMb,
            metrics.estimatedSizeMb
          );

          return {
            id: String(project.id),
            title: String(project.name || '未命名项目'),
            thumbnail: `https://picsum.photos/seed/${project.id || 'default'}/300/200`,
            updatedAt: String(project.updatedAt || project.createdAt || new Date().toISOString()),
            duration: metrics.durationSec,
            size,
            starred: false,
            tags: [String(project.status || 'draft')],
            status: (project.status as Project['status']) ?? 'draft',
          };
        }
      );
      setProjects(mapped);
    } catch (error) {
      logger.error('加载项目失败:', { error });
      notify.error(error, '加载项目失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  // 监听项目变化事件
  useEffect(() => {
    void loadProjects();
    const handleProjectsChanged = () => {
      void loadProjects();
    };
    window.addEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);
    return () => {
      window.removeEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);
    };
  }, [loadProjects]);

  // 统计数据（memoized）
  const stats = useMemo((): DashboardStats => {
    const totalProjects = projects.length;
    const totalDuration = projects.reduce((sum, p) => sum + p.duration, 0);
    const totalSize = projects.reduce((sum, p) => sum + p.size, 0);
    return { totalProjects, totalDuration, totalSize };
  }, [projects]);

  // 切换收藏状态
  const toggleStar = useCallback((id: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, starred: !p.starred } : p))
    );
  }, []);

  // 删除项目
  const deleteProject = useCallback((id: string) => {
    Modal.confirm({
      title: '确认删除项目',
      content: '删除后不可恢复，确认继续？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const ok = await deleteProjectFile(id);
          if (ok) {
            notify.success('项目已删除');
            await loadProjects();
          } else {
            notify.error(null, '删除项目失败');
          }
        } catch (error) {
          logger.error('删除项目失败:', { error });
          notify.error(error, '删除项目失败，请稍后重试');
        }
      },
    });
  }, [loadProjects]);

  // 创建新项目
  const createNewProject = useCallback(() => {
    navigate('/project/new');
  }, [navigate]);

  // 打开项目
  const openProject = useCallback((id: string) => {
    addRecentProject(id);
    navigate(`/project/edit/${id}`);
  }, [navigate, addRecentProject]);

  return {
    projects,
    loading,
    stats,
    loadProjects,
    toggleStar,
    deleteProject,
    createNewProject,
    openProject,
  };
}
