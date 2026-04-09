/**
 * CutDeck Dashboard — AI Cinema Studio
 * 全新视觉系统：深炭底 + 琥珀光 + 电青色
 */
import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Typography,
  Space,
  List,
  Dropdown,
  Tag,
  Empty,
  Tooltip,
  Input,
  Segmented,
  Modal,
  Form,
  Select,
} from 'antd';
import {
  PlusOutlined,
  ClockCircleOutlined,
  VideoCameraOutlined,
  FolderOutlined,
  BarChartOutlined,
  MoreOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  StarOutlined,
  StarFilled,
  AppstoreOutlined,
  BarsOutlined,
  SearchOutlined,
  FireOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  listProjects,
  deleteProject as deleteProjectFile,
  getFileSizeBytes,
  PROJECTS_CHANGED_EVENT,
} from '@/services/tauri';
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

const { Text } = Typography;
const { Search } = Input;

// ============================================================================
// 类型定义
// ============================================================================

/** 项目状态 */
type ProjectStatus = 'draft' | 'processing' | 'completed' | 'failed';

interface Project {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  updatedAt: string;
  size: number;
  starred: boolean;
  tags: string[];
  status: ProjectStatus;
}

// ============================================================================
// 工具函数
// ============================================================================

/** 格式化时间显示 */
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
    return `${diffDays} 天前`;
  } else {
    return targetDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
};

/** 格式化时长 */
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/** 状态配置 */
const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  completed: {
    label: '已完成',
    className: styles.statusCompleted,
    icon: <CheckCircleOutlined />,
  },
  processing: {
    label: 'AI 分析中',
    className: styles.statusProcessing,
    icon: <SyncOutlined />,
  },
  draft: {
    label: '草稿',
    className: styles.statusDraft,
    icon: <FileTextOutlined />,
  },
  failed: {
    label: '失败',
    className: styles.statusDraft,
    icon: <FileTextOutlined />,
  },
};

// ============================================================================
// 状态标签组件
// ============================================================================

const StatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`${styles.statusBadge} ${config.className}`}>
      <span className={styles.statusDot} />
      {config.icon}
      {config.label}
    </span>
  );
};

// ============================================================================
// Dashboard 主组件
// ============================================================================

