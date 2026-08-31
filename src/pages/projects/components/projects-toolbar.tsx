import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Grid3X3, List, Plus, Search } from 'lucide-react';
import type { ProjectStatusFilter } from '@/types/project';
import styles from '../index.module.less';

type ViewMode = 'grid' | 'list';

interface ProjectsToolbarProps {
  searchText: string;
  statusFilter: ProjectStatusFilter;
  viewMode: ViewMode;
  onSearchChange: (v: string) => void;
  onStatusFilterChange: (v: ProjectStatusFilter) => void;
  onViewModeChange: (v: ViewMode) => void;
  onNewProject: () => void;
}

export const ProjectsToolbar = React.memo<ProjectsToolbarProps>(({
  searchText, statusFilter, viewMode,
  onSearchChange, onStatusFilterChange, onViewModeChange, onNewProject,
}) => (
  <Card className={`${styles.toolbarCard} mb-4`}>
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索项目..."
            className="w-60 pl-9"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className="h-9 w-28 px-3 rounded-md border border-input bg-background text-sm"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as ProjectStatusFilter)}
        >
          <option value="all">全部状态</option>
          <option value="draft">草稿</option>
          <option value="processing">制作中</option>
          <option value="completed">已完成</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-2"
            onClick={() => onViewModeChange('grid')}
          >
            <Grid3X3 size={16} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-2"
            onClick={() => onViewModeChange('list')}
          >
            <List size={16} />
          </Button>
        </div>
        <Button
          className="border-0 font-semibold"
          style={{ background: 'var(--gradient-hero)', color: 'var(--primary-foreground)' }}
          onClick={onNewProject}
        >
          <Plus size={16} className="mr-1" />
          新建项目
        </Button>
      </div>
    </div>
  </Card>
));

ProjectsToolbar.displayName = 'ProjectsToolbar';
