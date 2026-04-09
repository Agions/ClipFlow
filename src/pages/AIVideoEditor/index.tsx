/**
 * AI 视频编辑器页面
 * 采用标签页分离布局：AI第一人称解说 / AI解说 / AI混剪
 */
import React, { useState, lazy, Suspense, useEffect } from 'react';
import {
  AudioOutlined,
  UserOutlined,
  ScissorOutlined,
} from '@ant-design/icons';
import { CutDeckProvider, useCutDeck } from '@/components/AIPanel/AIEditorContext';
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS_HELP } from '@/hooks/use-keyboard-shortcuts';
import { useEditorStore } from '@/store/editorStore';
import { message } from 'antd';
import { TAB_TO_FEATURE, type AIFunctionTabKey } from '@/components/AIPanel/CutDeck/functionModeMap';
import styles from './index.module.less';

const CutDeckComponent = lazy(() => import('@/components/AIPanel/CutDeck/CutDeck'));
const ProjectCreate = lazy(() => import('@/components/AIPanel/CutDeck/ProjectCreate'));
const VideoUpload = lazy(() => import('@/components/AIPanel/CutDeck/VideoUpload'));
const AIAnalyze = lazy(() => import('@/components/AIPanel/CutDeck/AIAnalyze'));
const ScriptGenerate = lazy(() => import('@/components/AIPanel/CutDeck/ScriptGenerate'));
const VideoSynthesize = lazy(() => import('@/components/AIPanel/CutDeck/VideoSynthesize'));
const VideoExport = lazy(() => import('@/components/AIPanel/CutDeck/VideoExport'));
const ClipRepurpose = lazy(() => import('@/components/AIPanel/CutDeck/ClipRepurpose'));

// 三个核心功能配置
const AI_FUNCTIONS = [
  {
    key: 'commentary-first',
    label: (
      <span className={styles.tabLabel}>
        <UserOutlined />
        AI第一人称解说
      </span>
    ),
    description: '以第一人称视角讲述，像主播一样与观众互动',
    color: '#52c41a',
    icon: <UserOutlined />,
  },
  {
    key: 'commentary',
    label: (
      <span className={styles.tabLabel}>
        <AudioOutlined />
        AI解说
      </span>
    ),
    description: '专业解说，适合教程、评测类内容',
    color: '#1890ff',
    icon: <AudioOutlined />,
  },
  {
    key: 'mix',
    label: (
      <span className={styles.tabLabel}>
        <ScissorOutlined />
        AI混剪
      </span>
    ),
    description: '自动识别精彩片段，生成节奏感强的混剪',
    color: '#fa8c16',
    icon: <ScissorOutlined />,
  },
];

const AIVideoEditorContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AIFunctionTabKey>('commentary-first');
  const { state, goToNextStep, setFeature } = useCutDeck();
  const editorStore = useEditorStore();

  // ── 快捷键注册 ────────────────────────────────────────
  useKeyboardShortcuts({
    enabled: true,
    preventDefault: true,
    onPlayPause: () => {
      editorStore.setPreviewPlaying(!editorStore.previewPlaying);
    },
    onPause: () => {
      editorStore.setPreviewPlaying(false);
    },
    onSeek: (delta) => {
      const newTime = Math.max(0, (editorStore.playheadMs / 1000) + delta);
      editorStore.setPlayheadMs(newTime * 1000);
    },
    onSeekTo: (time) => {
      editorStore.setPlayheadMs(time * 1000);
    },
    onDelete: () => {
      message.info('选中片段已删除（快捷键 Delete）');
    },
    onUndo: () => {
      message.info('撤销（快捷键 ⌘Z）');
    },
    onRedo: () => {
      message.info('重做（快捷键 ⇧⌘Z）');
    },
    onExport: () => {
      goToNextStep();
    },
  });

  useEffect(() => {
    const targetFeature = TAB_TO_FEATURE[activeTab];
    if (state.selectedFeature === targetFeature) {
      return;
    }
    setFeature(targetFeature);
  }, [activeTab, setFeature, state.selectedFeature]);

  // 根据当前步骤渲染内容
  const renderStepContent = () => {
    switch (state.currentStep) {
      case 'project-create':
        return <ProjectCreate onNext={goToNextStep} />;
      case 'video-upload':
        return <VideoUpload onNext={goToNextStep} />;
      case 'ai-analyze':
        return <AIAnalyze onNext={goToNextStep} />;
      case 'clip-repurpose':
        return <ClipRepurpose onNext={goToNextStep} />;
      case 'script-generate':
        return <ScriptGenerate onNext={goToNextStep} />;
      case 'video-synthesize':
        return <VideoSynthesize onNext={goToNextStep} />;
      case 'export':
        return <VideoExport onComplete={() => {}} />;
      default:
        return <ProjectCreate onNext={goToNextStep} />;
    }
  };

  return (
    <div className={styles.editorContainer}>
      {/* 顶部功能标签页 */}
      <div className={styles.tabHeader}>
        <div className={styles.functionCards}>
          {AI_FUNCTIONS.map(func => (
            <div
              key={func.key}
              className={`${styles.functionCard} ${activeTab === func.key ? styles.active : ''}`}
              onClick={() => setActiveTab(func.key as AIFunctionTabKey)}
              style={{
                '--func-color': func.color,
              } as React.CSSProperties}
            >
              <div className={styles.functionIcon}>{func.icon}</div>
              <div className={styles.functionInfo}>
                <div className={styles.functionName}>{func.label}</div>
                <div className={styles.functionDesc}>{func.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 主要工作区 */}
      <div className={styles.workspace}>
        <Suspense
          fallback={
            <div style={{ padding: 24, textAlign: 'center' }}>
              正在加载 AI 工作流模块...
            </div>
          }
        >
          <CutDeckComponent>
            {renderStepContent()}
          </CutDeckComponent>
        </Suspense>
      </div>
    </div>
  );
};

const AIVideoEditor: React.FC = () => {
  return (
    <CutDeckProvider>
      <AIVideoEditorContent />
    </CutDeckProvider>
  );
};

export default AIVideoEditor;
