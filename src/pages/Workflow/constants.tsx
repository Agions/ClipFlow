import {
  EyeOutlined,
  FileTextOutlined,
  EditOutlined,
  
  PlayCircleOutlined,
  DownloadOutlined,
  ScissorOutlined,
  UploadOutlined,
  UserOutlined,
  AudioOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import type { WorkflowStep } from '@/core/types';
import type { WorkflowMode } from '@/core/workflow/featureBlueprint';
import { WORKFLOW_MODE_DEFINITIONS, WORKFLOW_STEP_CONFIG, getWorkflowModeSummary } from '@/core/workflow/featureBlueprint';

/**
 * 基础工作流步骤定义
 */
const BASE_WORKFLOW_STEPS: Array<{
  key: WorkflowStep | 'ai-clip';
  title: string;
  description: string;
  icon: React.ReactNode;
  skippable?: boolean;
}> = [
  {
    key: 'upload',
    title: '上传视频',
    description: '选择要处理的视频文件',
    icon: <UploadOutlined />,
    skippable: false,
  },
  {
    key: 'analyze',
    title: '视频分析',
    description: 'AI 智能分析视频内容',
    icon: <EyeOutlined />,
    skippable: false,
  },
  {
    key: 'template-select',
    title: '选择模板',
    description: '选择解说脚本模板',
    icon: <FileTextOutlined />,
    skippable: false,
  },
  {
    key: 'script-generate',
    title: '生成脚本',
    description: 'AI 自动生成解说词',
    icon: <RocketOutlined />,
    skippable: false,
  },
  {
    key: 'script-dedup',
    title: '原创性检测',
    description: '检测并优化重复内容',
    icon: <CheckCircleOutlined />,
    skippable: true,
  },
  {
    key: 'script-edit',
    title: '编辑脚本',
    description: '修改和完善解说词',
    icon: <EditOutlined />,
    skippable: true,
  },
  {
    key: 'ai-clip',
    title: 'AI 剪辑',
    description: '智能剪辑点检测与优化',
    icon: <ScissorOutlined />,
    skippable: false,
  },
  {
    key: 'timeline-edit',
    title: '时间轴',
    description: '调整视频和音频',
    icon: <AppstoreOutlined />,
    skippable: true,
  },
  {
    key: 'preview',
    title: '预览',
    description: '预览最终效果',
    icon: <PlayCircleOutlined />,
    skippable: false,
  },
  {
    key: 'export',
    title: '导出',
    description: '导出最终视频',
    icon: <DownloadOutlined />,
    skippable: false,
  },
];

/**
 * 工作流模式选项
 */
export const WORKFLOW_MODE_OPTIONS: Array<{
  value: WorkflowMode;
  label: string;
  icon: React.ReactNode;
  description: string;
  summary: string;
}> = [
  { 
    value: 'ai-commentary', 
    label: 'AI 解说', 
    icon: <AudioOutlined />,
    description: WORKFLOW_MODE_DEFINITIONS['ai-commentary'].description,
    summary: getWorkflowModeSummary('ai-commentary'),
  },
  { 
    value: 'ai-mixclip', 
    label: 'AI 混剪', 
    icon: <ScissorOutlined />,
    description: WORKFLOW_MODE_DEFINITIONS['ai-mixclip'].description,
    summary: getWorkflowModeSummary('ai-mixclip'),
  },
  { 
    value: 'ai-first-person', 
    label: '第一人称', 
    icon: <UserOutlined />,
    description: WORKFLOW_MODE_DEFINITIONS['ai-first-person'].description,
    summary: getWorkflowModeSummary('ai-first-person'),
  },
];

/**
 * 获取工作流步骤列表
 */
export const getWorkflowSteps = (mode: WorkflowMode) => {
  const modeConfig = WORKFLOW_MODE_DEFINITIONS[mode];
  const allowedStepKeys = new Set(modeConfig.steps);
  return BASE_WORKFLOW_STEPS.filter((step) => allowedStepKeys.has(step.key));
};

/**
 * 获取步骤配置
 */
export const getStepConfig = (stepKey: string) => {
  return WORKFLOW_STEP_CONFIG[stepKey] || null;
};

/**
 * 计算工作流总进度
 */
export const calculateWorkflowProgress = (
  currentStepIndex: number,
  totalSteps: number,
  stepProgress: number = 0
): number => {
  if (totalSteps === 0) return 0;
  const baseProgress = (currentStepIndex / totalSteps) * 100;
  const currentStepContribution = (stepProgress / 100) * (1 / totalSteps) * 100;
  return Math.min(100, baseProgress + currentStepContribution);
};

/**
 * 预估剩余时间
 */
export const estimateRemainingTime = (
  currentStepIndex: number,
  totalSteps: number,
  elapsedTimeMs: number,
  stepProgress: number = 0
): number => {
  if (currentStepIndex >= totalSteps) return 0;
  
  const completedSteps = currentStepIndex + (stepProgress / 100);
  const averageTimePerStep = elapsedTimeMs / completedSteps;
  const remainingSteps = totalSteps - completedSteps;
  
  return Math.round(averageTimePerStep * remainingSteps / 1000 / 60); // 返回分钟
};
