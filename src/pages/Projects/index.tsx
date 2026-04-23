import { logger } from '@/utils/logger';
import React, { useState, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit3, Trash2, Play, MoreHorizontal, Grid3X3, List, Search, Video, FolderOpen, Download } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { notify } from '@/shared';
import { listProjects, deleteProject as deleteProjectFile, PROJECTS_CHANGED_EVENT } from '@/services/tauri';
import { preloadProjectDetailPage, preloadProjectEditPage, preloadVideoEditorPage } from '@/core/utils/route-preload';
import type { ProjectUIStatus, ProjectUIStats, ProjectView } from './types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const loadProjectsListView = () => import('./components/ProjectsListView');
const ProjectsListView = lazy(loadProjectsListView);

type ProjectStatusFilter = 'all' | ProjectUIStatus;

const asProjectView = (record: Record<string, unknown>): ProjectView => ({
  id: String(record.id),
  name: String(record.name || '未命名项目'),
  description: typeof record.description === 'string' ? record.description : '',
  status: (record.status === 'processing' || record.status === 'completed') ? record.status : 'draft',
  createdAt: String(record.createdAt || new Date().toISOString()),
  updatedAt: String(record.updatedAt || record.createdAt || new Date().toISOString()),
  scripts: Array.isArray(record.scripts) ? record.scripts : [],
  videos: Array.isArray(record.videos) ? record.videos : [],
  videoPath: typeof record.videoPath === 'string' ? record.videoPath : '',
});

const statusConfig: Record<ProjectUIStatus, { color: string; text: string }> = {
  draft: { color: 'secondary', text: '草稿' },
  processing: { color: 'default', text: '制作中' },
  completed: { color: 'success', text: '已完成' },
};

