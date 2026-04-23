/**
 * 欢迎头部组件
 */
import React from 'react';
import { Plus } from 'lucide-react';
import { preloadProjectEditPage } from '@/core/utils/route-preload';
import { useAppStore } from '@/store';
import styles from '../index.module.less';

interface WelcomeHeaderProps {
  onCreateProject: () => void;
}

const WelcomeHeader: React.FC<WelcomeHeaderProps> = React.memo(({ onCreateProject }) => {
  const user = useAppStore((state) => state.user);

  const handleMouseEnter = () => {
    void preloadProjectEditPage();
  };

  return (
    <div className={styles.dashboardHeader}>
      <div className={styles.headerLeft}>
        <h1 className={styles.pageTitle}>我的项目</h1>
        <p className={styles.pageSubtitle}>管理和编辑您的短视频项目</p>
      </div>
      <div className={styles.headerActions}>
        <button
          className={styles.createButton}
          onClick={onCreateProject}
          onMouseEnter={handleMouseEnter}
          aria-label="新建项目"
        >
          <Plus className={styles.createButtonIcon} />
          新建项目
        </button>
      </div>
    </div>
  );
});

export default WelcomeHeader;
WelcomeHeader.displayName = 'WelcomeHeader';
