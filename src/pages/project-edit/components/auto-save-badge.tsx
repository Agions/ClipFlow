/**
 * 剧工 (Fablr) — 自动保存状态指示微胶囊
 */
import React from 'react';
import styles from '@/pages/project-edit/index.module.less';

interface AutoSaveBadgeProps {
  enabled: boolean;
  videoPath: string;
  state: 'idle' | 'saving' | 'saved' | 'error';
  lastAt: string;
}

export const AutoSaveBadge = React.memo<AutoSaveBadgeProps>(({
  enabled,
  videoPath,
  state,
  lastAt,
}) => {
  if (!enabled) {
    return (
      <div className={styles.autoSaveBar}>
        <div className={styles.autoSavePill}>
          <span className={styles.statusDot} />
          <span>自动保存已关闭（如需实时防护请在右上角开启）</span>
        </div>
        <span className="text-[10px] text-text-tertiary">建议开启以防工程丢失</span>
      </div>
    );
  }

  if (!videoPath) {
    return (
      <div className={styles.autoSaveBar}>
        <div className={styles.autoSavePill}>
          <span className={styles.statusDot} />
          <span>待导入原片后启动实时本地防丢存储</span>
        </div>
        <span className="text-[10px] text-text-tertiary">本地加密草稿箱</span>
      </div>
    );
  }

  if (state === 'saving') {
    return (
      <div className={styles.autoSaveBar}>
        <div className={styles.autoSavePill}>
          <span className={`${styles.statusDot} ${styles.statusDotSaving}`} />
          <span className="text-amber-400">正在同步保存工程最新草稿...</span>
        </div>
      </div>
    );
  }

  if (state === 'saved') {
    return (
      <div className={styles.autoSaveBar}>
        <div className={styles.autoSavePill}>
          <span className={`${styles.statusDot} ${styles.statusDotActive}`} />
          <span className="text-emerald-400">
            {lastAt ? `本地草稿已同步保存 (${lastAt})` : '本地草稿已同步保存'}
          </span>
        </div>
        <span className="text-[10px] text-emerald-400/80 font-mono">100% 同步就绪</span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={styles.autoSaveBar}>
        <div className={styles.autoSavePill}>
          <span className={styles.statusDot} style={{ background: '#ef4444' }} />
          <span className="text-red-400">草稿保存异常，请检查磁盘权限</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.autoSaveBar}>
      <div className={styles.autoSavePill}>
        <span className={`${styles.statusDot} ${styles.statusDotActive}`} />
        <span>自动保存待命就绪</span>
      </div>
    </div>
  );
});

AutoSaveBadge.displayName = 'AutoSaveBadge';
