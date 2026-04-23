import React from 'react';
import { PlayCircle, MoreHorizontal, Video, FolderOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
interface MenuItem {
  key?: string;
  label?: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
}

interface MenuProps {
  items?: MenuItem[];
}

import type { ProjectUIStatus, ProjectView, ProjectUIStats } from '../types';

interface ProjectsListViewProps {
  projects: ProjectView[];
  loading: boolean;
  statusConfig: Record<ProjectUIStatus, { color: string; text: string }>;
  getProjectUIStatus: (project: ProjectView) => ProjectUIStats;
  formatDate: (value: string) => string;
  onOpenProject: (projectId: string) => void;
  onOpenEditor: (projectId: string) => void;
  onPreloadProject: () => void;
  onPreloadEditor: () => void;
  projectActions: (project: ProjectView) => any;
}

const ProjectsListView: React.FC<ProjectsListViewProps> = ({
  projects,
  loading,
  statusConfig,
  getProjectUIStatus,
  formatDate,
  onOpenProject,
  onPreloadProject,
  projectActions,
}) => {
  const getMenuItems = (project: ProjectView) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = projectActions(project).items || [];
    return items.map((item: any, i: number) => ({
      label: typeof item?.label === 'string' ? item.label : String(i),
      danger: item?.danger,
      onClick: () => typeof item?.onClick === 'function' && item.onClick(),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {projects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">暂无项目</div>
      ) : (
        projects.slice(0, 10).map(project => {
          const uiStatus = getProjectUIStatus(project);
          const statusCfg = statusConfig[uiStatus.status];

          return (
            <Card
              key={project.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onOpenProject(project.id)}
            >
              <div className="flex justify-between items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  {/* Tags + date */}
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    {statusCfg && (
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        style={{ backgroundColor: statusCfg.color + '20', color: statusCfg.color, borderColor: statusCfg.color + '40' }}
                      >
                        {statusCfg.text}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(project.updatedAt)}</span>
                  </div>

                  {/* Title */}
                  <div className="font-medium text-sm mb-1">{project.name}</div>

                  {/* Description */}
                  <div className="text-xs text-muted-foreground mb-2">
                    {project.description || '无项目描述'}
                  </div>

                  {/* Progress */}
                  <div className="mb-2">
                    <Progress value={uiStatus.progress} className="w-full">
                      <ProgressTrack className="h-1">
                        <ProgressIndicator className="bg-orange-500" />
                      </ProgressTrack>
                    </Progress>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Video size={12} /> {uiStatus.videoCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <FolderOpen size={12} /> {uiStatus.scriptCount}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onPreloadProject(); }}
                      >
                        <PlayCircle size={16} />
                      </TooltipTrigger>
                      <TooltipContent>进入工作台</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" onClick={(e: React.MouseEvent) => e.stopPropagation()} />}
                    >
                      <MoreHorizontal size={16} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {getMenuItems(project).map((item, idx) => (
                        <DropdownMenuItem
                          key={idx}
                          data-variant={item.danger ? 'destructive' : undefined}
                          className={item.danger ? 'text-destructive' : ''}
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); item.onClick(); }}
                        >
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default ProjectsListView;
