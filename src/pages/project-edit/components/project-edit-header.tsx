/**
 * 剧工 (Fablr) — 项目新建/编辑页顶部操作栏
 */
import React from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import type { ProjectSaveBehavior } from '@/shared/constants/constants';
import styles from '@/pages/project-edit/index.module.less';

interface ProjectEditHeaderProps {
  isNewProject: boolean;
  loading: boolean;
  initialLoading: boolean;
  saving: boolean;
  saveBehavior: ProjectSaveBehavior;
  autoSaveEnabled: boolean;
  onBack: () => void;
  onSave: () => void;
  onSaveBehaviorChange: (v: ProjectSaveBehavior) => void;
  onAutoSaveToggle: (checked: boolean) => void;
}

export const ProjectEditHeader = React.memo<ProjectEditHeaderProps>(({
  isNewProject,
  loading,
  initialLoading,
  saving,
  saveBehavior,
  autoSaveEnabled,
  onBack,
  onSave,
  onSaveBehaviorChange,
  onAutoSaveToggle,
}) => (
  <div className={styles.headerWrapper}>
    {/* 左侧：返回与标题 */}
    <div className={styles.headerLeft}>
      <button className={styles.backBtn} onClick={onBack} aria-label="返回项目列表">
        <ArrowLeft size={14} />
        <span>返回</span>
      </button>

      <div className={styles.titleCol}>
        <div className={styles.pageHeading}>
          <span>{isNewProject ? '新建影视创作工程' : '编辑影视创作工程'}</span>
          <span className={styles.projectBadge}>
            {isNewProject ? '新工程' : '草稿'}
          </span>
        </div>
        <p className={styles.pageSubheading}>
          配置工程参数并导入原片素材，开启 AI 智能拆条与剧本研磨流水线
        </p>
      </div>
    </div>

    {/* 右侧：保存选项与主操作按钮 */}
    <div className={styles.headerRightActions}>
      <div className={styles.controlItem}>
        <span>保存后：</span>
        <select
          className={styles.darkInput}
          style={{ padding: '4px 8px', fontSize: '11px', height: '28px' }}
          value={saveBehavior}
          onChange={e => onSaveBehaviorChange(e.target.value as ProjectSaveBehavior)}
        >
          <option value="workspace">直达剪辑工作台 (推荐)</option>
          <option value="script">进入剧本研磨工坊</option>
          <option value="asset">进入素材拆条工坊</option>
          <option value="stay">留在编辑页</option>
          <option value="detail">查看项目总览</option>
        </select>
      </div>

      <div className={styles.controlItem}>
        <span>自动保存</span>
        <input
          type="checkbox"
          checked={autoSaveEnabled}
          onChange={e => onAutoSaveToggle(e.target.checked)}
          className="accent-purple-500 cursor-pointer"
        />
      </div>

      <button
        className={styles.saveProjectBtn}
        onClick={onSave}
        disabled={loading || initialLoading || saving}
      >
        <Save size={13} />
        <span>{saving ? '正在保存中...' : '保存工程'}</span>
      </button>
    </div>
  </div>
));

ProjectEditHeader.displayName = 'ProjectEditHeader';
