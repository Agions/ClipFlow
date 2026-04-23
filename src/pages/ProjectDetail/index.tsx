import { logger } from '@/utils/logger';
import React, { useState, useEffect, lazy, Suspense, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, ArrowLeft, Delete, Settings, Eye, AudioLines, FileText, Scissors, LayoutDashboard } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useModelStore } from '@/store';
import { saveProjectToFile, getApiKey, loadProjectWithRetry, deleteProject } from '@/services/tauri';
import { useSettings } from '@/context/SettingsContext';
import { notify } from '@/shared';
import { generateScriptWithModel, parseGeneratedScript } from '@/services/aiService';
import { resolveLegacyModel } from '@/services/aiModelAdapter';
import { normalizeProjectFile } from '@/core/utils/project-file';
import type { ProjectFileLike } from '@/core/utils/project-file';
import type { Script } from '@/services/aiService';
import type { ScriptSegment } from '@/core/types';
import type { VideoAnalysis } from '@/types';
import styles from './index.module.less';

const loadVideoInfo = () => import('@/components/VideoInfo');
const loadScriptEditor = () => import('@/components/ScriptEditor');
const loadVideoProcessingController = () => import('@/components/VideoProcessingController');
const loadVideoAnalyzer = () => import('@/components/VideoAnalyzer');
const loadSubtitleExtractor = () => import('@/components/SubtitleExtractor');

const VideoInfo = lazy(loadVideoInfo);
const ScriptEditor = lazy(loadScriptEditor);
const VideoProcessingController = lazy(loadVideoProcessingController);
const VideoAnalyzer = lazy(loadVideoAnalyzer);
const SubtitleExtractor = lazy(loadSubtitleExtractor);

interface ProjectData extends ProjectFileLike<Script, { path?: string }> {
  id: string;
  name: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt: string;
  videoPath?: string;
  videos?: Array<{ path?: string }>;
  videoUrl?: string;
  scripts?: Script[];
  analysis?: VideoAnalysis;
  extractedSubtitles?: unknown;
}

const StepFallback: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="animate-spin text-2xl text-muted-foreground" />
  </div>
);

const persistUpdatedProject = async (updatedProject: ProjectData) => {
  try {
    await saveProjectToFile(updatedProject.id, updatedProject);
  } catch (error) {
    notify.error(error, '项目保存失败，请重试');
  }
};

