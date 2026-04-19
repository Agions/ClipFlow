/**
 * CutDeck Dashboard — Redesigned per frontend-design-pro
 *
 * Key improvements:
 * - Skeleton loading (not Spin)
 * - Empty state with clear CTA
 * - Reduced card nesting (was: Card > Card cover > thumbnail)
 * - Consistent 8px spacing grid
 * - Reduced-motion respected
 * - Accessible focus states
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Row, Col, Button, Typography, Tooltip, Dropdown, Input, Modal, Form, Select } from 'antd';
import { logger } from '@/utils/logger';
import {
  PlusOutlined,
  MoreOutlined,
  ClockCircleOutlined,
  StarOutlined,
  StarFilled,
  DeleteOutlined,
  CopyOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { formatDuration, formatDate } from '@/shared';
import styles from './Dashboard.module.less';

const { Title } = Typography;
const { Option } = Select;

interface ProjectType {
  id: string;
  title: string;
  thumbnail: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  duration: number;
  resolution: string;
  starred: boolean;
}

// Raw API/local storage project — exact shape from API or JSON
interface RawProject {
  id?: string;
  name?: string;
  title?: string;
  thumbnail?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  starred?: boolean;
  metadata?: { duration?: number; resolution?: string };
  duration?: number;
  resolution?: string;
}

interface CreateProjectFormValues {
  title: string;
  resolution: string;
  type?: string;
  description?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form] = Form.useForm();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const { projectApi } = await import('@/services/api');
        const data = await projectApi.getAll();
        const mapped: ProjectType[] = (data || []).map((p) => ({
          id: p.id,
          title: p.name || p.title || '',
          thumbnail: p.thumbnail || '',
          description: p.description || '',
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          duration: p.metadata?.duration || 0,
          resolution: p.metadata?.resolution || '1080p',
          starred: p.starred || false,
        }));
        setProjects(mapped);
      } catch {
        logger.warn('API 不可用，使用本地存储');
        const stored = localStorage.getItem('cutdeck_projects');
        const parsed = stored ? JSON.parse(stored) : [];
        const mapped: ProjectType[] = (parsed || []).map((p: RawProject) => ({
          id: p.id || `local_${Date.now()}`,
          title: p.title || p.name || '未命名项目',
          thumbnail: p.thumbnail || '',
          description: p.description || '',
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString(),
          duration: p.duration || p.metadata?.duration || 0,
          resolution: p.resolution || p.metadata?.resolution || '1080p',
          starred: p.starred || false,
        }));
        setProjects(mapped);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const handleCreateProject = useCallback(async (values: CreateProjectFormValues) => {
    logger.info('创建新项目:', { values });
    try {
      const { projectApi } = await import('@/services/api');
      const created = await projectApi.create({
        name: values.title,
        description: values.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const newProject: ProjectType = {
        id: created.id,
        title: created.name || values.title,
        thumbnail: '',
        description: created.description || '',
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        duration: 0,
        resolution: '1080p',
        starred: false,
      };
      setProjects(prev => [newProject, ...prev]);
      // Backup to localStorage
      const local = JSON.parse(localStorage.getItem('cutdeck_projects') || '[]');
      local.unshift(newProject);
      localStorage.setItem('cutdeck_projects', JSON.stringify(local));
    } catch {
      logger.warn('API 创建失败，使用本地存储');
      const localProject: ProjectType = {
        id: `local_${Date.now()}`,
        title: values.title,
        thumbnail: '',
        description: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        duration: 0,
        resolution: '1080p',
        starred: false,
      };
      setProjects(prev => [localProject, ...prev]);
      const local = JSON.parse(localStorage.getItem('cutdeck_projects') || '[]');
      local.unshift(localProject);
      localStorage.setItem('cutdeck_projects', JSON.stringify(local));
    }
    setShowCreateModal(false);
    form.resetFields();
  }, [form]);

  const handleOpenProject = (projectId: string) => navigate(`/editor/${projectId}`);
  const handleStarProject = (projectId: string, isStarred: boolean) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, starred: !isStarred } : p
    ));
  };
  const handleDuplicateProject = (projectId: string) => {
    const source = projects.find(p => p.id === projectId);
    if (!source) return;
    const dup: ProjectType = {
      ...source,
      id: `dup_${Date.now()}`,
      title: `${source.title} (副本)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      starred: false,
    };
    setProjects(prev => [dup, ...prev]);
  };
  const handleDeleteProject = (projectId: string) => {
    setDeletingId(projectId);
    Modal.confirm({
      title: '确定要删除这个项目吗？',
      content: '删除后无法恢复',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const { projectApi } = await import('@/services/api');
          await projectApi.delete(projectId);
        } catch {
          logger.warn('API 删除失败，仅本地删除');
        }
        setProjects(prev => prev.filter(p => p.id !== projectId));
        const local = JSON.parse(localStorage.getItem('cutdeck_projects') || '[]');
        localStorage.setItem('cutdeck_projects', JSON.stringify(local.filter((p: ProjectType) => p.id !== projectId)));
        setDeletingId(null);
      },
      afterClose: () => setDeletingId(null),
    });
  };

  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const aVal = sortBy === 'title' ? a[sortBy].toLowerCase() : new Date(a[sortBy]).getTime();
        const bVal = sortBy === 'title' ? b[sortBy].toLowerCase() : new Date(b[sortBy]).getTime();
        return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });
  }, [projects, searchQuery, sortBy, sortOrder]);

  const sortOptions = [
    { label: '最近编辑', value: 'updatedAt' },
    { label: '创建时间', value: 'createdAt' },
    { label: '名称', value: 'title' },
  ];

  // ── Skeleton Cards (no Spin) ──────────────────────────────────────
  const SkeletonCard = () => (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonThumb} />
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonLine} style={{ width: '70%' }} />
        <div className={styles.skeletonLine} style={{ width: '45%' }} />
        <div className={styles.skeletonLine} style={{ width: '35%' }} />
      </div>
    </div>
  );

  return (
    <div className={styles.dashboardContainer}>
      {/* Header */}
      <div className={styles.dashboardHeader}>
        <Title level={3} className={styles.pageHeading}>我的项目</Title>
        <div className={styles.dashboardActions}>
          <Input
            placeholder="搜索项目..."
            prefix={<SearchOutlined />}
            className={styles.searchInput}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
          />
          <Dropdown
            menu={{
              items: sortOptions.map(opt => ({
                key: opt.value,
                label: opt.label,
                onClick: () => {
                  if (sortBy === opt.value) {
                    setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy(opt.value as typeof sortBy);
                    setSortOrder('desc');
                  }
                },
              })),
            }}
            trigger={['click']}
          >
            <Button icon={<SortAscendingOutlined />}>
              {sortOptions.find(o => o.value === sortBy)?.label}
              {' '}{sortOrder === 'desc' ? '↓' : '↑'}
            </Button>
          </Dropdown>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
            新建项目
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.projectsGrid}>
        {/* Loading: Skeleton grid (not Spinner) */}
        {loading ? (
          <Row gutter={[24, 24]}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Col xs={24} sm={12} md={8} lg={6} key={i}>
                <SkeletonCard />
              </Col>
            ))}
          </Row>
        ) : filteredProjects.length === 0 ? (
          /* Empty state */
          <div className={styles.emptyState} role="status">
            <div className={styles.emptyIconWrap} aria-hidden="true">
              <VideoCameraOutlined className={styles.emptyIcon} />
            </div>
            <h3 className={styles.emptyTitle}>
              {searchQuery ? '没有找到匹配的项目' : '还没有项目'}
            </h3>
            <p className={styles.emptyDescription}>
              {searchQuery
                ? '试试其他关键词'
                : '创建你的第一个视频项目，开始 AI 剪辑之旅'}
            </p>
            {!searchQuery && (
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setShowCreateModal(true)}
                className={styles.emptyCtaBtn}
              >
                创建第一个项目
              </Button>
            )}
          </div>
        ) : (
          <Row gutter={[24, 24]}>
            {filteredProjects.map(project => (
              <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
                {/* Single card — no nested Card wrapper */}
                <article
                  className={styles.projectCard}
                  aria-label={project.title}
                >
                  {/* Thumbnail */}
                  <div
                    className={styles.thumbnailContainer}
                    onClick={() => handleOpenProject(project.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && handleOpenProject(project.id)}
                    aria-label={`打开项目: ${project.title}`}
                  >
                    {project.thumbnail ? (
                      <img
                        alt={project.title}
                        src={project.thumbnail}
                        className={styles.thumbnail}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.thumbnailPlaceholder}>
                        <VideoCameraOutlined className={styles.placeholderIcon} />
                      </div>
                    )}
                    <div className={styles.thumbnailOverlay} aria-hidden="true">
                      <EyeOutlined className={styles.viewIcon} />
                    </div>
                  </div>

                  {/* Info */}
                  <div className={styles.cardBody}>
                    <h4 className={styles.projectTitle}>{project.title}</h4>
                    <div className={styles.projectMeta}>
                      <span className={styles.metaItem}>
                        <ClockCircleOutlined /> {formatDuration(project.duration)}
                      </span>
                      <span className={styles.metaItem}>{project.resolution}</span>
                    </div>
                    <p className={styles.projectDate}>
                      修改于 {formatDate(project.updatedAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className={styles.cardActions}>
                    <Tooltip title={project.starred ? '取消收藏' : '收藏'}>
                      <button
                        className={`${styles.actionBtn} ${project.starred ? styles.starred : ''}`}
                        onClick={() => handleStarProject(project.id, project.starred)}
                        aria-label={project.starred ? '取消收藏' : '收藏'}
                      >
                        {project.starred ? <StarFilled /> : <StarOutlined />}
                      </button>
                    </Tooltip>
                    <Tooltip title="编辑">
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleOpenProject(project.id)}
                        aria-label="编辑项目"
                      >
                        <EditOutlined />
                      </button>
                    </Tooltip>
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'duplicate',
                            label: '复制',
                            icon: <CopyOutlined />,
                            onClick: () => handleDuplicateProject(project.id),
                          },
                          {
                            key: 'delete',
                            label: '删除',
                            icon: <DeleteOutlined />,
                            danger: true,
                            disabled: deletingId === project.id,
                            onClick: () => handleDeleteProject(project.id),
                          },
                        ],
                      }}
                      trigger={['click']}
                    >
                      <button className={styles.actionBtn} aria-label="更多操作">
                        <MoreOutlined />
                      </button>
                    </Dropdown>
                  </div>
                </article>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        title="创建新项目"
        open={showCreateModal}
        onCancel={() => { setShowCreateModal(false); form.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProject}
          initialValues={{ aspectRatio: '16:9', resolution: '1080p', template: 'blank' }}
        >
          <Form.Item
            name="title"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="输入项目名称..." />
          </Form.Item>
          <Form.Item name="aspectRatio" label="宽高比">
            <Select>
              <Option value="16:9">16:9 — 横屏</Option>
              <Option value="9:16">9:16 — 竖屏</Option>
              <Option value="1:1">1:1 — 方形</Option>
              <Option value="4:3">4:3 — 传统</Option>
            </Select>
          </Form.Item>
          <Form.Item name="resolution" label="分辨率">
            <Select>
              <Option value="720p">720p — HD</Option>
              <Option value="1080p">1080p — Full HD</Option>
              <Option value="2K">2K — 2560×1440</Option>
              <Option value="4K">4K — 3840×2160</Option>
            </Select>
          </Form.Item>
          <Form.Item name="template" label="模板">
            <Select>
              <Option value="blank">空白项目</Option>
              <Option value="shortVideo">短视频模板</Option>
              <Option value="documentary">纪录片模板</Option>
              <Option value="vlog">Vlog 模板</Option>
            </Select>
          </Form.Item>
          <Form.Item className={styles.formActions}>
            <Button onClick={() => { setShowCreateModal(false); form.resetFields(); }}>取消</Button>
            <Button type="primary" htmlType="submit" style={{ marginLeft: 8 }}>创建</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Dashboard;
