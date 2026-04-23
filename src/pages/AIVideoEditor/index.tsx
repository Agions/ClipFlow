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
import { CutDeckProvider, useCutDeck } from '@/components/CutDeck/AIEditorContext';
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS_HELP } from '@/hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from '@/components/common/KeyboardShortcutsHelp';
import { useEditorStore } from '@/store/editorStore';
import { notify } from '@/shared';
import { TAB_TO_FEATURE, type AIFunctionTabKey } from '@/components/CutDeck/Workspace/functionModeMap';
import styles from './index.module.less';

const Workspace = lazy(() => import('@/components/CutDeck/Workspace/Workspace'));
const ProjectSetup = lazy(() => import('@/components/CutDeck/Workspace/ProjectSetup'));
const VideoUpload = lazy(() => import('@/components/CutDeck/Workspace/VideoUpload'));
const AIVisualizer = lazy(() => import('@/components/CutDeck/Workspace/AIVisualizer'));
const ScriptWriting = lazy(() => import('@/components/CutDeck/Workspace/ScriptWriting'));
const VideoComposing = lazy(() => import('@/components/CutDeck/Workspace/VideoComposing'));
const VideoExport = lazy(() => import('@/components/CutDeck/Workspace/VideoExport'));
const ClipRippling = lazy(() => import('@/components/CutDeck/Workspace/ClipRippling'));

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
  const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false);
  const { state, goToNextStep, setFeature } = useCutDeck();
  const playheadMs = useEditorStore(state => state.playheadMs);
  const previewPlaying = useEditorStore(state => state.previewPlaying);
  const selectedClipId = useEditorStore(state => state.selectedClipId);
  const setPlayheadMs = useEditorStore(state => state.setPlayheadMs);
  const setPreviewPlaying = useEditorStore(state => state.setPreviewPlaying);
  const setInPoint = useEditorStore(state => state.setInPoint);
  const setOutPoint = useEditorStore(state => state.setOutPoint);
  const selectAllClips = useEditorStore(state => state.selectAllClips);
  const undo = useEditorStore(state => state.undo);
  const undoTrack = useEditorStore(state => state.undoTrack);
  const redo = useEditorStore(state => state.redo);
  const redoTrack = useEditorStore(state => state.redoTrack);
  const removeClipFromTrack = useEditorStore(state => state.removeClipFromTrack);

  // ── 快捷键注册 ────────────────────────────────────────
  useKeyboardShortcuts({
    enabled: true,
    preventDefault: true,
    onPlayPause: () => {
      setPreviewPlaying(!previewPlaying);
    },
    onPause: () => {
      setPreviewPlaying(false);
    },
    onSeek: (delta) => {
      const newTime = Math.max(0, (playheadMs / 1000) + delta);
      setPlayheadMs(newTime * 1000);
    },
    onSeekTo: (time) => {
      setPlayheadMs(time * 1000);
    },
    onDelete: () => {
      if (selectedClipId) {
        removeClipFromTrack(selectedClipId);
        notify.success('片段已删除');
      } else {
        notify.warning('请先选择要删除的片段');
      }
    },
    onInPoint: () => {
      setInPoint();
      notify.success(`入点: ${(playheadMs / 1000).toFixed(1)}s`);
    },
    onOutPoint: () => {
      setOutPoint();
      notify.success(`出点: ${(playheadMs / 1000).toFixed(1)}s`);
    },
    onSelectAll: () => {
      selectAllClips();
    },
    onUndo: () => {
      undo();
      undoTrack();
    },
    onRedo: () => {
      redo();
      redoTrack();
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
        return <ProjectSetup onNext={goToNextStep} />;
      case 'video-upload':
        return <VideoUpload onNext={goToNextStep} />;
      case 'ai-analyze':
        return <AIVisualizer onNext={goToNextStep} />;
      case 'clip-repurpose':
        return <ClipRippling onNext={goToNextStep} />;
      case 'script-generate':
        return <ScriptWriting onNext={goToNextStep} />;
      case 'video-synthesize':
        return <VideoComposing onNext={goToNextStep} />;
      case 'export':
        return <VideoExport onComplete={() => {}} />;
      default:
        return <ProjectSetup onNext={goToNextStep} />;
    }
  };

  // 快捷键：? 显示帮助面板
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsHelpVisible(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={styles.editorContainer}>
      {/* 快捷键帮助面板 */}
      <KeyboardShortcutsHelp
        visible={shortcutsHelpVisible}
        onClose={() => setShortcutsHelpVisible(false)}
      />
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
          <Workspace>
            {renderStepContent()}
          </Workspace>
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
