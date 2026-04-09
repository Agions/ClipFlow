import { logger } from '@/utils/logger';
import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Space, Spin, Divider, Modal, Tag, Result } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, DeleteOutlined, ExportOutlined, RobotOutlined } from '@ant-design/icons';
import { useSettings } from '@/context/SettingsContext';
import { notify } from '@/shared';
import { exportScriptToFile, saveProjectToFile, loadProjectWithRetry, listProjects } from '@/services/tauri';
import { findProjectByScriptId, normalizeProjectFile } from '@/core/utils/project-file';
import type { ProjectFileLike } from '@/core/utils/project-file';
import type { Script } from '@/services/aiService';
import type { VideoSegment } from '@/services/video';
import styles from './index.module.less';

const { Title, Text } = Typography;
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

const toVideoSegments = (script: Script | null): VideoSegment[] =>
  script?.content.map((segment) => ({
    start: segment.startTime,
    end: segment.endTime,
    type: segment.type,
    content: segment.content
  })) ?? [];

const toScriptSegments = (segments: VideoSegment[]): Script['content'] =>
  segments.map((segment: any, index: number) => ({
    id: `segment_${index}_${Date.now()}`,
    startTime: segment.start ?? segment.startTime,
    endTime: segment.end ?? segment.endTime,
    content: segment.content ?? '',
    type: (segment.type as Script['content'][number]['type']) || 'narration'
  }));

const ScriptDetail: React.FC = () => {
  const { projectId, scriptId } = useParams<{ projectId: string; scriptId: string }>();
  const navigate = useNavigate();
  const { addRecentProject } = useSettings();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectWithScripts | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [loadError, setLoadError] = useState<string>('');
  const [reloadToken, setReloadToken] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const loadRequestSeqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
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
          const allProjects = await listProjects();
          currentProject = findProjectByScriptId(allProjects as any, scriptId) as ProjectWithScripts | undefined;
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
        setSegments(toVideoSegments(currentScript));
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
      // 页面数据就绪后预加载编辑器，缩短首次进入编辑区等待
      void loadScriptEditor();
    }
  }, [loading, project, script]);

  const handleSegmentsChange = (newSegments: VideoSegment[]) => {
    setSegments(newSegments);
  };

  const handleSave = async () => {
    if (!project || !script || isSaving || isDeleting) return;

    try {
      setIsSaving(true);

      // 更新脚本
      const updatedScript = {
        ...script,
        content: toScriptSegments(segments),
        fullText: segments.map((segment: any) => (segment.content ?? '')).join('\n\n'),
        updatedAt: new Date().toISOString()
      };

      // 更新项目中的脚本
      const updatedScripts = (project.scripts ?? []).map((s) => 
        s.id === script.id ? updatedScript : s
      );

      // 更新项目
      const updatedProject = {
        ...project,
        scripts: updatedScripts,
        updatedAt: new Date().toISOString()
      };

      // 更新状态
      setProject(updatedProject);
      setScript(updatedScript);

      // 保存到文件
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
        {
          projectName: project.name,
          createdAt: script.createdAt,
          segments: toScriptSegments(segments)
        },
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

  const handleDelete = () => {
    if (!project || !script || isDeleting || isSaving || isExporting) return;

    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个脚本吗？此操作不可撤销。',
      okText: '删除',
      okType: 'danger',
      okButtonProps: { loading: isDeleting },
      cancelText: '取消',
      onOk: async () => {
        try {
          setIsDeleting(true);
          // 过滤掉要删除的脚本
          const updatedScripts = (project.scripts ?? []).filter((s) => s.id !== script.id);
          
          // 更新项目
          const updatedProject = {
            ...project,
            scripts: updatedScripts,
            updatedAt: new Date().toISOString()
          };

          // 保存到文件
          await saveProjectToFile(updatedProject.id, updatedProject);
          
          notify.success('删除成功');
          navigate(`/project/${project.id}`);
        } catch (error) {
          logger.error('删除脚本失败:', { error });
          notify.error(error, '删除失败');
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  if (loading) {
    return <Spin size="large" tip="加载中..." />;
  }
  if (loadError) {
    return (
      <Result
        status="error"
        title="加载脚本失败"
        subTitle={loadError}
        extra={[
          <Button key="retry" type="primary" onClick={() => setReloadToken((v) => v + 1)}>重试</Button>,
          projectId ? <Button key="project" onClick={() => navigate(`/project/${projectId}`)}>返回项目</Button> : null,
          <Button key="back" onClick={() => navigate('/projects')}>返回项目列表</Button>,
        ]}
      />
    );
  }

  if (!project || !script) {
    return <div>资源不存在</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/project/${project.id}`)}
          >
            返回项目
          </Button>
          
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={isSaving}
            disabled={isDeleting}
          >
            保存
          </Button>
          
          <Button
            icon={<ExportOutlined />}
            onClick={handleExport}
            loading={isExporting}
            disabled={segments.length === 0 || isSaving || isDeleting}
          >
            导出
          </Button>
          
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
            loading={isDeleting}
            disabled={isSaving || isExporting}
          >
            删除
          </Button>
        </Space>
      </div>

      <Card className={styles.infoCard}>
        <Title level={4}>{project.name} - 脚本编辑</Title>
        <div className={styles.scriptInfo}>
          <Text type="secondary">创建于 {new Date(script.createdAt).toLocaleString()}</Text>
          {script.modelUsed && (
            <Tag color="blue" icon={<RobotOutlined />} className={styles.modelTag}>
              由 {script.modelUsed} 生成
            </Tag>
          )}
        </div>
        <Divider />
        <div className={styles.stats}>
          <Space>
            <Text>片段数量: {segments.length}</Text>
            <Text>总时长: {segments.reduce((total, seg) => total + (seg.end - seg.start), 0)} 秒</Text>
          </Space>
        </div>
      </Card>
      
      <div className={styles.editorContainer}>
        <Suspense fallback={<Spin size="large" tip="编辑器加载中..." />}>
          <ScriptEditor
            videoPath={project.videoUrl ?? ''}
            initialSegments={segments}
            onSave={handleSegmentsChange}
          />
        </Suspense>
      </div>
    </div>
  );
};

export default ScriptDetail; 
