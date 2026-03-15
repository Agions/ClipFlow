/**
 * Project Store - 项目状态
 * 包含: 项目列表、当前项目、加载状态、筛选排序
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Project, ProjectStatus } from '../core/types';

/**
 * 项目排序方式
 */
export type ProjectSortBy = 'updatedAt' | 'createdAt' | 'title' | 'duration';
export type SortOrder = 'asc' | 'desc';

/**
 * 项目筛选条件
 */
export interface ProjectFilter {
  status?: ProjectStatus;
  starred?: boolean;
  tags?: string[];
  search?: string;
}

/**
 * Project Store 状态
 */
export interface ProjectState {
  // 数据
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  
  // 筛选排序
  sortBy: ProjectSortBy;
  sortOrder: SortOrder;
  filter: ProjectFilter;

  // Actions - 基本操作
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (project: Project | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Actions - 筛选排序
  setSortBy: (sortBy: ProjectSortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  setFilter: (filter: ProjectFilter) => void;
  clearFilter: () => void;
  
  // Getters
  getFilteredProjects: () => Project[];
  getProjectById: (id: string) => Project | undefined;
}

/**
 * Project Store
 */
export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // 初始状态
      projects: [] as Project[],
      currentProject: null,
      loading: false,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      filter: {},

      // 基本操作
      setProjects: (projects) => set({ projects }),
      
      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project],
        })),
      
      updateProject: (id, data) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, ...data, updatedAt: new Date().toISOString() }
              : p
          ),
          // 同时更新当前项目
          currentProject: state.currentProject?.id === id 
            ? { ...state.currentProject, ...data, updatedAt: new Date().toISOString() }
            : state.currentProject,
        })),
      
      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject,
        })),
      
      setCurrentProject: (project) => set({ currentProject: project }),
      setLoading: (loading) => set({ loading }),

      // 筛选排序
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      setFilter: (filter) => set({ filter }),
      clearFilter: () => set({ filter: {} }),

      // Getters
      getFilteredProjects: () => {
        const { projects, sortBy, sortOrder, filter } = get();
        
        let result = [...projects];
        
        // 筛选
        if (filter.status) {
          result = result.filter(p => p.status === filter.status);
        }
        if (filter.starred !== undefined) {
          result = result.filter(p => p.starred === filter.starred);
        }
        if (filter.tags?.length) {
          result = result.filter(p => 
            filter.tags!.some(tag => p.tags.includes(tag))
          );
        }
        if (filter.search) {
          const search = filter.search.toLowerCase();
          result = result.filter(p => 
            p.title.toLowerCase().includes(search) ||
            p.description?.toLowerCase().includes(search)
          );
        }
        
        // 排序
        result.sort((a, b) => {
          let comparison = 0;
          
          switch (sortBy) {
            case 'title':
              comparison = a.title.localeCompare(b.title);
              break;
            case 'createdAt':
              comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              break;
            case 'updatedAt':
              comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
              break;
            case 'duration':
              comparison = a.duration - b.duration;
              break;
          }
          
          return sortOrder === 'asc' ? comparison : -comparison;
        });
        
        return result;
      },
      
      getProjectById: (id) => {
        return get().projects.find(p => p.id === id);
      },
    }),
    {
      name: 'clipflow-projects',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects,
        currentProject: state.currentProject,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);