// 并发限制：避免大量文件操作同时发起
const concurrentMap = async <T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit = 8
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (index < items.length) {
        const i = index++;
        results[i] = await fn(items[i]);
      }
    })()
  );
  await Promise.all(workers);
  return results;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { addRecentProject } = useSettings();
  const [projects, setProjects] = useState<Project[]>([]);
  const [viewMode, setViewMode] = useState<string | number>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // -------------------------------------------------------------------------
  // 加载项目数据
  // -------------------------------------------------------------------------
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const rawProjects = await listProjects();
      const filtered = rawProjects.filter((p) => typeof p.id === 'string');
      const mapped: Project[] = await concurrentMap(
        filtered,
        async (project: any) => {
          const metrics = extractProjectMediaMetrics(project);
          const videoPath = resolveProjectVideoPath(project);
          const exactSizeMb = videoPath
            ? (await getFileSizeBytes(videoPath)) / 1024 / 1024
            : 0;
          const size = pickPreferredSizeMb(
            exactSizeMb,
            metrics.explicitSizeMb,
            metrics.estimatedSizeMb
          );

          return {
            id: String(project.id),
            title: String(project.name || '未命名项目'),
            thumbnail: `https://picsum.photos/seed/${project.id || 'default'}/300/200`,
            updatedAt: String(project.updatedAt || project.createdAt || new Date().toISOString()),
            duration: metrics.durationSec,
            size,
            starred: false,
            tags: [String(project.status || 'draft')],
            status: (project.status as ProjectStatus) ?? 'draft',
          };
        }
      );
      setProjects(mapped);
    } catch (error) {
      logger.error('加载项目失败:', { error });
      notify.error(error, '加载项目失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

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

  // -------------------------------------------------------------------------
  // 统计数据（memoized）
  // -------------------------------------------------------------------------
  const totalProjects = useMemo(() => projects.length, [projects]);
  const totalDuration = useMemo(
    () => projects.reduce((sum, p) => sum + p.duration, 0),
    [projects]
  );
  const totalSize = useMemo(
    () => projects.reduce((sum, p) => sum + p.size, 0),
    [projects]
  );

  // -------------------------------------------------------------------------
  // 搜索过滤
  // -------------------------------------------------------------------------
  const filteredProjects = useMemo(() => {
    if (searchQuery.trim() === '') return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [searchQuery, projects]);

  // -------------------------------------------------------------------------
  // 操作
  // -------------------------------------------------------------------------
  const toggleStar = (id: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, starred: !p.starred } : p))
    );
  };

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
          logger.error('删除项目失败:', { error });
          notify.error(error, '删除项目失败，请稍后重试');
        }
      },
    });
  };

  const createNewProject = () => {
    navigate('/project/new');
  };

  const openProject = (id: string) => {
    addRecentProject(id);
    navigate(`/project/edit/${id}`);
  };

  const projectMenu = (id: string) => ({
    items: [
      {
        key: 'edit',
        label: '编辑项目',
        icon: <EditOutlined />,
        onClick: () => openProject(id),
      },
      {
        key: 'duplicate',
        label: '复制项目',
        icon: <CopyOutlined />,
        onClick: () => notify.info('复制项目功能即将上线'),
      },
      {
        key: 'delete',
        label: '删除项目',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => deleteProject(id),
      },
    ],
  });

  const handleProjectKeyDown = (projectId: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openProject(projectId);
    }
  };

  // -------------------------------------------------------------------------
  // 渲染网格项目卡片
  // -------------------------------------------------------------------------
  const renderGridItem = (project: Project) => (
    <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
      <Card
        className={styles.projectCard}
        role="button"
        tabIndex={0}
        onKeyDown={handleProjectKeyDown(project.id)}
        onMouseEnter={() => {
          void preloadProjectEditPage();
        }}
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
            <div className={styles.duration}>{formatDuration(project.duration)}</div>
            <Tooltip title={project.starred ? '取消收藏' : '收藏'}>
              <Button
                className={styles.starButton}
                type="text"
                icon={
                  project.starred ? (
                    <StarFilled style={{ color: '#FF9F43' }} />
                  ) : (
                    <StarOutlined />
                  )
                }
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStar(project.id);
                }}
                aria-label={project.starred ? '取消收藏' : '收藏项目'}
              />
            </Tooltip>
            <div className={styles.thumbnailOverlay}>
              <VideoCameraOutlined className={styles.viewIcon} />
            </div>
          </div>
        }
        actions={[
          <Tooltip key="edit" title="编辑项目">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openProject(project.id)}
              aria-label="编辑项目"
            />
          </Tooltip>,
          <Tooltip key="export" title="导出视频">
            <Button
              type="text"
              icon={<CloudUploadOutlined />}
              onClick={() => logger.info('导出', { projectId: project.id })}
              aria-label="导出视频"
            />
          </Tooltip>,
          <Dropdown
            key="more"
            menu={projectMenu(project.id)}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button type="text" icon={<MoreOutlined />} aria-label="更多操作" />
          </Dropdown>,
        ]}
      >
        <div className={styles.projectInfo}>
          <div className={styles.projectTitle}>{project.title}</div>
          <div className={styles.projectMeta}>
            <span className={styles.projectTime}>
              <ClockCircleOutlined />
              {formatTime(project.updatedAt)}
            </span>
            <span className={styles.projectSize}>{project.size.toFixed(1)} MB</span>
          </div>
          <StatusBadge status={project.status} />
        </div>
      </Card>
    </Col>
  );

  // -------------------------------------------------------------------------
  // 渲染列表项目
  // -------------------------------------------------------------------------
  const renderListItem = (project: Project) => (
    <List.Item
      key={project.id}
      role="button"
      tabIndex={0}
      onKeyDown={handleProjectKeyDown(project.id)}
      aria-label={`项目: ${project.title}`}
      actions={[
        <Tooltip key="star" title={project.starred ? '取消收藏' : '收藏'}>
          <Button
            type="text"
            icon={
              project.starred ? (
                <StarFilled style={{ color: '#FF9F43' }} />
              ) : (
                <StarOutlined />
              )
            }
            onClick={() => toggleStar(project.id)}
            aria-label={project.starred ? '取消收藏' : '收藏项目'}
          />
        </Tooltip>,
        <Tooltip key="edit" title="编辑项目">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openProject(project.id)}
            aria-label="编辑项目"
          />
        </Tooltip>,
        <Tooltip key="export" title="导出视频">
          <Button
            type="text"
            icon={<CloudUploadOutlined />}
            onClick={() => logger.info('导出', { projectId: project.id })}
            aria-label="导出视频"
          />
        </Tooltip>,
        <Dropdown
          key="more"
          menu={projectMenu(project.id)}
          placement="bottomRight"
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} aria-label="更多操作" />
        </Dropdown>,
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
        title={
          <a
            onClick={() => openProject(project.id)}
          >
            {project.title}
          </a>
        }
        description={
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <div className={styles.projectMeta}>
              <span className={styles.projectTime}>
                <ClockCircleOutlined />
                {formatTime(project.updatedAt)}
              </span>
              <span className={styles.projectSize}>{project.size.toFixed(1)} MB</span>
            </div>
            <StatusBadge status={project.status} />
          </Space>
        }
      />
    </List.Item>
  );

  // -------------------------------------------------------------------------
  // 渲染
  // -------------------------------------------------------------------------
  return (
    <div className={styles.dashboardContainer}>
      {/* 页面头部 */}
      <div className={styles.dashboardHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>我的项目</h1>
          <p className={styles.pageSubtitle}>管理和编辑您的短视频项目</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.createButton}
            onClick={createNewProject}
            onMouseEnter={() => {
              void preloadProjectEditPage();
            }}
            aria-label="新建项目"
          >
            <PlusOutlined className={styles.createButtonIcon} />
            新建项目
          </button>
        </div>
      </div>

      {/* 统计数据 */}
      <Row gutter={16} className={styles.statsRow}>
        <Col xs={24} sm={8}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>
              <FolderOutlined className={styles.statIcon} />
              项目总数
            </div>
            <div className={styles.statValue}>
              {totalProjects}
              <span className={styles.statUnit}>个</span>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>
              <ClockCircleOutlined className={styles.statIcon} />
              总时长
            </div>
            <div className={styles.statValue}>
              {(totalDuration / 60).toFixed(1)}
              <span className={styles.statUnit}>分钟</span>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>
              <BarChartOutlined className={styles.statIcon} />
              存储容量
            </div>
            <div className={styles.statValue}>
              {(totalSize / 1024).toFixed(2)}
              <span className={styles.statUnit}>GB</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* 搜索工具栏 */}
      <div className={styles.projectToolbar}>
        <div className={styles.searchInput}>
          <Search
            placeholder="搜索项目..."
            allowClear
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined />}
          />
        </div>
        <div className={styles.viewToggle}>
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
      </div>

      {/* 项目列表 */}
      {loading ? (
        <Row gutter={[16, 16]} className={styles.projectGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Col xs={24} sm={12} md={8} lg={6} key={i}>
              <Card className={styles.skeletonCard} loading />
            </Col>
          ))}
        </Row>
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
            <span style={{ color: '#8888A0', fontFamily: '"Figtree", sans-serif' }}>
              {searchQuery ? '没有找到匹配的项目' : '还没有创建任何项目'}
            </span>
          }
          className={styles.emptyState}
        >
          <button
            className={styles.emptyButton}
            onClick={createNewProject}
            onMouseEnter={() => {
              void preloadProjectEditPage();
            }}
          >
            <PlusOutlined />
            创建第一个项目
          </button>
        </Empty>
      )}

      {/* 快速工具 */}
      <Card className={styles.quickTools}>
        <Row gutter={[16, 16]} className={styles.toolGrid}>
          <Col xs={24} sm={8} md={6}>
            <Card
              className={styles.toolCard}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/workflow');
                }
              }}
              onMouseEnter={() => {
                void preloadAIVideoEditorPage();
              }}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/projects');
                }
              }}
              onMouseEnter={() => {
                void preloadProjectsPage();
              }}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/ai-editor');
                }
              }}
              onMouseEnter={() => {
                void preloadAIVideoEditorPage();
              }}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/settings');
                }
              }}
              onMouseEnter={() => {
                void preloadSettingsPage();
              }}
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
