/**
 * 统计概览组件
 */
import React from 'react';
import { Folder, Clock, BarChart3 } from 'lucide-react';
import { DashboardStats } from '../types';
import styles from '../index.module.less';

interface StatsOverviewProps {
  stats: DashboardStats;
}

const StatsOverview: React.FC<StatsOverviewProps> = React.memo(({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className={styles.statCard}>
        <div className={styles.statLabel}>
          <Folder size={16} className={styles.statIcon} />
          项目总数
        </div>
        <div className={styles.statValue}>
          {stats.totalProjects}
          <span className={styles.statUnit}>个</span>
        </div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>
          <Clock size={16} className={styles.statIcon} />
          总时长
        </div>
        <div className={styles.statValue}>
          {(stats.totalDuration / 60).toFixed(1)}
          <span className={styles.statUnit}>分钟</span>
        </div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>
          <BarChart3 size={16} className={styles.statIcon} />
          存储容量
        </div>
        <div className={styles.statValue}>
          {(stats.totalSize / 1024).toFixed(2)}
          <span className={styles.statUnit}>GB</span>
        </div>
      </div>
    </div>
  );
});

export default StatsOverview;
StatsOverview.displayName = 'StatsOverview';
