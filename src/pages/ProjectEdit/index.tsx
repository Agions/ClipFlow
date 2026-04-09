import { logger } from '@/utils/logger';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Steps,
  Typography,
  Space,
  Spin,
  Result,
  Select,
  Switch,
  Tag,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, VideoCameraOutlined, EditOutlined, CheckCircleOutlined } from '@ant-design/icons';
import VideoSelector from '@/components/VideoSelector';
import ScriptEditor from '@/components/ScriptEditor';
import { VideoMetadata, VideoSegment, analyzeVideo, extractKeyFrames } from '@/services/video';
import { generateScriptWithAI, analyzeKeyFramesWithAI } from '@/services/aiService';
import { loadProjectWithRetry, saveProjectToFile } from '@/services/tauri';
import { normalizeProjectFile } from '@/core/utils/project-file';
import type { ProjectFileLike } from '@/core/utils/project-file';
import { PROJECT_SAVE_BEHAVIOR_KEY, type ProjectSaveBehavior } from '@/shared/constants/settings';
import { notify } from '@/shared';
import { useSettings } from '@/context/SettingsContext';
import { v4 as uuid } from 'uuid';
import styles from './index.module.less';

const { Title, Paragraph } = Typography;
const STEP_ITEMS = [
  { title: '选择视频', icon: <VideoCameraOutlined />, description: '上传视频文件' },
  { title: '分析内容', icon: <EditOutlined />, description: '分析视频生成脚本' },
  { title: '编辑脚本', icon: <CheckCircleOutlined />, description: '编辑和优化脚本' },
];

interface ProjectData extends ProjectFileLike<unknown, { path?: string }> {
  id: string;
  name: string;
  description: string;
  videoPath: string;
  createdAt: string;
  updatedAt: string;
  metadata?: VideoMetadata;
  keyFrames?: string[];
  script?: VideoSegment[];
}

interface ProjectEditHeaderProps {
  isNewProject: boolean;
  loading: boolean;
  initialLoading: boolean;
  saving: boolean;
  saveBehavior: ProjectSaveBehavior;
  autoSaveEnabled: boolean;
  onBack: () => void;
  onSave: () => void;
  onSaveBehaviorChange: (value: ProjectSaveBehavior) => void;
  onAutoSaveToggle: (checked: boolean) => void;
}

const ProjectEditHeader = React.memo((props: ProjectEditHeaderProps) => {
  const {
    isNewProject,
    loading,
    initialLoading,
    saving,
    saveBehavior,
    autoSaveEnabled,
    onBack,
    onSave,
    onSaveBehaviorChange,
    onAutoSaveToggle,
  } = props;

  return (
    <div className={styles.header}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>返回</Button>
      <Title level={3}>{isNewProject ? '创建新项目' : '编辑项目'}</Title>
      <Space size="middle">
        <div className={styles.saveBehaviorControl}>
          <span className={styles.saveBehaviorLabel}>保存后：</span>
          <Select<ProjectSaveBehavior>
            size="small"
            value={saveBehavior}
            onChange={onSaveBehaviorChange}
            options={[
              { value: 'stay', label: '留在编辑页' },
              { value: 'detail', label: '跳转项目详情' },
            ]}
          />
        </div>
        <div className={styles.saveBehaviorControl}>
          <span className={styles.saveBehaviorLabel}>自动保存：</span>
          <Switch size="small" checked={autoSaveEnabled} onChange={onAutoSaveToggle} />
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={onSave}
          loading={saving}
          disabled={loading || initialLoading}
        >
          保存项目
        </Button>
      </Space>
    </div>
  );
});

ProjectEditHeader.displayName = 'ProjectEditHeader';

const AutoSaveStatus = React.memo(({ content }: { content: React.ReactNode }) => (
  <div className={styles.autoSaveStatus}>{content}</div>
));

AutoSaveStatus.displayName = 'AutoSaveStatus';

const normalizeProjectData = (project: ProjectData): ProjectData => {
  const normalized = normalizeProjectFile(project);
  return {
    ...project,
    ...normalized,
    description: project.description || '',
    videoPath: project.videoPath || normalized.videoUrl || '',
    createdAt: project.createdAt || new Date().toISOString(),
  };
};

const normalizeText = (value?: string) => value?.trim().replace(/\s+/g, ' ') || '';

const createDefaultProjectName = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `未命名项目-${timestamp}`;
};

const PROJECT_AUTO_SAVE_KEY = 'cutdeck-project-auto-save-enabled';

