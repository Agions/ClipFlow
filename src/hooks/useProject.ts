/**
 * 项目管理 Hook
 * 统一的项目创建、编辑和管理
 */

import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ProjectData, VideoInfo, ScriptData, ProjectSettings, TaskStatus } from '../core/types';
import { logger } from '../utils/logger';

export interface UseProjectReturn {
  // 当前项目
  project: ProjectData | null;
  
  // 项目列表
  projects: ProjectData[];
  recentProjects: ProjectData[];
  
  // 操作方法
  createProject: (name: string, description?: string) => ProjectData;
  loadProject: (projectId: string) => Promise<boolean>;
  saveProject: () => Promise<boolean>;
  updateProject: (updates: Partial<ProjectData>) => void;
  deleteProject: (projectId: string) => Promise<boolean>;
  duplicateProject: (projectId: string) => Promise<ProjectData | null>;
  
  // 视频相关
  setVideo: (videoInfo: VideoInfo) => void;
  removeVideo: () => void;
  
  // 脚本相关
  setScript: (script: ScriptData) => void;
  updateScript: (updates: Partial<ScriptData>) => void;
  
  // 设置相关
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  
  // 任务状态
  taskStatus: TaskStatus | null;
  
  // 状态
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
}

// 默认项目设置
const DEFAULT_SETTINGS: ProjectSettings = {
  videoQuality: 'high',
  outputFormat: 'mp4',
  resolution: '1080p',
  frameRate: 30,
  audioCodec: 'aac',
  videoCodec: 'h264',
  subtitleEnabled: true,
  subtitleStyle: {
    fontFamily: 'Arial',
    fontSize: 24,
    color: '#FFFFFF',
    backgroundColor: '#000000',
    outline: true,
    outlineColor: '#000000',
    position: 'bottom',
    alignment: 'center'
  }
};

// 模拟本地存储
const storage = {
  getProjects: (): ProjectData[] => {
    const data = localStorage.getItem('reelforge_projects');
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      logger.warn('Failed to parse projects from localStorage, returning empty array');
      return [];
    }
  },
  saveProjects: (projects: ProjectData[]) => {
    localStorage.setItem('reelforge_projects', JSON.stringify(projects));
  },
  getProject: (id: string): ProjectData | null => {
    const projects = storage.getProjects();
    return projects.find(p => p.id === id) || null;
  },
  saveProject: (project: ProjectData) => {
    const projects = storage.getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.push(project);
    }
    storage.saveProjects(projects);
  },
  deleteProject: (id: string) => {
    const projects = storage.getProjects().filter(p => p.id !== id);
    storage.saveProjects(projects);
  }
};

