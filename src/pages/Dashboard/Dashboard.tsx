/**
 * CutDeck Dashboard — AI Cinema Studio
 * 全新视觉系统：深炭底 + 琥珀光 + 电青色
 */
import React from 'react';
import { useDashboard } from './hooks/useDashboard';
import WelcomeHeader from './components/WelcomeHeader';
import StatsOverview from './components/StatsOverview';
import RecentProjects from './components/RecentProjects';
import QuickActions from './components/QuickActions';
import styles from './index.module.less';

const Dashboard: React.FC = () => {
  const {
    projects,
    loading,
    stats,
    toggleStar,
    deleteProject,
    createNewProject,
    openProject,
  } = useDashboard();

  return (
    <div className={styles.dashboardContainer}>
      {/* 页面头部 */}
      <WelcomeHeader onCreateProject={createNewProject} />

      {/* 统计数据 */}
      <StatsOverview stats={stats} />

      {/* 项目列表 */}
      <RecentProjects
        projects={projects}
        loading={loading}
        onOpenProject={openProject}
        onToggleStar={toggleStar}
        onDeleteProject={deleteProject}
        onCreateProject={createNewProject}
      />

      {/* 快速工具 */}
      <QuickActions />
    </div>
  );
};

export default Dashboard;
