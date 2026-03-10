import React, { useState, useEffect, useCallback } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Button, 
  Typography, 
  Space, 
  Statistic, 
  List, 
  Avatar, 
  Dropdown, 
  Tag, 
  Empty, 
  Tooltip,
  Input,
  Segmented,
  Modal
} from 'antd';
import { 
  PlusOutlined, 
  ClockCircleOutlined, 
  FireOutlined, 
  VideoCameraOutlined, 
  BarChartOutlined, 
  MoreOutlined, 
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  FolderOutlined,
  StarOutlined,
  StarFilled,
  AppstoreOutlined,
  BarsOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { listProjects, deleteProject as deleteProjectFile, getFileSizeBytes, PROJECTS_CHANGED_EVENT } from '@/services/tauriService';
import {
  preloadAIVideoEditorPage,
  preloadProjectEditPage,
  preloadProjectsPage,
  preloadSettingsPage,
} from '@/core/utils/route-preload';
import { useSettings } from '@/context/SettingsContext';
import {
  extractProjectMediaMetrics,
  notify,
  pickPreferredSizeMb,
  resolveProjectVideoPath,
  type RawProjectRecord,
} from '@/shared';
import styles from './index.module.less';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface Project {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  updatedAt: string;
  size: number;
  starred: boolean;
  tags: string[];
}

// 格式化时间显示
const formatTime = (date: Date | string): string => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - targetDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return '今天 ' + targetDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return '昨天 ' + targetDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return targetDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
};

