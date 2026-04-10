/**
 * CutDeck - AI 剪辑工作流组件
 *
 * 设计系统：AI Cinema Studio
 * - 深炭底：#0C0D14
 * - 琥珀光：#FF9F43（主强调/CTA）
 * - 电青色：#00D4FF（AI 状态/信息）
 * - 字体：Outfit（标题）+ Figtree（正文）
 * - 玻璃拟态：rgba(20, 21, 32, 0.8) + backdrop-filter: blur(20px)
 */
import React, { useRef, useEffect, memo } from 'react';
import {
  PlusOutlined,
  VideoCameraOutlined,
  CloudSyncOutlined,
  FileTextOutlined,
  EditOutlined,
  ExportOutlined,
  CheckOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useCutDeck, CutDeckStep } from '../AIEditorContext';
import styles from './CutDeck.module.less';

// ============================================================================
// 类型定义
// ============================================================================

export type { CutDeckStep };

interface StepConfig {
  key: CutDeckStep;
  title: string;
  icon: React.ReactNode;
}

interface CutDeckProps {
  children?: React.ReactNode;
}

// ============================================================================
// 常量配置
// ============================================================================

const STEPS: StepConfig[] = [
  { key: 'project-create', title: '上传视频', icon: <PlusOutlined /> },
  { key: 'video-upload', title: '视频上传', icon: <VideoCameraOutlined /> },
  { key: 'ai-analyze', title: 'AI 分析', icon: <CloudSyncOutlined /> },
  { key: 'clip-repurpose', title: 'AI 拆条', icon: <ThunderboltOutlined /> },
  { key: 'script-generate', title: '生成片段', icon: <FileTextOutlined /> },
  { key: 'video-synthesize', title: '文案生成', icon: <EditOutlined /> },
  { key: 'export', title: '视频合成', icon: <ExportOutlined /> },
];

// 正确的顺序映射（按照任务描述的视觉顺序）
const STEP_ORDER: CutDeckStep[] = [
  'project-create',
  'video-upload',
  'ai-analyze',
  'clip-repurpose',
  'script-generate',
  'video-synthesize',
  'export',
];

// ============================================================================
// 辅助函数
// ============================================================================

const getStepIndex = (step: CutDeckStep): number => STEP_ORDER.indexOf(step);

const isStepCompleted = (
  step: CutDeckStep,
  stepStatus: Record<CutDeckStep, boolean>
): boolean => stepStatus[step];

const isStepAccessible = (
  step: CutDeckStep,
  currentStep: CutDeckStep,
  stepStatus: Record<CutDeckStep, boolean>
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
// 子组件：步骤列表
// ============================================================================

interface StepListProps {
  currentStep: CutDeckStep;
  stepStatus: Record<CutDeckStep, boolean>;
  onStepClick: (step: CutDeckStep) => void;
  activeStepRef: React.RefObject<HTMLDivElement | null>;
}

const StepList: React.FC<StepListProps> = ({
  currentStep,
  stepStatus,
  onStepClick,
  activeStepRef,
}) => {
  return (
    <div className={styles.stepList}>
      {STEPS.map((step, index) => {
        const completed = isStepCompleted(step.key, stepStatus);
        const active = step.key === currentStep;
        const accessible = isStepAccessible(step.key, currentStep, stepStatus);

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
              ref={active ? activeStepRef : null}
            >
              {/* 状态图标 */}
              <div className={styles.stepIconWrapper}>
                {completed ? (
                  <span className={`${styles.stepIcon} ${styles.iconCompleted}`}>
                    <CheckOutlined />
                  </span>
                ) : inProgress ? (
                  <span className={`${styles.stepIcon} ${styles.iconInProgress}`}>
                    <ThunderboltOutlined />
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
};

// ============================================================================
// 主组件
// ============================================================================

const CutDeck: React.FC<CutDeckProps> = memo(({ children }) => {
  const { state, setStep } = useCutDeck();
  const { currentStep, stepStatus } = state;
  const activeStepRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 自动滚动当前步骤到可视区
  useEffect(() => {
    if (activeStepRef.current) {
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

  const handleStepClick = (step: CutDeckStep) => {
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
          currentStep={currentStep}
          stepStatus={stepStatus}
          onStepClick={handleStepClick}
          activeStepRef={activeStepRef}
        />
      </aside>

      {/* 右侧：内容区 */}
      <main className={styles.contentArea} ref={contentRef}>
        <div className={styles.contentCard}>
          {children}
        </div>
      </main>
    </div>
  );
});

export default CutDeck;
