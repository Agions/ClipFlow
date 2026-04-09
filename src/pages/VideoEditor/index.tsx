import React, { useState, useCallback, lazy, Suspense, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Layout, Tabs, Row, Col, Spin, message } from 'antd';
import { RobotOutlined } from '@ant-design/icons';

import { saveProjectToFile } from '@/services/tauri';
import { notify } from '@/shared';
import type { ClipAnalysisResult } from '@/core/services/aiClip.service';
import { logger } from '@/utils/logger';
import { useVideoEditor } from './hooks/useVideoEditor';
import { exportService, ExportConfig } from '@/core/services/export.service';

import Toolbar from './components/Toolbar';
import VideoPlayer from '@/components/VideoPlayer';
import Timeline from './components/Timeline';
import SegmentList from './components/SegmentList';

import styles from './index.module.less';

const { Content } = Layout;
const { TabPane } = Tabs;
const loadKeyframePanel = () => import('./components/KeyframePanel');
const loadAIClipPanel = () => import('./components/AIClipPanel');
const loadExportSettingsPanel = () => import('./components/ExportSettingsPanel');
const KeyframePanel = lazy(loadKeyframePanel);
const AIClipPanel = lazy(loadAIClipPanel);
const ExportSettingsPanel = lazy(loadExportSettingsPanel);

const PanelLoading: React.FC = () => (
  <div style={{ padding: '20px 0', textAlign: 'center' }}>
    <Spin size="small" />
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
      // 构建导出配置
      const exportConfig: Partial<ExportConfig> = {
        format: outputFormat as 'mp4' | 'webm' | 'mov' | 'mkv',
        quality: videoQuality as 'low' | 'medium' | 'high' | 'ultra',
        resolution: '1080p',
        frameRate: 30,
        aspectRatio: '16:9',
        audioCodec: 'aac',
        audioBitrate: '256k',
        sampleRate: 48000,
        channels: 2,
      };

      // 设置导出配置
      exportService.setConfig(exportConfig as unknown as ExportConfig);

      // 输出路径
      const outputPath = `export/${Date.now()}.${outputFormat}`;

      // 显示进度
      message.loading('正在导出视频...', 0);

      // 执行导出（调用真实 Rust export_video 命令）
      const result = await exportService.exportVideo(
        videoSrc,
        outputPath,
        exportConfig
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
  }, []);

  return (
    <Layout className={styles.editorLayout}>
      <Content className={styles.editorContent}>
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

        <Row gutter={[24, 24]}>
          {/* 视频预览区 */}
          <Col span={16}>
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
          </Col>

          {/* 右侧工具面板 */}
          <Col span={8}>
            <Tabs
              defaultActiveKey="trim"
              activeKey={activeTab}
              onChange={setActiveTab}
              destroyInactiveTabPane
              animated={false}
              className={styles.editorTabs}
            >
              <TabPane tab="片段" key="trim">
                <SegmentList
                  segments={segments}
                  selectedIndex={selectedSegmentIndex}
                  hasVideo={!!videoSrc}
                  onSelectSegment={handleSelectSegment}
                  onDeleteSegment={handleDeleteSegment}
                  onAddSegment={handleAddSegment}
                />
              </TabPane>

              <TabPane tab={<span onMouseEnter={() => { void loadKeyframePanel(); }}>关键帧</span>} key="keyframes">
                <Suspense fallback={<PanelLoading />}>
                  <KeyframePanel keyframes={keyframes} />
                </Suspense>
              </TabPane>

              <TabPane tab={<span onMouseEnter={() => { void loadAIClipPanel(); }}><RobotOutlined /> AI 剪辑</span>} key="ai-clip">
                <Suspense fallback={<PanelLoading />}>
                  <AIClipPanel
                    projectId={projectId}
                    videoSrc={videoSrc}
                    duration={duration}
                    onAnalysisComplete={handleAnalysisComplete}
                    onApplySuggestions={handleApplyAISuggestions}
                  />
                </Suspense>
              </TabPane>

              <TabPane tab="效果" key="effects">
                <div className={styles.effectsPanel}>
                  视频效果功能正在开发中
                </div>
              </TabPane>

              <TabPane tab={<span onMouseEnter={() => { void loadExportSettingsPanel(); }}>设置</span>} key="settings">
                <Suspense fallback={<PanelLoading />}>
                  <ExportSettingsPanel
                    outputFormat={outputFormat}
                    videoQuality={videoQuality}
                    onFormatChange={setOutputFormat}
                    onQualityChange={setVideoQuality}
                  />
                </Suspense>
              </TabPane>
            </Tabs>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default VideoEditorPage;