// 格式化时长显示
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { addRecentProject } = useSettings();
  const [projects, setProjects] = useState<Project[]>([]);
  const [viewMode, setViewMode] = useState<string | number>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProjects, setFilteredProjects] = useState<Project[]>(projects);
  const [loading, setLoading] = useState(false);
  
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const rawProjects = await listProjects<RawProjectRecord>();
      const mapped = await Promise.all(rawProjects
        .filter((project) => typeof project.id === 'string')
        .map(async (project, index) => {
          const metrics = extractProjectMediaMetrics(project);
          const videoPath = resolveProjectVideoPath(project);
          const exactSizeMb = videoPath ? (await getFileSizeBytes(videoPath)) / 1024 / 1024 : 0;
          const size = pickPreferredSizeMb(exactSizeMb, metrics.explicitSizeMb, metrics.estimatedSizeMb);

          return {
            id: String(project.id),
            title: String(project.name || '未命名项目'),
            thumbnail: `https://picsum.photos/seed/${project.id || index}/300/200`,
            updatedAt: String(project.updatedAt || project.createdAt || new Date().toISOString()),
            duration: metrics.durationSec,
            size,
            starred: false,
            tags: [String(project.status || 'draft')],
          } satisfies Project;
        }));
      setProjects(mapped);
    } catch (error) {
      console.error('加载项目失败:', error);
      notify.error(error, '加载项目失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  // 统计数据
  const totalProjects = projects.length;
  const totalDuration = projects.reduce((sum, project) => sum + project.duration, 0);
  const totalSize = projects.reduce((sum, project) => sum + project.size, 0);
  
  // 搜索和过滤项目
  useEffect(() => {
    void loadProjects();
    const handleProjectsChanged = () => {
      void loadProjects();
    };
    window.addEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);
    return () => {
      window.removeEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);
    };
  }, [loadProjects]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(project => 
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredProjects(filtered);
    }
  }, [searchQuery, projects]);
  
  // 切换收藏状态
  const toggleStar = (id: string) => {
    setProjects(projects.map(project => 
      project.id === id 
        ? { ...project, starred: !project.starred } 
        : project
    ));
  };
  
  // 删除项目
  const deleteProject = (id: string) => {
    Modal.confirm({
      title: '确认删除项目',
      content: '删除后不可恢复，确认继续？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const ok = await deleteProjectFile(id);
          if (ok) {
            notify.success('项目已删除');
            await loadProjects();
          } else {
            notify.error(null, '删除项目失败');
          }
        } catch (error) {
          console.error('删除项目失败:', error);
          notify.error(error, '删除项目失败，请稍后重试');
        }
      },
    });
  };
  
  // 创建新项目
  const createNewProject = () => {
    navigate('/project/new');
  };
  
  // 打开项目
  const openProject = (id: string) => {
    addRecentProject(id);
    navigate(`/project/edit/${id}`);
  };
  
  // 项目操作菜单
  const projectMenu = (id: string) => ({
    items: [
      {
        key: '1',
        label: '编辑项目',
        icon: <EditOutlined />,
        onClick: () => openProject(id)
      },
      {
        key: '2',
        label: '复制项目',
        icon: <CopyOutlined />,
        onClick: () => notify.info('复制项目功能即将上线')
      },
      {
        key: '3',
        label: '删除项目',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => deleteProject(id)
      },
    ],
  });
  
  // 键盘导航处理
  const handleProjectKeyDown = (projectId: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openProject(projectId);
    }
  };

  // 渲染网格视图中的项目卡片
  const renderGridItem = (project: Project) => (
    <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
      <Card 
        className={styles.projectCard}
        role="button"
        tabIndex={0}
        onKeyDown={handleProjectKeyDown(project.id)}
        onMouseEnter={() => { void preloadProjectEditPage(); }}
        aria-label={`项目: ${project.title}, 时长: ${formatDuration(project.duration)}`}
        cover={
          <div className={styles.thumbnailContainer}>
            <img 
              alt={project.title} 
              src={project.thumbnail} 
              className={styles.thumbnail}
              loading="lazy"
              decoding="async"
              draggable={false}
              onClick={() => openProject(project.id)}
            />
            <div className={styles.duration}>
              {formatDuration(project.duration)}
            </div>
            <Button 
              className={styles.starButton}
              type="text" 
              icon={project.starred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />} 
              onClick={(e) => {
                e.stopPropagation();
                toggleStar(project.id);
              }}
              aria-label={project.starred ? "取消收藏" : "收藏项目"}
            />
          </div>
        }
        actions={[
          <Tooltip title="编辑项目">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => openProject(project.id)}
              aria-label="编辑项目"
            />
          </Tooltip>,
          <Tooltip title="导出视频">
            <Button 
              type="text" 
              icon={<CloudUploadOutlined />} 
              onClick={() => console.log('导出', project.id)}
              aria-label="导出视频"
            />
          </Tooltip>,
          <Dropdown menu={projectMenu(project.id)} placement="bottomRight" trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} aria-label="更多操作" />
          </Dropdown>
        ]}
      >
        <Card.Meta
          title={
            <Tooltip title={project.title}>
              <div className={styles.projectTitle}>{project.title}</div>
            </Tooltip>
          }
          description={
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <div className={styles.projectInfo}>
                <Text type="secondary">{formatTime(project.updatedAt)}</Text>
                <Text type="secondary">{project.size.toFixed(1)} MB</Text>
              </div>
              <div className={styles.projectTags}>
                {project.tags.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            </Space>
          }
        />
      </Card>
    </Col>
  );
  
  // 渲染列表视图中的项目
  const renderListItem = (project: Project) => (
    <List.Item
      key={project.id}
      role="button"
      tabIndex={0}
      onKeyDown={handleProjectKeyDown(project.id)}
      aria-label={`项目: ${project.title}`}
      actions={[
        <Button
          type="text"
          icon={project.starred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
          onClick={() => toggleStar(project.id)}
          aria-label={project.starred ? "取消收藏" : "收藏项目"}
        />,
        <Button
          type="text"
          icon={<EditOutlined />}
          onMouseEnter={() => { void preloadProjectEditPage(); }}
          onClick={() => openProject(project.id)}
          aria-label="编辑项目"
        />,
        <Button
          type="text"
          icon={<CloudUploadOutlined />}
          onClick={() => console.log('导出', project.id)}
          aria-label="导出视频"
        />,
        <Dropdown menu={projectMenu(project.id)} placement="bottomRight" trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} aria-label="更多操作" />
        </Dropdown>
      ]}
    >
      <List.Item.Meta
        avatar={
          <div className={styles.listThumbnailContainer}>
            <img 
              alt={project.title} 
              src={project.thumbnail} 
              className={styles.listThumbnail}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <div className={styles.listDuration}>
              {formatDuration(project.duration)}
            </div>
          </div>
        }
        title={<a onMouseEnter={() => { void preloadProjectEditPage(); }} onClick={() => openProject(project.id)}>{project.title}</a>}
        description={
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <div className={styles.projectInfo}>
              <Text type="secondary">更新于: {formatTime(project.updatedAt)}</Text>
              <Text type="secondary">大小: {project.size.toFixed(1)} MB</Text>
            </div>
            <div className={styles.projectTags}>
              {project.tags.map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          </Space>
        }
      />
    </List.Item>
  );
  
  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <div>
          <Title level={2}>我的项目</Title>
          <Paragraph type="secondary">管理和编辑您的短视频项目</Paragraph>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={createNewProject}
          onMouseEnter={() => { void preloadProjectEditPage(); }}
          className={styles.newProjectButton}
        >
          新建项目
        </Button>
      </div>
      
      {/* 统计数据 */}
      <Row gutter={16} className={styles.statsRow}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="项目总数"
              value={totalProjects}
              prefix={<FolderOutlined />}
              className={styles.statistic}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总时长"
              value={(totalDuration / 60).toFixed(1)}
              suffix="分钟"
              prefix={<ClockCircleOutlined />}
              className={styles.statistic}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="存储容量"
              value={(totalSize / 1024).toFixed(2)}
              suffix="GB"
              prefix={<BarChartOutlined />}
              className={styles.statistic}
            />
          </Card>
        </Col>
      </Row>
      
      {/* 项目筛选工具栏 */}
      <div className={styles.projectToolbar}>
        <Search
          placeholder="搜索项目..."
          allowClear
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 250 }}
          prefix={<SearchOutlined />}
        />
        <Segmented
          options={[
            {
              value: 'grid',
              icon: <AppstoreOutlined />,
            },
            {
              value: 'list',
              icon: <BarsOutlined />,
            },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />
      </div>
      
      {/* 项目列表 */}
      {loading ? (
        <div className={styles.emptyState}>
          <Empty description="正在加载项目..." />
        </div>
      ) : filteredProjects.length > 0 ? (
        viewMode === 'grid' ? (
          <Row gutter={[16, 16]} className={styles.projectGrid}>
            {filteredProjects.map(renderGridItem)}
          </Row>
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={filteredProjects}
            renderItem={renderListItem}
            className={styles.projectList}
          />
        )
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            searchQuery ? "没有找到匹配的项目" : "还没有创建任何项目"
          }
          className={styles.emptyState}
        >
          <Button type="primary" icon={<PlusOutlined />} onMouseEnter={() => { void preloadProjectEditPage(); }} onClick={createNewProject}>
            创建第一个项目
          </Button>
        </Empty>
      )}
      
      {/* 快速工具 */}
      <Card title="快速工具" className={styles.quickTools}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8} md={6}>
            <Card 
              className={styles.toolCard} 
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/workflow'); } }}
              onMouseEnter={() => { void preloadAIVideoEditorPage(); }} 
              onClick={() => navigate('/workflow')}
              aria-label="模板库: 使用专业模板快速创建"
            >
              <VideoCameraOutlined className={styles.toolIcon} />
              <div className={styles.toolTitle}>模板库</div>
              <div className={styles.toolDesc}>使用专业模板快速创建</div>
            </Card>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Card 
              className={styles.toolCard} 
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/projects'); } }}
              onMouseEnter={() => { void preloadProjectsPage(); }} 
              onClick={() => navigate('/projects')}
              aria-label="素材库: 管理您的视频素材"
            >
              <FolderOutlined className={styles.toolIcon} />
              <div className={styles.toolTitle}>素材库</div>
              <div className={styles.toolDesc}>管理您的视频素材</div>
            </Card>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Card 
              className={styles.toolCard} 
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/ai-editor'); } }}
              onMouseEnter={() => { void preloadAIVideoEditorPage(); }} 
              onClick={() => navigate('/ai-editor')}
              aria-label="AI 助手: 智能生成内容与剪辑"
            >
              <FireOutlined className={styles.toolIcon} />
              <div className={styles.toolTitle}>AI 助手</div>
              <div className={styles.toolDesc}>智能生成内容与剪辑</div>
            </Card>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Card 
              className={styles.toolCard} 
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/settings'); } }}
              onMouseEnter={() => { void preloadSettingsPage(); }} 
              onClick={() => navigate('/settings')}
              aria-label="数据分析: 查看您的创作数据"
            >
              <BarChartOutlined className={styles.toolIcon} />
              <div className={styles.toolTitle}>数据分析</div>
              <div className={styles.toolDesc}>查看您的创作数据</div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Dashboard; 
