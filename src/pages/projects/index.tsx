/**
 * 剧工 (Fablr) — 项目管理中心 (Project Hub)
 * 100% 对齐 project_hub_ui 设计稿：黑曜石工业级项目管理枢纽
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Grid3X3,
  List,
  Play,
  Trash2,
  X,
  Settings,
  User,
  Sparkles,
} from 'lucide-react';
import { withErrorBoundary } from '@/components/common/error-boundary';
import { useAppStore } from '@/stores/app-store';
import { useProjectList } from '@/hooks/use-project-list';
import { formatRelativeDate } from '@/shared/utils/formatting';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import styles from './index.module.less';

const POSTER_GRADIENTS = [
  'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
  'linear-gradient(135deg, #092c3e 0%, #085a6a 50%, #0d9488 100%)',
  'linear-gradient(135deg, #2e1065 0%, #581c87 50%, #7e22ce 100%)',
  'linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)',
  'linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)',
];

const ProjectManager: React.FC = () => {
  const navigate = useNavigate();
  const { userSettings: settings, addRecentProject } = useAppStore();

  const {
    viewMode,
    searchText,
    statusFilter,
    deleteConfirmId,
    filteredProjects,
    statusFilters,
    setViewMode,
    setSearchText,
    setStatusFilter,
    setDeleteConfirmId,
    confirmDelete,
  } = useProjectList({ recentProjects: settings.recentProjects });

  // Selected project for Right Inspector
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const activeSelectedProject =
    filteredProjects.find(p => p.id === selectedProjectId) || filteredProjects[0] || null;

  return (
    <div className={styles.pageContainer}>
      {/* ── 顶部工具检索栏 ── */}
      <div className={styles.topSearchRow}>
        <div className={styles.searchBox}>
          <Search size={15} className="text-text-tertiary" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="搜索项目、素材或台词关键词..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>

        <div className={styles.topActionRight}>
          <select className={styles.dropdownSelect} defaultValue="time">
            <option value="time">按创建时间排序</option>
            <option value="name">按项目名称排序</option>
          </select>

          <button
            className={styles.newProjectHeaderBtn}
            onClick={() => navigate('/project/new')}
          >
            <Plus size={15} />
            新建创作项目
          </button>
        </div>
      </div>

      {/* ── 状态过滤器与视图切换 ── */}
      <div className={styles.filterToolbar}>
        <div className={styles.filterTabs}>
          {statusFilters.map(f => (
            <button
              key={f.filter}
              className={`${styles.tabBtn} ${statusFilter === f.filter ? styles.activeTabBtn : ''}`}
              onClick={() => setStatusFilter(f.filter)}
            >
              {f.label} <span className={styles.countBadge}>{f.value}</span>
            </button>
          ))}
        </div>

        <div className={styles.viewToggleGroup}>
          <button
            className={`${styles.viewToggleBtn} ${viewMode === 'grid' ? styles.activeView : ''}`}
            onClick={() => setViewMode('grid')}
            title="网格视图"
          >
            <Grid3X3 size={15} />
          </button>
          <button
            className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.activeView : ''}`}
            onClick={() => setViewMode('list')}
            title="列表视图"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* ── 主体区域：项目卡片网格 + 右侧检查官 ── */}
      <div className={styles.mainContentGrid}>
        {/* 左/中：卡片流或列表 */}
        <div className={styles.cardsArea}>
          {filteredProjects.length === 0 ? (
            <div className={styles.emptyStateContainer}>
              <Sparkles size={40} className="text-purple-400 opacity-40 mb-2" />
              <div className="text-sm font-bold text-white mb-1">未检索到匹配的创作项目</div>
              <div className="text-xs text-text-tertiary mb-4">可以尝试调整搜索关键词或重置状态过滤</div>
              <button
                className={styles.newProjectHeaderBtn}
                onClick={() => navigate('/project/new')}
              >
                <Plus size={15} /> 新建创作项目
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className={styles.projectGrid}>
              {filteredProjects.map((project, idx) => {
                const isSelected = activeSelectedProject?.id === project.id;
                const isCompleted = project.status === 'completed';
                const isProcessing = project.status === 'processing';
                const statusLabel = isCompleted ? '已完成' : isProcessing ? '渲染中 65%' : '草稿中';
                const posterGradient = POSTER_GRADIENTS[idx % POSTER_GRADIENTS.length];

                return (
                  <div
                    key={project.id}
                    className={`${styles.projectCard} ${isSelected ? styles.selectedCard : ''}`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    {/* 16:9 封面 */}
                    <div
                      className={styles.cardPoster}
                      style={{ background: posterGradient }}
                    >
                      <span className={styles.timeTag}>03:15</span>
                      <span className={styles.resTag}>2K/24fps</span>
                      <div className={styles.centerPlayBtn}>
                        <Play size={20} className="fill-white text-white ml-0.5" />
                      </div>
                    </div>

                    {/* 卡片详情 */}
                    <div className={styles.cardBody}>
                      <div className={styles.cardProjectTitle}>{project.name}</div>
                      <div className={styles.tagRow}>
                        <span className={styles.hashTag}>#影视解说</span>
                        <span className={styles.hashTag}>#科幻动作</span>
                        <span className={styles.hashTag}>{isCompleted ? '#已完成' : '#处理中'}</span>
                      </div>

                      <div className={styles.progressRow}>
                        <span className="text-[10px] text-text-tertiary">状态: {statusLabel}</span>
                        <div className={styles.progressTrack}>
                          <div
                            className={styles.progressFill}
                            style={{
                              width: isCompleted ? '100%' : isProcessing ? '65%' : '20%',
                              background: isCompleted
                                ? '#10b981'
                                : 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
                            }}
                          />
                        </div>
                      </div>

                      <div className={styles.creatorRow}>
                        <div className="flex items-center gap-1.5 text-text-tertiary text-[11px]">
                          <User size={11} /> 创作者: 专业解说员
                        </div>
                      </div>

                      {/* 底部 3 按钮操作组 */}
                      <div className={styles.actionRow}>
                        <button
                          type="button"
                          className={styles.enterStudioBtn}
                          onClick={e => {
                            e.stopPropagation();
                            addRecentProject(project.id);
                            navigate(`/workspace/${project.id}`);
                          }}
                        >
                          进入工作台
                        </button>
                        <button
                          type="button"
                          className={styles.secondaryActionBtn}
                          onClick={e => {
                            e.stopPropagation();
                            navigate('/export-hub');
                          }}
                        >
                          导出
                        </button>
                        <button
                          type="button"
                          className={styles.dangerActionBtn}
                          onClick={e => {
                            e.stopPropagation();
                            setDeleteConfirmId(project.id);
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 列表视图 */
            <div className="flex flex-col gap-2">
              {filteredProjects.map((project, idx) => (
                <div
                  key={project.id}
                  className={`${styles.listItem} ${activeSelectedProject?.id === project.id ? styles.selectedCard : ''}`}
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={styles.listThumb}
                      style={{ background: POSTER_GRADIENTS[idx % POSTER_GRADIENTS.length] }}
                    >
                      <Play size={14} className="fill-white text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white truncate">{project.name}</div>
                      <div className="text-xs text-text-tertiary truncate">
                        {project.description || 'AI 影视解说 · 5轨合成项目'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-text-secondary">
                    <span>{formatRelativeDate(project.updatedAt)}</span>
                    <button
                      type="button"
                      className={styles.enterStudioBtn}
                      onClick={e => {
                        e.stopPropagation();
                        addRecentProject(project.id);
                        navigate(`/workspace/${project.id}`);
                      }}
                    >
                      进入工作台
                    </button>
                    <button
                      type="button"
                      className={styles.dangerActionBtn}
                      onClick={e => {
                        e.stopPropagation();
                        setDeleteConfirmId(project.id);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 右侧：快速项目信息检查官 (Quick Project Inspector) ── */}
        {activeSelectedProject && (
          <aside className={styles.inspectorSidebar}>
            <div className={styles.inspectorHeader}>
              <span className={styles.inspectorTitle}>快速项目信息检查官</span>
              <button
                className={styles.closeInspectorBtn}
                onClick={() => setSelectedProjectId(null)}
              >
                <X size={14} />
              </button>
            </div>

            {/* 封面与时间码 */}
            <div
              className={styles.inspectorCover}
              style={{ background: POSTER_GRADIENTS[0] }}
            >
              <span className={styles.timeTag}>03:15</span>
              <Play size={32} className="fill-white text-white/90" />
            </div>

            {/* 属性清单 */}
            <div className={styles.propList}>
              <div className={styles.propItem}>
                <span className={styles.propLabel}>项目名称</span>
                <span className={styles.propValue}>{activeSelectedProject.name}</span>
              </div>

              <div className={styles.propItem}>
                <span className={styles.propLabel}>工程 ID</span>
                <span className={`${styles.propValue} font-mono text-[11px] text-text-tertiary`}>
                  {activeSelectedProject.id}
                </span>
              </div>

              <div className={styles.propItem}>
                <span className={styles.propLabel}>创作者</span>
                <span className={styles.propValue}>专业版创作者</span>
              </div>

              <div className={styles.propItem}>
                <span className={styles.propLabel}>渲染状态</span>
                <span className="text-cyan-400 font-semibold text-xs">
                  {activeSelectedProject.status === 'completed' ? '已渲染完成' : '制作中 · 65%'}
                </span>
              </div>

              <div className={styles.propItem}>
                <span className={styles.propLabel}>更新时间</span>
                <span className={styles.propValue}>
                  {formatRelativeDate(activeSelectedProject.updatedAt)}
                </span>
              </div>

              <div className={styles.propItem}>
                <span className={styles.propLabel}>标签分类</span>
                <div className="flex gap-1 flex-wrap">
                  <span className={styles.hashTag}>#预告片</span>
                  <span className={styles.hashTag}>#科幻</span>
                  <span className={styles.hashTag}>#处理中</span>
                </div>
              </div>
            </div>

            {/* 检查官底部直达按钮 */}
            <div className={styles.inspectorFooter}>
              <button
                className={styles.inspectorPrimaryBtn}
                onClick={() => {
                  addRecentProject(activeSelectedProject.id);
                  navigate(`/workspace/${activeSelectedProject.id}`);
                }}
              >
                进入工作台
              </button>
              <button
                className={styles.inspectorSecondaryBtn}
                onClick={() => navigate(`/project/edit/${activeSelectedProject.id}`)}
              >
                <Settings size={13} /> 项目设置
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* ── 删除确认弹窗 ── */}
      {deleteConfirmId && (
        <AlertDialog open onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent className="bg-[#141522] border border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>确认彻底删除该创作项目？</AlertDialogTitle>
              <AlertDialogDescription className="text-text-tertiary">
                删除后该项目草稿、分镜台词与本地渲染中间缓存将无法恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setDeleteConfirmId(null)}
                className="bg-white/10 text-white border-0"
              >
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => confirmDelete(deleteConfirmId)}
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default withErrorBoundary(ProjectManager, { name: 'ProjectManager' });