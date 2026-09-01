/**
 * * Workspace - AI 视频剪辑工作区主容器组件
 *
 * 设计系统：AI Cinema Studio
 * - 深炭底：#08080a
 * - 琥珀光：#c8956c（主强调/CTA）
 * - 电青色：#5a9e9e（AI 状态/信息）
 * - 字体：Outfit（标题）+ Figtree（正文）
 * - 玻璃拟态：rgba(20, 21, 32, 0.8) + backdrop-filter: blur(20px)
 */
import React, { useRef, useEffect, memo } from 'react';
import {
  Plus,
  Video,
  Cloud,
  FileText,
  Edit,
  Download,
  Bolt,
} from 'lucide-react';
import { useProjectStore } from '@/stores';
import type { WorkflowStep } from '@/core/workflow';
import { WORKFLOW_STEPS } from '@/core/workflow';
import { ErrorBoundary } from '@/components/common/error-boundary';
import styles from './workspace.module.less';
import StepList from './edit-step/step-list';

// ============================================================================
// 类型定义
// ============================================================================

export type { WorkflowStep };

interface StepConfig {
  key: WorkflowStep;
  title: string;
  icon: React.ReactNode;
}

interface WorkspaceProps {
  children?: React.ReactNode;
}

// ============================================================================
// 常量配置
// ============================================================================

const STEPS: StepConfig[] = [
  { key: 'project-create', title: '创建项目', icon: <Plus /> },
  { key: 'video-upload', title: '上传视频', icon: <Video /> },
  { key: 'ai-analyze', title: 'AI 分析', icon: <Cloud /> },
  { key: 'clip-repurpose', title: 'AI 拆条', icon: <Bolt /> },
  { key: 'script-generate', title: '生成文案', icon: <FileText /> },
  { key: 'video-synth', title: '视频合成', icon: <Edit /> },
  { key: 'video-export', title: '导出', icon: <Download /> },
];

// 正确的顺序映射（按照任务描述的视觉顺序）
const STEP_ORDER: readonly WorkflowStep[] = WORKFLOW_STEPS;

// ============================================================================
// 辅助函数
// ============================================================================

const getStepIndex = (step: WorkflowStep): number => STEP_ORDER.indexOf(step);

const isStepAccessible = (
  step: WorkflowStep,
  currentStep: WorkflowStep,
  stepStatus: Record<WorkflowStep, boolean>
): boolean => {
  // 已完成的步骤可以点击跳转
  if (stepStatus[step]) return true;
  // 当前步骤可访问
  if (step === currentStep) return true;
  // 检查是否是下一步（允许直接进入下一步）
  const currentIndex = getStepIndex(currentStep);
  const targetIndex = getStepIndex(step);
  return targetIndex === currentIndex + 1;
};

// ============================================================================
// 主组件
// ============================================================================

const Workspace: React.FC<WorkspaceProps> = memo(({ children }) => {
  const { state, setStep } = useProjectStore();
  const { currentStep, stepStatus } = state;
  const activeStepRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 自动滚动当前步骤到可视区
  useEffect(() => {
    if (activeStepRef.current && typeof activeStepRef.current.scrollIntoView === 'function') {
      activeStepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentStep]);

  // 内容切换动画
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.classList.remove(styles.contentEntering);
      // 触发重排以重新应用动画
      void contentRef.current.offsetWidth;
      contentRef.current.classList.add(styles.contentEntering);
    }
  }, [currentStep]);

  const handleStepClick = (step: WorkflowStep) => {
    if (isStepAccessible(step, currentStep, stepStatus)) {
      setStep(step);
    }
  };

  return (
    <div className={styles.cutDeck}>
      {/* 左侧：垂直步骤列表 */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>AI 剪辑流程</h2>
          <p className={styles.sidebarSubtitle}>
            {Object.values(stepStatus).filter(Boolean).length} / {STEPS.length} 步骤完成
          </p>
        </div>

        <StepList
          mode={state.mode}
          currentStep={currentStep}
          stepStatus={stepStatus}
          onStepClick={handleStepClick}
          activeStepRef={activeStepRef}
        />
      </aside>

      {/* 右侧：内容区 (错误边界隔离 — 单步崩溃不丢整体工作态) */}
      <main className={styles.contentArea} ref={contentRef}>
        <div className={styles.contentCard}>
          <ErrorBoundary name={`step-${currentStep}`}>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
});

Workspace.displayName = 'Workspace';
export default Workspace;

