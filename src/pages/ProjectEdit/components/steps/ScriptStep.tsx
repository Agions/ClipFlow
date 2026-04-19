/**
 * ScriptStep — 编辑脚本步骤
 */
import React from 'react';
import { Card, Button, Space } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import ScriptEditor from '@/components/ScriptEditor';
import type { ScriptSegment } from '@/core/types';
import styles from '../../index.module.less';

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
  <Card className={styles.stepCard}>
    <ScriptEditor
      videoPath={videoPath}
      initialSegments={initialSegments}
      onSave={onSave}
      onExport={onExport}
    />

    <div className={styles.stepActions}>
      <Space>
        <Button onClick={onPrev}>上一步</Button>
        <Button type="primary" onClick={onSaveProject} loading={saving} disabled={loading}>保存项目</Button>
      </Space>
    </div>
  </Card>
);
