import { logger } from '@/utils/logger';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Row, Col } from '@/components/ui/grid';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Video, Plus, Play, Rocket, Zap, FileText, Clock, CheckCircle, ArrowRight,
  FlaskConical, Scissors, VolumeX, Download, Folder, TrendingUp, Loader2,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { getFileSizeBytes, listProjects, PROJECTS_CHANGED_EVENT } from '@/services/tauri';
import { preloadProjectEditPage, preloadProjectsPage } from '@/core/utils/route-preload';
import {
  extractProjectMediaMetrics,
  pickPreferredSizeMb,
  resolveProjectVideoPath,
} from '@/shared';
import styles from './index.module.less';

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

const workflowSteps = [
  { icon: <Video size={20} />, title: '上传视频', desc: '支持 MP4/MOV/WebM', color: AMBER },
  { icon: <Zap size={20} />, title: '智能分析', desc: '场景检测 · 关键帧', color: '#c49660' },
  { icon: <FileText size={20} />, title: '脚本生成', desc: '8大AI模型 · 7种模板', color: '#e2c49a' },
  { icon: <FlaskConical size={20} />, title: '去重优化', desc: '原创性保障', color: '#06b6d4' },
  { icon: <Scissors size={20} />, title: '智能剪辑', desc: '时间轴编排', color: '#10b981' },
  { icon: <Download size={20} />, title: '导出发布', desc: '720p ~ 4K', color: '#f43f5e' },
];

const aiModels = ['GPT-5.3 Codex', 'o3', 'Claude Sonnet 4.6', 'Gemini 3.1 Pro Preview', 'Gemini 3.1 Flash Lite Preview', 'Qwen-Max-Latest', 'GLM-5', 'Kimi K2.5'];

