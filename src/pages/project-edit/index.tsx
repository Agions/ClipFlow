/**
 * ProjectEdit — 项目快速创建/编辑页（Sprint 1 重构版）
 *
 * 改造要点：
 *   - 废弃 3 步向导（视频→分析→剧本），统一为"单屏快速表单"
 *   - 保留：ProjectForm（名称/描述）+ VideoSelector（原片导入）
 *   - 移除：AnalyzeStep（移入 Asset Hub）、ScriptStep（移入 Script Studio）
 *   - 保存后固定直达 asset-hub/:projectId，确保流程线性贯通
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Spin } from '@/components/ui/spin';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, Video, ChevronRight, Zap } from 'lucide-react';
import { withErrorBoundary } from '@/components/common/error-boundary';

import type { VideoMetadata } from '@/core/video';
import { loadProjectWithRetry, saveProjectToFile } from '@/core/services/project/project-file-service';
import { notify } from '@/shared';
import { useAppStore } from '@/stores/app-store';
import { logger } from '@/shared/utils/logging';

import { AutoSaveBadge } from './components/auto-save-badge';
import { ProjectForm } from './components/project-form';
import { useProjectAutoSave } from './hooks/use-project-auto-save';
import { useProjectEditState } from './hooks/use-project-edit-state';
import VideoSelector from '@/components/video-selector/video-selector';
import {
  type ProjectData,
  normalizeProjectData,
  createDefaultProjectName,
} from './project-edit-utils';
import {
  PROJECT_AUTO_SAVE_KEY,
} from '@/shared/constants/constants';

import styles from '@/pages/project-edit/index.module.less';

const ProjectEdit: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addRecentProject } = useAppStore();

  const [defaultProjectName] = useState(createDefaultProjectName);
  const {
    formName, setFormName,
    formDescription, setFormDescription,
    saving, setSaving,
    project, setProject,
    videoPath, setVideoPath,
    videoSelected, setVideoSelected,
    videoMetadata, setVideoMetadata,
    isNewProject, setIsNewProject,
    initialLoading, setInitialLoading,
    error, setError,
    autoSaveEnabled, setAutoSaveEnabled,
    reloadToken, setReloadToken,
  } = useProjectEditState({ defaultProjectName });

  // Refs
  const persistLockRef = useRef(false);
  const draftProjectIdRef = useRef<string>(projectId || '');
  const recentProjectTrackedRef = useRef('');
  const mountedRef = useRef(true);
  const reloadSeqRef = useRef(0);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Project data factory ───────────────────────────────────────────────────
  const getProjectData = useCallback((): ProjectData => {
    const now = new Date().toISOString();
    return {
      id: project?.id || draftProjectIdRef.current || crypto.randomUUID(),
      name: (formName || '').trim() || defaultProjectName,
      description: (formDescription || '').trim(),
      videoPath,
      videoUrl: videoPath || undefined,
      videos: videoPath ? [{ path: videoPath }] : [],
      createdAt: project?.createdAt || now,
      updatedAt: now,
      metadata: videoMetadata || undefined,
    };
  }, [project, videoPath, videoMetadata, defaultProjectName, formName, formDescription]);

  // ─── Persist ────────────────────────────────────────────────────────────────
  const persistProject = useCallback(async (opts = { silent: false, requireVideo: true, requireValidName: true }) => {
    const { silent, requireVideo, requireValidName } = opts;
    if (requireVideo && !videoPath) {
      if (!silent) notify.error(null, '请先导入原片视频文件');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addRecentProject, getProjectData, videoPath, notify, formName]);

  const { autoSaveState, lastAutoSaveAt, scheduleAutoSave, setAutoSaveState } = useProjectAutoSave({
    enabled: autoSaveEnabled,
    videoPath,
    getProjectData,
    onPersist: persistProject,
    initialLoading,
    loading: false,
    saving,
  });

  // ─── Project loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    const seq = ++reloadSeqRef.current;
    const stale = () => !mountedRef.current || seq !== reloadSeqRef.current;

    if (!projectId) {
      if (stale()) return;
      setIsNewProject(true); setProject(null); setError(null);
      setInitialLoading(false);
      setVideoPath(''); setVideoSelected(false); setVideoMetadata(null);
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
        const normalized = normalizeProjectData(data);
        draftProjectIdRef.current = normalized.id;
        setProject(normalized);
        setFormName(normalized.name || '');
        setFormDescription(normalized.description || '');
        const p = normalized as unknown as Record<string, unknown>;
        const vPath = (p.videoPath as string) || (p.videoUrl as string) || '';
        if (vPath) { setVideoPath(vPath); setVideoSelected(true); }
      })
      .catch((err) => {
        if (stale()) return;
        logger.error('加载项目失败:', { error: err });
        setError(err instanceof Error ? err.message : '加载项目文件失败');
      })
      .finally(() => { if (!stale()) setInitialLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, reloadToken]);

  useEffect(() => { scheduleAutoSave(); }, [scheduleAutoSave]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleVideoSelect = useCallback((filePath: string, metadata?: VideoMetadata) => {
    setVideoPath(filePath);
    setVideoSelected(true);
    if (metadata) setVideoMetadata(metadata);
  }, [setVideoPath, setVideoSelected, setVideoMetadata]);

  const handleVideoRemove = useCallback(() => {
    setVideoPath(''); setVideoSelected(false); setVideoMetadata(null);
  }, [setVideoPath, setVideoSelected, setVideoMetadata]);

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
      setIsNewProject(false);
      // 固定直达素材拆条工坊，与新版流程对齐
      const target = `/asset-hub/${data.id}`;
      if (location.pathname !== target) {
        navigate(target, { replace: isNewProject });
      }
    } catch (e) {
      logger.error('保存项目失败:', { error: e });
      notify.error(e, '保存项目失败，请稍后再试');
    } finally {
      setSaving(false);
    }
  }, [formName, isNewProject, location.pathname, navigate, persistProject, saving, setIsNewProject, setSaving]);

  const handleBack = () => {
    if (window.history.length > 1) { navigate(-1); return; }
    navigate('/projects');
  };

  const handleAutoSaveToggle = (checked: boolean) => {
    setAutoSaveEnabled(checked);
    if (!checked) setAutoSaveState('idle');
    try { localStorage.setItem(PROJECT_AUTO_SAVE_KEY, checked ? '1' : '0'); } catch { /* ignore */ }
  };

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">加载失败</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            {projectId && (
              <Button variant="default" type="button" onClick={() => setReloadToken((v) => v + 1)}>重试</Button>
            )}
            <Button onClick={handleBack}>返回</Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <Spin spinning={initialLoading} tip="加载项目中...">
        {/* ── 精简顶栏 ── */}
        <div className={styles.headerWrapper}>
          <div className={styles.headerLeft}>
            <button className={styles.backBtn} onClick={handleBack} aria-label="返回项目列表">
              <ArrowLeft size={14} />
              <span>返回</span>
            </button>
            <div className={styles.titleCol}>
              <div className={styles.pageHeading}>
                <span>{isNewProject ? '新建影视创作工程' : '编辑影视创作工程'}</span>
                <span className={styles.projectBadge}>
                  {isNewProject ? '新工程' : '草稿'}
                </span>
              </div>
              <p className={styles.pageSubheading}>
                填写基础信息并导入原片，保存后即可进入工坊开始创作
              </p>
            </div>
          </div>

          <div className={styles.headerRightActions}>
            {/* 自动保存开关 */}
            <div className={styles.controlItem}>
              <span>自动保存</span>
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={e => handleAutoSaveToggle(e.target.checked)}
                className="accent-purple-500 cursor-pointer"
              />
            </div>

            {/* 保存并直达素材工坊 */}
            <button
              className={styles.saveProjectBtn}
              onClick={() => void handleSaveProject()}
              disabled={initialLoading || saving}
            >
              <Save size={13} />
              <span>{saving ? '正在创建中...' : (isNewProject ? '创建并进入工坊' : '保存工程')}</span>
            </button>
          </div>
        </div>

        {/* 自动保存状态徽章 */}
        <AutoSaveBadge
          enabled={autoSaveEnabled}
          videoPath={videoPath}
          state={autoSaveState}
          lastAt={lastAutoSaveAt}
        />

        {/* ── 流程说明横幅（新建时显示）── */}
        {isNewProject && (
          <div className="mx-4 mb-3 px-4 py-3 bg-purple-950/30 border border-purple-800/30 rounded-xl flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2 text-purple-300">
              <Zap size={14} className="text-purple-400" />
              <span className="text-xs font-semibold text-white">创建完成后，系统将带您进入四大工坊：</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
              <span className="text-purple-300 font-medium">① 素材拆条</span>
              <ChevronRight size={11} />
              <span className="text-cyan-300 font-medium">② 剧本研磨</span>
              <ChevronRight size={11} />
              <span className="text-teal-300 font-medium">③ 剪辑合成</span>
              <ChevronRight size={11} />
              <span className="text-amber-300 font-medium">④ 消重发布</span>
            </div>
          </div>
        )}

        {/* ── 主内容区：单屏快速表单 ── */}
        <div className={styles.stepsContent} style={{ paddingTop: 0 }}>
          <div className={styles.stepCard}>
            {/* 项目基础信息 */}
            <div className={styles.stepCardHeader}>
              <div className={styles.stepCardTitle}>
                <Sparkles size={16} className="text-purple-400" />
                <span>项目基础信息</span>
              </div>
              <p className={styles.stepCardDesc}>
                填写工程名称与简介，帮助 AI 理解您的创作方向。
              </p>
            </div>
            <ProjectForm
              name={formName}
              description={formDescription}
              onNameChange={setFormName}
              onDescriptionChange={setFormDescription}
            />

            {/* 分割线 */}
            <div className="mx-0 my-5 border-t border-white/6" />

            {/* 原片导入 */}
            <div className={styles.stepCardHeader}>
              <div className={styles.stepCardTitle}>
                <Video size={16} className="text-purple-400" />
                <span>导入影视原片</span>
              </div>
              <p className={styles.stepCardDesc}>
                支持 MP4、MOV、AVI、MKV、WEBM 等常见 4K/1080P 格式，导入后将自动提取元数据。
              </p>
            </div>
            <VideoSelector
              initialVideoPath={videoPath}
              onVideoSelect={handleVideoSelect}
              onVideoRemove={handleVideoRemove}
              loading={false}
            />

            {/* 底部操作按钮 */}
            <div className={styles.stepBottomActions} style={{ marginTop: '20px' }}>
              <button
                className={styles.nextStepBtn}
                onClick={() => void handleSaveProject()}
                disabled={!videoSelected || saving || initialLoading}
              >
                <Zap size={14} />
                <span>
                  {saving
                    ? '正在创建工程...'
                    : isNewProject
                    ? '创建工程并进入素材工坊 →'
                    : '保存并进入素材工坊 →'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </Spin>
    </div>
  );
};

export default withErrorBoundary(ProjectEdit, { name: 'ProjectEdit' });
