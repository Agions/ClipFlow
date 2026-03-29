/**
 * AI 剪辑流程组件 - 优化版
 * 完整流程：创建项目 -> 上传视频 -> AI分析 -> 生成文案 -> 视频合成 -> 导出
 * 
 * 三大核心功能：
 * 1. AI 视频解说 - 对视频内容进行专业解说
 * 2. AI 第一人称解说 - 以第一人称视角讲述  
 * 3. AI 混剪 - 自动识别精彩片段并添加旁白
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Steps, Card, Button, Space, 
  Alert, Progress, Typography, Tag, Tooltip, Badge 
} from 'antd';
import {
  PlusOutlined,
  VideoCameraOutlined,
  CloudSyncOutlined,
  FileTextOutlined,
  EditOutlined,
  ExportOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  RedoOutlined,
  UserOutlined,
  ScissorOutlined,
  PlayCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useStoryForge, StoryForgeStep, StoryForgeState } from '../AIEditorContext';
import styles from './StoryForge.module.less';

const { Title, Text, Paragraph } = Typography;

// 流程步骤配置 - 体现三大核心功能
const stepConfig: Record<StoryForgeStep, {
  title: string;
  description: string;
  icon: React.ReactNode;
  tip?: string;
  color: string;
}> = {
  'project-create': {
    title: '创建项目',
    description: '设置项目名称和基本配置',
    icon: <PlusOutlined />,
    color: '#1890ff',
  },
  'video-upload': {
    title: '上传视频',
    description: '选择要剪辑的视频文件',
    icon: <VideoCameraOutlined />,
    color: '#52c41a',
  },
  'ai-analyze': {
    title: 'AI 分析',
    description: '智能识别内容、生成字幕',
    icon: <CloudSyncOutlined />,
    color: '#722ed1',
  },
  'script-generate': {
    title: '生成文案',
    description: '三大核心功能：解说/第一人称/混剪',
    icon: <FileTextOutlined />,
    tip: '🎯 选择：视频解说 | 第一人称 | AI混剪',
    color: '#fa8c16',
  },
  'video-synthesize': {
    title: '视频合成',
    description: '音画同步、添加特效',
    icon: <EditOutlined />,
    color: '#eb2f96',
  },
  'export': {
    title: '导出视频',
    description: '导出最终成片',
    icon: <ExportOutlined />,
    color: '#13c2c2',
  },
};

// 获取步骤索引
const getStepIndex = (step: StoryForgeStep): number => {
  const steps: StoryForgeStep[] = [
    'project-create',
    'video-upload', 
    'ai-analyze',
    'script-generate',
    'video-synthesize',
    'export',
  ];
  return steps.indexOf(step);
};

// 检查是否可以进入下一步
const canProceedToStep = (state: StoryForgeState, targetStep: StoryForgeStep): boolean => {
  const currentIndex = getStepIndex(state.currentStep);
  const targetIndex = getStepIndex(targetStep);
  
  // 只能前进到下一步
  if (targetIndex > currentIndex + 1) return false;
  
  // 检查前置步骤是否完成
  if (targetStep === 'video-upload') return state.stepStatus['project-create'];
  if (targetStep === 'ai-analyze') return state.stepStatus['video-upload'];
  if (targetStep === 'script-generate') return state.stepStatus['ai-analyze'];
  if (targetStep === 'video-synthesize') return state.stepStatus['script-generate'];
  if (targetStep === 'export') return state.stepStatus['video-synthesize'];
  
  return true;
};

interface StoryForgeProps {
  children?: React.ReactNode;
  showSteps?: boolean;
  showNavigation?: boolean;
}

const StoryForge: React.FC<StoryForgeProps> = ({
  children,
  showSteps = true,
  showNavigation = true,
}) => {
  // const navigate = useNavigate(); // TODO: 启用导航功能 - 用于步骤完成后的页面跳转
  const { projectId } = useParams();
  const { 
    state, 
    setStep, 
    goToNextStep, 
    goToPrevStep,
    canProceed,
    completedSteps,
    totalSteps,
  } = useStoryForge();

  // 从 URL 同步项目 ID
  React.useEffect(() => {
    if (projectId) {
      // 如果有项目 ID，说明项目已创建
    }
  }, [projectId]);

  // 步骤变化处理
  const handleStepClick = (step: StoryForgeStep) => {
    if (canProceedToStep(state, step)) {
      setStep(step);
    }
  };

  // 获取当前步骤的颜色
  const getCurrentStepColor = () => {
    return stepConfig[state.currentStep]?.color || '#1890ff';
  };

  // 渲染功能标签
  const renderFunctionTags = () => (
    <div style={{ 
      marginBottom: 16, 
      textAlign: 'center',
      display: 'flex',
      justifyContent: 'center',
      gap: 12,
      flexWrap: 'wrap'
    }}>
      <Tooltip title="专业解说，适合教程、评测类内容">
        <Badge.Ribbon text="视频解说" color="blue" placement="start">
          <Card size="small" hoverable style={{ width: 140, cursor: 'pointer' }}>
            <Space>
              <VideoCameraOutlined style={{ fontSize: 20, color: '#1890ff' }} />
              <Text strong>AI 解说</Text>
            </Space>
          </Card>
        </Badge.Ribbon>
      </Tooltip>
      
      <Tooltip title="第一人称视角，像主播一样与观众互动">
        <Badge.Ribbon text="第一人称" color="green" placement="start">
          <Card size="small" hoverable style={{ width: 140, cursor: 'pointer' }}>
            <Space>
              <UserOutlined style={{ fontSize: 20, color: '#52c41a' }} />
              <Text strong>第一人称</Text>
            </Space>
          </Card>
        </Badge.Ribbon>
      </Tooltip>
      
      <Tooltip title="自动识别精彩片段，生成节奏感强的混剪">
        <Badge.Ribbon text="AI 混剪" color="orange" placement="start">
          <Card size="small" hoverable style={{ width: 140, cursor: 'pointer' }}>
            <Space>
              <ScissorOutlined style={{ fontSize: 20, color: '#fa8c16' }} />
              <Text strong>AI 混剪</Text>
            </Space>
          </Card>
        </Badge.Ribbon>
      </Tooltip>
    </div>
  );

  // 渲染步骤条 - 优化版
  const renderSteps = () => {
    const steps: StoryForgeStep[] = [
      'project-create',
      'video-upload',
      'ai-analyze', 
      'script-generate',
      'video-synthesize',
      'export',
    ];

    return (
      <div className={styles.stepsContainer}>
        {/* 功能标签展示 - 仅在文案生成步骤显示 */}
        {state.currentStep === 'script-generate' && renderFunctionTags()}
        
        <Steps
          current={getStepIndex(state.currentStep)}
          size="small"
          items={steps.map((step, index) => {
            const isCompleted = state.stepStatus[step];
            const isCurrent = state.currentStep === step;
            const config = stepConfig[step];
            
            return {
              key: step,
              title: (
                <Space>
                  {config.title}
                  {isCompleted && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />}
                </Space>
              ),
              description: isCompleted ? '已完成' : config.description,
              icon: isCompleted 
                ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                : <span style={{ color: isCurrent ? config.color : undefined }}>{config.icon}</span>,
              className: isCurrent ? 'current-step' : '',
            };
          })}
          onChange={(current) => {
            const targetStep = steps[current];
            if (canProceedToStep(state, targetStep)) {
              setStep(targetStep);
            }
          }}
          className={styles.steps}
        />
        
        {/* 当前步骤提示 */}
        {stepConfig[state.currentStep].tip && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: 12,
            padding: '8px 16px',
            background: `${getCurrentStepColor()}10`,
            borderRadius: 8,
            border: `1px solid ${getCurrentStepColor()}30`
          }}>
            <InfoCircleOutlined style={{ color: getCurrentStepColor(), marginRight: 8 }} />
            <Text type="secondary">{stepConfig[state.currentStep].tip}</Text>
          </div>
        )}
      </div>
    );
  };

  // 渲染导航按钮 - 优化版
  const renderNavigation = () => {
    const steps: StoryForgeStep[] = [
      'project-create',
      'video-upload',
      'ai-analyze',
      'script-generate',
      'video-synthesize',
      'export',
    ];
    const currentIndex = getStepIndex(state.currentStep);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === steps.length - 1;

    // 获取下一步名称
    const nextStepName = !isLast ? stepConfig[steps[currentIndex + 1]]?.title : '';

    return (
      <div className={styles.navigation}>
        <Space>
          {!isFirst && (
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={goToPrevStep}
              size="large"
            >
              上一步
            </Button>
          )}
          
          {/* 重置当前步骤按钮 */}
          <Tooltip title="重新开始当前步骤">
            <Button 
              icon={<RedoOutlined />}
              onClick={() => setStep(steps[currentIndex])}
              size="large"
            >
              重置
            </Button>
          </Tooltip>
        </Space>
        
        <Space>
          {/* 预览按钮 */}
          {state.stepStatus[state.currentStep] && state.currentStep !== 'export' && (
            <Tooltip title="预览当前步骤结果">
              <Button 
                icon={<PlayCircleOutlined />}
                size="large"
              >
                预览
              </Button>
            </Tooltip>
          )}
          
          {isLast ? (
            <Button 
              type="primary" 
              icon={<ExportOutlined />}
              disabled={!state.stepStatus['video-synthesize']}
              size="large"
              style={{ 
                background: state.stepStatus['video-synthesize'] ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined 
              }}
            >
              完成导出
            </Button>
          ) : (
            <Button 
              type="primary" 
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              disabled={!canProceed()}
              onClick={goToNextStep}
              size="large"
              style={{ 
                background: canProceed() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined 
              }}
            >
              {nextStepName ? `去${nextStepName}` : '下一步'}
            </Button>
          )}
        </Space>
        
        {/* 进度信息 */}
        <div className={styles.progress}>
          <Space>
            <Text type="secondary">
              进度: {completedSteps}/{totalSteps}
            </Text>
            <Progress 
              percent={Math.round((completedSteps / totalSteps) * 100)} 
              size="small"
              showInfo={false}
              strokeColor="linear-gradient(90deg, #667eea, #764ba2)"
              style={{ width: 100 }}
            />
          </Space>
        </div>
      </div>
    );
  };

  // 渲染当前步骤状态
  const renderStepStatus = () => {
    const { currentStep, stepStatus } = state;
    
    // 显示警告信息
    if (!stepStatus[currentStep] && currentStep !== 'project-create') {
      return (
        <Alert
          message="请先完成当前步骤"
          description={`请完成「${stepConfig[currentStep].title}」后再继续下一步`}
          type="warning"
          showIcon
          className={styles.alert}
          action={
            <Button size="small" onClick={() => setStep(currentStep)}>
              查看
            </Button>
          }
        />
      );
    }
    
    // 显示成功状态
    if (stepStatus[currentStep]) {
      return (
        <Alert
          message={`✅ ${stepConfig[currentStep].title}已完成`}
          description="点击下一步继续，或点击预览查看结果"
          type="success"
          showIcon
          className={styles.alert}
          style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}
        />
      );
    }
    
    return null;
  };

  // 渲染空状态引导
  const renderEmptyGuide = () => {
    if (state.stepStatus['project-create']) return null;
    
    return (
      <Card style={{ marginBottom: 16, textAlign: 'center' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={4}>🎬 欢迎使用 StoryForge AI 剪辑</Title>
          <Paragraph>
            三大核心功能：AI 视频解说、AI 第一人称解说、AI 混剪
          </Paragraph>
          <Space>
            <Tag color="blue"><VideoCameraOutlined /> AI 解说</Tag>
            <Tag color="green"><UserOutlined /> 第一人称</Tag>
            <Tag color="orange"><ScissorOutlined /> AI 混剪</Tag>
          </Space>
          <Text type="secondary">
            从左侧选择功能开始，或点击下方按钮创建新项目
          </Text>
        </Space>
      </Card>
    );
  };

  return (
    <div className={styles.clipFlow}>
      {showSteps && renderSteps()}
      {renderStepStatus()}
      
      <div className={styles.content}>
        {renderEmptyGuide()}
        {children}
      </div>
      
      {showNavigation && renderNavigation()}
    </div>
  );
};

export default StoryForge;
