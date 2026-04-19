import { logger } from '@/utils/logger';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Button, Card, Row, Col,
  Space, Tag, Timeline, Spin
} from 'antd';
import {
  VideoCameraOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ExperimentOutlined,
  ScissorOutlined,
  SoundOutlined,
  ExportOutlined,
  ProjectOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { getFileSizeBytes, listProjects, PROJECTS_CHANGED_EVENT } from '@/services/tauri';
import { preloadProjectEditPage, preloadProjectsPage } from '@/core/utils/route-preload';
import {
  extractProjectMediaMetrics,
  pickPreferredSizeMb,
  resolveProjectVideoPath,
  type RawProjectRecord,
} from '@/shared';
import styles from './index.module.less';

const { Title, Paragraph, Text } = Typography;

// Amber brand color
const AMBER = '#d4a574';

interface HomeProjectItem {
  id: string;
  name?: string;
  description?: string;
  createdAt?: string;
  updatedAt: string;
  status?: 'draft' | 'processing' | 'completed' | 'archived';
  durationSec?: number;
  sizeMb?: number;
}

// 工作流步骤 — 统一琥珀色调
const workflowSteps = [
  { icon: <VideoCameraOutlined />, title: '上传视频', desc: '支持 MP4/MOV/WebM', color: AMBER },
  { icon: <ThunderboltOutlined />, title: '智能分析', desc: '场景检测 · 关键帧', color: '#c49660' },
  { icon: <FileTextOutlined />, title: '脚本生成', desc: '8大AI模型 · 7种模板', color: '#e2c49a' },
  { icon: <ExperimentOutlined />, title: '去重优化', desc: '原创性保障', color: '#06b6d4' },
  { icon: <ScissorOutlined />, title: '智能剪辑', desc: '时间轴编排', color: '#10b981' },
  { icon: <ExportOutlined />, title: '导出发布', desc: '720p ~ 4K', color: '#f43f5e' },
];

// AI 模型标签
const aiModels = ['GPT-5.3 Codex', 'o3', 'Claude Sonnet 4.6', 'Gemini 3.1 Pro Preview', 'Gemini 3.1 Flash Lite Preview', 'Qwen-Max-Latest', 'GLM-5', 'Kimi K2.5'];

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

const Home = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { settings } = useSettings();
  const [projects, setProjects] = useState<HomeProjectItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const loadProjects = useCallback(async (activeRef?: { current: boolean }) => {
    setProjectsLoading(true);
    try {
      const rawProjects = await listProjects();
      if (activeRef && !activeRef.current) {
        return;
      }
      const filtered = (Array.isArray(rawProjects) ? rawProjects : []).filter(
        (project) => typeof project.id === 'string'
      );
      const enriched = await concurrentMap(filtered, async (project) => {
        const metrics = extractProjectMediaMetrics(project);
        const videoPath = resolveProjectVideoPath(project);
        const exactSizeMb = videoPath ? (await getFileSizeBytes(videoPath)) / 1024 / 1024 : 0;
        const sizeMb = pickPreferredSizeMb(exactSizeMb, metrics.explicitSizeMb, metrics.estimatedSizeMb);
        return {
          id: String(project.id),
          name: typeof project.name === 'string' ? project.name : '未命名项目',
          description: typeof project.description === 'string' ? project.description : '',
          createdAt: typeof project.createdAt === 'string' ? project.createdAt : new Date().toISOString(),
          updatedAt: typeof project.updatedAt === 'string'
            ? project.updatedAt
            : (typeof project.createdAt === 'string' ? project.createdAt : new Date().toISOString()),
          status: project.status === 'completed' || project.status === 'processing' || project.status === 'archived'
            ? project.status
            : 'draft',
          durationSec: metrics.durationSec,
          sizeMb,
        } satisfies HomeProjectItem;
      });
      if (!activeRef || activeRef.current) {
        setProjects(enriched);
      }
    } catch (error) {
      logger.error('加载首页项目列表失败:', { error });
    } finally {
      if (!activeRef || activeRef.current) {
        setProjectsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const activeRef = { current: true };
    void loadProjects(activeRef);
    const handleProjectsChanged = () => {
      void loadProjects(activeRef);
    };
    window.addEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);
    return () => {
      activeRef.current = false;
      window.removeEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);
    };
  }, [loadProjects]);

  const recentProjects = useMemo(() => {
    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const orderedByRecent = settings.recentProjects
      .map((projectId) => projectMap.get(projectId))
      .filter((project): project is HomeProjectItem => Boolean(project))
      .slice(0, 4);

    if (orderedByRecent.length > 0) {
      return orderedByRecent;
    }

    return [...projects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4);
  }, [projects, settings.recentProjects]);

  const getRelativeTime = (dateText: string) => {
    const time = new Date(dateText).getTime();
    const now = Date.now();
    const diff = now - time;
    if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.floor(diff / (60 * 1000)))} 分钟前`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))} 天前`;
    return new Date(dateText).toLocaleDateString('zh-CN');
  };

  const statsData = useMemo(() => [
    { title: '总项目', value: projects.length, icon: <VideoCameraOutlined />, color: AMBER, suffix: '个' },
    { title: '已完成', value: projects.filter((p) => p.status === 'completed').length, icon: <CheckCircleOutlined />, color: '#10b981', suffix: '个' },
    { title: '本月创作', value: (() => {
      const now = new Date();
      return projects.filter((p) => {
        if (!p.createdAt) return false;
        const d = new Date(p.createdAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length;
    })(), icon: <RocketOutlined />, color: '#f59e0b', suffix: '个' },
    { title: '总时长', value: Number((projects.reduce((s, p) => s + (p.durationSec || 0), 0) / 60).toFixed(1)), icon: <ClockCircleOutlined />, color: '#06b6d4', suffix: '分钟' },
    { title: '存储容量', value: Number((projects.reduce((s, p) => s + (p.sizeMb || 0), 0) / 1024).toFixed(2)), icon: <ProjectOutlined />, color: AMBER, suffix: 'GB' },
  ], [projects]);

  const recentActivities = useMemo(() => {
    const ordered = [...projects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4);

    if (ordered.length === 0) {
      return [{
        color: AMBER,
        title: '开始创建你的第一个项目',
        desc: '点击"创建新项目"进入完整 AI 工作流',
        time: '现在',
        processing: false,
      }];
    }

    return ordered.map((project) => {
      const isCompleted = project.status === 'completed';
      const isProcessing = project.status === 'processing';
      return {
        color: isCompleted ? '#10b981' : isProcessing ? '#f59e0b' : AMBER,
        title: project.name || '未命名项目',
        desc: isCompleted ? '项目已完成' : isProcessing ? '处理中' : '草稿已更新',
        time: getRelativeTime(project.updatedAt),
        processing: isProcessing,
      };
    });
  }, [projects]);

  const hours = new Date().getHours();
  const greeting = hours < 12 ? '早上好' : hours < 18 ? '下午好' : '晚上好';
  const heroGradient = isDarkMode
    ? 'linear-gradient(135deg, #d4a574 0%, #c49660 50%, #b8856a 100%)'
    : 'linear-gradient(135deg, #d4a574 0%, #c49660 100%)';

  return (
    <div className={styles.container}>
      {/* 欢迎横幅 */}
      <Card
        bordered={false}
        className={styles.heroBanner}
        style={{ background: heroGradient }}
        styles={{ body: { padding: '40px 36px', position: 'relative', zIndex: 1 } }}
      >
        <div className={styles.heroGrid} />
        <div className={styles.heroGlow} />

        <Row align="middle" justify="space-between">
          <Col>
            <Title level={2} className={styles.heroTitle}>
              {greeting}，欢迎使用 CutDeck
            </Title>
            <Paragraph className={styles.heroParagraph}>
              AI 驱动的专业视频内容创作平台
            </Paragraph>
            <Space size={12}>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => navigate('/project/new')}
                onMouseEnter={() => { void preloadProjectEditPage(); }}
                className={styles.heroPrimaryBtn}
              >
                创建新项目
              </Button>
              <Button
                size="large"
                icon={<ProjectOutlined />}
                onClick={() => navigate('/projects')}
                onMouseEnter={() => { void preloadProjectsPage(); }}
                className={styles.heroSecondaryBtn}
              >
                项目管理
              </Button>
            </Space>
          </Col>
          <Col>
            <div className={styles.heroIcon}>
              <PlayCircleOutlined />
            </div>
          </Col>
        </Row>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        {statsData.map((item, idx) => (
          <Col xs={12} sm={8} lg={4} key={idx}>
            <Card
              bordered={false}
              className={`${styles.statsCard} ${isDarkMode ? styles.cardDark : styles.cardLight}`}
              styles={{ body: { padding: '20px 24px' } }}
              hoverable
            >
              <div className={styles.statsCardBody}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    className={styles.statIcon}
                    style={{
                      background: isDarkMode ? `${item.color}20` : `${item.color}15`,
                      color: item.color,
                      borderColor: `${item.color}30`,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <Text
                      className={styles.statLabel}
                      style={{ color: isDarkMode ? '#94a3b8' : 'rgba(0,0,0,0.45)' }}
                    >
                      {item.title}
                    </Text>
                    <div
                      className={styles.statValue}
                      style={{ color: isDarkMode ? '#f1f5f9' : 'rgba(0,0,0,0.87)' }}
                    >
                      {item.value}
                      <span
                        className={styles.statSuffix}
                        style={{ color: isDarkMode ? '#64748b' : 'rgba(0,0,0,0.45)' }}
                      >
                        {item.suffix}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 最近项目 */}
      <Card
        bordered={false}
        className={`${styles.recentProjectsCard} ${isDarkMode ? styles.cardDark : styles.cardLight}`}
        title={
          <Space>
            <ClockCircleOutlined style={{ color: AMBER }} />
            <span className={styles.cardTitle}>最近项目</span>
          </Space>
        }
        extra={
          <Button type="link" onMouseEnter={() => { void preloadProjectsPage(); }} onClick={() => navigate('/projects')}>
            查看全部
          </Button>
        }
      >
        {projectsLoading ? (
          <div className={styles.loadingContainer}>
            <Spin />
          </div>
        ) : recentProjects.length === 0 ? (
          <div className={styles.emptyState}>
            <Text type="secondary">暂无项目，先创建一个项目开始创作。</Text>
            <div style={{ marginTop: 10 }}>
              <Button type="primary" icon={<PlusOutlined />} onMouseEnter={() => { void preloadProjectEditPage(); }} onClick={() => navigate('/project/new')}>
                创建项目
              </Button>
            </div>
          </div>
        ) : (
          <Row gutter={[12, 12]}>
            {recentProjects.map((project) => (
              <Col xs={24} sm={12} md={12} lg={6} key={project.id}>
                <Card
                  hoverable
                  className={`${styles.projectCard} ${isDarkMode ? styles.projectCardDark : styles.projectCardLight}`}
                  styles={{ body: { padding: 14 } }}
                  onClick={() => navigate(`/project/edit/${project.id}`)}
                  onMouseEnter={() => { void preloadProjectEditPage(); }}
                >
                  <Text strong ellipsis className={styles.projectCardTitle}>
                    {project.name || '未命名项目'}
                  </Text>
                  <Text type="secondary" ellipsis className={styles.projectCardDesc}>
                    {project.description || '无项目描述'}
                  </Text>
                  <div className={styles.projectCardFooter}>
                    <Tag color="blue">{project.status === 'completed' ? '已完成' : '草稿'}</Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        {/* 工作流程 */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <RocketOutlined style={{ color: AMBER }} />
                <span className={styles.cardTitle}>创作流程</span>
              </Space>
            }
            bordered={false}
            className={`${styles.workflowCard} ${isDarkMode ? styles.cardDark : styles.cardLight}`}
          >
            <Row gutter={[12, 16]}>
              {workflowSteps.map((step, idx) => (
                <Col xs={12} sm={8} key={idx}>
                  <div
                    className={styles.workflowItem}
                    style={{
                      background: isDarkMode ? 'rgba(212, 165, 116, 0.08)' : '#fafafa',
                    }}
                  >
                    <div
                      className={styles.workflowIcon}
                      style={{
                        background: isDarkMode ? `${step.color}20` : `${step.color}15`,
                        color: step.color,
                        borderColor: `${step.color}30`,
                      }}
                    >
                      {step.icon}
                    </div>
                    <div
                      className={styles.workflowStepTitle}
                      style={{ color: isDarkMode ? '#f1f5f9' : 'rgba(0,0,0,0.87)' }}
                    >
                      {step.title}
                    </div>
                    <Text
                      className={styles.workflowStepDesc}
                      style={{ color: isDarkMode ? '#64748b' : 'rgba(0,0,0,0.45)' }}
                    >
                      {step.desc}
                    </Text>
                  </div>
                </Col>
              ))}
            </Row>

            <div className={styles.workflowCtaRow}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/project/new')}
                onMouseEnter={() => { void preloadProjectEditPage(); }}
                className={styles.workflowCtaBtn}
              >
                开始创作 <ArrowRightOutlined />
              </Button>
            </div>
          </Card>
        </Col>

        {/* 最近动态 */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#06b6d4' }} />
                <span className={styles.cardTitle}>最近动态</span>
              </Space>
            }
            bordered={false}
            className={`${styles.activitiesCard} ${isDarkMode ? styles.cardDark : styles.cardLight}`}
          >
            <Timeline
              items={recentActivities.map((item) => ({
                color: item.color,
                children: (
                  <div className={styles.activityItem}>
                    <Text strong style={{ color: isDarkMode ? '#f1f5f9' : 'rgba(0,0,0,0.87)' }}>
                      {item.title}
                    </Text>
                    <div>
                      <Text style={{ fontSize: 12, color: isDarkMode ? '#94a3b8' : 'rgba(0,0,0,0.65)' }}>
                        {item.desc}
                      </Text>
                      {item.processing && (
                        <Tag color="processing" className={styles.processingTag}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <LineChartOutlined spin /> 处理中
                          </span>
                        </Tag>
                      )}
                    </div>
                    <Text style={{ fontSize: 11, color: isDarkMode ? '#64748b' : 'rgba(0,0,0,0.45)' }}>
                      {item.time}
                    </Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      {/* AI 模型支持 */}
      <Card
        bordered={false}
        className={`${styles.aiModelsCard} ${isDarkMode ? styles.cardDark : styles.cardLight}`}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <div className={styles.aiModelsWrapper}>
          <Text style={{ color: isDarkMode ? '#94a3b8' : 'rgba(0,0,0,0.65)' }}>
            <RocketOutlined style={{ color: '#f59e0b', marginRight: 8 }} />
            支持的 AI 模型
          </Text>
          <Space size={6} wrap>
            {aiModels.map((m) => (
              <Tag
                key={m}
                className={`${styles.aiModelTag} ${isDarkMode ? styles.aiModelTagDark : styles.aiModelTagLight}`}
              >
                {m}
              </Tag>
            ))}
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default Home;