const buildDraftFingerprint = (payload: {
  id?: string;
  name?: string;
  description?: string;
  videoPath?: string;
  keyFrameCount?: number;
  scriptCount?: number;
  hasMetadata?: boolean;
}) =>
  JSON.stringify({
    id: payload.id || '',
    name: normalizeText(payload.name) || '',
    description: normalizeText(payload.description),
    videoPath: payload.videoPath || '',
    keyFrameCount: payload.keyFrameCount || 0,
    scriptCount: payload.scriptCount || 0,
    hasMetadata: Boolean(payload.hasMetadata),
  });

const ProjectEdit: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addRecentProject } = useSettings();
  const [form] = Form.useForm();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [videoSelected, setVideoSelected] = useState(false);
  const [videoPath, setVideoPath] = useState<string>('');
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [keyFrames, setKeyFrames] = useState<string[]>([]);
  const [scriptSegments, setScriptSegments] = useState<VideoSegment[]>([]);
  const [isNewProject, setIsNewProject] = useState(true);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultProjectName] = useState(() => createDefaultProjectName());
  const [saveBehavior, setSaveBehavior] = useState<ProjectSaveBehavior>(() => {
    try {
      const rawValue = window.localStorage.getItem(PROJECT_SAVE_BEHAVIOR_KEY);
      return rawValue === 'detail' ? 'detail' : 'stay';
    } catch {
      return 'stay';
    }
  });
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(PROJECT_AUTO_SAVE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const draftTimerRef = useRef<number | null>(null);
  const autoSaveRequestSeqRef = useRef(0);
  const lastDraftFingerprintRef = useRef('');
  const recentProjectTrackedRef = useRef('');
  const draftProjectIdRef = useRef<string>(projectId || '');
  const persistLockRef = useRef(false);
  const analyzingLockRef = useRef(false);
  const loadRequestSeqRef = useRef(0);
  const mountedRef = useRef(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
      }
    };
  }, []);

  const canAccessStep = useCallback((step: number) => {
    if (step <= 0) return true;
    if (step === 1) return Boolean(videoPath);
    if (step === 2) return Boolean(videoPath && (scriptSegments.length > 0 || keyFrames.length > 0 || videoMetadata));
    return false;
  }, [keyFrames.length, scriptSegments.length, videoMetadata, videoPath]);

  const goToStep = useCallback((targetStep: number) => {
    if (canAccessStep(targetStep)) {
      setCurrentStep(targetStep);
      return;
    }

    if (targetStep > 0 && !videoPath) {
      notify.warning('请先选择视频后再继续。');
      return;
    }

    if (targetStep > 1) {
      notify.warning('请先完成视频分析后再进入脚本编辑。');
    }
  }, [canAccessStep, videoPath]);

  const parseTimeString = (timeString: string): number => {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  };

  const parseScriptText = (text: string): VideoSegment[] => {
    try {
      const lines = text.split('\n').filter((line) => line.trim().length > 0);
      const resultSegments: VideoSegment[] = [];
      let currentSegment: VideoSegment | null = null;

      for (const line of lines) {
        const timeMatch = line.match(/\[(\d{1,2}:\d{2}(?::\d{2})?) - (\d{1,2}:\d{2}(?::\d{2})?)\]/);

        if (timeMatch) {
          const startTime = parseTimeString(timeMatch[1]);
          const endTime = parseTimeString(timeMatch[2]);
          const content = line.substring(timeMatch[0].length).trim();

          currentSegment = {
            start: startTime,
            end: endTime,
          };
          resultSegments.push(currentSegment);
        } else if (currentSegment) {
          // Append to previous segment's duration (text-based parsing)
          currentSegment.duration += 1;
        }
      }

      return resultSegments;
    } catch (parseError) {
      logger.error('解析脚本失败:', { error: parseError });
      return [];
    }
  };

  const buildProjectData = useCallback((): ProjectData => {
    const formData = form.getFieldsValue();
    const now = new Date().toISOString();
    const normalizedName = normalizeText(formData.name) || defaultProjectName;
    const normalizedDescription = normalizeText(formData.description);
    const resolvedProjectId = project?.id || draftProjectIdRef.current || uuid();
    if (!draftProjectIdRef.current) {
      draftProjectIdRef.current = resolvedProjectId;
    }

    const projectData: ProjectData = {
      id: resolvedProjectId,
      name: normalizedName,
      description: normalizedDescription,
      videoPath,
      videoUrl: videoPath || undefined,
      videos: videoPath ? [{ path: videoPath }] : [],
      createdAt: project?.createdAt || now,
      updatedAt: now,
      metadata: videoMetadata || undefined,
      keyFrames: keyFrames.length > 0 ? keyFrames : undefined,
      script: scriptSegments.length > 0 ? scriptSegments : undefined,
    };
    return projectData;
  }, [defaultProjectName, form, keyFrames, project, scriptSegments, videoMetadata, videoPath]);

  const persistProject = useCallback(async (options?: {
    silent?: boolean;
    requireVideo?: boolean;
    requireValidName?: boolean;
  }): Promise<ProjectData | null> => {
    const { silent = false, requireVideo = true, requireValidName = true } = options || {};

    if (requireVideo && !videoPath) {
      if (!silent) notify.error(null, '请先选择视频文件');
      return null;
    }

    const nameInput = normalizeText(form.getFieldValue('name'));
    if (requireValidName && nameInput && nameInput.length < 2) {
      if (!silent) notify.error(null, '项目名称至少2个字符');
      return null;
    }

    if (persistLockRef.current) {
      if (!silent) notify.info('正在保存，请稍候');
      return null;
    }

    persistLockRef.current = true;
    const data = buildProjectData();
    try {
      await saveProjectToFile(data.id, data);
      const shouldSyncProjectState = !silent || !project || project.id !== data.id;
      if (shouldSyncProjectState) {
        setProject(data);
      }
      if (recentProjectTrackedRef.current !== data.id) {
        addRecentProject(data.id);
        recentProjectTrackedRef.current = data.id;
      }

      if (!silent) notify.success('项目保存成功');
      return data;
    } finally {
      persistLockRef.current = false;
    }
  }, [addRecentProject, buildProjectData, form, videoPath]);

  const getCurrentDraftFingerprint = useCallback(() => buildDraftFingerprint({
    id: project?.id || projectId || '',
    name: form.getFieldValue('name'),
    description: form.getFieldValue('description'),
    videoPath,
    keyFrameCount: keyFrames.length,
    scriptCount: scriptSegments.length,
    hasMetadata: Boolean(videoMetadata),
  }), [
    form,
    keyFrames.length,
    project?.id,
    projectId,
    scriptSegments.length,
    videoMetadata,
    videoPath,
  ]);

  const scheduleAutoSave = useCallback(() => {
    if (!autoSaveEnabled || initialLoading || loading || saving || !videoPath) return;
    const currentFingerprint = getCurrentDraftFingerprint();
    if (lastDraftFingerprintRef.current === currentFingerprint) {
      return;
    }

    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    const requestId = ++autoSaveRequestSeqRef.current;
    const isStale = () => !mountedRef.current || requestId !== autoSaveRequestSeqRef.current;

    draftTimerRef.current = window.setTimeout(async () => {
      try {
        if (isStale()) return;
        setAutoSaveState('saving');
        const draftData = await persistProject({
          silent: true,
          requireVideo: true,
          requireValidName: false,
        });

        if (isStale()) return;
        if (!draftData) {
          setAutoSaveState('idle');
          return;
        }
        lastDraftFingerprintRef.current = currentFingerprint;
        setLastAutoSaveAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
        setAutoSaveState('saved');
      } catch (draftError) {
        if (isStale()) return;
        logger.error('自动保存草稿失败:', { error: draftError });
        setAutoSaveState('error');
      }
    }, 900);
  }, [autoSaveEnabled, getCurrentDraftFingerprint, initialLoading, loading, persistProject, saving, videoPath]);

  useEffect(() => {
    const requestId = ++loadRequestSeqRef.current;
    const isStale = () => !mountedRef.current || requestId !== loadRequestSeqRef.current;

    if (!projectId) {
      if (isStale()) return;
      setIsNewProject(true);
      setProject(null);
      setError(null);
      setInitialLoading(false);
      setCurrentStep(0);
      setVideoSelected(false);
      setVideoPath('');
      setVideoMetadata(null);
      setKeyFrames([]);
      setScriptSegments([]);
      setAutoSaveState('idle');
      setLastAutoSaveAt('');
      draftProjectIdRef.current = '';
      lastDraftFingerprintRef.current = '';
      form.setFieldsValue({ name: defaultProjectName, description: '' });
      return;
    }

    if (isStale()) return;
    setInitialLoading(true);
    setIsNewProject(false);
    setError(null);

    loadProjectWithRetry<ProjectData>(projectId, { retries: 2, retryDelayMs: 260 })
      .then((projectData) => {
        if (isStale()) return;
        const normalizedProject = normalizeProjectData(projectData);
        draftProjectIdRef.current = normalizedProject.id;
        setProject(normalizedProject);
        form.setFieldsValue({
          name: normalizedProject.name,
          description: normalizedProject.description,
        });

        if (normalizedProject.videoPath) {
          setVideoPath(normalizedProject.videoPath);
          setVideoSelected(true);
        }
        if (normalizedProject.metadata) setVideoMetadata(normalizedProject.metadata);
        if (normalizedProject.keyFrames?.length) setKeyFrames(normalizedProject.keyFrames);

        if (normalizedProject.script?.length) {
          setScriptSegments(normalizedProject.script);
          setCurrentStep(2);
        } else if (normalizedProject.videoPath) {
          setCurrentStep(1);
        }

        // 初始化草稿基线，避免进入编辑页后立即触发自动保存引发视觉跳动
        lastDraftFingerprintRef.current = buildDraftFingerprint({
          id: normalizedProject.id,
          name: normalizedProject.name,
          description: normalizedProject.description,
          videoPath: normalizedProject.videoPath,
          keyFrameCount: normalizedProject.keyFrames?.length || 0,
          scriptCount: normalizedProject.script?.length || 0,
          hasMetadata: Boolean(normalizedProject.metadata),
        });

        setError(null);
      })
      .catch((err: unknown) => {
        if (isStale()) return;
        logger.error('加载项目失败:', { error: err });
        const detail = err instanceof Error ? err.message : String(err);
        setError(`加载项目失败：${detail}`);
        notify.error(err, '加载项目失败，请返回项目列表后重试');
      })
      .finally(() => {
        if (isStale()) return;
        setInitialLoading(false);
      });
  }, [defaultProjectName, form, projectId, reloadToken]);

  useEffect(() => {
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleVideoSelect = (filePath: string, metadata?: VideoMetadata) => {
    if (filePath === videoPath && videoSelected) {
      if (metadata && metadata !== videoMetadata) {
        setVideoMetadata(metadata);
      }
      return;
    }
    setVideoPath(filePath);
    setVideoSelected(true);
    if (metadata) setVideoMetadata(metadata);
    if (currentStep === 0) goToStep(1);
  };

  const handleVideoRemove = () => {
    setVideoPath('');
    setVideoSelected(false);
    setVideoMetadata(null);
    setKeyFrames([]);
    setScriptSegments([]);
    setCurrentStep(0);
    setAutoSaveState('idle');
    setLastAutoSaveAt('');
  };

  const handleAnalyzeVideo = async () => {
    if (loading || analyzingLockRef.current) return;
    if (!videoPath) {
      notify.error(null, '请先选择视频');
      return;
    }

    analyzingLockRef.current = true;
    let stage: 'metadata' | 'keyframes' | 'frames-ai' | 'script' = 'metadata';

    try {
      setLoading(true);

      let metadata = videoMetadata;
      if (!metadata) {
        stage = 'metadata';
        notify.info('正在分析视频元数据...');
        metadata = await analyzeVideo(videoPath);
        setVideoMetadata(metadata);
      }

      stage = 'keyframes';
      notify.info('正在提取关键帧...');
      const frames = await extractKeyFrames(videoPath);
      const framePaths = frames.map((frame) => frame.path);
      if (framePaths.length === 0) {
        throw new Error('未提取到关键帧，请尝试更换视频或检查视频时长');
      }
      setKeyFrames(framePaths);

      stage = 'frames-ai';
      notify.info('正在分析关键帧内容...');
      const frameDescriptions = await analyzeKeyFramesWithAI(framePaths);

      stage = 'script';
      notify.info('正在根据视频内容生成脚本...');
      const scriptText = await generateScriptWithAI(metadata, frameDescriptions, {
        style: '自然流畅',
        tone: '专业',
        length: 'medium',
        purpose: '内容展示',
      });

      let script = parseScriptText(scriptText);
      if (script.length === 0) {
        script = [{
          start: 0,
          end: Math.max(10, Math.round(metadata?.duration || 10)),
        }];
      }

      setScriptSegments(script);
      notify.success('视频分析完成');
      goToStep(2);
    } catch (analyzeError) {
      logger.error('视频分析失败:', { error: analyzeError });
      const detail = analyzeError instanceof Error ? analyzeError.message : '未知错误';
      const stageLabel = {
        metadata: '视频元数据分析',
        keyframes: '关键帧提取',
        'frames-ai': '关键帧内容理解',
        script: '脚本生成',
      }[stage];
      const errorMessage = detail.includes('失败') ? detail : `${stageLabel}失败：${detail}`;
      notify.error(analyzeError, errorMessage);
    } finally {
      setLoading(false);
      analyzingLockRef.current = false;
    }
  };

  const handleSaveProject = async () => {
    if (saving) return;

    try {
      await form.validateFields();
      setSaving(true);

      const projectData = await persistProject({
        silent: false,
        requireVideo: true,
        requireValidName: true,
      });

      if (!projectData) return;
      lastDraftFingerprintRef.current = buildDraftFingerprint({
        id: projectData.id,
        name: projectData.name,
        description: projectData.description,
        videoPath: projectData.videoPath,
        keyFrameCount: projectData.keyFrames?.length || 0,
        scriptCount: projectData.script?.length || 0,
        hasMetadata: Boolean(projectData.metadata),
      });
      setAutoSaveState('saved');
      setLastAutoSaveAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));

      const shouldOpenDetail = saveBehavior === 'detail';
      const shouldBindNewIdToEditRoute = Boolean(!projectId && isNewProject);
      const targetRoute = shouldOpenDetail
        ? `/project/${projectData.id}`
        : `/project/edit/${projectData.id}`;

      if (shouldBindNewIdToEditRoute || shouldOpenDetail) {
        setIsNewProject(false);
        if (location.pathname !== targetRoute) {
          navigate(targetRoute, { replace: true });
        }
      }
    } catch (saveError) {
      logger.error('保存项目失败:', { error: saveError });
      notify.error(saveError, '保存项目失败，请稍后再试');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/projects');
  };

  const handleSaveBehaviorChange = (value: ProjectSaveBehavior) => {
    setSaveBehavior(value);
    try {
      window.localStorage.setItem(PROJECT_SAVE_BEHAVIOR_KEY, value);
    } catch (storageError) {
      logger.error('保存项目跳转策略失败:', { error: storageError });
    }
  };

  const handleAutoSaveToggle = (checked: boolean) => {
    setAutoSaveEnabled(checked);
    if (!checked) {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
      }
      autoSaveRequestSeqRef.current += 1;
      setAutoSaveState('idle');
      setLastAutoSaveAt('');
    }
    try {
      window.localStorage.setItem(PROJECT_AUTO_SAVE_KEY, checked ? '1' : '0');
    } catch (storageError) {
      logger.error('保存自动保存开关失败:', { error: storageError });
    }
  };

  const autoSaveTag = React.useMemo(() => {
    if (!autoSaveEnabled) return <Tag color="default">自动保存已关闭</Tag>;
    if (!videoPath) return <Tag color="default">未开始自动保存</Tag>;
    if (autoSaveState === 'saving') return <Tag color="processing">草稿自动保存中...</Tag>;
    if (autoSaveState === 'saved') return <Tag color="success">{lastAutoSaveAt ? `草稿已保存 ${lastAutoSaveAt}` : '草稿已保存'}</Tag>;
    if (autoSaveState === 'error') return <Tag color="error">草稿保存失败</Tag>;
    return <Tag color="default">自动保存待触发</Tag>;
  }, [autoSaveEnabled, autoSaveState, lastAutoSaveAt, videoPath]);

  const handleExportScript = (format: string) => {
    notify.info(`导出脚本为 ${format.toUpperCase()} 格式`);
  };

  const handleFormValuesChange = (changedValues: Partial<Pick<ProjectData, 'name' | 'description'>>) => {
    if (!Object.prototype.hasOwnProperty.call(changedValues, 'name')
      && !Object.prototype.hasOwnProperty.call(changedValues, 'description')) {
      return;
    }
    scheduleAutoSave();
  };

  const stepContent = React.useMemo(() => {
    switch (currentStep) {
      case 0:
        return (
          <Card className={styles.stepCard}>
            <Title level={4}>
              <VideoCameraOutlined /> 选择视频
            </Title>
            <Paragraph>请选择要编辑的视频文件，支持 MP4、MOV、AVI 等常见格式。</Paragraph>
            <VideoSelector
              initialVideoPath={videoPath}
              onVideoSelect={handleVideoSelect}
              onVideoRemove={handleVideoRemove}
              loading={loading}
            />
            <div className={styles.stepActions}>
              <Button type="primary" onClick={() => goToStep(1)} disabled={!videoSelected}>下一步</Button>
            </div>
          </Card>
        );

      case 1:
        return (
          <Card className={styles.stepCard}>
            <Title level={4}><EditOutlined /> 分析视频内容</Title>
            <Paragraph>分析视频获取关键帧和内容信息，生成脚本草稿。</Paragraph>

            <Spin spinning={loading} tip="正在分析视频...">
              <div className={styles.analyzeContent}>
                <VideoSelector
                  initialVideoPath={videoPath}
                  onVideoSelect={handleVideoSelect}
                  onVideoRemove={handleVideoRemove}
                  loading={false}
                />

                {keyFrames.length > 0 && (
                  <div className={styles.keyFrames}>
                    <Title level={5}>已提取 {keyFrames.length} 个关键帧</Title>
                    <div className={styles.keyFramesList}>
                      {keyFrames.map((frame, index) => (
                        <img
                          key={index}
                          src={frame}
                          alt={`关键帧 ${index + 1}`}
                          className={styles.keyFrameImage}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Spin>

            <div className={styles.stepActions}>
              <Space>
                <Button onClick={() => goToStep(0)}>上一步</Button>
                {scriptSegments.length > 0 ? (
                  <Button type="primary" onClick={() => goToStep(2)}>下一步</Button>
                ) : (
                  <Button type="primary" onClick={handleAnalyzeVideo} loading={loading}>分析视频</Button>
                )}
              </Space>
            </div>
          </Card>
        );

      case 2:
        return (
          <Card className={styles.stepCard}>
            <Title level={4}><EditOutlined /> 编辑脚本</Title>
            <Paragraph>编辑和优化自动生成的脚本内容，可以添加、删除或修改片段。</Paragraph>

            <ScriptEditor
              videoPath={videoPath}
              initialSegments={scriptSegments}
              onSave={setScriptSegments}
              onExport={handleExportScript}
            />

            <div className={styles.stepActions}>
              <Space>
                <Button onClick={() => goToStep(1)}>上一步</Button>
                <Button type="primary" onClick={handleSaveProject} loading={saving} disabled={loading}>保存项目</Button>
              </Space>
            </div>
          </Card>
        );

      default:
        return null;
    }
  }, [
    currentStep,
    goToStep,
    videoPath,
    handleVideoSelect,
    handleVideoRemove,
    loading,
    videoSelected,
    keyFrames,
    scriptSegments,
    handleAnalyzeVideo,
    handleSaveProject,
    saving,
    handleExportScript,
  ]);

  if (error) {
    const actions = [<Button key="back" onClick={handleBack}>返回</Button>];
    if (projectId) {
      actions.unshift(
        <Button key="retry" type="primary" onClick={() => setReloadToken((v) => v + 1)}>重试</Button>
      );
    }
    return (
      <Result
        status="error"
        title="加载失败"
        subTitle={error}
        extra={actions}
      />
    );
  }

  return (
    <div className={styles.container}>
      <Spin spinning={initialLoading} tip="加载项目中...">
        <ProjectEditHeader
          isNewProject={isNewProject}
          loading={loading}
          initialLoading={initialLoading}
          saving={saving}
          saveBehavior={saveBehavior}
          autoSaveEnabled={autoSaveEnabled}
          onBack={handleBack}
          onSave={handleSaveProject}
          onSaveBehaviorChange={handleSaveBehaviorChange}
          onAutoSaveToggle={handleAutoSaveToggle}
        />

        <AutoSaveStatus content={autoSaveTag} />

        <Card className={styles.card}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{ name: defaultProjectName, description: '' }}
            onValuesChange={handleFormValuesChange}
          >
            <Form.Item
              name="name"
              label="项目名称"
              rules={[
                {
                  validator: (_, value: string) => {
                    const normalizedValue = normalizeText(value);
                    if (normalizedValue && normalizedValue.length < 2) {
                      return Promise.reject(new Error('项目名称至少2个字符'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input placeholder="请输入项目名称" maxLength={100} />
            </Form.Item>

            <Form.Item name="description" label="项目描述">
              <Input.TextArea placeholder="请输入项目描述（选填）" rows={2} maxLength={500} />
            </Form.Item>
          </Form>
        </Card>

        <div className={styles.stepsContainer}>
          <Steps
            current={currentStep}
            onChange={goToStep}
            items={STEP_ITEMS}
          />
        </div>

        <div className={styles.stepsContent}>
          {stepContent}
        </div>
      </Spin>
    </div>
  );
};

export default ProjectEdit;