const ProjectManager: React.FC = () => {
  const navigate = useNavigate();
  const { settings, addRecentProject } = useSettings();
  const [projects, setProjects] = useState<ProjectView[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadProjectData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadFailed(false);
      const data = await listProjects();
      const mapped = (Array.isArray(data) ? data : [])
        .filter((item) => typeof item.id === 'string')
        .map(asProjectView);
      setProjects(mapped);
    } catch (error) {
      logger.error('加载项目列表失败:', { error });
      notify.error(error, '加载项目列表失败，请稍后重试');
      setProjects([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjectData();
    const handleProjectsChanged = () => { void loadProjectData(); };
    window.addEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);
    return () => { window.removeEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged); };
  }, [loadProjectData]);

  const getProjectUIStatus = (project: ProjectView): ProjectUIStats => {
    const scriptCount = Array.isArray(project.scripts) ? project.scripts.length : 0;
    const videoCount = Array.isArray(project.videos) && project.videos.length > 0
      ? project.videos.length
      : (project.videoPath ? 1 : 0);
    const status: ProjectUIStatus = project.status === 'completed'
      ? 'completed'
      : project.status === 'processing'
        ? 'processing'
        : 'draft';
    let progress = 0;
    if (status === 'completed') progress = 100;
    else if (status === 'processing') progress = 65;
    else if (scriptCount > 0 && videoCount > 0) progress = 45;
    else if (videoCount > 0) progress = 20;
    return { scriptCount, videoCount, status, progress };
  };

  const orderedProjects = useMemo(() => {
    const recentOrder = new Map(settings.recentProjects.map((id, index) => [id, index]));
    return [...projects].sort((a, b) => {
      const aOrder = recentOrder.get(a.id);
      const bOrder = recentOrder.get(b.id);
      if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [projects, settings.recentProjects]);

  const filteredProjects = orderedProjects.filter(p => {
    const matchSearch = !searchText || p.name.includes(searchText) || p.description?.includes(searchText);
    const uiStatus = getProjectUIStatus(p).status;
    const matchStatus = statusFilter === 'all' || uiStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const confirmDelete = async (id: string) => {
    try {
      const ok = await deleteProjectFile(id);
      if (!ok) { notify.error(null, '删除项目失败'); return; }
      notify.success('项目已删除');
      await loadProjectData();
    } catch (error) {
      logger.error('删除项目失败:', { error });
      notify.error(error, '删除项目失败，请稍后重试');
    }
    setDeleteConfirmId(null);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const projectActions = (project: ProjectView): any => [
    { key: 'edit', label: '编辑项目', icon: <Edit3 size={14} />, onClick: () => navigate(`/project/edit/${project.id}`) },
    { key: 'editor', label: '进入工作台', icon: <Play size={14} />, onClick: () => navigate(`/editor/${project.id}`) },
    { key: 'export', label: '导出', icon: <Download size={14} /> },
    { key: 'divider', type: 'divider' as const },
    { key: 'delete', label: '删除', icon: <Trash2 size={14} />, danger: true, onClick: () => setDeleteConfirmId(project.id) },
  ];

  const statusFilters: Array<{ label: string; value: number; color: string; filter: ProjectStatusFilter }> = [
    { label: '全部', value: projects.length, color: '#667eea', filter: 'all' },
    { label: '草稿', value: projects.filter(p => getProjectUIStatus(p).status === 'draft').length, color: '#8c8c8c', filter: 'draft' },
    { label: '制作中', value: projects.filter(p => getProjectUIStatus(p).status === 'processing').length, color: '#1890ff', filter: 'processing' },
    { label: '已完成', value: projects.filter(p => getProjectUIStatus(p).status === 'completed').length, color: '#52c41a', filter: 'completed' },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* 工具栏 */}
      <Card className="mb-4" style={{ padding: '12px 20px' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索项目..."
                className="w-60 pl-9"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <select
              className="h-9 w-28 px-3 rounded-md border border-input bg-background text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectStatusFilter)}
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
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 size={16} />
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
            {loadFailed && (
              <Button variant="outline" size="sm" onClick={() => { void loadProjectData(); }}>
                重试
              </Button>
            )}
            <Button
              className="bg-gradient-to-r from-[#667eea] to-[#764ba2] border-0"
              onClick={() => navigate('/project/new')}
            >
              <Plus size={16} className="mr-1" />
              新建项目
            </Button>
          </div>
        </div>
      </Card>

      {/* 项目统计 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {statusFilters.map((item, idx) => (
          <Badge
            key={idx}
            variant={statusFilter === item.filter ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1.5 text-sm"
            style={{
              background: statusFilter === item.filter ? `${item.color}15` : undefined,
              borderColor: statusFilter === item.filter ? item.color : undefined,
              color: statusFilter === item.filter ? item.color : undefined,
            }}
            onClick={() => setStatusFilter(item.filter)}
          >
            {item.label} <strong>{item.value}</strong>
          </Badge>
        ))}
      </div>

      {/* 内容区 */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* 创建项目卡片 */}
          <div
            className="rounded-xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
            style={{ height: 220 }}
            onClick={() => navigate('/project/new')}
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/10 flex items-center justify-center text-primary mb-3">
              <Plus size={22} />
            </div>
            <span className="text-primary font-medium">创建新项目</span>
          </div>

          {filteredProjects.map(project => {
            const uiStatus = getProjectUIStatus(project);
            return (
              <Card
                key={project.id}
                className="cursor-pointer overflow-hidden"
                style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge variant={uiStatus.status === 'completed' ? 'default' : uiStatus.status === 'processing' ? 'default' : 'secondary'}>
                    {statusConfig[uiStatus.status]?.text || '草稿'}
                  </Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => { void preloadProjectEditPage(); void preloadVideoEditorPage(); }}
                      >
                        <MoreHorizontal size={16} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>操作</AlertDialogTitle>
                      </AlertDialogHeader>
                      <div className="flex flex-col gap-1">
                        {projectActions(project).filter((a: any) => a.key !== 'divider').map((action: any) => (
                          <Button
                            key={action.key}
                            variant="ghost"
                            className={`justify-start ${action.danger ? 'text-destructive' : ''}`}
                            onClick={() => {
                              if (action.onClick) action.onClick();
                            }}
                          >
                            {action.icon}
                            <span className="ml-2">{action.label}</span>
                          </Button>
                        ))}
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <h5 className="font-medium truncate mb-1">{project.name}</h5>
                <p className="text-xs text-muted-foreground truncate mb-3">{project.description || '无项目描述'}</p>

                <Progress value={uiStatus.progress} className="mb-3" />

                <div className="mt-auto flex justify-between items-center">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1">
                          <Video size={12} /> {uiStatus.videoCount}
                        </TooltipTrigger>
                        <TooltipContent>视频数</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1">
                          <FolderOpen size={12} /> {uiStatus.scriptCount}
                        </TooltipTrigger>
                        <TooltipContent>脚本数</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(project.updatedAt)}</span>
                </div>
              </Card>
            );
          })}

          {filteredProjects.length === 0 && !loading && (
            <div className="col-span-24 text-center py-16 text-muted-foreground">
              暂无匹配的项目
            </div>
          )}
        </div>
      ) : (
        <Suspense fallback={<div className="text-center py-8"><Skeleton className="w-48 h-8 mx-auto" /></div>}>
          <ProjectsListView
            projects={filteredProjects}
            loading={loading}
            statusConfig={statusConfig}
            getProjectUIStatus={getProjectUIStatus}
            formatDate={formatDate}
            onOpenProject={(projectId) => {
              addRecentProject(projectId);
              navigate(`/project/${projectId}`);
            }}
            onOpenEditor={(projectId) => {
              addRecentProject(projectId);
              navigate(`/editor/${projectId}`);
            }}
            onPreloadProject={() => { void preloadProjectDetailPage(); }}
            onPreloadEditor={() => { void preloadVideoEditorPage(); }}
            projectActions={projectActions}
          />
        </Suspense>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirmId && (
        <AlertDialog open onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>删除后无法恢复，确定要删除此项目吗？</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmId(null)}>取消</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => confirmDelete(deleteConfirmId)}
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default ProjectManager;
