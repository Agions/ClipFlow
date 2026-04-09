/**
 * 工作流监控面板组件
 * 实时显示工作流状态、进度和详细信息
 */

import React, { useMemo } from 'react';
import { Card, Progress, Timeline, Tag, Space, Typography, Statistic, Row, Col, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { WorkflowStep, WorkflowState } from '@/core/services/workflow/types';
import { WORKFLOW_STEP_CONFIG } from '@/core/workflow/featureBlueprint';

const { Text, Title } = Typography;

interface WorkflowMonitorProps {
  /** 工作流状态 */
  state: WorkflowState;
  /** 工作流步骤列表 */
  steps: Array<{ key: WorkflowStep; title: string; description: string }>;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 自定义样式 */
  className?: string;
}

/**
 * 获取步骤状态图标
 */
const getStepStatusIcon = (
  stepKey: WorkflowStep,
  currentStep: WorkflowStep,
  completedSteps: WorkflowStep[],
  status: WorkflowState['status']
) => {
  // 当前运行中的步骤
  if (stepKey === currentStep && status === 'running') {
    return <LoadingOutlined spin />;
  }

  // 已完成的步骤
  if (completedSteps.includes(stepKey)) {
    return <CheckCircleOutlined />;
  }

  // 当前步骤(未运行)
  if (stepKey === currentStep && status === 'paused') {
    return <PauseCircleOutlined />;
  }

  // 当前步骤(等待中)
  if (stepKey === currentStep) {
    return <PlayCircleOutlined />;
  }

  // 等待中的步骤
  return <ClockCircleOutlined />;
};

/**
 * 获取步骤状态颜色
 */
const getStepStatusColor = (
  stepKey: WorkflowStep,
  currentStep: WorkflowStep,
  completedSteps: WorkflowStep[],
  status: WorkflowState['status']
): string => {
  if (completedSteps.includes(stepKey)) {
    return 'success';
  }

  if (stepKey === currentStep) {
    if (status === 'error') {
      return 'error';
    }
    if (status === 'paused') {
      return 'warning';
    }
    return 'processing';
  }

  return 'default';
};

/**
 * 获取状态标签
 */
const getStatusTag = (status: WorkflowState['status']) => {
  const config = {
    idle: { color: 'default', text: '空闲' },
    running: { color: 'processing', text: '运行中' },
    paused: { color: 'warning', text: '已暂停' },
    completed: { color: 'success', text: '已完成' },
    error: { color: 'error', text: '出错' },
  };

  const { color, text } = config[status];
  return <Tag color={color}>{text}</Tag>;
};

/**
 * 计算工作流统计信息
 */
const calculateStats = (
  currentStep: WorkflowStep,
  steps: WorkflowStep[],
  completedSteps: WorkflowStep[]
) => {
  const total = steps.length;
  const completed = completedSteps.length;
  const currentIndex = steps.indexOf(currentStep);
  const remaining = total - completed - (currentIndex >= 0 ? 1 : 0);

  return { total, completed, remaining, progress: Math.round((completed / total) * 100) };
};

/**
 * 工作流监控面板
 */
export const WorkflowMonitor: React.FC<WorkflowMonitorProps> = ({
  state,
  steps,
  showDetails = true,
  className,
}) => {
  const { step: currentStep, status, progress, error } = state;

  // 获取已完成步骤列表(从数据中推断)
  const completedSteps = useMemo(() => {
    const completed: WorkflowStep[] = [];
    const stepOrder: WorkflowStep[] = [
      'upload',
      'analyze',
      'template-select',
      'script-generate',
      'script-dedup',
      'script-edit',
      'ai-clip',
      'timeline-edit',
      'preview',
      'export',
    ];

    const currentIndex = stepOrder.indexOf(currentStep);
    for (let i = 0; i < currentIndex; i++) {
      completed.push(stepOrder[i]);
    }

    return completed;
  }, [currentStep]);

  // 计算统计数据
  const stats = useMemo(
    () => calculateStats(currentStep, steps.map((s) => s.key) as WorkflowStep[], completedSteps),
    [currentStep, steps, completedSteps]
  );

  // 格式化时间
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${seconds}秒`;
  };

  return (
    <Card className={className} size="small">
      {/* 标题和状态 */}
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
          <Title level={5} style={{ margin: 0 }}>
            工作流监控
          </Title>
          {getStatusTag(status)}
        </Space>

        {/* 进度条 */}
        <Progress
          percent={progress}
          status={status === 'error' ? 'exception' : status === 'completed' ? 'success' : 'active'}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />

        {/* 统计信息 */}
        {showDetails && (
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="总步骤"
                value={stats.total}
                suffix={`/ ${stats.total}`}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="已完成"
                value={stats.completed}
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="剩余"
                value={stats.remaining}
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
          </Row>
        )}

        {/* 错误信息 */}
        {status === 'error' && error && (
          <Card size="small" type="inner" style={{ backgroundColor: '#fff2f0', borderColor: '#ffccc7' }}>
            <Text type="danger">{error}</Text>
          </Card>
        )}

        {/* 步骤时间线 */}
        <Timeline
          mode="left"
          items={steps.map((step) => {
            const stepConfig = WORKFLOW_STEP_CONFIG[step.key];
            const isCompleted = completedSteps.includes(step.key as WorkflowStep);
            const isCurrent = step.key === currentStep;

            const children: React.ReactNode = (
              <Space direction="vertical" size={0}>
                <Text strong={isCurrent}>{step.title}</Text>
                {showDetails && stepConfig ? (
                  <React.Fragment>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {step.description}
                    </Text>
                    {stepConfig.skippable ? (
                      <Tag color="blue" style={{ marginLeft: 4 }}>
                        可跳过
                      </Tag>
                    ) : null}
                  </React.Fragment>
                ) : null}
              </Space>
            );

            return {
              key: step.key,
              dot: getStepStatusIcon(step.key as WorkflowStep, currentStep, completedSteps, status),
              color: getStepStatusColor(step.key as WorkflowStep, currentStep, completedSteps, status),
              children,
            };
          })}
        />

        </Space>
      </Card>
    );
  };





/**
 * 简洁版工作流监控
 */
export const WorkflowMonitorMini: React.FC<{
  state: WorkflowState;
  steps: Array<{ key: WorkflowStep; title: string }>;
}> = ({ state, steps }) => {
  const { step: currentStep, status, progress } = state;

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
        <Text>{steps.find((s) => s.key === currentStep)?.title || '未知'}</Text>
        <Tag color={status === 'running' ? 'processing' : status === 'completed' ? 'success' : 'default'}>
          {status === 'running' ? '运行中' : status === 'completed' ? '完成' : status === 'paused' ? '暂停' : '就绪'}
        </Tag>
      </Space>
      <Progress percent={progress} size="small" status={status === 'error' ? 'exception' : undefined} />
    </Space>
  );
};

export default WorkflowMonitor;
