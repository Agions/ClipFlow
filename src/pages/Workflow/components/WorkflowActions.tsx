import React, { memo } from 'react';
import { Card, Button, Space } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { WorkflowStep } from '@/core/services/workflow/types';
import styles from '../index.module.less';

interface WorkflowActionsProps {
  currentStep: WorkflowStep | 'ai-clip';
  currentStepIndex: number;
  stepKeys: Array<WorkflowStep | 'ai-clip'>;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  canStart: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onReset: () => void;
  onJumpToStep: (step: WorkflowStep) => void;
}

const WorkflowActions: React.FC<WorkflowActionsProps> = ({
  currentStepIndex,
  stepKeys,
  isRunning,
  isPaused,
  isCompleted,
  canStart,
  onStart,
  onPause,
  onResume,
  onCancel,
  onReset,
  onJumpToStep,
}) => {
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === stepKeys.length - 1;
  const isMiddleStep = !isFirstStep && !isLastStep && !isRunning;

  return (
    <Card className={styles.actionCard}>
      <Space>
        {isFirstStep && (
          <Button type="primary" size="large" onClick={onStart} disabled={!canStart}>
            启动 AI 自主创作
          </Button>
        )}

        {isRunning && (
          <>
            <Button
              icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              onClick={isPaused ? onResume : onPause}
            >
              {isPaused ? '继续' : '暂停'}
            </Button>
            <Button danger onClick={onCancel}>
              取消
            </Button>
          </>
        )}

        {isCompleted && (
          <Button type="primary" icon={<ReloadOutlined />} onClick={onReset}>
            启动下一个 AI 项目
          </Button>
        )}

        {isMiddleStep && (
          <>
            <Button
              onClick={() =>
                onJumpToStep(stepKeys[currentStepIndex - 1] as WorkflowStep)
              }
            >
              上一步
            </Button>
            <Button
              type="primary"
              onClick={() =>
                onJumpToStep(stepKeys[currentStepIndex + 1] as WorkflowStep)
              }
            >
              下一步
            </Button>
          </>
        )}
      </Space>
    </Card>
  );
};

export default memo(WorkflowActions);
