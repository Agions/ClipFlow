/**
 * 统计概览组件
 */
import React from 'react';
import { Row, Col } from 'antd';
import { FolderOutlined, ClockCircleOutlined, BarChartOutlined } from '@ant-design/icons';
import { DashboardStats } from '../types';
import styles from '../index.module.less';

interface StatsOverviewProps {
  stats: DashboardStats;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  return (
    <Row gutter={16} className={styles.statsRow}>
      <Col xs={24} sm={8}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            <FolderOutlined className={styles.statIcon} />
            项目总数
          </div>
          <div className={styles.statValue}>
            {stats.totalProjects}
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
            {(stats.totalDuration / 60).toFixed(1)}
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
            {(stats.totalSize / 1024).toFixed(2)}
            <span className={styles.statUnit}>GB</span>
          </div>
        </div>
      </Col>
    </Row>
  );
};

export default StatsOverview;
