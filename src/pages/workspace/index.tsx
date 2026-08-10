/**
 * AI 视频编辑器页面
 * 采用标签页分离布局：AI第一人称解说 / AI解说 / AI混剪
 */
import React, { useState, lazy, Suspense, useEffect } from 'react';
import { Mic, User, Scissors } from 'lucide-react';
import { useProjectStore } from '@/stores';
import { useKeyboardShortcuts } from '../../hooks/use-keyboard-shortcuts';
import KeyboardShortcutsHelp from '@/components/common/keyboard-shortcuts-help';
import { useEditorStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';
import { notify } from '@/shared';
import { TAB_TO_FEATURE, type AIFunctionTabKey } from '@/pages/workspace/shared/function-mode-map';
import { useFeatureFlag } from '@/shared/feature-flags';
import styles from '@/components/video-editor/video-editor.module.less';

const Workspace = lazy(() => import('@/pages/workspace/workspace'));
const ProjectSetup = lazy(() => import('@/pages/workspace/edit-step/project-setup'));
const VideoUpload = lazy(() => import('@/pages/workspace/edit-step/video-upload'));
const AIVisualizer = lazy(() => import('@/pages/workspace/assemble/ai-visualizer'));
const ScriptWriting = lazy(() => import('@/pages/workspace/edit-step/script-writing'));
const VideoComposing = lazy(() => import('@/pages/workspace/assemble/video-composing'));
const TtsPage = lazy(() => import('@/pages/workspace/assemble/tts-page'));
const SubtitleTable = lazy(() => import('@/pages/workspace/assemble/subtitle-table'));
const VideoExport = lazy(() => import('@/pages/workspace/export/video-export'));
const ClipRippling = lazy(() => import('@/pages/workspace/assemble/clip-rippling'));
const CommentaryPanel = lazy(() => import('@/components/commentary-panel'));

// 三个核心功能配置
const AI_FUNCTIONS = [
  {
    key: 'commentary-first',
    label: (
      <span className={styles.tabLabel}>
        <User />
        AI第一人称解说
      </span>
    ),
    description: '以第一人称视角讲述，像主播一样与观众互动',
    color: '#5a9e6f',
    icon: <User />,
  },
  {
    key: 'commentary',
    label: (
      <span className={styles.tabLabel}>
        <Mic />
        AI解说
      </span>
    ),
    description: '专业解说，适合教程、评测类内容',
    color: '#6b8cce',
    icon: <Mic />,
  },
  {
    key: 'mix',
    label: (
      <span className={styles.tabLabel}>
        <Scissors />
        AI混剪
      </span>
    ),
    description: '自动识别精彩片段，生成节奏感强的混剪',
    color: '#c49660',
    icon: <Scissors />,
  },
];

const AIVideoEditorContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AIFunctionTabKey>('commentary-first');
  const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false);
  const { state, goToNextStep, setFeature } = useProjectStore();

  // ── Store selectors — use shallow equality for multi-field objects ──────────
  const isPlaying = useEditorStore(s => s.isPlaying);
  const setIsPlaying = useEditorStore(s => s.setIsPlaying);
  const timelineActions = useEditorStore(
    useShallow(s => ({
      playheadMs: s.playheadMs,
      selectedClipId: s.selectedClipId,
      setPlayheadMs: s.setPlayheadMs,
      setInPoint: s.setInPoint,
      setOutPoint: s.setOutPoint,
      selectAllClips: s.selectAllClips,
      undoTrack: s.undoTrack,
      redoTrack: s.redoTrack,
      removeClipFromTrack: s.removeClipFromTrack,
    }))
  );

  // ── 快捷键注册 ────────────────────────────────────────
  useKeyboardShortcuts({
    enabled: true,
    preventDefault: true,
    onPlayPause: () => {
      setIsPlaying(!isPlaying);
    },
    onPause: () => {
      setIsPlaying(false);
    },
    onSeek: delta => {
      const newTime = Math.max(0, timelineActions.playheadMs / 1000 + delta);
      timelineActions.setPlayheadMs(newTime * 1000);
    },
    onSeekTo: time => {
      timelineActions.setPlayheadMs(time * 1000);
    },
    onDelete: () => {
      if (timelineActions.selectedClipId) {
        timelineActions.removeClipFromTrack(timelineActions.selectedClipId);
        notify.success('片段已删除');
      } else {
        notify.warning('请先选择要删除的片段');
      }
    },
    onInPoint: () => {
      timelineActions.setInPoint();
      notify.success(`入点: ${(timelineActions.playheadMs / 1000).toFixed(1)}s`);
    },
    onOutPoint: () => {
      timelineActions.setOutPoint();
      notify.success(`出点: ${(timelineActions.playheadMs / 1000).toFixed(1)}s`);
    },
    onSelectAll: () => {
      timelineActions.selectAllClips();
    },
    onUndo: () => {
      timelineActions.undoTrack();
    },
    onRedo: () => {
      timelineActions.redoTrack();
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
        return activeTab === 'commentary' ? (
          <CommentaryPanel
            videoPath={state.currentVideo?.path || ''}
            subtitles={
              state.subtitleData.asr?.map(s => s.text).join('\n') ||
              state.subtitleData.ocr?.map(s => s.text).join('\n') ||
              ''
            }
            durationSecs={state.currentVideo?.duration}
          />
        ) : (
          <ScriptWriting onNext={goToNextStep} />
        );
      case 'video-synth':
        // PR-4.1b：feature flag 灰度切换
        // 关闭 experimental.tts-page → 渲染 video-composing（旧组件）
        // 开启 experimental.tts-page → 渲染 tts-page + subtitle-table（新组件）
        return useFeatureFlag('experimental.tts-page') ? (
          <>
            <TtsPage onNext={goToNextStep} />
            <SubtitleTable onNext={goToNextStep} />
          </>
        ) : (
          <VideoComposing onNext={goToNextStep} />
        );
      case 'video-export':
        return <VideoExport onComplete={() => {}} />;
      default:
        return <ProjectSetup onNext={goToNextStep} />;
    }
  };

  // 快捷键：? 显示帮助面板
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsHelpVisible(true);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
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
              style={
                {
                  '--func-color': func.color,
                } as React.CSSProperties
              }
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
            <div style={{ padding: 24, textAlign: 'center' }}>正在加载 AI 工作流模块...</div>
          }
        >
          <Workspace>{renderStepContent()}</Workspace>
        </Suspense>
      </div>
    </div>
  );
};

const AIVideoEditor = () => {
  return <AIVideoEditorContent />;
};

export default AIVideoEditor;
