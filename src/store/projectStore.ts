/**
 * Project Store - 项目状态
 * 包含: 项目列表、当前项目、加载状态、筛选排序
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Project, ProjectStatus } from '../core/types';

// ─── Pure filter/sort functions (exported for testing) ────────────────────────

export type ProjectSortBy = 'updatedAt' | 'createdAt' | 'title' | 'duration';
export type SortOrder = 'asc' | 'desc';

export interface ProjectFilter {
  status?: ProjectStatus;
  starred?: boolean;
  tags?: string[];
  search?: string;
}

export function filterProjects(projects: Project[], filter: ProjectFilter): Project[] {
  return projects.filter(p => {
    if (filter.status && p.status !== filter.status) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (!p.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function sortProjects(projects: Project[], sortBy: ProjectSortBy, order: SortOrder): Project[] {
  return [...projects].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'title') cmp = a.title.localeCompare(b.title);
    else if (sortBy === 'duration') cmp = (a.duration ?? 0) - (b.duration ?? 0);
    else cmp = new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime();
    return order === 'asc' ? cmp : -cmp;
  });
}

// ─── Store types ───────────────────────────────────────────────────────────────

export interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  sortBy: ProjectSortBy;
  sortOrder: SortOrder;
  filter: ProjectFilter;

  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (project: Project | null) => void;
  setLoading: (loading: boolean) => void;
  setSortBy: (sortBy: ProjectSortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  setFilter: (filter: ProjectFilter) => void;
  clearFilter: () => void;
  getFilteredProjects: () => Project[];
  getProjectById: (id: string) => Project | undefined;
}

// ─── Store implementation ──────────────────────────────────────────────────────

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [] as Project[],
      currentProject: null as Project | null,
      loading: false,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      filter: {},

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

      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      setFilter: (filter) => set({ filter }),
      clearFilter: () => set({ filter: {} }),

      getFilteredProjects: () => {
        const { projects, sortBy, sortOrder, filter } = get();

        let result = [...projects];

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
      name: 'cutdeck-projects',
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
