/**
 * ScriptStep — 编辑脚本步骤
 */
import React from 'react';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import ScriptEditor from '@/components/script-editor';
import type { ScriptSegment } from '@/types';
import styles from '@/pages/project-edit/index.module.less';

interface ScriptStepProps {
  videoPath: string;
  initialSegments: ScriptSegment[];
  saving: boolean;
  loading: boolean;
  onSave: (segments: ScriptSegment[]) => void;
  onExport: (format: string) => void;
  onPrev: () => void;
  onSaveProject: () => void;
}

export const ScriptStep: React.FC<ScriptStepProps> = ({
  videoPath,
  initialSegments,
  saving,
  loading,
  onSave,
  onExport,
  onPrev,
  onSaveProject,
}) => (
  <div className={styles.stepCard}>
    <div className={styles.stepCardHeader}>
      <div className={styles.stepCardTitle}>
        <Sparkles size={16} className="text-purple-400" />
        <span>3. 剧本研磨与分镜台词优化</span>
      </div>
      <p className={styles.stepCardDesc}>
        对拆解出的画面分镜与解说台词进行精细化调整，确认无误后即可保存并进入多轨视听剪辑。
      </p>
    </div>

    <ScriptEditor
      videoPath={videoPath}
      initialSegments={initialSegments}
      onSave={onSave}
      onExport={onExport}
    />

    <div className={styles.stepBottomActions}>
      <button className={styles.prevStepBtn} onClick={onPrev}>
        <ArrowLeft size={14} />
        <span>上一步：返回视听拆解</span>
      </button>

      <button
        className={styles.nextStepBtn}
        onClick={onSaveProject}
        disabled={loading || saving}
      >
        <Save size={14} />
        <span>{saving ? '正在保存工程...' : '保存工程并完成创建'}</span>
      </button>
    </div>
  </div>
);
