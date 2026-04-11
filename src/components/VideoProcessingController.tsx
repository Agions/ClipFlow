import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Select, Slider, InputNumber, Switch, Button, Tooltip, Space, Collapse, Tag, Progress, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, ScissorOutlined, SoundOutlined, SettingOutlined } from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { notify } from '@/shared';
import type { VideoSegment } from '@/core/types';
import styles from './VideoProcessingController.module.less';

const { Option } = Select;
const { Panel } = Collapse;

// 转场效果选项扩展
const TRANSITION_OPTIONS = [
  { value: 'none', label: '无转场' },
  { value: 'fade', label: '淡入淡出' },
  { value: 'dissolve', label: '交叉溶解' },
  { value: 'wipe', label: '擦除效果' },
  { value: 'wiperight', label: '右擦除' },
  { value: 'wipeleft', label: '左擦除' },
  { value: 'wipeup', label: '上擦除' },
  { value: 'wipedown', label: '下擦除' },
  { value: 'slide', label: '滑动效果' },
  { value: 'slideleft', label: '左滑动' },
  { value: 'slideright', label: '右滑动' },
  { value: 'slideup', label: '上滑动' },
  { value: 'slidedown', label: '下滑动' },
  { value: 'circlecrop', label: '圆形扩展' },
  { value: 'rectcrop', label: '矩形扩展' },
  { value: 'distance', label: '距离变换' },
  { value: 'fadeblack', label: '黑场过渡' },
  { value: 'fadewhite', label: '白场过渡' },
  { value: 'radial', label: '径向扩展' },
  { value: 'smoothleft', label: '平滑左移' },
  { value: 'smoothright', label: '平滑右移' },
  { value: 'smoothup', label: '平滑上移' },
  { value: 'smoothdown', label: '平滑下移' },
  { value: 'circleopen', label: '圆形打开' },
  { value: 'circleclose', label: '圆形关闭' },
  { value: 'vertopen', label: '垂直打开' },
  { value: 'vertclose', label: '垂直关闭' },
  { value: 'horzopen', label: '水平打开' },
  { value: 'horzclose', label: '水平关闭' },
  { value: 'pixelize', label: '像素化' },
];

// 视频质量选项
const QUALITY_OPTIONS = [
  { value: 'low', label: '低质量 (720p)', description: '适合快速预览或网络分享' },
  { value: 'medium', label: '中等质量 (1080p)', description: '平衡文件大小和清晰度' },
  { value: 'high', label: '高质量 (原始分辨率)', description: '保持原始视频质量' },
  { value: 'custom', label: '自定义', description: '设置自定义的编码参数' }
];

// 视频格式选项
const FORMAT_OPTIONS = [
  { value: 'mp4', label: 'MP4', description: '通用兼容性最佳' },
  { value: 'mov', label: 'MOV', description: '适合苹果设备' },
  { value: 'webm', label: 'WebM', description: '网页视频，体积小' },
  { value: 'gif', label: 'GIF', description: '适合短循环动画' }
];

// 音频处理选项
const AUDIO_PROCESS_OPTIONS = [
  { value: 'original', label: '保持原始音频' },
  { value: 'normalize', label: '音量标准化' },
  { value: 'denoise', label: '降噪处理' },
  { value: 'none', label: '无音频 (静音)' }
];

interface VideoProcessingControllerProps {
  videoPath: string;
  segments: Array<{ start: number; end: number; type?: string; content?: string }>;
  onProcessingComplete?: (outputPath: string) => void;
  defaultQuality?: (typeof QUALITY_OPTIONS)[number]['value'];
  defaultFormat?: (typeof FORMAT_OPTIONS)[number]['value'];
  defaultTransition?: (typeof TRANSITION_OPTIONS)[number]['value'];
  defaultAudioProcess?: (typeof AUDIO_PROCESS_OPTIONS)[number]['value'];
}

interface BatchItem {
  id: string;
  segments: VideoSegment[];
  name: string;
  completed: boolean;
}

interface CustomQualitySettings {
  resolution: string;
  bitrate: number;
  framerate: number;
  useHardwareAcceleration: boolean;
}

type SaveFilePicker = (options?: {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
}) => Promise<{ name: string }>;

// 计算片段总时长
const calculateTotalDuration = (segments: VideoSegment[]): number => {
  return segments.reduce((total, segment) => {
    const s = segment as any;
    return total + ((s.end ?? s.endTime ?? 0) - (s.start ?? s.startTime ?? 0));
  }, 0);
};