export function useProject(projectId?: string): UseProjectReturn {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  
  // 最近项目
  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
      .slice(0, 10);
  }, [projects]);
  
  // 创建项目
  const createProject = useCallback((name: string, description?: string): ProjectData => {
    const now = new Date().toISOString();
    const newProject: ProjectData = {
      id: uuidv4(),
      name: name || '未命名项目',
      description,
      status: 'draft',
      videos: [],
      scripts: [],
      settings: { ...DEFAULT_SETTINGS },
      createdAt: now,
      updatedAt: now
    };
    
    storage.saveProject(newProject);
    setProjects(prev => [newProject, ...prev]);
    setProject(newProject);
    setHasUnsavedChanges(false);
    
    return newProject;
  }, []);
  
  // 加载项目
  const loadProject = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const loaded = storage.getProject(id);
      if (loaded) {
        setProject(loaded);
        setHasUnsavedChanges(false);
        return true;
      } else {
        setError('项目不存在');
        return false;
      }
    } catch (_err) {
      setError('加载项目失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // 保存项目
  const saveProject = useCallback(async (): Promise<boolean> => {
    if (!project) return false;
    
    setIsSaving(true);
    
    try {
      const updated = {
        ...project,
        updatedAt: new Date().toISOString()
      };
      
      storage.saveProject(updated);
      setProject(updated);
      setProjects(prev => 
        prev.map(p => p.id === updated.id ? updated : p)
      );
      setHasUnsavedChanges(false);
      
      return true;
    } catch (_err) {
      setError('保存项目失败');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [project]);
  
  // 更新项目
  const updateProject = useCallback((updates: Partial<ProjectData>) => {
    if (!project) return;
    
    setProject(prev => prev ? { ...prev, ...updates } : null);
    setHasUnsavedChanges(true);
  }, [project]);
  
  // 删除项目
  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    try {
      storage.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      
      if (project?.id === id) {
        setProject(null);
      }
      
      return true;
    } catch (_err) {
      setError('删除项目失败');
      return false;
    }
  }, [project]);
  
  // 复制项目
  const duplicateProject = useCallback(async (id: string): Promise<ProjectData | null> => {
    const source = storage.getProject(id);
    if (!source) return null;
    
    const now = new Date().toISOString();
    const duplicated: ProjectData = {
      ...source,
      id: uuidv4(),
      name: `${source.name} (副本)`,
      status: 'draft',
      createdAt: now,
      updatedAt: now
    };
    
    storage.saveProject(duplicated);
    setProjects(prev => [duplicated, ...prev]);
    
    return duplicated;
  }, []);
  
  // 设置视频
  const setVideo = useCallback((videoInfo: VideoInfo) => {
    updateProject({ videos: [videoInfo] });
  }, [updateProject]);
  
  // 移除视频
  const removeVideo = useCallback(() => {
    updateProject({ videos: [] });
  }, [updateProject]);
  
  // 设置脚本
  const setScript = useCallback((script: ScriptData) => {
    updateProject({ scripts: [script] });
  }, [updateProject]);
  
  // 更新脚本
  const updateScript = useCallback((updates: Partial<ScriptData>) => {
    if (!project?.scripts?.length) return;

    const currentScript = project.scripts[0];
    if (!currentScript) return;

    updateProject({
      scripts: [{ ...currentScript, ...updates, updatedAt: new Date().toISOString() }]
    });
  }, [project, updateProject]);
  
  // 更新设置
  const updateSettings = useCallback((settings: Partial<ProjectSettings>) => {
    if (!project) return;
    
    updateProject({
      settings: { ...(project.settings || DEFAULT_SETTINGS), ...settings } as ProjectSettings
    });
  }, [project, updateProject]);
  
  return {
    project,
    projects,
    recentProjects,
    createProject,
    loadProject,
    saveProject,
    updateProject,
    deleteProject,
    duplicateProject,
    setVideo,
    removeVideo,
    setScript,
    updateScript,
    updateSettings,
    taskStatus,
    isLoading,
    isSaving,
    error,
    hasUnsavedChanges
  };
}

// 使用项目列表
export function useProjectList() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState({
    search: '',
    status: [] as string[],
    sortBy: 'updatedAt' as const,
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  
  // 加载项目列表
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    const data = storage.getProjects();
    setProjects(data);
    setIsLoading(false);
  }, []);
  
  // 过滤和排序
  const filteredProjects = useMemo(() => {
    let result = [...projects];
    
    // 搜索过滤
    if (filter.search) {
      const search = filter.search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search)
      );
    }
    
    // 状态过滤
    if (filter.status.length > 0) {
      result = result.filter(p => (filter.status ?? []).includes(p.status ?? ''));
    }
    
    // 排序
    result.sort((a, b) => {
      const aVal = a[filter.sortBy] ?? 0;
      const bVal = b[filter.sortBy] ?? 0;
      const comparison = aVal > bVal ? 1 : -1;
      return filter.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [projects, filter]);
  
  return {
    projects: filteredProjects,
    allProjects: projects,
    isLoading,
    filter,
    setFilter,
    loadProjects,
    refresh: loadProjects
  };
}
