import { logger } from '@/utils/logger';
import React, { useState, useEffect, lazy, Suspense, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Modal, Spin, Typography, Menu, Space, Drawer, Tooltip, Result } from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowLeftOutlined, 
  DeleteOutlined, 
  SettingOutlined,
  EyeOutlined,
  AudioOutlined,
  FormOutlined,
  ScissorOutlined,
  DashboardOutlined
} from '@ant-design/icons';
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
import type { VideoSegment } from '@/services/video';
import type { VideoAnalysis } from '@/types';
import type { ScriptEditorOriginalProps } from '@/components/ScriptEditor/types';
import styles from './index.module.less';

const { Title, Text } = Typography;
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

const toVideoSegments = (script: Script | null): VideoSegment[] =>
  script?.content.map((segment) => ({
    start: segment.startTime,
    end: segment.endTime,
    type: (segment as any).type,
    content: (segment as any).content
  })) ?? [];

const toScriptSegments = (segments: VideoSegment[]) =>
  segments.map((segment) => ({
    id: uuidv4(),
    startTime: segment.start,
    endTime: segment.end,
    content: (segment as any).content ?? '',
    type: ((segment as any).type as Script['content'][number]['type']) || 'narration'
  }));

const StepFallback: React.FC = () => (
  <div className={styles.spinner}>
    <Spin size="large" />
  </div>
);

const persistUpdatedProject = async (updatedProject: ProjectData) => {
  try {
    await saveProjectToFile(updatedProject.id, updatedProject);
  } catch (error) {
    notify.error(error, '项目保存失败，请重试');
  }
};

