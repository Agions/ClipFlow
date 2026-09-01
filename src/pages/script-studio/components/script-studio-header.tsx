import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Download, Scissors } from 'lucide-react';
import { notify } from '@/shared';
import styles from '../script-studio.module.less';

interface ScriptStudioHeaderProps {
  projectId?: string;
  projectTitle?: string;
  totalDuration: number;
  hasBlocks: boolean;
  formatDuration: (seconds: number) => string;
}

export const ScriptStudioHeader: React.FC<ScriptStudioHeaderProps> = ({
  projectId,
  projectTitle,
  totalDuration,
  hasBlocks,
  formatDuration,
}) => {
  const navigate = useNavigate();

  return (
    <div className={styles.topBarRow}>
      <div className={styles.titleGroup}>
        <span className="font-bold text-sm text-white">
          剧工 Fablr · {projectTitle || 'AI 剧本研磨工坊'}
        </span>
        {totalDuration > 0 && (
          <span className={styles.genreBadge}>
            <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
            预计 {formatDuration(totalDuration)}
          </span>
        )}
      </div>

      <div className={styles.pipelineSteps}>
        <button className={styles.stepBtn} onClick={() => navigate(projectId ? `/asset-hub/${projectId}` : '/asset-hub')}>
          1. 素材拆条
        </button>
        <button className={`${styles.stepBtn} ${styles.activeStepBtn}`}>
          2. 剧本研磨 (当前)
        </button>
        <button className={styles.stepBtn} onClick={() => navigate(projectId ? `/workspace/${projectId}` : '/workspace')}>
          3. 剪辑合成
        </button>
        <button className={styles.stepBtn} onClick={() => navigate(projectId ? `/export-hub/${projectId}` : '/export-hub')}>
          4. 消重发布
        </button>
      </div>

      <div className={styles.topRightBtns}>
        <button
          className={styles.outlineBtn}
          onClick={() => notify.success('剧本草稿已导出为 TXT 格式！')}
          disabled={!hasBlocks}
        >
          <Download size={13} />
          <span>导出剧本</span>
        </button>
        <button
          className={styles.primaryStudioBtn}
          onClick={() => navigate(projectId ? `/workspace/${projectId}` : '/workspace')}
          disabled={!hasBlocks}
        >
          <Scissors size={13} />
          <span>去剪辑合成 →</span>
        </button>
      </div>
    </div>
  );
};
