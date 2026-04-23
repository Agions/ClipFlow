import React, { useState, useCallback, lazy, Suspense, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bot } from 'lucide-react';

import { saveProjectToFile } from '@/services/tauri';
import { notify } from '@/shared';
import type { ClipAnalysisResult } from '@/core/services/aiClip.service';
import { logger } from '@/utils/logger';
import { useVideoEditor } from './hooks/useVideoEditor';
import { exportService } from '@/core/services/export.service';

import Toolbar from './components/Toolbar';
import VideoPlayer from '@/components/VideoPlayer';
import Timeline from './components/Timeline';
import SegmentList from './components/SegmentList';

import styles from './index.module.less';

const loadKeyframePanel = () => import('./components/KeyframePanel');
const loadAIClipPanel = () => import('./components/AIClipPanel');
const loadExportSettingsPanel = () => import('./components/ExportSettingsPanel');
const KeyframePanel = lazy(loadKeyframePanel);
const AIClipPanel = lazy(loadAIClipPanel);
const ExportSettingsPanel = lazy(loadExportSettingsPanel);

const PanelLoading: React.FC = () => (
  <div style={{ padding: '20px 0', textAlign: 'center' }}>
    <div className="animate-spin text-lg">⟳</div>
  </div>
);

const VideoEditorPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeTab, setActiveTab] = useState<string>('trim');
  const aliveRef = useRef(true);

  useEffect(() => () => {
    aliveRef.current = false;
  }, []);

  useEffect(() => {
    const warmup = () => {
      void loadKeyframePanel();
      void loadAIClipPanel();
      void loadExportSettingsPanel();
    };

    const timer = window.setTimeout(warmup, 360);
    return () => window.clearTimeout(timer);
  }, []);

  const {
    // 状态
    videoSrc,
    loading,
    analyzing,
    currentTime,
    duration,
    isPlaying,
    segments,
    keyframes,
    selectedSegmentIndex,
    historyIndex,
    editHistory,
    outputFormat,
    videoQuality,
    isSaving,
    isExporting,

    // 状态设置器
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setIsSaving,
    setIsExporting,
    setOutputFormat,
    setVideoQuality,

    // 操作
    handleLoadVideo,
    handleUndo,
    handleRedo,
    handleAddSegment,
    handleDeleteSegment,
    handleSelectSegment,
    handleSmartClip,
    handleApplyAISuggestions,
  } = useVideoEditor(projectId);

  // 保存项目
  const handleSaveProject = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const projectToSave = {
        id: projectId || 'new',
        segments,
        updatedAt: new Date().toISOString(),
      };

      await saveProjectToFile(projectId || 'new', projectToSave);
      if (aliveRef.current) {
        notify.success('项目保存成功');
      }
    } catch (error) {
      logger.error('保存失败:', error);
      if (aliveRef.current) {
        notify.error(error, '保存失败，请重试');
      }
    } finally {
      if (aliveRef.current) {
        setIsSaving(false);
      }
    }
  }, [isSaving, projectId, segments, setIsSaving]);

  // 导出视频
  const handleExportVideo = useCallback(async () => {
    if (isExporting) return;
    if (!videoSrc || segments.length === 0) {
      notify.warning('请先加载视频并添加剪辑片段');
      return;
    }

    setIsExporting(true);
    try {
      // 输出路径
      const outputPath = `export/${Date.now()}.${outputFormat}`;

      // 显示进度
      notify.info('正在导出视频...');

      // 执行导出
      const result = await exportService.exportVideo(
        videoSrc,
        outputPath,
        {}
      );

      // 导出成功
      notify.success(`视频导出成功: ${result.outputPath}`);
      logger.info('导出成功', { result });
    } catch (error) {
      logger.error('导出失败:', error);
      notify.error(String(error), '导出失败');
    } finally {
      if (aliveRef.current) {
        setIsExporting(false);
      }
    }
  }, [isExporting, videoSrc, segments, outputFormat, videoQuality, setIsExporting]);

  // AI 分析完成
  const handleAnalysisComplete = useCallback((result: ClipAnalysisResult) => {
    logger.info('AI 剪辑分析完成', { result });
    notify.success(`检测到 ${result.cutPoints.length} 个剪辑点`);
  }, [logger, notify]);

  return (
    <div className={styles.editorLayout}>
      <div className={styles.editorContent}>
        <Toolbar
          loading={loading}
          analyzing={analyzing}
          isSaving={isSaving}
          isExporting={isExporting}
          hasVideo={!!videoSrc}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < editHistory.length - 1}
          onLoadVideo={handleLoadVideo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onAddSegment={handleAddSegment}
          onSmartClip={handleSmartClip}
          onSave={handleSaveProject}
          onExport={handleExportVideo}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <div>
            <VideoPlayer
              src={videoSrc}
              onTimeUpdate={setCurrentTime}
              onEnded={() => {}}
            />

            <Timeline
              segments={segments}
              currentTime={currentTime}
              duration={duration}
              selectedIndex={selectedSegmentIndex}
              onSelectSegment={handleSelectSegment}
            />
          </div>

          <div>
            <Tabs
              defaultValue="trim"
              value={activeTab}
              onValueChange={setActiveTab}
              className={styles.editorTabs}
            >
              <TabsList>
                <TabsTrigger value="trim">片段</TabsTrigger>
                <TabsTrigger value="keyframes" onMouseEnter={() => { void loadKeyframePanel(); }}>关键帧</TabsTrigger>
                <TabsTrigger value="ai-clip" onMouseEnter={() => { void loadAIClipPanel(); }}><Bot size={14} /> AI 剪辑</TabsTrigger>
                <TabsTrigger value="effects">效果</TabsTrigger>
                <TabsTrigger value="settings" onMouseEnter={() => { void loadExportSettingsPanel(); }}>设置</TabsTrigger>
              </TabsList>
              <TabsContent value="trim">
                <SegmentList
                  segments={segments}
                  selectedIndex={selectedSegmentIndex}
                  hasVideo={!!videoSrc}
                  onSelectSegment={handleSelectSegment}
                  onDeleteSegment={handleDeleteSegment}
                  onAddSegment={handleAddSegment}
                />
              </TabsContent>
              <TabsContent value="keyframes">
                <Suspense fallback={<PanelLoading />}>
                  <KeyframePanel keyframes={keyframes} />
                </Suspense>
              </TabsContent>
              <TabsContent value="ai-clip">
                <Suspense fallback={<PanelLoading />}>
                  <AIClipPanel
                    projectId={projectId}
                    videoSrc={videoSrc}
                    duration={duration}
                    onAnalysisComplete={handleAnalysisComplete}
                    onApplySuggestions={handleApplyAISuggestions}
                  />
                </Suspense>
              </TabsContent>
              <TabsContent value="effects">
                <div className={styles.effectsPanel}>
                  视频效果功能正在开发中
                </div>
              </TabsContent>
              <TabsContent value="settings">
                <Suspense fallback={<PanelLoading />}>
                  <ExportSettingsPanel
                    outputFormat={outputFormat}
                    videoQuality={videoQuality}
                    onFormatChange={setOutputFormat}
                    onQualityChange={setVideoQuality}
                  />
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEditorPage;
