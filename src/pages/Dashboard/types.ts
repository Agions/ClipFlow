/**
 * CutDeck Dashboard 类型定义
 */

/** 项目状态 */
export type ProjectStatus = 'draft' | 'processing' | 'completed' | 'failed';

export interface Project {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  updatedAt: string;
  size: number;
  starred: boolean;
  tags: string[];
  status: ProjectStatus;
}

export interface DashboardStats {
  totalProjects: number;
  totalDuration: number;
  totalSize: number;
}
