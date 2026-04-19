import { logger } from '@/utils/logger';
import React, { useState, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Button, Card, Row, Col, Input, Select,
  Tag, Space, Modal, Empty, Dropdown, Progress, Tooltip, Spin
} from 'antd';
import { useSettings } from '@/context/SettingsContext';
import { notify } from '@/shared';
import { listProjects, deleteProject as deleteProjectFile, PROJECTS_CHANGED_EVENT } from '@/services/tauri';
import { preloadProjectDetailPage, preloadProjectEditPage, preloadVideoEditorPage } from '@/core/utils/route-preload';
import type { ProjectUIStatus, ProjectUIStats, ProjectView } from './types';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  EllipsisOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  VideoCameraOutlined,
  ExportOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;
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

const ProjectManager: React.FC = () => {
  const navigate = useNavigate();
  const { settings, addRecentProject } = useSettings();
  const [projects, setProjects] = useState<ProjectView[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

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
    const handleProjectsChanged = () => {
      void loadProjectData();
    };
    window.addEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);
    return () => {
      window.removeEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);
    };
  }, [loadProjectData]);

  const statusConfig: Record<ProjectUIStatus, { color: string; text: string }> = {
    draft: { color: 'default', text: '草稿' },
    processing: { color: 'processing', text: '制作中' },
    completed: { color: 'success', text: '已完成' },
  };

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
    if (status === 'completed') {
      progress = 100;
    } else if (status === 'processing') {
      progress = 65;
    } else if (scriptCount > 0 && videoCount > 0) {
      progress = 45;
    } else if (videoCount > 0) {
      progress = 20;
    }

    return { scriptCount, videoCount, status, progress };
  };

  const orderedProjects = useMemo(() => {
    const recentOrder = new Map(settings.recentProjects.map((id, index) => [id, index]));
    return [...projects].sort((a, b) => {
      const aOrder = recentOrder.get(a.id);
      const bOrder = recentOrder.get(b.id);
      if (aOrder !== undefined && bOrder !== undefined) {
        return aOrder - bOrder;
      }
      if (aOrder !== undefined) {
        return -1;
      }
      if (bOrder !== undefined) {
        return 1;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [projects, settings.recentProjects]);

  const filteredProjects = orderedProjects.filter(p => {
    const matchSearch = !searchText || p.name.includes(searchText) || p.description?.includes(searchText);
    const uiStatus = getProjectUIStatus(p).status;
    const matchStatus = statusFilter === 'all' || uiStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除此项目吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const ok = await deleteProjectFile(id);
          if (!ok) {
            notify.error(null, '删除项目失败');
            return;
          }
          notify.success('项目已删除');
          await loadProjectData();
        } catch (error) {
          logger.error('删除项目失败:', { error });
          notify.error(error, '删除项目失败，请稍后重试');
        }
      }
    });
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

  const projectActions = (project: ProjectView) => ({
    items: [
      { key: 'edit', label: '编辑项目', icon: <EditOutlined />, onClick: () => navigate(`/project/edit/${project.id}`) },
      { key: 'editor', label: '进入工作台', icon: <PlayCircleOutlined />, onClick: () => navigate(`/editor/${project.id}`) },
      { key: 'export', label: '导出', icon: <ExportOutlined /> },
      { type: 'divider' as const },
      { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(project.id) },
    ]
  });

  // 网格视图
  const GridView = () => (
    <Row gutter={[16, 16]}>
      {/* 创建项目卡片 */}
      <Col xs={24} sm={12} md={8} lg={6}>
        <Card
          hoverable
          onClick={() => navigate('/project/new')}
          onMouseEnter={() => { void preloadProjectEditPage(); }}
          style={{ 
            borderRadius: 10, height: 220, 
            border: '2px dashed rgba(102, 126, 234, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          styles={{ body: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' } }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #667eea15, #764ba215)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#667eea', marginBottom: 12,
          }}>
            <PlusOutlined />
          </div>
          <Text strong style={{ color: '#667eea' }}>创建新项目</Text>
        </Card>
      </Col>

      {filteredProjects.map(project => {
        const uiStatus = getProjectUIStatus(project);
        return (
          <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
            <Card
              hoverable
              onClick={() => navigate(`/project/${project.id}`)}
              onMouseEnter={() => { void preloadProjectDetailPage(); }}
              style={{ borderRadius: 10, height: 220, overflow: 'hidden' }}
              styles={{ body: { padding: 16, height: '100%', display: 'flex', flexDirection: 'column' } }}
            >
              {/* 顶部：状态和菜单 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Tag color={statusConfig[uiStatus.status]?.color || 'default'} style={{ margin: 0, borderRadius: 4 }}>
                  {statusConfig[uiStatus.status]?.text || '草稿'}
                </Tag>
                <Dropdown menu={projectActions(project)} trigger={['click']}>
                  <Button type="text" icon={<EllipsisOutlined />} size="small" onMouseEnter={() => { void preloadProjectEditPage(); void preloadVideoEditorPage(); }} onClick={e => e.stopPropagation()} />
                </Dropdown>
              </div>

              {/* 项目名 */}
              <Title level={5} ellipsis style={{ margin: '0 0 4px' }}>{project.name}</Title>
              <Text type="secondary" ellipsis style={{ fontSize: 12, marginBottom: 12 }}>{project.description}</Text>

              {/* 进度 */}
              <Progress 
                percent={uiStatus.progress} 
                size="small" 
                strokeColor={{ from: '#667eea', to: '#764ba2' }}
                style={{ marginBottom: 8 }}
              />

              {/* 底部信息 */}
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size={12}>
                  <Tooltip title="视频数"><Text type="secondary" style={{ fontSize: 11 }}><VideoCameraOutlined /> {uiStatus.videoCount}</Text></Tooltip>
                  <Tooltip title="脚本数"><Text type="secondary" style={{ fontSize: 11 }}><FolderOpenOutlined /> {uiStatus.scriptCount}</Text></Tooltip>
                </Space>
                <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(project.updatedAt)}</Text>
              </div>
            </Card>
          </Col>
        );
      })}

      {filteredProjects.length === 0 && !loading && (
        <Col span={24}>
          <Empty description="暂无匹配的项目" style={{ padding: 60 }} />
        </Col>
      )}
    </Row>
  );

  // 列表视图（按需懒加载）
  const ListView = () => (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>}>
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
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* 工具栏 */}
      <Card bordered={false} style={{ borderRadius: 10, marginBottom: 16 }} styles={{ body: { padding: '12px 20px' } }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Space size={12}>
            <Search
              placeholder="搜索项目..."
              allowClear
              style={{ width: 240 }}
              onSearch={v => setSearchText(v)}
              onChange={e => !e.target.value && setSearchText('')}
            />
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as ProjectStatusFilter)}
              style={{ width: 120 }}
              getPopupContainer={() => document.body}
              popupClassName="projects-filter-select-popup"
              dropdownStyle={{ zIndex: 3200 }}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'draft', label: '草稿' },
                { value: 'processing', label: '制作中' },
                { value: 'completed', label: '已完成' },
              ]}
            />
          </Space>
          
          <Space size={8}>
            <Button.Group>
              <Tooltip title="网格视图">
                <Button 
                  icon={<AppstoreOutlined />} 
                  type={viewMode === 'grid' ? 'primary' : 'default'}
                  onClick={() => setViewMode('grid')}
                />
              </Tooltip>
              <Tooltip title="列表视图">
                <Button 
                  icon={<UnorderedListOutlined />}
                  type={viewMode === 'list' ? 'primary' : 'default'}
                  onClick={() => setViewMode('list')}
                  onMouseEnter={() => {
                    void loadProjectsListView();
                  }}
                />
              </Tooltip>
            </Button.Group>
            {loadFailed && (
              <Tooltip title="重新加载">
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => { void loadProjectData(); }}
                >
                  重试
                </Button>
              </Tooltip>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/project/new')}
              onMouseEnter={() => { void preloadProjectEditPage(); }}
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none', borderRadius: 6,
              }}
            >
              新建项目
            </Button>
          </Space>
        </div>
      </Card>

      {/* 项目统计 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {([
          { label: '全部', value: projects.length, color: '#667eea', filter: 'all' },
          { label: '草稿', value: projects.filter(p => getProjectUIStatus(p).status === 'draft').length, color: '#8c8c8c', filter: 'draft' },
          { label: '制作中', value: projects.filter(p => getProjectUIStatus(p).status === 'processing').length, color: '#1890ff', filter: 'processing' },
          { label: '已完成', value: projects.filter(p => getProjectUIStatus(p).status === 'completed').length, color: '#52c41a', filter: 'completed' },
        ] as Array<{ label: string; value: number; color: string; filter: ProjectStatusFilter }>).map((item, idx) => (
          <Col key={idx}>
            <Tag
              style={{ 
                cursor: 'pointer', padding: '4px 12px', borderRadius: 6, fontSize: 13,
                background: statusFilter === item.filter ? `${item.color}15` : undefined,
                borderColor: statusFilter === item.filter ? item.color : undefined,
                color: statusFilter === item.filter ? item.color : undefined,
              }}
              onClick={() => setStatusFilter(item.filter)}
            >
              {item.label} <Text strong style={{ color: 'inherit' }}>{item.value}</Text>
            </Tag>
          </Col>
        ))}
      </Row>

      {/* 内容区 */}
      {viewMode === 'grid' ? <GridView /> : <ListView />}
    </div>
  );
};

export default ProjectManager;