const MENU_ITEMS = [
  { key: 'analyze', icon: <Eye size={14} />, label: '画面识别' },
  { key: 'subtitle', icon: <FileText size={14} />, label: '字幕提取' },
  { key: 'script', icon: <LayoutDashboard size={14} />, label: '脚本生成' },
  { key: 'sync', icon: <AudioLines size={14} />, label: '音画同步' },
  { key: 'edit', icon: <Scissors size={14} />, label: '视频混剪' },
];

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { addRecentProject } = useSettings();
  const { selectedAIModel, aiModelsSettings } = useModelStore();
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<string>('analyze');
  const [project, setProject] = useState<ProjectData | null>(null);
  const projectRef = useRef<ProjectData | null>(null);
  const [activeScript, setActiveScript] = useState<Script | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loadError, setLoadError] = useState<string>('');
  const [reloadToken, setReloadToken] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const loadRequestSeqRef = useRef(0);
  const mountedRef = useRef(true);
  const scriptPersistTimerRef = useRef<number | null>(null);
  const createScriptLockRef = useRef(false);
  const generateScriptLockRef = useRef(false);

  useEffect(() => { projectRef.current = project; }, [project]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (scriptPersistTimerRef.current) window.clearTimeout(scriptPersistTimerRef.current);
    };
  }, []);

  const schedulePersistUpdatedProject = useCallback((updatedProject: ProjectData, delayMs = 280) => {
    if (scriptPersistTimerRef.current) window.clearTimeout(scriptPersistTimerRef.current);
    scriptPersistTimerRef.current = window.setTimeout(() => { void persistUpdatedProject(updatedProject); }, delayMs);
  }, []);

  useEffect(() => {
    switch (activeStep) {
      case 'analyze': void loadSubtitleExtractor(); break;
      case 'subtitle': void loadScriptEditor(); break;
      case 'script': void loadVideoProcessingController(); break;
      case 'edit': void loadVideoInfo(); break;
    }
  }, [activeStep]);

  useEffect(() => {
    if (activeScript) void loadScriptEditor();
  }, [activeScript]);

  useEffect(() => {
    const requestId = ++loadRequestSeqRef.current;
    const isStale = () => !mountedRef.current || requestId !== loadRequestSeqRef.current;
    if (!projectId || isStale()) return;
    setProject(null);
    setActiveScript(null);
    setLoading(true);
    setLoadError('');
    loadProjectWithRetry<ProjectData>(projectId, { retries: 2, retryDelayMs: 260 })
      .then((currentProject) => {
        if (isStale()) return;
        const normalizedProject = normalizeProjectFile(currentProject);
        setProject(normalizedProject);
        addRecentProject(normalizedProject.id);
        if (normalizedProject.scripts && normalizedProject.scripts.length > 0) setActiveScript(normalizedProject.scripts[0]);
      })
      .catch((error) => {
        if (isStale()) return;
        logger.error('加载项目失败:', { error });
        setLoadError(error instanceof Error ? error.message : '未知错误');
        notify.error(error, '加载项目失败，请重试');
      })
      .finally(() => { if (isStale()) return; setLoading(false); });
  }, [addRecentProject, projectId, reloadToken]);

  const handleDeleteProject = useCallback(() => { setDeleteConfirmOpen(true); }, []);

  const confirmDeleteProject = useCallback(async () => {
    if (!projectId) return;
    try {
      await deleteProject(projectId);
      notify.success('项目已删除');
      navigate('/projects');
    } catch { notify.error(null, '删除项目失败'); }
  }, [navigate, projectId]);

  const handleCreateScript = useCallback((): void => {
    if (!project || createScriptLockRef.current) return;
    createScriptLockRef.current = true;
    try {
      const newScript: Script = { id: uuidv4(), projectId: project.id, content: [], fullText: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      const updatedProject = { ...project, scripts: [...(project.scripts || []), newScript], updatedAt: new Date().toISOString() };
      setProject(updatedProject);
      setActiveScript(newScript);
      notify.loading('正在保存...', 'save');
      saveProjectToFile(updatedProject.id, updatedProject).then(() => { notify.success('脚本创建成功', 'save'); }).catch(() => { notify.error(null, '保存失败', 'save'); }).finally(() => { createScriptLockRef.current = false; });
    } catch { createScriptLockRef.current = false; notify.error(null, '创建失败'); }
  }, [project]);

  const handleGenerateScript = useCallback(async () => {
    if (generateScriptLockRef.current) return;
    if (!project || !project.analysis) { notify.warning('项目缺少分析数据，请先完成【画面识别】步骤'); return; }
    try {
      generateScriptLockRef.current = true;
      setAiLoading(true);
      const modelSettings = aiModelsSettings[selectedAIModel];
      if (!modelSettings?.enabled) { notify.warning(`请在设置中启用 ${selectedAIModel} 模型`); return; }
      const apiKey = await getApiKey(selectedAIModel);
      if (!apiKey) { notify.warning(`缺少 ${selectedAIModel} 的API密钥`); return; }
      notify.loading('AI正在创作脚本...', 'ai');
      const compatibleModel = resolveLegacyModel(selectedAIModel);
      const scriptText = await generateScriptWithModel(compatibleModel, apiKey, project.analysis, { style: 'informative' });
      const generatedScript = parseGeneratedScript(scriptText, project.id);
      const scriptWithModelInfo = { ...generatedScript, modelUsed: selectedAIModel };
      const updatedProject = { ...project, scripts: [...(project.scripts || []), scriptWithModelInfo], updatedAt: new Date().toISOString() };
      setProject(updatedProject);
      setActiveScript(scriptWithModelInfo);
      await saveProjectToFile(updatedProject.id, updatedProject);
      notify.success('AI脚本生成完毕✨', 'ai');
    } catch (error) { notify.error(error, '生成失败：未知错误', 'ai'); }
    finally { setAiLoading(false); generateScriptLockRef.current = false; }
  }, [aiModelsSettings, project, selectedAIModel]);

  const handleAnalysisComplete = useCallback((analysis: VideoAnalysis) => {
    if (!project) return;
    const updated = { ...project, analysis };
    setProject(updated);
    void persistUpdatedProject(updated);
    notify.success('画面识别已完成并保存');
  }, [project]);

  const handleSubtitleExtracted = useCallback((subtitles: unknown) => {
    if (!project) return;
    const updated = { ...project, extractedSubtitles: subtitles };
    setProject(updated);
    void persistUpdatedProject(updated);
  }, [project]);

  const handleScriptSave = useCallback((updatedSegments: ScriptSegment[]) => {
    if (!project || !activeScript) return;
    const updatedScript: Script = { ...activeScript, content: updatedSegments as Script['content'], fullText: updatedSegments.map((segment) => segment.content ?? '').join('\n\n'), updatedAt: new Date().toISOString() };
    const updatedProject = { ...project, scripts: (project.scripts ?? []).map((script) => script.id === activeScript.id ? updatedScript : script), updatedAt: new Date().toISOString() };
    setActiveScript(updatedScript);
    setProject(updatedProject);
    schedulePersistUpdatedProject(updatedProject);
  }, [activeScript, project, schedulePersistUpdatedProject]);

  const contentNode = useMemo((): React.ReactNode => {
    if (!project) return null;
    switch (activeStep) {
      case 'analyze': return <Suspense fallback={<StepFallback />}><VideoAnalyzer projectId={project.id} videoUrl={project.videoUrl} onAnalysisComplete={handleAnalysisComplete} /></Suspense>;
      case 'subtitle': return <Suspense fallback={<StepFallback />}><SubtitleExtractor projectId={project.id} videoUrl={project.videoUrl} onExtracted={handleSubtitleExtracted} /></Suspense>;
      case 'script': return (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">AI驱动脚本编辑</h2>
            <div className="flex gap-2">
              <Button className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white" onClick={handleGenerateScript} disabled={aiLoading}>{aiLoading ? '生成中...' : 'AI 一键生成'}</Button>
              <Button variant="outline" onClick={handleCreateScript}>新建空脚本</Button>
            </div>
          </div>
          {activeScript ? (
            <Suspense fallback={<StepFallback />}><ScriptEditor videoPath={project.videoUrl ?? ''} initialSegments={activeScript.content} onSave={handleScriptSave} /></Suspense>
          ) : (
            <div className="text-center py-12 text-muted-foreground">暂无脚本，请点击上方按钮生成或创建</div>
          )}
        </div>
      );
      case 'sync': return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AudioLines size={48} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold">全自动音画同步引擎</h3>
          <p className="text-muted-foreground">结合TTS合成声音与画面关键帧自动对齐，提供影院级配音体验。</p>
          <Button className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white" onClick={() => notify.info('功能开发中，敬请期待！')}>即将推出</Button>
        </div>
      );
      case 'edit': if (!activeScript) return null; return <Suspense fallback={<StepFallback />}><VideoProcessingController videoPath={project.videoUrl ?? ''} segments={activeScript.content.map(s => ({ start: s.startTime, end: s.endTime, type: s.type, content: s.content }))} /></Suspense>;
      default: return null;
    }
  }, [activeStep, activeScript, project, handleAnalysisComplete, handleSubtitleExtracted, handleGenerateScript, handleCreateScript, handleScriptSave, aiLoading]);

  if (!project) return null;

  return (
    <TooltipProvider>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}><ArrowLeft size={16} /></Button>
              </TooltipTrigger>
              <TooltipContent>返回项目列表</TooltipContent>
            </Tooltip>
            <div>
              <div className="text-xs text-muted-foreground">当前工作区</div>
              <h1 className="text-xl font-bold">{project.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setDrawerVisible(true)}><Settings size={14} className="mr-1" />项目信息</Button>
            <Button variant="destructive" onClick={handleDeleteProject}><Delete size={14} className="mr-1" />删除</Button>
          </div>
        </div>

        <div className={styles.workflowContainer}>
          <div className={styles.sidebar}>
            <Card className="p-2">
              <div className="flex flex-col gap-1">
                {MENU_ITEMS.map(item => (
                  <Button
                    key={item.key}
                    variant={activeStep === item.key ? 'secondary' : 'ghost'}
                    className="justify-start"
                    onClick={() => setActiveStep(item.key)}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Button>
                ))}
              </div>
            </Card>
          </div>

          <div className={styles.contentArea}>
            <div className={styles.activeContent}>{contentNode}</div>
          </div>
        </div>

        <Drawer open={drawerVisible} onOpenChange={setDrawerVisible}>
          <DrawerContent>
            <DrawerHeader><DrawerTitle>详细信息与媒体属性</DrawerTitle></DrawerHeader>
            <div className="px-4 pb-4">
              {project.description && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold mb-1">项目描述</h4>
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                </div>
              )}
              <Suspense fallback={<StepFallback />}>
                <VideoInfo name={project.name} path={project.videoUrl} duration={project.analysis?.duration || 0} />
              </Suspense>
            </div>
            <DrawerFooter>
              <Button variant="outline" onClick={() => setDrawerVisible(false)}>关闭</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">确定要删除此项目吗？此操作不可撤销。</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>取消</Button>
              <Button onClick={confirmDeleteProject}>删除</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default ProjectDetail;