const concurrentMap = async <T, R>(items: T[], fn: (item: T) => Promise<R>, limit = 8): Promise<R[]> => {
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
      if (activeRef && !activeRef.current) return;
      const filtered = (Array.isArray(rawProjects) ? rawProjects : []).filter((project) => typeof project.id === 'string');
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
          updatedAt: typeof project.updatedAt === 'string' ? project.updatedAt : (typeof project.createdAt === 'string' ? project.createdAt : new Date().toISOString()),
          status: project.status === 'completed' || project.status === 'processing' || project.status === 'archived' ? project.status : 'draft',
          durationSec: metrics.durationSec,
          sizeMb,
        } satisfies HomeProjectItem;
      });
      if (!activeRef || activeRef.current) setProjects(enriched);
    } catch (error) {
      logger.error('加载首页项目列表失败:', { error });
    } finally {
      if (!activeRef || activeRef.current) setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    const activeRef = { current: true };
    void loadProjects(activeRef);
    const handleProjectsChanged = () => { void loadProjects(activeRef); };
    window.addEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);
    return () => {
      activeRef.current = false;
      window.removeEventListener(PROJECTS_CHANGED_EVENT, handleProjectsChanged);
    };
  }, [loadProjects]);

  const recentProjects = useMemo(() => {
    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const orderedByRecent = settings.recentProjects.map((projectId) => projectMap.get(projectId))
      .filter((project): project is HomeProjectItem => Boolean(project))
      .slice(0, 4);
    if (orderedByRecent.length > 0) return orderedByRecent;
    return [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4);
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
    { title: '总项目', value: projects.length, icon: <Video size={18} />, color: AMBER, suffix: '个' },
    { title: '已完成', value: projects.filter((p) => p.status === 'completed').length, icon: <CheckCircle size={18} />, color: '#10b981', suffix: '个' },
    { title: '本月创作', value: (() => {
      const now = new Date();
      return projects.filter((p) => {
        if (!p.createdAt) return false;
        const d = new Date(p.createdAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length;
    })(), icon: <Rocket size={18} />, color: '#f59e0b', suffix: '个' },
    { title: '总时长', value: Number((projects.reduce((s, p) => s + (p.durationSec || 0), 0) / 60).toFixed(1)), icon: <Clock size={18} />, color: '#06b6d4', suffix: '分钟' },
    { title: '存储容量', value: Number((projects.reduce((s, p) => s + (p.sizeMb || 0), 0) / 1024).toFixed(2)), icon: <Folder size={18} />, color: AMBER, suffix: 'GB' },
  ], [projects]);

  const recentActivities = useMemo(() => {
    const ordered = [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4);
    if (ordered.length === 0) return [{ color: AMBER, title: '开始创建你的第一个项目', desc: '点击"创建新项目"进入完整 AI 工作流', time: '现在', processing: false }];
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
  const heroGradient = isDarkMode ? 'linear-gradient(135deg, #d4a574 0%, #c49660 50%, #b8856a 100%)' : 'linear-gradient(135deg, #d4a574 0%, #c49660 100%)';

  return (
    <div className={styles.container}>
      {/* 欢迎横幅 */}
      <Card
        bordered={false}
        className={styles.heroBanner}
        styles={{ body: { padding: '40px 36px', position: 'relative', zIndex: 1 } }}
        style={{ background: heroGradient }}
      >
        <div className={styles.heroGrid} />
        <div className={styles.heroGlow} />
        <Row align="middle" justify="space-between">
          <Col>
            <h2 className={styles.heroTitle}>{greeting}，欢迎使用 CutDeck</h2>
            <p className={styles.heroParagraph}>AI 驱动的专业视频内容创作平台</p>
            <div className="flex gap-3">
              <Button
                size="lg"
                className="bg-white/20 border-0 hover:bg-white/30 text-white"
                onClick={() => navigate('/project/new')}
                onMouseEnter={() => { void preloadProjectEditPage(); }}
              >
                <Plus size={16} className="mr-1" />
                创建新项目
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => navigate('/projects')}
                onMouseEnter={() => { void preloadProjectsPage(); }}
              >
                <Folder size={16} className="mr-1" />
                项目管理
              </Button>
            </div>
          </Col>
          <Col>
            <div className={styles.heroIcon}><Play size={48} /></div>
          </Col>
        </Row>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        {statsData.map((item, idx) => (
          <Col xs={12} sm={8} lg={4} key={idx}>
            <Card bordered={false} className={`${styles.statsCard} ${isDarkMode ? styles.cardDark : styles.cardLight}`}>
              <div className="flex items-center gap-3">
                <div className={styles.statIcon} style={{ background: isDarkMode ? `${item.color}20` : `${item.color}15`, color: item.color }}>
                  {item.icon}
                </div>
                <div>
                  <div className={`${styles.statLabel} ${isDarkMode ? 'text-slate-400' : 'text-black/45'}`}>{item.title}</div>
                  <div className={`${styles.statValue} ${isDarkMode ? 'text-slate-100' : 'text-black/87'}`}>
                    {item.value}<span className={`${styles.statSuffix} ${isDarkMode ? 'text-slate-600' : 'text-black/45'}`}>{item.suffix}</span>
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
        header={
          <div className="flex items-center gap-2">
            <Clock size={16} style={{ color: AMBER }} />
            <span className={styles.cardTitle}>最近项目</span>
          </div>
        }
        footer={
          <Button type="link" onMouseEnter={() => { void preloadProjectsPage(); }} onClick={() => navigate('/projects')}>
            查看全部
          </Button>
        }
      >
        {projectsLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin" /></div>
        ) : recentProjects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-3">暂无项目，先创建一个项目开始创作。</p>
            <Button onClick={() => navigate('/project/new')}>
              <Plus size={14} className="mr-1" />创建项目
            </Button>
          </div>
        ) : (
          <Row gutter={[12, 12]}>
            {recentProjects.map((project) => (
              <Col xs={24} sm={12} md={12} lg={6} key={project.id}>
                <Card
                  hoverable
                  className={`${styles.projectCard} ${isDarkMode ? styles.projectCardDark : styles.projectCardLight}`}
                  onClick={() => navigate(`/project/edit/${project.id}`)}
                  onMouseEnter={() => { void preloadProjectEditPage(); }}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <span className={`${styles.projectCardTitle} font-semibold truncate`}>{project.name || '未命名项目'}</span>
                      <Badge variant={project.status === 'completed' ? 'success' : 'secondary'}>
                        {project.status === 'completed' ? '已完成' : '草稿'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{project.description || '无项目描述'}</p>
                    <span className="text-xs text-muted-foreground">{new Date(project.updatedAt).toLocaleDateString('zh-CN')}</span>
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
            header={
              <div className="flex items-center gap-2">
                <Rocket size={16} style={{ color: AMBER }} />
                <span className={styles.cardTitle}>创作流程</span>
              </div>
            }
            bordered={false}
            className={`${styles.workflowCard} ${isDarkMode ? styles.cardDark : styles.cardLight}`}
          >
            <Row gutter={[12, 16]}>
              {workflowSteps.map((step, idx) => (
                <Col xs={12} sm={8} key={idx}>
                  <div className={styles.workflowItem} style={{ background: isDarkMode ? 'rgba(212, 165, 116, 0.08)' : '#fafafa' }}>
                    <div className={styles.workflowIcon} style={{ background: isDarkMode ? `${step.color}20` : `${step.color}15`, color: step.color }}>
                      {step.icon}
                    </div>
                    <div className={`${styles.workflowStepTitle} ${isDarkMode ? 'text-slate-100' : 'text-black/87'}`}>{step.title}</div>
                    <div className={`${styles.workflowStepDesc} ${isDarkMode ? 'text-slate-500' : 'text-black/45'}`}>{step.desc}</div>
                  </div>
                </Col>
              ))}
            </Row>
            <div className="mt-4 flex justify-center">
              <Button className="bg-gradient-to-r from-[#667eea] to-[#764ba2] border-0" onClick={() => navigate('/project/new')}>
                开始创作 <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </Card>
        </Col>

        {/* 最近动态 */}
        <Col xs={24} lg={10}>
          <Card
            header={
              <div className="flex items-center gap-2">
                <TrendingUp size={16} style={{ color: '#06b6d4' }} />
                <span className={styles.cardTitle}>最近动态</span>
              </div>
            }
            bordered={false}
            className={`${styles.activitiesCard} ${isDarkMode ? styles.cardDark : styles.cardLight}`}
          >
            <div className="flex flex-col gap-3">
              {recentActivities.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${isDarkMode ? 'text-slate-100' : 'text-black/87'}`}>{item.title}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-black/65'}`}>{item.desc}</span>
                      {item.processing && (
                        <Badge variant="warning" className="text-xs">
                          <Loader2 size={10} className="animate-spin mr-1" />处理中
                        </Badge>
                      )}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-slate-600' : 'text-black/45'}`}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* AI 模型支持 */}
      <Card bordered={false} className={`${styles.aiModelsCard} ${isDarkMode ? styles.cardDark : styles.cardLight}`}>
        <div className="flex items-center gap-2 mb-3">
          <Rocket size={14} style={{ color: '#f59e0b' }} />
          <span className={isDarkMode ? 'text-slate-400' : 'text-black/65'}>支持的 AI 模型</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {aiModels.map((m) => (
            <Badge key={m} variant="outline" className={`${styles.aiModelTag} ${isDarkMode ? styles.aiModelTagDark : styles.aiModelTagLight}`}>
              {m}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Home;
