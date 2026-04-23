/**
 * ProjectEdit — 项目编辑页
 *
 * 结构：
 *   components/steps/   — 三个步骤组件（VideoStep / AnalyzeStep / ScriptStep）
 *   hooks/              — useProjectAutoSave auto-save 逻辑
 *   projectEditUtils.ts — 纯工具函数
 *   index.tsx           — 主组件（状态编排）
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Spin } from '@/components/ui/spin';
import { Button } from '@/components/ui/button';
import { Steps } from '@/components/ui/steps';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Video, Edit, CheckCircle } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

import { VideoMetadata, analyzeVideo, extractKeyFrames } from '@/services/video';
import type { ScriptSegment } from '@/core/types';
import { generateScriptWithAI, analyzeKeyFramesWithAI } from '@/services/aiService';
import { loadProjectWithRetry, saveProjectToFile } from '@/services/tauri';
import { notify } from '@/shared';
import { useSettings } from '@/context/SettingsContext';
import { v4 as uuid } from 'uuid';
import { logger } from '@/utils/logger';

import { VideoStep } from './components/steps/VideoStep';
import { AnalyzeStep } from './components/steps/AnalyzeStep';
import { ScriptStep } from './components/steps/ScriptStep';
import { useProjectAutoSave } from './hooks/useProjectAutoSave';
import {
  type ProjectData,
  type ProjectSaveBehavior,
  PROJECT_SAVE_BEHAVIOR_KEY,
  PROJECT_AUTO_SAVE_KEY,
  normalizeProjectData,
  createDefaultProjectName,
  buildDraftFingerprint,
  parseScriptText,
} from './projectEditUtils';

import styles from './index.module.less';



const STEP_ITEMS = [
  { title: '选择视频', icon: <Video size={18} />, description: '上传视频文件' },
  { title: '分析内容', icon: <Edit size={18} />, description: '分析视频生成脚本' },
  { title: '编辑脚本', icon: <CheckCircle size={18} />, description: '编辑和优化脚本' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────
interface ProjectEditHeaderProps {
  isNewProject: boolean;
  loading: boolean;
  initialLoading: boolean;
  saving: boolean;
  saveBehavior: ProjectSaveBehavior;
  autoSaveEnabled: boolean;
  onBack: () => void;
  onSave: () => void;
  onSaveBehaviorChange: (v: ProjectSaveBehavior) => void;
  onAutoSaveToggle: (checked: boolean) => void;
}

const ProjectEditHeader = React.memo<ProjectEditHeaderProps>(({
  isNewProject, loading, initialLoading, saving, saveBehavior,
  autoSaveEnabled, onBack, onSave, onSaveBehaviorChange, onAutoSaveToggle,
}) => (
  <div className={styles.header}>
    <Button variant="ghost" icon={<ArrowLeft />} onClick={onBack}>返回</Button>
    <h3 className="text-base font-semibold">{isNewProject ? '创建新项目' : '编辑项目'}</h3>
    <div className="flex items-center gap-4">
      <div className={styles.saveBehaviorControl}>
        <span className={styles.saveBehaviorLabel}>保存后：</span>
        <Select value={saveBehavior} onValueChange={onSaveBehaviorChange as any}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stay">留在编辑页</SelectItem>
            <SelectItem value="detail">跳转项目详情</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className={styles.saveBehaviorControl}>
        <span className={styles.saveBehaviorLabel}>自动保存：</span>
        <Switch size="sm" checked={autoSaveEnabled} onCheckedChange={onAutoSaveToggle} />
      </div>
      <Button
        variant="primary" icon={<Save />} onClick={onSave}
        loading={saving} disabled={loading || initialLoading}
      >
        保存项目
      </Button>
    </div>
  </div>
));

ProjectEditHeader.displayName = 'ProjectEditHeader';

// ─────────────────────────────────────────────────────────────────────────────
// AutoSave badge
// ─────────────────────────────────────────────────────────────────────────────
const AutoSaveBadge = React.memo<{
  enabled: boolean;
  videoPath: string;
  state: 'idle' | 'saving' | 'saved' | 'error';
  lastAt: string;
}>(({ enabled, videoPath, state, lastAt }) => {
  if (!enabled) return <Badge variant="secondary">自动保存已关闭</Badge>;
  if (!videoPath) return <Badge variant="secondary">未开始自动保存</Badge>;
  if (state === 'saving') return <Badge variant="default">草稿自动保存中...</Badge>;
  if (state === 'saved') return <Badge variant="default">{lastAt ? `草稿已保存 ${lastAt}` : '草稿已保存'}</Badge>;
  if (state === 'error') return <Badge variant="destructive">草稿保存失败</Badge>;
  return <Badge variant="secondary">自动保存待触发</Badge>;
});

AutoSaveBadge.displayName = 'AutoSaveBadge';

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const ProjectEdit: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addRecentProject } = useSettings();
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [videoPath, setVideoPath] = useState('');
  const [videoSelected, setVideoSelected] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [keyFrames, setKeyFrames] = useState<string[]>([]);
  const [scriptSegments, setScriptSegments] = useState<ScriptSegment[]>([]);
  const [isNewProject, setIsNewProject] = useState(true);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultProjectName] = useState(createDefaultProjectName);
  const [saveBehavior, setSaveBehavior] = useState<ProjectSaveBehavior>(() => {
    try { return localStorage.getItem(PROJECT_SAVE_BEHAVIOR_KEY) === 'detail' ? 'detail' : 'stay'; }
    catch { return 'stay'; }
  });
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(PROJECT_AUTO_SAVE_KEY) === '1'; }
    catch { return false; }
  });
  const [reloadToken, setReloadToken] = useState(0);

  // Refs
  const persistLockRef = useRef(false);
  const analyzingLockRef = useRef(false);
  const draftProjectIdRef = useRef<string>(projectId || '');
  const recentProjectTrackedRef = useRef('');
  const mountedRef = useRef(true);
  const reloadSeqRef = useRef(0);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Auto-save ────────────────────────────────────────────────────────────
  const getProjectData = useCallback((): ProjectData => {
    const name = formName;
    const description = formDescription;
    const now = new Date().toISOString();
    return {
      id: project?.id || draftProjectIdRef.current || uuid(),
      name: (name || '').trim() || defaultProjectName,
      description: (description || '').trim(),
      videoPath,
      videoUrl: videoPath || undefined,
      videos: videoPath ? [{ path: videoPath }] : [],
      createdAt: project?.createdAt || now,
      updatedAt: now,
      metadata: videoMetadata || undefined,
      keyFrames: keyFrames.length > 0 ? keyFrames : undefined,
      script: scriptSegments.length > 0 ? scriptSegments : undefined,
    };
  }, [project, videoPath, videoMetadata, keyFrames, scriptSegments, defaultProjectName, formName, formDescription]);

  const persistProject = useCallback(async (opts = { silent: false, requireVideo: true, requireValidName: true }) => {
    const { silent, requireVideo, requireValidName } = opts;

    if (requireVideo && !videoPath) {
      if (!silent) notify.error(null, '请先选择视频文件');
      return null;
    }
    const nameVal = (formName || '').trim();
    if (requireValidName && nameVal && nameVal.length < 2) {
      if (!silent) notify.error(null, '项目名称至少2个字符');
      return null;
    }
    if (persistLockRef.current) {
      if (!silent) notify.info('正在保存，请稍候');
      return null;
    }

    persistLockRef.current = true;
    try {
      const data = getProjectData();
      await saveProjectToFile(data.id, data);
      if (recentProjectTrackedRef.current !== data.id) {
        addRecentProject(data.id);
        recentProjectTrackedRef.current = data.id;
      }
      setProject(data);
      if (!silent) notify.success('项目保存成功');
      return data;
    } finally {
      persistLockRef.current = false;
    }
  }, [addRecentProject, getProjectData, videoPath]);

  const { autoSaveState, lastAutoSaveAt, scheduleAutoSave, setAutoSaveState } = useProjectAutoSave({
    enabled: autoSaveEnabled,
    videoPath,
    getProjectData,
    onPersist: persistProject,
    initialLoading,
    loading,
    saving,
  });

  // ─── Project loading ────────────────────────────────────────────────────────
  useEffect(() => {
    const seq = ++reloadSeqRef.current;
    const stale = () => !mountedRef.current || seq !== reloadSeqRef.current;

    if (!projectId) {
      if (stale()) return;
      setIsNewProject(true); setProject(null); setError(null);
      setInitialLoading(false); setCurrentStep(0);
      setVideoSelected(false); setVideoPath(''); setVideoMetadata(null);
      setKeyFrames([]); setScriptSegments([]);
      draftProjectIdRef.current = '';
      setFormName(defaultProjectName);
      setFormDescription('');
      return;
    }

    if (stale()) return;
    setInitialLoading(true); setIsNewProject(false); setError(null);

    loadProjectWithRetry<ProjectData>(projectId, { retries: 2, retryDelayMs: 260 })
      .then((data) => {
        if (stale()) return;
        const p = normalizeProjectData(data);
        draftProjectIdRef.current = p.id;
        setProject(p);
        setFormName(p.name);
        setFormDescription(p.description || '');
        if (p.videoPath) { setVideoPath(p.videoPath); setVideoSelected(true); }
        if (p.metadata) setVideoMetadata(p.metadata);
        if (p.keyFrames?.length) setKeyFrames(p.keyFrames);
        if (p.script?.length) { setScriptSegments(p.script); setCurrentStep(2); }
        else if (p.videoPath) setCurrentStep(1);
      })
      .catch((e: unknown) => {
        if (stale()) return;
        logger.error('加载项目失败:', { error: e });
        const msg = e instanceof Error ? e.message : String(e);
        setError(`加载项目失败：${msg}`);
        notify.error(e, '加载项目失败，请返回项目列表后重试');
      })
      .finally(() => { if (!stale()) setInitialLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, reloadToken]);

  // Trigger auto-save on relevant state changes
  useEffect(() => { scheduleAutoSave(); }, [scheduleAutoSave]);

  // ─── Step navigation ───────────────────────────────────────────────────────
  const canAccessStep = useCallback((step: number) => {
    if (step <= 0) return true;
    if (step === 1) return Boolean(videoPath);
    if (step === 2) return Boolean(videoPath && (scriptSegments.length > 0 || keyFrames.length > 0 || videoMetadata));
    return false;
  }, [videoPath, scriptSegments.length, keyFrames.length, videoMetadata]);

  const goToStep = useCallback((step: number) => {
    if (canAccessStep(step)) { setCurrentStep(step); return; }
    if (step > 0 && !videoPath) { notify.warning('请先选择视频后再继续。'); return; }
    if (step > 1) notify.warning('请先完成视频分析后再进入脚本编辑。');
  }, [canAccessStep, videoPath]);

  // ─── Video handlers ─────────────────────────────────────────────────────────
  const handleVideoSelect = useCallback((filePath: string, metadata?: VideoMetadata) => {
    if (filePath === videoPath && videoSelected) {
      if (metadata && metadata !== videoMetadata) setVideoMetadata(metadata);
      return;
    }
    setVideoPath(filePath);
    setVideoSelected(true);
    if (metadata) setVideoMetadata(metadata);
    if (currentStep === 0) goToStep(1);
  }, [currentStep, goToStep, videoMetadata, videoPath, videoSelected]);

  const handleVideoRemove = useCallback(() => {
    setVideoPath(''); setVideoSelected(false); setVideoMetadata(null);
    setKeyFrames([]); setScriptSegments([]); setCurrentStep(0);
  }, []);

  // ─── Analyze ────────────────────────────────────────────────────────────────
  const handleAnalyzeVideo = useCallback(async () => {
    if (loading || analyzingLockRef.current || !videoPath) {
      if (!videoPath) notify.error(null, '请先选择视频');
      return;
    }

    analyzingLockRef.current = true;
    let stage: 'metadata' | 'keyframes' | 'frames-ai' | 'script' = 'metadata';

    try {
      setLoading(true);

      let meta = videoMetadata;
      if (!meta) {
        stage = 'metadata';
        notify.info('正在分析视频元数据...');
        meta = await analyzeVideo(videoPath);
        setVideoMetadata(meta);
      }

      stage = 'keyframes';
      notify.info('正在提取关键帧...');
      const frames = await extractKeyFrames(videoPath);
      const paths = frames.map((f) => f.path);
      if (paths.length === 0) throw new Error('未提取到关键帧，请尝试更换视频或检查视频时长');
      setKeyFrames(paths);

      stage = 'frames-ai';
      notify.info('正在分析关键帧内容...');
      const descriptions = await analyzeKeyFramesWithAI(paths);

      stage = 'script';
      notify.info('正在根据视频内容生成脚本...');
      const text = await generateScriptWithAI(meta, descriptions, {
        style: '自然流畅', tone: '专业', length: 'medium', purpose: '内容展示',
      });

      let script = parseScriptText(text);
      if (script.length === 0) {
        script = [{
          id: `segment_${Date.now()}`,
          startTime: 0,
          endTime: Math.max(10, Math.round(meta?.duration || 10)),
        }];
      }

      setScriptSegments(script);
      notify.success('视频分析完成');
      goToStep(2);
    } catch (e: unknown) {
      logger.error('视频分析失败:', { error: e });
      const msg = e instanceof Error ? e.message : '未知错误';
      const labels = { metadata: '视频元数据分析', keyframes: '关键帧提取', 'frames-ai': '关键帧内容理解', script: '脚本生成' };
      const label = labels[stage];
      notify.error(e, msg.includes('失败') ? msg : `${label}失败：${msg}`);
    } finally {
      setLoading(false);
      analyzingLockRef.current = false;
    }
  }, [loading, videoMetadata, videoPath, goToStep]);

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSaveProject = useCallback(async () => {
    if (saving) return;
    const nameVal = (formName || '').trim();
    if (nameVal && nameVal.length < 2) {
      notify.error(null, '项目名称至少2个字符');
      return;
    }
    try {
      setSaving(true);
      const data = await persistProject({ silent: false, requireVideo: true, requireValidName: true });
      if (!data) return;

      const shouldDetail = saveBehavior === 'detail';
      const shouldBindId = Boolean(!projectId && isNewProject);
      const target = shouldDetail ? `/project/${data.id}` : `/project/edit/${data.id}`;

      if (shouldBindId || shouldDetail) {
        setIsNewProject(false);
        if (location.pathname !== target) navigate(target, { replace: true });
      }
    } catch (e) {
      logger.error('保存项目失败:', { error: e });
      notify.error(e, '保存项目失败，请稍后再试');
    } finally {
      setSaving(false);
    }
  }, [formName, isNewProject, location.pathname, navigate, persistProject, projectId, saveBehavior, saving]);

  const handleBack = () => {
    if (window.history.length > 1) { navigate(-1); return; }
    navigate('/projects');
  };

  const handleSaveBehaviorChange = (v: ProjectSaveBehavior) => {
    setSaveBehavior(v);
    try { localStorage.setItem(PROJECT_SAVE_BEHAVIOR_KEY, v); } catch { /* ignore */ }
  };

  const handleAutoSaveToggle = (checked: boolean) => {
    setAutoSaveEnabled(checked);
    if (!checked) setAutoSaveState('idle');
    try { localStorage.setItem(PROJECT_AUTO_SAVE_KEY, checked ? '1' : '0'); } catch { /* ignore */ }
  };

  const handleExportScript = (format: string) => notify.info(`导出脚本为 ${format.toUpperCase()} 格式`);

  const handleFormValuesChange = () => scheduleAutoSave();

  // ─── Render ────────────────────────────────────────────────────────────────
  if (error) {
    const actions = [<Button key="back" onClick={handleBack}>返回</Button>];
    if (projectId) actions.unshift(
      <Button key="retry" variant="primary" type="button" onClick={() => setReloadToken((v) => v + 1)}>重试</Button>
    );
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">加载失败</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">{actions}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Spin spinning={initialLoading} tip="加载项目中...">
        <ProjectEditHeader
          isNewProject={isNewProject} loading={loading} initialLoading={initialLoading}
          saving={saving} saveBehavior={saveBehavior} autoSaveEnabled={autoSaveEnabled}
          onBack={handleBack} onSave={handleSaveProject}
          onSaveBehaviorChange={handleSaveBehaviorChange} onAutoSaveToggle={handleAutoSaveToggle}
        />

        <div className={styles.autoSaveStatus}>
          <AutoSaveBadge enabled={autoSaveEnabled} videoPath={videoPath} state={autoSaveState} lastAt={lastAutoSaveAt} />
        </div>

        <Card className={styles.card}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">项目名称</label>
              <Input
                placeholder="请输入项目名称"
                maxLength={100}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">项目描述</label>
              <textarea
                className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
                placeholder="请输入项目描述（选填）"
                rows={2}
                maxLength={500}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <div className={styles.stepsContainer}>
          <Steps current={currentStep} onChange={goToStep} items={STEP_ITEMS} />
        </div>

        <div className={styles.stepsContent}>
          {currentStep === 0 && (
            <VideoStep
              videoPath={videoPath} videoSelected={videoSelected} loading={loading}
              onVideoSelect={handleVideoSelect} onVideoRemove={handleVideoRemove}
              onNext={() => goToStep(1)}
            />
          )}
          {currentStep === 1 && (
            <AnalyzeStep
              videoPath={videoPath} keyFrames={keyFrames} scriptSegmentsCount={scriptSegments.length}
              loading={loading}
              onVideoSelect={handleVideoSelect} onVideoRemove={handleVideoRemove}
              onAnalyze={handleAnalyzeVideo}
              onPrev={() => goToStep(0)} onNext={() => goToStep(2)}
            />
          )}
          {currentStep === 2 && (
            <ScriptStep
              videoPath={videoPath} initialSegments={scriptSegments}
              saving={saving} loading={loading}
              onSave={setScriptSegments} onExport={handleExportScript}
              onPrev={() => goToStep(1)} onSaveProject={handleSaveProject}
            />
          )}
        </div>
      </Spin>
    </div>
  );
};

export default ProjectEdit;
