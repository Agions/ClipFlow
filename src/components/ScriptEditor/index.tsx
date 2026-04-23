import React, { memo, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { ScriptEditorProps, isWorkflowProps } from './types';
import styles from './ScriptEditor.module.less';

const WorkflowEditor = lazy(() => import('./WorkflowEditor'));
const OriginalEditor = lazy(() => import('./OriginalEditor'));

const EditorFallback: React.FC = () => (
  <Card className={styles.scriptEditor}>
    <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="animate-spin text-3xl">⟳</div>
      <p className="text-sm text-muted-foreground">编辑器模块加载中...</p>
    </CardContent>
  </Card>
);

/**
 * 脚本编辑器组件
 * 支持两种模式：
 * 1. 原始模式：基于 videoPath 和 segments
 * 2. Workflow 模式：基于 script 对象
 */
const ScriptEditor: React.FC<ScriptEditorProps> = (props) => {
  const isWorkflowMode = isWorkflowProps(props);

  if (isWorkflowMode) {
    const { script, scenes, onSave, onScriptUpdate } = props;

    if (!script) {
      return (
        <Card className={styles.scriptEditor}>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <FileText size={48} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">暂无脚本数据</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Suspense fallback={<EditorFallback />}>
        <WorkflowEditor
          script={script}
          scenes={scenes}
          onSave={onSave}
          onScriptUpdate={onScriptUpdate}
        />
      </Suspense>
    );
  }

  const { videoPath, initialSegments, onSave, onExport } = props;

  return (
    <Suspense fallback={<EditorFallback />}>
      <OriginalEditor
        videoPath={videoPath}
        initialSegments={initialSegments}
        onSave={onSave}
        onExport={onExport}
      />
    </Suspense>
  );
};

export default memo(ScriptEditor);
