/**
 * StepList — 垂直步骤列表组件
 * 展示 AI 剪辑流程的步骤进度，支持点击跳转
 */
import React, { memo } from 'react';
import { Plus, Video, Cloud, Download, Check, Bolt, Brain, Eye, PenTool, Mic } from 'lucide-react';
import type { WorkflowStep, WorkflowMode } from '@/core/workflow';
import styles from '../workspace.module.less';

// ============================================================================
// 类型定义
// ============================================================================

interface StepConfig {
  key: WorkflowStep;
  title: string;
  icon: React.ReactNode;
}

interface StepListProps {
  mode: WorkflowMode;
  currentStep: WorkflowStep;
  stepStatus: Record<WorkflowStep, boolean>;
  onStepClick: (step: WorkflowStep) => void;
  activeStepRef: React.RefObject<HTMLDivElement | null>;
}

// ============================================================================
// 常量配置
// ============================================================================

const CLIP_STEPS_CONFIG: StepConfig[] = [
  { key: 'project-create', title: '创建项目', icon: <Plus /> },
  { key: 'video-upload', title: '上传视频', icon: <Video /> },
  { key: 'ai-analyze', title: 'AI 分析', icon: <Cloud /> },
  { key: 'clip-repurpose', title: 'AI 拆条', icon: <Bolt /> },
  { key: 'video-export', title: '导出', icon: <Download /> },
];

const COMMENTARY_STEPS_CONFIG: StepConfig[] = [
  { key: 'project-create', title: '创建项目', icon: <Plus /> },
  { key: 'video-upload', title: '上传视频', icon: <Video /> },
  { key: 'ai-analyze', title: 'AI 分析', icon: <Cloud /> },
  { key: 'semantic-segment', title: '语义分段', icon: <Brain /> },
  { key: 'director-review', title: '导演审核', icon: <Eye /> },
  { key: 'script-generate', title: '解说词生成', icon: <PenTool /> },
  { key: 'voice-synth', title: '配音合成', icon: <Mic /> },
  { key: 'video-export', title: '导出', icon: <Download /> },
];

const STEP_ORDER: Record<WorkflowMode, readonly WorkflowStep[]> = {
  clip: ['project-create', 'video-upload', 'ai-analyze', 'clip-repurpose', 'video-export'],
  commentary: ['project-create', 'video-upload', 'ai-analyze', 'semantic-segment', 'director-review', 'script-generate', 'voice-synth', 'video-export'],
};

// ============================================================================
// 辅助函数
// ============================================================================

const getStepsConfig = (mode: WorkflowMode): StepConfig[] => {
  return mode === 'clip' ? CLIP_STEPS_CONFIG : COMMENTARY_STEPS_CONFIG;
};

const isStepCompleted = (
  step: WorkflowStep,
  stepStatus: Record<WorkflowStep, boolean>
): boolean => stepStatus[step];

const isStepAccessible = (
  step: WorkflowStep,
  currentStep: WorkflowStep,
  stepStatus: Record<WorkflowStep, boolean>,
  mode: WorkflowMode
): boolean => {
  // 已完成的步骤可以点击跳转
  if (stepStatus[step]) return true;
  // 当前步骤可访问
  if (step === currentStep) return true;
  // 检查是否是下一步（允许直接进入下一步）
  const order = STEP_ORDER[mode];
  const currentIndex = order.indexOf(currentStep);
  const targetIndex = order.indexOf(step);
  return targetIndex === currentIndex + 1;
};

// ============================================================================
// 组件
// ============================================================================

const StepList: React.FC<StepListProps> = memo(({
  mode,
  currentStep,
  stepStatus,
  onStepClick,
  activeStepRef,
}) => {
  const STEPS = getStepsConfig(mode);

  return (
    <div className={styles.stepList}>
      {STEPS.map((step, index) => {
        const completed = isStepCompleted(step.key, stepStatus);
        const active = step.key === currentStep;
        const accessible = isStepAccessible(step.key, currentStep, stepStatus, mode);

        // 判断进行中：当前步骤且未完成
        const inProgress = active && !completed;

        let statusClass = styles.stepItemPending;
        if (completed) statusClass = styles.stepItemCompleted;
        else if (active) statusClass = styles.stepItemActive;
        else if (inProgress) statusClass = styles.stepItemInProgress;

        return (
          <div key={step.key} className={styles.stepWrapper}>
            {/* 连接线（除最后一个） */}
            {index < STEPS.length - 1 && (
              <div
                className={`${styles.stepConnector} ${
                  completed ? styles.connectorCompleted : ''
                }`}
              />
            )}

            {/* 步骤项 */}
            <div
              className={`${styles.stepItem} ${statusClass} ${
                accessible ? styles.stepItemAccessible : ''
              }`}
              onClick={() => accessible && onStepClick(step.key)}
              role="button"
              tabIndex={accessible ? 0 : -1}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && accessible) {
                  onStepClick(step.key);
                }
              }}
              ref={(active ? activeStepRef : null) as React.RefObject<HTMLDivElement>}
            >
              {/* 状态图标 */}
              <div className={styles.stepIconWrapper}>
                {completed ? (
                  <span className={`${styles.stepIcon} ${styles.iconCompleted}`}>
                    <Check />
                  </span>
                ) : inProgress ? (
                  <span className={`${styles.stepIcon} ${styles.iconInProgress}`}>
                    <Bolt />
                  </span>
                ) : (
                  <span className={`${styles.stepIcon} ${styles.iconPending}`}>
                    {step.icon}
                  </span>
                )}
              </div>

              {/* 步骤文字 */}
              <div className={styles.stepText}>
                <span className={styles.stepTitle}>{step.title}</span>
                {completed && (
                  <span className={styles.stepStatus}>已完成</span>
                )}
                {inProgress && (
                  <span className={styles.stepStatusInProgress}>进行中</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

StepList.displayName = 'StepList';

export default StepList;