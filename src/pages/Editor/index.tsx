/**
 * 视频剪辑页面
 * 整合所有剪辑功能，提供专业的剪辑工作流
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Layout,
  Button,
  Space,
  Tooltip,
  Divider,
  Tabs,
  Slider,
  Select,
  Modal,
  Progress,
} from 'antd';
import {
  PlayCircleFilled,
  PauseCircleFilled,
  StepBackwardFilled,
  StepForwardFilled,
  ScissorOutlined,
  CopyOutlined,
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExportOutlined,
  PlusOutlined,
  FileAddOutlined,
  SaveOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { motion } from '@/components/common/motion-shim';
import { useEditor } from '@/core/hooks';
import { notify } from '@/shared';
import type {
  AudioTrack,
  EditorExportSettings as ExportSettings,
  TextItem,
  TextTrack,
  VideoClip,
  VideoTrack,
} from '@/core/services/editor/types';
import styles from './index.module.less';

const { Content, Sider } = Layout;
const { TabPane } = Tabs;
const { Option } = Select;

// 转场效果选项
const TRANSITION_OPTIONS = [
  { value: 'fade', label: '淡入淡出' },
  { value: 'dissolve', label: '交叉溶解' },
  { value: 'wipe', label: '擦除' },
  { value: 'slide', label: '滑动' },
  { value: 'zoom', label: '缩放' },
];

// 导出设置选项
const EXPORT_SETTINGS: ExportSettings = {
  format: 'mp4',
  resolution: '1080p',
  quality: 'high',
  fps: 30,
  bitrate: '8M',
};

export const EditorPage: React.FC = () => {
  // 使用剪辑 Hook
  const { state, operations } = useEditor();

  // 本地状态
  const [activePanel, setActivePanel] = useState<'media' | 'effects' | 'text' | 'audio'>('media');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(EXPORT_SETTINGS);
  const [playbackRate, setPlaybackRate] = useState(1);

  const isPanelKey = (key: string): key is 'media' | 'effects' | 'text' | 'audio' => {
    return key === 'media' || key === 'effects' || key === 'text' || key === 'audio';
  };

  // 视频预览引用
  const videoRef = useRef<HTMLVideoElement>(null);

  // 同步播放状态
  useEffect(() => {
    if (videoRef.current) {
      if (state.isPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [state.isPlaying, operations]);

  // 同步播放位置
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - state.currentTime) > 0.5) {
      videoRef.current.currentTime = state.currentTime;
    }
  }, [state.currentTime]);

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // 处理播放/暂停
  const handlePlayPause = () => {
    if (state.isPlaying) {
      operations.pause();
    } else {
      operations.play();
    }
  };

  // 处理导出
  const handleExport = async () => {
    try {
      const blob = await operations.exportVideo({
        format: exportSettings.format as 'mp4' | 'webm' | 'gif',
        quality: exportSettings.quality,
        resolution: exportSettings.resolution as '720p' | '1080p' | '4k',
        fps: exportSettings.fps as 24 | 30 | 60,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success('导出成功！');
      setShowExportModal(false);
    } catch (error) {
      notify.error(error, '导出失败');
    }
  };

  // 处理分割
  const handleSplit = () => {
    if (state.selectedClipId) {
      operations.splitClip(state.selectedClipId, state.currentTime);
      notify.success('已分割片段');
    } else {
      notify.warning('请先选择一个片段');
    }
  };

  // 处理删除
  const handleDelete = () => {
    if (state.selectedClipId && state.selectedTrackId) {
      operations.removeClip(state.selectedTrackId, state.selectedClipId);
      notify.success('已删除片段');
    } else {
      notify.warning('请先选择一个片段');
    }
  };

  // 渲染工具栏
  const renderToolbar = () => (
    <div className={styles.toolbar}>
      <Space>
        <Tooltip title="撤销">
          <Button icon={<UndoOutlined />} onClick={operations.undo} disabled={!state.canUndo} />
        </Tooltip>
        <Tooltip title="重做">
          <Button icon={<RedoOutlined />} onClick={operations.redo} disabled={!state.canRedo} />
        </Tooltip>
        <Divider type="vertical" />
        <Tooltip title="分割">
          <Button icon={<ScissorOutlined />} onClick={handleSplit} />
        </Tooltip>
        <Tooltip title="复制">
          <Button
            icon={<CopyOutlined />}
            onClick={() => {
              if (state.selectedClipId) {
                operations.copyClip(state.selectedClipId);
                notify.success('已复制片段');
              } else {
                notify.warning('请先选择一个片段');
              }
            }}
          />
        </Tooltip>
        <Tooltip title="删除">
          <Button icon={<DeleteOutlined />} onClick={handleDelete} />
        </Tooltip>
        <Divider type="vertical" />
        <Tooltip title="缩小">
          <Button icon={<ZoomOutOutlined />} onClick={operations.zoomOut} />
        </Tooltip>
        <span className={styles.zoomText}>{Math.round(state.zoom * 100)}%</span>
        <Tooltip title="放大">
          <Button icon={<ZoomInOutlined />} onClick={operations.zoomIn} />
        </Tooltip>
      </Space>

      <Space>
        <Button icon={<SaveOutlined />} onClick={operations.saveProject}>
          保存
        </Button>
        <Button icon={<FolderOpenOutlined />} onClick={operations.loadProject}>
          打开
        </Button>
        <Button type="primary" icon={<ExportOutlined />} onClick={() => setShowExportModal(true)}>
          导出
        </Button>
      </Space>
    </div>
  );

  // 渲染预览区
  const renderPreview = () => (
    <div className={styles.previewContainer}>
      <div className={styles.previewVideo}>
        {state.timeline?.videoTracks[0]?.clips[0] ? (
          <video
            ref={videoRef}
            src={state.timeline.videoTracks[0].clips[0].sourceId}
            className={styles.video}
          />
        ) : (
          <div className={styles.emptyPreview}>
            <FileAddOutlined className={styles.emptyIcon} />
            <p>拖拽视频到此处</p>
          </div>
        )}
      </div>

      {/* 播放控制 */}
      <div className={styles.playbackControls}>
        <Space>
          <Button icon={<StepBackwardFilled />} onClick={() => operations.seek(0)} />
          <Button
            type="primary"
            size="large"
            icon={state.isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
            onClick={handlePlayPause}
          />
          <Button
            icon={<StepForwardFilled />}
            onClick={() => operations.seek(state.timeline?.duration || 0)}
          />
        </Space>

        <div className={styles.timeDisplay}>
          <span className={styles.currentTime}>{formatTime(state.currentTime)}</span>
          <span className={styles.timeSeparator}> / </span>
          <span className={styles.totalTime}>{formatTime(state.timeline?.duration || 0)}</span>
        </div>

        <div className={styles.playbackRate}>
          <Select
            value={playbackRate}
            onChange={value => {
              setPlaybackRate(value);
              operations.setPlaybackRate(value);
            }}
            style={{ width: 80 }}
          >
            <Option value={0.25}>0.25x</Option>
            <Option value={0.5}>0.5x</Option>
            <Option value={1}>1x</Option>
            <Option value={1.5}>1.5x</Option>
            <Option value={2}>2x</Option>
          </Select>
        </div>
      </div>

      {/* 进度条 */}
      <Slider
        className={styles.progressSlider}
        min={0}
        max={state.timeline?.duration || 100}
        value={state.currentTime}
        onChange={operations.seek}
        tooltip={{ formatter: value => formatTime(value || 0) }}
      />
    </div>
  );

  // 渲染时间轴
  const renderTimeline = () => (
    <div className={styles.timelineContainer}>
      <div className={styles.timelineHeader}>
        <Space>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => operations.createTrack('video')}
          >
            视频轨道
          </Button>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => operations.createTrack('audio')}
          >
            音频轨道
          </Button>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => operations.createTrack('text')}
          >
            文字轨道
          </Button>
        </Space>
      </div>

      <div className={styles.timelineTracks}>
        {state.timeline?.videoTracks.map(
          (track: VideoTrack, index: number) => (
            <div key={track.id} className={styles.track}>
              <div className={styles.trackHeader}>
                <span>视频 {index + 1}</span>
              </div>
              <div className={styles.trackContent}>
                {track.clips.map((clip: VideoClip) => (
                  <motion.div
                    key={clip.id}
                    className={`${styles.clip} ${state.selectedClipId === clip.id ? styles.selected : ''}`}
                    style={{
                      left: `${(clip.startTime / (state.timeline?.duration || 1)) * 100}%`,
                      width: `${((clip.endTime - clip.startTime) / (state.timeline?.duration || 1)) * 100}%`,
                    }}
                    onClick={() => operations.selectClip(clip.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={styles.clipContent}>
                      <span className={styles.clipLabel}>片段</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )
        )}

        {state.timeline?.audioTracks.map(
          (track: AudioTrack, index: number) => (
            <div key={track.id} className={styles.track}>
              <div className={styles.trackHeader}>
                <span>音频 {index + 1}</span>
              </div>
              <div className={styles.trackContent}>
                <span style={{ color: '#666', fontSize: 11, padding: 4 }}>拖拽音频到此处</span>
              </div>
            </div>
          )
        )}

        {state.timeline?.textTracks.map(
          (track: TextTrack, index: number) => (
            <div key={track.id} className={styles.track}>
              <div className={styles.trackHeader}>
                <span>字幕 {index + 1}</span>
              </div>
              <div className={styles.trackContent}>
                {track.items.map(
                  (item: TextItem) => (
                    <motion.div
                      key={item.id}
                      className={styles.textItem}
                      style={{
                        left: `${(item.startTime / (state.timeline?.duration || 1)) * 100}%`,
                        width: `${((item.endTime - item.startTime) / (state.timeline?.duration || 1)) * 100}%`,
                      }}
                    >
                      <span className={styles.textContent}>
                        {item.content.length > 15 ? `${item.content.slice(0, 15)}…` : item.content}
                      </span>
                    </motion.div>
                  )
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* 播放头 */}
      <div
        className={styles.playhead}
        style={{ left: `${(state.currentTime / (state.timeline?.duration || 1)) * 100}%` }}
      />
    </div>
  );

  // 渲染侧边栏
  const renderSidebar = () => (
    <Sider width={300} className={styles.sidebar}>
      <Tabs activeKey={activePanel} onChange={key => isPanelKey(key) && setActivePanel(key)}>
        <TabPane tab="媒体" key="media">
          <div className={styles.panelContent}>
            <p style={{ color: '#888', fontSize: 12 }}>从左侧拖拽或点击添加视频、音频、图片素材</p>
            <Button icon={<FileAddOutlined />} block style={{ marginTop: 8 }}>
              导入素材
            </Button>
          </div>
        </TabPane>
        <TabPane tab="效果" key="effects">
          <div className={styles.panelContent}>
            <p style={{ color: '#888', fontSize: 12 }}>选择转场效果应用到选中片段</p>
            <div className={styles.effectGrid}>
              {TRANSITION_OPTIONS.map(effect => (
                <Button
                  key={effect.value}
                  className={styles.effectButton}
                  onClick={() => {
                    if (state.selectedClipId) {
                      notify.info(`添加效果: ${effect.label}`);
                    } else {
                      notify.warning('请先选择一个片段');
                    }
                  }}
                >
                  {effect.label}
                </Button>
              ))}
            </div>
          </div>
        </TabPane>
        <TabPane tab="文字" key="text">
          <div className={styles.panelContent}>
            <p style={{ color: '#888', fontSize: 12 }}>添加字幕或标题文字</p>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Button icon={<PlusOutlined />} block>添加字幕</Button>
              <Button icon={<PlusOutlined />} block>添加标题</Button>
              <Button icon={<PlusOutlined />} block>添加贴片</Button>
            </Space>
          </div>
        </TabPane>
        <TabPane tab="音频" key="audio">
          <div className={styles.panelContent}>
            <p style={{ color: '#888', fontSize: 12 }}>添加背景音乐或配音</p>
            <Button icon={<FileAddOutlined />} block style={{ marginTop: 8 }}>
              导入音频
            </Button>
          </div>
        </TabPane>
      </Tabs>
    </Sider>
  );

  // 渲染导出模态框
  const renderExportModal = () => (
    <Modal
      title="导出视频"
      open={showExportModal}
      onOk={handleExport}
      onCancel={() => setShowExportModal(false)}
      confirmLoading={state.isExporting}
    >
      {state.isExporting ? (
        <div className={styles.exportProgress}>
          <Progress percent={state.exportProgress} status="active" />
          <p>正在导出...</p>
        </div>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <label>格式</label>
            <Select
              value={exportSettings.format}
              onChange={value => setExportSettings({ ...exportSettings, format: value })}
              style={{ width: '100%' }}
            >
              <Option value="mp4">MP4</Option>
              <Option value="mov">MOV</Option>
              <Option value="webm">WebM</Option>
            </Select>
          </div>
          <div>
            <label>分辨率</label>
            <Select
              value={exportSettings.resolution}
              onChange={value => setExportSettings({ ...exportSettings, resolution: value })}
              style={{ width: '100%' }}
            >
              <Option value="720p">720p HD</Option>
              <Option value="1080p">1080p Full HD</Option>
              <Option value="2k">2K QHD</Option>
              <Option value="4k">4K UHD</Option>
            </Select>
          </div>
          <div>
            <label>质量</label>
            <Select
              value={exportSettings.quality}
              onChange={value => setExportSettings({ ...exportSettings, quality: value })}
              style={{ width: '100%' }}
            >
              <Option value="low">低</Option>
              <Option value="medium">中</Option>
              <Option value="high">高</Option>
              <Option value="ultra">超高</Option>
            </Select>
          </div>

          {/* 导出预览 */}
          {state.timeline && (
            <div className={styles.exportPreview}>
              <p>导出预览:</p>
              <p>时长: {formatTime(operations.getExportPreview().duration)}</p>
              <p>分辨率: {operations.getExportPreview().resolution}</p>
              <p>预估大小: {operations.getExportPreview().estimatedSize}</p>
            </div>
          )}
        </Space>
      )}
    </Modal>
  );

  return (
    <Layout className={styles.editorPage}>
      {/* 工具栏 */}
      {renderToolbar()}

      <Layout className={styles.mainLayout}>
        {/* 侧边栏 */}
        {renderSidebar()}

        {/* 主内容区 */}
        <Content className={styles.content}>
          {/* 预览区 */}
          {renderPreview()}

          {/* 时间轴 */}
          {renderTimeline()}
        </Content>
      </Layout>

      {/* 导出模态框 */}
      {renderExportModal()}
    </Layout>
  );
};

export default EditorPage;
