import { logger } from '@/utils/logger';
import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Save, Trash2, Download, Bot, Loader2 } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { notify } from '@/shared';
import { exportScriptToFile, saveProjectToFile, loadProjectWithRetry, listProjects } from '@/services/tauri';
import { findProjectByScriptId, normalizeProjectFile } from '@/core/utils/project-file';
import type { ProjectFileLike } from '@/core/utils/project-file';
import type { Script } from '@/services/aiService';
import type { ScriptSegment } from '@/core/types';
import styles from './index.module.less';

const loadScriptEditor = () => import('@/components/ScriptEditor');
const ScriptEditor = lazy(loadScriptEditor);

interface ProjectWithScripts extends ProjectFileLike<Script, { path?: string }> {
  id: string;
  name: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt: string;
  scripts?: Script[];
  videoPath?: string;
  videos?: Array<{ path?: string }>;
  videoUrl?: string;
}

const ScriptDetail: React.FC = () => {
  const { projectId, scriptId } = useParams<{ projectId: string; scriptId: string }>();
  const navigate = useNavigate();
  const { addRecentProject } = useSettings();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectWithScripts | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [segments, setSegments] = useState<ScriptSegment[]>([]);
  const [loadError, setLoadError] = useState<string>('');
  const [reloadToken, setReloadToken] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const loadRequestSeqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const requestId = ++loadRequestSeqRef.current;
    const isStale = () => !mountedRef.current || requestId !== loadRequestSeqRef.current;

    if (!scriptId) {
      if (isStale()) return;
      setProject(null);
      setScript(null);
      setSegments([]);
      setLoadError('参数错误：缺少脚本ID');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        if (isStale()) return;
        setProject(null);
        setScript(null);
        setSegments([]);
        setLoading(true);
        setLoadError('');
        let currentProject: ProjectWithScripts | undefined;
        if (projectId) {
          currentProject = await loadProjectWithRetry(projectId, { retries: 2, retryDelayMs: 260 }) as ProjectWithScripts | undefined;
        } else {
          const allProjects = await listProjects() as unknown as ProjectFileLike<{ id: string }, { path?: string }>[];
          currentProject = findProjectByScriptId(allProjects, scriptId) as ProjectWithScripts | undefined;
        }

        if (!currentProject) {
          if (isStale()) return;
          setLoadError('找不到所属项目');
          return;
        }

        const normalizedProject = normalizeProjectFile(currentProject);
        const currentScript = normalizedProject.scripts?.find((s) => s.id === scriptId);
        if (!currentScript) {
          if (isStale()) return;
          setLoadError('找不到脚本，请确认脚本是否已被删除');
          return;
        }

        if (isStale()) return;
        setProject(normalizedProject);
        setScript(currentScript);
        setSegments(currentScript?.content ?? []);
        addRecentProject(normalizedProject.id);
      } catch (error) {
        if (isStale()) return;
        logger.error('加载脚本详情失败:', { error });
        const detail = error instanceof Error ? error.message : '未知错误';
        setLoadError(detail);
        notify.error(error, '加载脚本失败，请重试');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [addRecentProject, projectId, scriptId, reloadToken]);

  useEffect(() => {
    if (!loading && project && script) {
      void loadScriptEditor();
    }
  }, [loading, project, script]);

  const handleSegmentsChange = (newSegments: ScriptSegment[]) => {
    setSegments(newSegments);
  };

  const handleSave = async () => {
    if (!project || !script || isSaving || isDeleting) return;
    try {
      setIsSaving(true);
      const updatedScript = {
        ...script,
        content: segments,
        fullText: segments.map((segment) => (segment.content ?? '')).join('\n\n'),
        updatedAt: new Date().toISOString()
      } as Script;
      const updatedScripts: Script[] = (project.scripts ?? []).map((s) => s.id === script.id ? updatedScript : s);
      const updatedProject = { ...project, scripts: updatedScripts, updatedAt: new Date().toISOString() };
      setProject(updatedProject);
      setScript(updatedScript);
      await saveProjectToFile(updatedProject.id, updatedProject);
      notify.success('保存成功');
    } catch (error) {
      logger.error('保存失败:', { error });
      notify.error(error, '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (!project || !script || isExporting || isDeleting) return;
    try {
      setIsExporting(true);
      await exportScriptToFile(
        { projectName: project.name, createdAt: script.createdAt, segments: segments.map((s) => ({ startTime: s.startTime, endTime: s.endTime, content: s.content ?? '' })) },
        `${project.name}_脚本_${new Date().toISOString().slice(0, 10)}.txt`
      );
      notify.success('导出成功');
    } catch (error) {
      logger.error('导出脚本失败:', { error });
      notify.error(error, '导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!project || !script) return;
    try {
      setIsDeleting(true);
      const updatedScripts = (project.scripts ?? []).filter((s) => s.id !== script.id);
      const updatedProject = { ...project, scripts: updatedScripts, updatedAt: new Date().toISOString() };
      await saveProjectToFile(updatedProject.id, updatedProject);
      notify.success('删除成功');
      navigate(`/project/${project.id}`);
    } catch (error) {
      logger.error('删除脚本失败:', { error });
      notify.error(error, '删除失败');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-2xl text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">加载中...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-destructive text-lg font-medium">加载脚本失败</div>
        <div className="text-muted-foreground text-sm">{loadError}</div>
        <div className="flex gap-2">
          <Button onClick={() => setReloadToken((v) => v + 1)}>重试</Button>
          {projectId ? <Button variant="outline" onClick={() => navigate(`/project/${projectId}`)}>返回项目</Button> : null}
          <Button variant="outline" onClick={() => navigate('/projects')}>返回项目列表</Button>
        </div>
      </div>
    );
  }

  if (!project || !script) {
    return <div className="text-center py-20 text-muted-foreground">资源不存在</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate(`/project/${project.id}`)}>
            <ArrowLeft size={16} className="mr-1" />
            返回项目
          </Button>
          <Button className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white" onClick={handleSave} disabled={isSaving || isDeleting}>
            <Save size={14} className="mr-1" />
            {isSaving ? '保存中...' : '保存'}
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={segments.length === 0 || isSaving || isDeleting}>
            <Download size={14} className="mr-1" />
            {isExporting ? '导出中...' : '导出'}
          </Button>
          <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)} disabled={isSaving || isExporting}>
            <Trash2 size={14} className="mr-1" />
            {isDeleting ? '删除中...' : '删除'}
          </Button>
        </div>
      </div>

      <Card className={styles.infoCard + ' p-4 mb-4'}>
        <h2 className="text-lg font-semibold mb-2">{project.name} - 脚本编辑</h2>
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <span className="text-xs text-muted-foreground">创建于 {new Date(script.createdAt).toLocaleString()}</span>
          {script.modelUsed && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Bot size={10} />
              由 {script.modelUsed} 生成
            </Badge>
          )}
        </div>
        <Separator className="my-3" />
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>片段数量: {segments.length}</span>
          <span>总时长: {segments.reduce((total, seg) => total + (seg.endTime - seg.startTime), 0)} 秒</span>
        </div>
      </Card>

      <div className={styles.editorContainer}>
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-2xl text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">编辑器加载中...</span>
          </div>
        }>
          <ScriptEditor
            videoPath={project.videoUrl ?? ''}
            initialSegments={segments}
            onSave={handleSegmentsChange}
          />
        </Suspense>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">确定要删除这个脚本吗？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>取消</Button>
            <Button onClick={handleDeleteConfirm}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScriptDetail;
