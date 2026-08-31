import { logger } from '@/shared/utils/logging';
import { useState, useEffect, lazy, Suspense, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '../../components/ui/drawer';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../../components/ui/tooltip';
import { Loader2, ArrowLeft, Delete, Settings, Eye, AudioLines, FileText, Scissors, LayoutDashboard } from 'lucide-react';
import { withErrorBoundary } from '@/components/common/error-boundary';

import { useAppStore } from '@/stores/app-store';
import { saveProjectToFile, loadProjectWithRetry, deleteProject } from '@/core/services/project/project-file-service';
import { getApiKey } from '@/core/services/auth/api-key-service';
import { notify } from '@/shared';
import { generateScriptWithModel, parseGeneratedScript } from '@/core/services/ai/script-service';
import { resolveLegacyModel } from '@/core/services/ai/ai-model-adapter';
import { normalizeProjectFile } from '../../core/utils/project-file';
import type { ProjectFileLike } from '../../core/utils/project-file';
import type { AIScriptDraft } from '@/core/services/ai/script-service';
import type { ScriptSegment } from '@/types';
import type { VideoAnalysis } from '@/types';
import { useProjectDetail } from '@/hooks/use-project-detail';
import styles from '@/pages/project-detail/index.module.less';

const loadVideoInfo = () => import('@/components/video-info');
const loadScriptEditor = () => import('@/components/script-editor');
const loadVideoProcessingController = () => import('@/components/video-processing-controller/video-processing-controller');
const loadVideoAnalyzer = () => import('@/components/video-analyzer/video-analyzer');
const loadSubtitleExtractor = () => import('@/components/subtitle-extractor');

const VideoInfo = lazy(loadVideoInfo);
const ScriptEditor = lazy(loadScriptEditor);
const VideoProcessingController = lazy(loadVideoProcessingController);
const VideoAnalyzer = lazy(loadVideoAnalyzer);
const SubtitleExtractor = lazy(loadSubtitleExtractor);

interface ProjectData extends ProjectFileLike<AIScriptDraft, { path?: string }> {
  id: string;
  name: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt: string;
  videoPath?: string;
  videos?: Array<{ path?: string }>;
  videoUrl?: string;
  scripts?: AIScriptDraft[];
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
  const { addRecentProject } = useAppStore();
  const selectedAIModel = useAppStore(s => s.aiSettings.selectedAIModel);
  const aiModelsSettings = useAppStore(s => s.aiSettings.aiModelsSettings);

  // Loading/legacy placeholders (kept as useState — non-migratable side-effect carriers)
  const [, setLoading] = useState(true);
  const [, setLoadError] = useState<string>('');
  const [, setCurrentStep] = useState<'analyze' | 'script' | 'voice' | 'video'>('analyze');
  // 兼容性: setCurrentStep 供 stepper 子组件调用
  void setCurrentStep;
  const [, setReloadToken] = useState(0);
  void setReloadToken;

  // All UI/data state centralized in reducer
  const {
    state,
    setActiveStep,
    setProject,
    updateProject,
    setActiveScript,
    updateActiveScriptFromSegments,
    setAiLoading,
    setDrawerVisible,
    setDeleteConfirmOpen,
  } = useProjectDetail();

  const { activeStep, project, activeScript, aiLoading, drawerVisible, deleteConfirmOpen } = state;

  const projectRef = useRef<ProjectData | null>(null);
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
    scriptPersistTimerRef.current = window.setTimeout(() => {
      // Guard against firing after unmount
      if (!mountedRef.current) return;
      void persistUpdatedProject(updatedProject);
    }, delayMs);
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

  const setProjectRef = useRef(setProject);
  setProjectRef.current = setProject;
  const setActiveScriptRef = useRef(setActiveScript);
  setActiveScriptRef.current = setActiveScript;

  useEffect(() => {
    const requestId = ++loadRequestSeqRef.current;
    const isStale = () => !mountedRef.current || requestId !== loadRequestSeqRef.current;
    if (!projectId || isStale()) return;
    setProjectRef.current(null);
    setActiveScriptRef.current(null);
    setLoading(true);
    setLoadError('');
    loadProjectWithRetry<ProjectData>(projectId, { retries: 2, retryDelayMs: 260 })
      .then((currentProject) => {
        if (isStale()) return;
        const normalizedProject = normalizeProjectFile(currentProject);
        setProjectRef.current(normalizedProject);
        addRecentProject(normalizedProject.id);
        if (normalizedProject.scripts && normalizedProject.scripts.length > 0) {
          setActiveScriptRef.current(normalizedProject.scripts[0]);
        }
      })
      .catch((error) => {
        if (isStale()) return;
        logger.error('加载项目失败:', { error });
        setLoadError(error instanceof Error ? error.message : '未知错误');
        notify.error(error, '加载项目失败，请重试');
      })
      .finally(() => { if (isStale()) return; setLoading(false); });
  }, [addRecentProject, projectId]);

  const handleDeleteProject = useCallback(() => { setDeleteConfirmOpen(true); }, [setDeleteConfirmOpen]);

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
      const newScript: AIScriptDraft = { id: crypto.randomUUID(), projectId: project.id, content: [], fullText: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      const updatedProject = { ...project, scripts: [...(project.scripts || []), newScript], updatedAt: new Date().toISOString() };
      updateProject(updatedProject);
      setActiveScript(newScript);
      notify.loading('正在保存...', 'save');
      saveProjectToFile(updatedProject.id, updatedProject).then(() => { notify.success('脚本创建成功', 'save'); }).catch(() => { notify.error(null, '保存失败', 'save'); }).finally(() => { createScriptLockRef.current = false; });
    } catch { createScriptLockRef.current = false; notify.error(null, '创建失败'); }
  }, [project, updateProject, setActiveScript]);

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
      updateProject(updatedProject);
      setActiveScript(scriptWithModelInfo);
      await saveProjectToFile(updatedProject.id, updatedProject);
      notify.success('AI脚本生成完毕✨', 'ai');
    } catch (error) { notify.error(error, '生成失败：未知错误', 'ai'); }
    finally { setAiLoading(false); generateScriptLockRef.current = false; }
  }, [aiModelsSettings, project, selectedAIModel, updateProject, setActiveScript, setAiLoading]);

  const handleAnalysisComplete = useCallback((analysis: VideoAnalysis) => {
    if (!project) return;
    const updated = { ...project, analysis };
    updateProject(updated);
    void persistUpdatedProject(updated);
    notify.success('画面识别已完成并保存');
  }, [project, updateProject]);

  const handleSubtitleExtracted = useCallback((subtitles: unknown) => {
    if (!project) return;
    const updated = { ...project, extractedSubtitles: subtitles };
    updateProject(updated);
    void persistUpdatedProject(updated);
  }, [project, updateProject]);

  const handleScriptSave = useCallback((updatedSegments: ScriptSegment[]) => {
    if (!project || !activeScript) return;
    const updatedProject: ProjectData = {
      ...project,
      scripts: (project.scripts ?? []).map((script) => script.id === activeScript.id ? { ...activeScript, content: updatedSegments as AIScriptDraft['content'], fullText: updatedSegments.map((segment) => segment.content ?? '').join('\n\n'), updatedAt: new Date().toISOString() } : script),
      updatedAt: new Date().toISOString(),
    };
    updateProject(updatedProject);
    updateActiveScriptFromSegments(updatedSegments, activeScript);
    schedulePersistUpdatedProject(updatedProject);
  }, [activeScript, project, schedulePersistUpdatedProject, updateActiveScriptFromSegments, updateProject]);

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
              <Button className="bg-accent-primary hover:bg-accent-primary-hover text-primary-foreground" onClick={handleGenerateScript} disabled={aiLoading}>{aiLoading ? '生成中...' : 'AI 一键生成'}</Button>
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
          <Button className="bg-accent-primary hover:bg-accent-primary-hover text-primary-foreground" onClick={() => notify.info('功能开发中，敬请期待！')}>即将推出</Button>
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
        <div className="flex items-center justify-between bg-[#111220] border border-white/8 rounded-xl p-4 mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger>
                <button
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
                  onClick={() => navigate('/projects')}
                  aria-label="返回项目列表"
                >
                  <ArrowLeft size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent>返回项目列表</TooltipContent>
            </Tooltip>
            <div>
              <div className="text-[10px] text-text-tertiary font-mono">工程项目中心</div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                {project.name}
                <span className="text-[10px] text-purple-400 bg-purple-950/60 border border-purple-800/40 px-2 py-0.5 rounded-full font-medium">
                  {project.updatedAt ? `更新于 ${project.updatedAt.slice(0, 10)}` : '进行中'}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 4 工坊流转步骤条 */}
            <div className="flex items-center gap-1 bg-[#18192a] p-1 rounded-lg border border-white/5">
              <button
                className="px-2.5 py-1 text-xs text-purple-300 hover:text-white rounded hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => navigate(`/asset-hub/${project.id}`)}
              >
                1. 素材拆条
              </button>
              <button
                className="px-2.5 py-1 text-xs text-purple-300 hover:text-white rounded hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => navigate(`/script-studio/${project.id}`)}
              >
                2. 剧本研磨
              </button>
              <button
                className="px-2.5 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded shadow-sm transition-colors cursor-pointer"
                onClick={() => navigate(`/workspace/${project.id}`)}
              >
                3. 剪辑工作台
              </button>
              <button
                className="px-2.5 py-1 text-xs text-purple-300 hover:text-white rounded hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => navigate(`/export-hub/${project.id}`)}
              >
                4. 消重发布
              </button>
            </div>

            <button
              className="text-xs bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white font-medium px-3 py-1.5 rounded-lg border border-white/8 flex items-center gap-1.5 transition-colors cursor-pointer"
              onClick={() => setDrawerVisible(true)}
            >
              <Settings size={13} />
              <span>属性信息</span>
            </button>
            <button
              className="text-xs bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 font-medium px-3 py-1.5 rounded-lg border border-red-800/40 flex items-center gap-1.5 transition-colors cursor-pointer"
              onClick={handleDeleteProject}
            >
              <Delete size={13} />
              <span>删除</span>
            </button>
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

export default withErrorBoundary(ProjectDetail, { name: 'ProjectDetail' });