const VideoProcessingController: React.FC<VideoProcessingControllerProps> = ({
  videoPath,
  segments,
  onProcessingComplete,
  defaultQuality = 'medium',
  defaultFormat = 'mp4',
  defaultTransition = 'fade',
  defaultAudioProcess = 'original'
}) => {
  // 基本设置
  const [videoQuality, setVideoQuality] = useState(defaultQuality);
  const [exportFormat, setExportFormat] = useState(defaultFormat);
  const [transitionType, setTransitionType] = useState(defaultTransition);
  const [transitionDuration, setTransitionDuration] = useState(1);
  const [audioProcess, setAudioProcess] = useState(defaultAudioProcess);
  const [audioVolume, setAudioVolume] = useState(100);
  const [useSubtitles, setUseSubtitles] = useState(true);
  
  // 批量处理状态
  const [processingBatch, setProcessingBatch] = useState(false);
  const [currentBatchItem, setCurrentBatchItem] = useState(0);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  
  // 自定义质量设置
  const [customSettings, setCustomSettings] = useState<CustomQualitySettings>({
    resolution: '1920x1080',
    bitrate: 4000,
    framerate: 30,
    useHardwareAcceleration: true
  });

  // 监听转码过程的进度事件
  useEffect(() => {
    // 这里应该使用Tauri的listen方法来监听进度更新
    // 简化版示例
    const cleanup = () => {
      // 清理监听器
    };
    return cleanup;
  }, []);

  // 添加批处理项目
  const addBatchItem = useCallback(() => {
    if (!segments || segments.length === 0) {
      notify.warning('没有可用的脚本片段');
      return;
    }
    
    const newBatchItem: BatchItem = {
      id: Date.now().toString(),
      segments: [...(segments as any)],
      name: `批处理 ${batchItems.length + 1}`,
      completed: false
    };
    
    setBatchItems(prev => [...prev, newBatchItem]);
  }, [segments, batchItems.length]);

  // 移除批处理项目
  const removeBatchItem = useCallback((id: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateCustomSettings = useCallback((patch: Partial<CustomQualitySettings>) => {
    setCustomSettings(prev => ({ ...prev, ...patch }));
  }, []);

  // 处理单个视频
  const processVideo = useCallback(async (segmentsToProcess: VideoSegment[], itemName?: string): Promise<string> => {
    // 让用户选择保存位置
    try {
      const fileName = itemName ? 
        `${itemName.replace(/[^\w\s-]/gi, '')}_${new Date().toISOString().split('T')[0]}` : 
        `剪辑_${new Date().toISOString().split('T')[0]}`;
      
      const showSaveFilePicker = (window as Window & {
        showSaveFilePicker?: SaveFilePicker;
      }).showSaveFilePicker;
      if (typeof showSaveFilePicker !== 'function') {
        throw new Error('当前环境不支持文件选择器');
      }
      const saveHandle = await showSaveFilePicker({
        suggestedName: `${fileName}.${exportFormat}`,
        types: [{
          description: '视频文件',
          accept: { 'video/*': [`.${exportFormat}`] }
        }]
      });
      const outputPath = saveHandle.name;
      
      // 构建编码参数
      let qualityParams: Record<string, unknown> = {};
      if (videoQuality === 'custom') {
        qualityParams = {
          resolution: customSettings.resolution,
          bitrate: customSettings.bitrate,
          framerate: customSettings.framerate,
          useHardwareAccel: customSettings.useHardwareAcceleration
        };
      }
      
      // 构建音频参数
      const audioParams = {
        volume: audioVolume / 100,
        process: audioProcess
      };
      
      // 调用后端转码函数
      await invoke('cut_video', {
        inputPath: videoPath,
        outputPath,
        segments: segmentsToProcess,
        quality: videoQuality,
        format: exportFormat,
        transition: transitionType,
        transitionDuration: transitionDuration,
        audioParams,
        addSubtitles: useSubtitles
      });
      
      if (onProcessingComplete) {
        onProcessingComplete(outputPath);
      }
      
      return outputPath;
    } catch (error) {
      logger.error('视频处理失败:', { error });
      notify.error(error, '视频处理失败');
      throw error;
    }
  }, [exportFormat, videoQuality, customSettings, audioVolume, audioProcess, transitionType, transitionDuration, useSubtitles, videoPath, onProcessingComplete]);

  // 开始批量处理
  const startBatchProcessing = useCallback(async () => {
    if (batchItems.length === 0) {
      notify.warning('请先添加批处理项目');
      return;
    }
    
    setProcessingBatch(true);
    setCurrentBatchItem(0);
    setBatchProgress(0);
    
    const newOutputPaths: string[] = [];
    
    for (let i = 0; i < batchItems.length; i++) {
      setCurrentBatchItem(i);
      const item = batchItems[i];
      
      try {
        // 调用处理单个项目的函数
        const outputPath = await processVideo(item.segments, item.name);
        newOutputPaths.push(outputPath);
        
        // 更新批处理项状态
        setBatchItems(prevItems => prevItems.map((prevItem, idx) => 
          idx === i ? { ...prevItem, completed: true } : prevItem
        ));
        
        // 更新总体进度
        setBatchProgress(((i + 1) / batchItems.length) * 100);
      } catch (error) {
        logger.error(`处理批次项 ${i+1} 失败:`, { error });
        notify.error(error, `处理 "${item.name}" 失败`);
        
        // 继续处理下一个
        continue;
      }
    }
    
    setProcessingBatch(false);
    notify.success(`完成批量处理，共 ${newOutputPaths.length} 个文件`);
  }, [batchItems, processVideo]);

  // 处理当前加载的视频
  const handleProcessCurrentVideo = useCallback(async () => {
    if (!segments || segments.length === 0) {
      notify.warning('没有可用的脚本片段');
      return;
    }
    
    try {
      await processVideo(segments as any);
      notify.success('视频处理完成');
    } catch {
      // 错误已在processVideo内部处理
    }
  }, [segments, processVideo]);

  return (
    <div className={styles.container}>
      <Card 
        title={
          <Space>
            <SettingOutlined />
            <span>视频处理控制器</span>
          </Space>
        }
        className={styles.controllerCard}
      >
        <Collapse defaultActiveKey={['basic']}>
          <Panel 
            header="基本设置" 
            key="basic"
            className={styles.panel}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div className={styles.formItem}>
                  <div className={styles.formLabel}>视频质量</div>
                  <Select
                    value={videoQuality}
                    onChange={setVideoQuality}
                    style={{ width: '100%' }}
                  >
                    {QUALITY_OPTIONS.map(option => (
                      <Option key={option.value} value={option.value}>
                        <div>
                          <div>{option.label}</div>
                          <div className={styles.optionDescription}>
                            {option.description}
                          </div>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </div>
              </Col>
              
              <Col span={12}>
                <div className={styles.formItem}>
                  <div className={styles.formLabel}>导出格式</div>
                  <Select
                    value={exportFormat}
                    onChange={setExportFormat}
                    style={{ width: '100%' }}
                  >
                    {FORMAT_OPTIONS.map(option => (
                      <Option key={option.value} value={option.value}>
                        <div>
                          <div>{option.label}</div>
                          <div className={styles.optionDescription}>
                            {option.description}
                          </div>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </div>
              </Col>
              
              {videoQuality === 'custom' && (
                <>
                  <Col span={12}>
                    <div className={styles.formItem}>
                      <div className={styles.formLabel}>分辨率</div>
                      <Select
                        value={customSettings.resolution}
                        onChange={resolution => updateCustomSettings({ resolution })}
                        style={{ width: '100%' }}
                      >
                        <Option value="1280x720">720p (1280x720)</Option>
                        <Option value="1920x1080">1080p (1920x1080)</Option>
                        <Option value="2560x1440">2K (2560x1440)</Option>
                        <Option value="3840x2160">4K (3840x2160)</Option>
                      </Select>
                    </div>
                  </Col>
                  
                  <Col span={12}>
                    <div className={styles.formItem}>
                      <div className={styles.formLabel}>比特率 (Kbps)</div>
                      <Row>
                        <Col span={18}>
                          <Slider
                            min={1000}
                            max={20000}
                            step={500}
                            value={customSettings.bitrate}
                            onChange={(bitrate: number) => updateCustomSettings({ bitrate })}
                          />
                        </Col>
                        <Col span={6}>
                          <InputNumber
                            min={1000}
                            max={20000}
                            step={500}
                            value={customSettings.bitrate}
                            onChange={bitrate => updateCustomSettings({ bitrate: bitrate ?? customSettings.bitrate })}
                            style={{ marginLeft: 8 }}
                          />
                        </Col>
                      </Row>
                    </div>
                  </Col>
                  
                  <Col span={12}>
                    <div className={styles.formItem}>
                      <div className={styles.formLabel}>帧率 (FPS)</div>
                      <Select
                        value={customSettings.framerate}
                        onChange={framerate => updateCustomSettings({ framerate })}
                        style={{ width: '100%' }}
                      >
                        <Option value={24}>24 FPS (电影)</Option>
                        <Option value={25}>25 FPS (PAL)</Option>
                        <Option value={30}>30 FPS (常用)</Option>
                        <Option value={50}>50 FPS (流畅)</Option>
                        <Option value={60}>60 FPS (高帧率)</Option>
                      </Select>
                    </div>
                  </Col>
                  
                  <Col span={12}>
                    <div className={styles.formItem}>
                      <div className={styles.formLabel}>启用硬件加速</div>
                      <Switch
                        checked={customSettings.useHardwareAcceleration}
                        onChange={useHardwareAcceleration => updateCustomSettings({ useHardwareAcceleration })}
                      />
                      <span className={styles.switchDescription}>
                        启用可加快处理速度，但可能影响兼容性
                      </span>
                    </div>
                  </Col>
                </>
              )}
            </Row>
          </Panel>
          
          <Panel 
            header="转场和音频效果" 
            key="effects"
            className={styles.panel}
          >
            <Row gutter={[16, 16]}>
              <Col span={16}>
                <div className={styles.formItem}>
                  <div className={styles.formLabel}>转场效果</div>
                  <Select
                    value={transitionType}
                    onChange={setTransitionType}
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="children"
                  >
                    {TRANSITION_OPTIONS.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </div>
              </Col>
              
              <Col span={8}>
                <div className={styles.formItem}>
                  <div className={styles.formLabel}>转场时长 (秒)</div>
                  <InputNumber 
                    min={0.2}
                    max={3}
                    step={0.1}
                    value={transitionDuration}
                    onChange={val => setTransitionDuration(val as number)}
                    style={{ width: '100%' }}
                  />
                </div>
              </Col>
              
              <Col span={12}>
                <div className={styles.formItem}>
                  <div className={styles.formLabel}>音频处理</div>
                  <Select
                    value={audioProcess}
                    onChange={setAudioProcess}
                    style={{ width: '100%' }}
                  >
                    {AUDIO_PROCESS_OPTIONS.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </div>
              </Col>
              
              <Col span={12}>
                <div className={styles.formItem}>
                  <div className={styles.formLabel}>
                    <Space>
                      <span>音量调整</span>
                      <SoundOutlined />
                    </Space>
                    <span className={styles.valueDisplay}>{audioVolume}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={200}
                    step={5}
                    value={audioVolume}
                    onChange={setAudioVolume}
                    disabled={audioProcess === 'none'}
                  />
                </div>
              </Col>
              
              <Col span={24}>
                <div className={styles.formItem}>
                  <div className={styles.formLabel}>添加字幕</div>
                  <Switch
                    checked={useSubtitles}
                    onChange={setUseSubtitles}
                  />
                  <span className={styles.switchDescription}>
                    将脚本内容作为字幕添加到视频中
                  </span>
                </div>
              </Col>
            </Row>
          </Panel>
          
          <Panel 
            header="批量处理" 
            key="batch"
            className={styles.panel}
          >
            <div className={styles.batchContainer}>
              <div className={styles.batchHeader}>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={addBatchItem}
                >
                  添加当前视频到批处理
                </Button>
                
                <Tooltip title="开始处理所有批次项">
                  <Button 
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={startBatchProcessing}
                    disabled={processingBatch || batchItems.length === 0}
                    loading={processingBatch}
                  >
                    {processingBatch ? '处理中...' : '开始批量处理'}
                  </Button>
                </Tooltip>
              </div>
              
              {processingBatch && (
                <div className={styles.batchProgress}>
                  <Progress 
                    percent={batchProgress} 
                    status="active" 
                    format={() => `${Math.round(batchProgress)}%`}
                  />
                  <div className={styles.batchStatus}>
                    处理中: {currentBatchItem + 1}/{batchItems.length} - {batchItems[currentBatchItem]?.name}
                  </div>
                </div>
              )}
              
              <div className={styles.batchList}>
                {batchItems.length === 0 ? (
                  <div className={styles.emptyBatch}>
                    <p>暂无批处理项目</p>
                    <p>添加当前视频及其片段到批处理列表</p>
                  </div>
                ) : (
                  batchItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      className={`${styles.batchItem} ${item.completed ? styles.completed : ''}`}
                    >
                      <div className={styles.batchItemContent}>
                        <div className={styles.batchItemHeader}>
                          <div className={styles.batchItemName}>
                            <span className={styles.batchNumber}>{index + 1}.</span> {item.name}
                          </div>
                          <div className={styles.batchItemActions}>
                            {item.completed && (
                              <Tag color="success">已完成</Tag>
                            )}
                            <Popconfirm
                              title="确定要移除此项目吗？"
                              onConfirm={() => removeBatchItem(item.id)}
                              okText="确定"
                              cancelText="取消"
                              disabled={processingBatch}
                            >
                              <Button 
                                type="text" 
                                danger
                                icon={<DeleteOutlined />}
                                size="small"
                                disabled={processingBatch}
                              />
                            </Popconfirm>
                          </div>
                        </div>
                        <div className={styles.batchItemInfo}>
                          <div>片段数量: {item.segments.length}</div>
                          <div>总时长: {calculateTotalDuration(item.segments)}秒</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Panel>
        </Collapse>
        
        <div className={styles.actionButtons}>
          <Button 
            type="primary" 
            icon={<ScissorOutlined />}
            onClick={handleProcessCurrentVideo}
            size="large"
          >
            处理当前视频
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default React.memo(VideoProcessingController); 
