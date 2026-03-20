import React, { memo, lazy, Suspense } from 'react';
import { Card, Typography, Spin } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { ScriptEditorProps, isWorkflowProps } from './types';
import styles from './ScriptEditor.module.less';

const { Text } = Typography;
const WorkflowEditor = lazy(() => import('./WorkflowEditor'));
const OriginalEditor = lazy(() => import('./OriginalEditor'));

const EditorFallback: React.FC = () => (
  <Card className={styles.scriptEditor}>
    <div className={styles.emptyState}>
      <Spin size="large" />
      <Text type="secondary">编辑器模块加载中...</Text>
    </div>
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

  // Workflow 模式渲染
  if (isWorkflowMode) {
    const { script, scenes, onSave, onScriptUpdate } = props;

    if (!script) {
      return (
        <Card className={styles.scriptEditor}>
          <div className={styles.emptyState}>
            <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <Text type="secondary">暂无脚本数据</Text>
          </div>
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

  // 原始模式渲染
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