const MENU_ITEMS: MenuProps['items'] = [
  { key: 'analyze', icon: <EyeOutlined />, label: '画面识别' },
  { key: 'subtitle', icon: <FormOutlined />, label: '字幕提取' },
  { key: 'script', icon: <DashboardOutlined />, label: '脚本生成' },
  { key: 'sync', icon: <AudioOutlined />, label: '音画同步' },
  { key: 'edit', icon: <ScissorOutlined />, label: '视频混剪' },
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
  const loadRequestSeqRef = useRef(0);
  const mountedRef = useRef(true);
  const scriptPersistTimerRef = useRef<number | null>(null);
  const createScriptLockRef = useRef(false);
  const generateScriptLockRef = useRef(false);

  // 同步 project 到 ref（供 hooks 在条件返回后使用）
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (scriptPersistTimerRef.current) {
        window.clearTimeout(scriptPersistTimerRef.current);
      }
    };
  }, []);

  const schedulePersistUpdatedProject = useCallback((updatedProject: ProjectData, delayMs = 280) => {
    if (scriptPersistTimerRef.current) {
      window.clearTimeout(scriptPersistTimerRef.current);
    }
    scriptPersistTimerRef.current = window.setTimeout(() => {
      void persistUpdatedProject(updatedProject);
    }, delayMs);
  }, []);

  useEffect(() => {
    // 预加载当前步骤常见的下一步组件，降低切换等待时间
    switch (activeStep) {
      case 'analyze':
        void loadSubtitleExtractor();
        break;
      case 'subtitle':
        void loadScriptEditor();
        break;
      case 'script':
        void loadVideoProcessingController();
        break;
      case 'edit':
        void loadVideoInfo();
        break;
      default:
        break;
    }
  }, [activeStep]);

  useEffect(() => {
    if (activeScript) {
      // 脚本存在时优先预热编辑器模块
      void loadScriptEditor();
    }
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
        if (normalizedProject.scripts && normalizedProject.scripts.length > 0) {
          setActiveScript(normalizedProject.scripts[0]);
        }
      })
      .catch((error) => {
        if (isStale()) return;
        logger.error('加载项目失败:', { error });
        const detail = error instanceof Error ? error.message : '未知错误';
        setLoadError(detail);
        notify.error(error, '加载项目失败，请重试');
      })
      .finally(() => {
        if (isStale()) return;
        setLoading(false);
      });
  }, [addRecentProject, projectId, reloadToken]);

  const handleDeleteProject = useCallback(() => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此项目吗？此操作不可撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (!projectId) return;
        try {
          await deleteProject(projectId);
          notify.success('项目已删除');
          navigate('/projects');
        } catch {
          notify.error(null, '删除项目失败');
        }
      }
    });
  }, [navigate, projectId]);

  const handleCreateScript = useCallback((): void => {
    if (!project || createScriptLockRef.current) return;
    createScriptLockRef.current = true;
    try {
      const newScript: Script = {
        id: uuidv4(),
        projectId: project.id,
        content: [],
        fullText: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const updatedProject = {
        ...project,
        scripts: [...(project.scripts || []), newScript],
        updatedAt: new Date().toISOString()
      };
  
      setProject(updatedProject);
      setActiveScript(newScript);
      
      notify.loading('正在保存...', 'save');
      saveProjectToFile(updatedProject.id, updatedProject).then(() => {
        notify.success('脚本创建成功', 'save');
      }).catch(() => {
        notify.error(null, '保存失败', 'save');
      }).finally(() => {
        createScriptLockRef.current = false;
      });
    } catch {
      createScriptLockRef.current = false;
      notify.error(null, '创建失败');
    }
  }, [project]);

  const handleGenerateScript = useCallback(async () => {
    if (generateScriptLockRef.current) return;
    if (!project || !project.analysis) {
      notify.warning('项目缺少分析数据，请先完成【画面识别】步骤');
      return;
    }
    
    try {
      generateScriptLockRef.current = true;
      setAiLoading(true);
      const modelSettings = aiModelsSettings[selectedAIModel];
      if (!modelSettings?.enabled) {
        notify.warning(`请在设置中启用 ${selectedAIModel} 模型`);
        return;
      }
      
      const apiKey = await getApiKey(selectedAIModel);
      if (!apiKey) {
        notify.warning(`缺少 ${selectedAIModel} 的API密钥`);
        return;
      }
      
      notify.loading('AI正在创作脚本...', 'ai');
      const compatibleModel = resolveLegacyModel(selectedAIModel);
      const scriptText = await generateScriptWithModel(
        compatibleModel,
        apiKey,
        project.analysis,
        { style: 'informative' }
      );
      const generatedScript = parseGeneratedScript(scriptText, project.id);
      
      const scriptWithModelInfo = {
        ...generatedScript,
        modelUsed: selectedAIModel
      };
      
      const updatedProject = {
        ...project,
        scripts: [...(project.scripts || []), scriptWithModelInfo],
        updatedAt: new Date().toISOString()
      };
      
      setProject(updatedProject);
      setActiveScript(scriptWithModelInfo);
      
      await saveProjectToFile(updatedProject.id, updatedProject);
      notify.success('AI脚本生成完毕✨', 'ai');
    } catch (error) {
      notify.error(error, '生成失败：未知错误', 'ai');
    } finally {
      setAiLoading(false);
      generateScriptLockRef.current = false;
    }
  }, [aiModelsSettings, project, selectedAIModel]);

  if (loading) return <div className={styles.spinner}><Spin size="large" /></div>;
  if (loadError) {
    return (
      <Result
        status="error"
        title="加载项目失败"
        subTitle={loadError}
        extra={[
          <Button key="retry" type="primary" onClick={() => setReloadToken((v) => v + 1)}>重试</Button>,
          <Button key="back" onClick={() => navigate('/projects')}>返回项目列表</Button>,
        ]}
      />
    );
  }


  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleAnalysisComplete = useCallback((analysis: VideoAnalysis) => {
    if (!project) return;
    const updated = { ...project, analysis };
    setProject(updated);
    void persistUpdatedProject(updated);
    notify.success('画面识别已完成并保存');
  }, [project]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleSubtitleExtracted = useCallback((subtitles: unknown) => {
    if (!project) return;
    const updated = { ...project, extractedSubtitles: subtitles };
    setProject(updated);
    void persistUpdatedProject(updated);
  }, [project]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleScriptSave = useCallback((updatedSegments: Parameters<ScriptEditorOriginalProps['onSave']>[0]) => {
    if (!project || !activeScript) return;
    const updatedScript: Script = {
      ...activeScript,
      content: toScriptSegments(updatedSegments),
      fullText: updatedSegments.map((segment) => (segment as any).content ?? '').join('\n\n'),
      updatedAt: new Date().toISOString()
    };
    const updatedProject = {
      ...project,
      scripts: (project.scripts ?? []).map((script) =>
        script.id === activeScript.id ? updatedScript : script
      ),
      updatedAt: new Date().toISOString()
    };
    setActiveScript(updatedScript);
    setProject(updatedProject);
    schedulePersistUpdatedProject(updatedProject);
  }, [activeScript, project, schedulePersistUpdatedProject]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const contentNode = useMemo((): React.ReactNode => {
    switch (activeStep) {
      case 'analyze':
        return (
          <div>
            <Suspense fallback={<StepFallback />}>
              <VideoAnalyzer
                projectId={project.id}
                videoUrl={project.videoUrl}
                onAnalysisComplete={handleAnalysisComplete}
              />
            </Suspense>
          </div>
        );
      case 'subtitle':
        return (
          <div>
            <Suspense fallback={<StepFallback />}>
              <SubtitleExtractor
                projectId={project.id}
                videoUrl={project.videoUrl}
                onExtracted={handleSubtitleExtracted}
              />
            </Suspense>
          </div>
        );
      case 'script':
        return (
          <div>
            <div className={styles.scriptHeader}>
              <Title level={4}>AI驱动脚本编辑</Title>
              <Space>
                <Button loading={aiLoading} onClick={handleGenerateScript} type="primary" className={styles.premiumBtn}>AI 一键生成</Button>
                <Button onClick={handleCreateScript} className={styles.premiumBtn}>新建空脚本</Button>
              </Space>
            </div>
            {activeScript ? (
              <Suspense fallback={<StepFallback />}>
                <ScriptEditor
                  videoPath={project.videoUrl ?? ''}
                  initialSegments={toVideoSegments(activeScript)}
                  onSave={handleScriptSave}
                />
              </Suspense>
            ) : (
              <div className={styles.emptyScript}>
                <Text type="secondary">暂无脚本，请点击上方按钮生成或创建</Text>
              </div>
            )}
          </div>
        );
      case 'sync':
        return (
          <div className={styles.placeholderSection}>
            <div className={styles.iconWrapper}><AudioOutlined /></div>
            <Title level={3}>全自动音画同步引擎</Title>
            <Text>结合TTS合成声音与画面关键帧自动对齐，提供影院级配音体验。</Text>
            <Button type="primary" size="large" className={styles.premiumBtn} onClick={() => notify.info('功能开发中，敬请期待！')}>即将推出</Button>
          </div>
        );
      case 'edit':
        return (
          <div>
            <Suspense fallback={<StepFallback />}>
              <VideoProcessingController
                videoPath={project.videoUrl ?? ''}
                segments={toVideoSegments(activeScript)}
              />
            </Suspense>
          </div>
        );
      default:
        return null;
    }
  }, [
    activeStep,
    activeScript,
    aiLoading,
    handleAnalysisComplete,
    handleCreateScript,
    handleGenerateScript,
    handleScriptSave,
    handleSubtitleExtracted,
    project.id,
    project.videoUrl,
  ]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (!project) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Space>
          <Tooltip title="返回项目列表">
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')} size="large" />
          </Tooltip>
          <div className={styles.titleArea}>
            <Text type="secondary" style={{ fontSize: '12px' }}>当前工作区</Text>
            <Title level={2}>{project.name}</Title>
          </div>
        </Space>
        
        <Space>
          <Button icon={<SettingOutlined />} onClick={() => setDrawerVisible(true)} className={styles.premiumBtn}>
            项目信息
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDeleteProject} className={styles.premiumBtn}>
            删除
          </Button>
        </Space>
      </div>

      <div className={styles.workflowContainer}>
        <div className={styles.sidebar}>
          <div className={styles.stepCard}>
            <Menu
              mode="vertical"
              selectedKeys={[activeStep]}
              className={styles.stepMenu}
              items={MENU_ITEMS}
              onSelect={({ key }) => setActiveStep(String(key))}
            />
          </div>
        </div>

        <div className={styles.contentArea}>
          <div className={styles.activeContent}>
            {contentNode}
          </div>
        </div>
      </div>

      <Drawer
        title="详细信息与媒体属性"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={400}
      >
        {project.description && (
          <div style={{ marginBottom: 24 }}>
            <Title level={5}>项目描述</Title>
            <Text type="secondary">{project.description}</Text>
          </div>
        )}
        <Suspense fallback={<StepFallback />}>
          <VideoInfo
            name={project.name}
            path={project.videoUrl}
            duration={project.analysis?.duration || 0}
          />
        </Suspense>
      </Drawer>
    </div>
  );
};

export default ProjectDetail;
