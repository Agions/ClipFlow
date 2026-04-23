/**
 * 最近项目列表组件
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  Plus,
  Clock,
  Video,
  MoreHorizontal,
  CloudUpload,
  Trash2,
  Edit3,
  Copy,
  Star,
  StarOff,
  LayoutGrid,
  List,
  Search,
  FileText,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { Project, ProjectStatus } from '../types';
import styles from '../index.module.less';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string; icon: React.ReactNode }> = {
  completed: { label: '已完成', className: styles.statusCompleted, icon: <CheckCircle size={12} /> },
  processing: { label: 'AI 分析中', className: styles.statusProcessing, icon: <RefreshCw size={12} className="animate-spin" /> },
  draft: { label: '草稿', className: styles.statusDraft, icon: <FileText size={12} /> },
  failed: { label: '失败', className: styles.statusDraft, icon: <FileText size={12} /> },
};

const StatusBadge: React.FC<{ status: ProjectStatus }> = React.memo(({ status }) => {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`${styles.statusBadge} ${config.className}`}>
      <span className={styles.statusDot} />
      {config.icon}
      {config.label}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

const formatTime = (date: Date | string): string => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - targetDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '今天 ' + targetDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return '昨天 ' + targetDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return `${diffDays} 天前`;
  return targetDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

interface ProjectCardProps {
  project: Project;
  onOpenProject: (id: string) => void;
  onToggleStar: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = React.memo(({ project, onOpenProject, onToggleStar, onDeleteProject }) => {
  const menuItems = useMemo(() => [
    { key: 'edit', label: '编辑项目', icon: <Edit3 size={14} />, onClick: () => onOpenProject(project.id) },
    { key: 'duplicate', label: '复制项目', icon: <Copy size={14} />, onClick: () => {} },
    { key: 'delete', label: '删除项目', icon: <Trash2 size={14} />, danger: true, onClick: () => onDeleteProject(project.id) },
  ], [onOpenProject, onDeleteProject, project.id]);

  return (
    <div className="relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-colors hover:border-primary/50 cursor-pointer" style={{ width: '100%' }}>
      <div className={styles.thumbnailContainer} onClick={() => onOpenProject(project.id)}>
        <img
          alt={project.title}
          src={project.thumbnail}
          className={styles.thumbnail}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <div className={styles.duration}>{formatDuration(project.duration)}</div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                onClick={(e) => { e.stopPropagation(); onToggleStar(project.id); }}
                aria-label={project.starred ? '取消收藏' : '收藏'}
              >
                {project.starred ? <Star size={14} className="text-amber-400 fill-amber-400" /> : <Star size={14} className="text-white" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{project.starred ? '取消收藏' : '收藏'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className={styles.thumbnailOverlay}>
          <Video size={32} />
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className={styles.projectInfo}>
            <div className={styles.projectTitle}>{project.title}</div>
            <div className={styles.projectMeta}>
              <span className={styles.projectTime}><Clock size={12} />{formatTime(project.updatedAt)}</span>
              <span className={styles.projectSize}>{project.size.toFixed(1)} MB</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menuItems.map(item => (
                <DropdownMenuItem key={item.key} onClick={item.onClick} className={item.danger ? 'text-destructive' : ''}>
                  {item.icon}<span className="ml-2">{item.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <StatusBadge status={project.status} />
      </div>
    </div>
  );
});
ProjectCard.displayName = 'ProjectCard';

interface RecentProjectsProps {
  projects: Project[];
  loading: boolean;
  onOpenProject: (id: string) => void;
  onToggleStar: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onCreateProject: () => void;
}

const RecentProjects: React.FC<RecentProjectsProps> = React.memo(({
  projects,
  loading,
  onOpenProject,
  onToggleStar,
  onDeleteProject,
  onCreateProject,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = useMemo(() => {
    if (searchQuery.trim() === '') return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter((p) => p.title.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)));
  }, [projects, searchQuery]);

  const getProjectMenuItems = useCallback((id: string) => [
    { key: 'edit', label: '编辑项目', icon: <Edit3 size={14} />, onClick: () => onOpenProject(id) },
    { key: 'duplicate', label: '复制项目', icon: <Copy size={14} />, onClick: () => {} },
    { key: 'delete', label: '删除项目', icon: <Trash2 size={14} />, danger: true, onClick: () => onDeleteProject(id) },
  ], [onOpenProject, onDeleteProject]);

  const ListItem: React.FC<{ project: Project }> = React.memo(({ project: projectProp }) => {
    const menuItems = useMemo(() => getProjectMenuItems(projectProp.id), [getProjectMenuItems, projectProp.id]);
    return (
      <div className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-accent/50 transition-colors">
        <img
          alt={projectProp.title}
          src={projectProp.thumbnail}
          className="w-16 h-12 object-cover rounded"
          loading="lazy"
          draggable={false}
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{projectProp.title}</div>
          <div className={styles.projectMeta}>
            <span className={styles.projectTime}><Clock size={12} />{formatTime(projectProp.updatedAt)}</span>
            <span className={styles.projectSize}>{projectProp.size.toFixed(1)} MB</span>
          </div>
        </div>
        <StatusBadge status={projectProp.status} />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onToggleStar(projectProp.id)}>
            {projectProp.starred ? <Star size={16} className="text-amber-400 fill-amber-400" /> : <StarOff size={16} />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menuItems.map(item => (
                <DropdownMenuItem key={item.key} onClick={item.onClick} className={item.danger ? 'text-destructive' : ''}>
                  {item.icon}<span className="ml-2">{item.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  });
  ListItem.displayName = 'ListItem';

  return (
    <>
      <div className={styles.projectToolbar}>
        <div className={styles.searchInput}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索项目..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-2"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid size={16} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-2"
            onClick={() => setViewMode('list')}
          >
            <List size={16} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className={`${styles.skeletonCard} overflow-hidden`}>
              <div className="h-32 bg-muted animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpenProject={onOpenProject}
                onToggleStar={onToggleStar}
                onDeleteProject={onDeleteProject}
              />
            ))}
          </div>
        ) : (
          <div className="border rounded-lg bg-card">
            {filteredProjects.map((project) => (
              <ListItem key={project.id} project={project} />
            ))}
          </div>
        )
      ) : (
        <div className={`${styles.emptyState} text-center py-16`}>
          <div className="text-muted-foreground mb-4">
            {searchQuery ? '没有找到匹配的项目' : '还没有创建任何项目'}
          </div>
          <Button onClick={onCreateProject}>
            <Plus size={16} className="mr-2" />
            创建第一个项目
          </Button>
        </div>
      )}
    </>
  );
});

export default RecentProjects;
RecentProjects.displayName = 'RecentProjects';
