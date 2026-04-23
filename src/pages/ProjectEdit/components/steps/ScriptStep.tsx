/**
 * ScriptStep — 编辑脚本步骤
 */
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
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

    <div className={cn(styles.stepActions, 'flex items-center gap-2')}>
      <Button variant="outline" onClick={onPrev}>上一步</Button>
      <Button className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white" onClick={onSaveProject} disabled={loading || saving}>
        {saving ? '保存中...' : '保存项目'}
      </Button>
    </div>
  </Card>
);
