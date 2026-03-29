import { logger } from '@/utils/logger';
/**
 * 步骤2: 上传视频
 * 
 * 数据输入: project (从 ProjectCreate 来)
 * 数据输出: video (VideoInfo) + duration/width/height
 * 流转到: AIAnalyze
 */
import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, Button, Card, Space, Typography,
  Alert, Divider, Tooltip
} from 'antd';
import {
  DeleteOutlined,
  PlayCircleOutlined,
  FileOutlined,
  CloudUploadOutlined,
  PauseCircleOutlined,
  SyncOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useStoryForge } from '../AIEditorContext';
import { ProcessingProgress } from '@/components/common';
import type { VideoInfo } from '@/core/types';
import { formatDuration, formatFileSize, notify } from '@/shared';
import styles from './StoryForge.module.less';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

// 支持的视频格式
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'];

// 模拟断点续传存储
const createChunkStore = () => {
  const chunks: Map<string, Blob[]> = new Map();
  return {
    addChunk: (id: string, chunk: Blob, index: number) => {
      if (!chunks.has(id)) chunks.set(id, []);
      const arr = chunks.get(id)!;
      arr[index] = chunk;
    },
    getChunks: (id: string) => chunks.get(id) || [],
    hasChunks: (id: string) => chunks.has(id) && chunks.get(id)!.length > 0,
    clear: (id: string) => chunks.delete(id),
  };
};

const chunkStore = createChunkStore();

interface VideoUploadProps {
  onNext?: () => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onNext }) => {
  const { state, setVideo, goToNextStep } = useStoryForge();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'paused' | 'completed'>('idle');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const uploadStatusRef = useRef<string>('idle');

  // 验证文件
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!VIDEO_EXTENSIONS.includes(ext)) {
      return { valid: false, error: `不支持的视频格式: ${ext}` };
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      return { valid: false, error: '视频文件不能超过 2GB' };
    }
    return { valid: true };
  };

  // 处理文件上传
  const handleUpload = useCallback(async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      notify.error(null, validation.error || '文件校验失败');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');
    uploadStatusRef.current = 'uploading';
    setCurrentFile(file);
    
    // 生成唯一上传ID（用于断点续传）
    const uploadId = `upload_${Date.now()}`;
    chunkStore.clear(uploadId);

    try {
      // 模拟分片上传
      const chunkSize = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(file.size / chunkSize);
      
      // 模拟上传进度
      for (let i = 0; i < totalChunks; i++) {
        if (uploadStatusRef.current === 'paused') {
          // 暂停处理
          await new Promise<void>((resolve) => {
            const checkResume = setInterval(() => {
              if (uploadStatusRef.current === 'uploading') {
                clearInterval(checkResume);
                resolve();
              }
            }, 100);
          });
        }
        
        // 模拟每个分片上传
        const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
        chunkStore.addChunk(uploadId, chunk, i);
        
        // 计算进度
        const progress = Math.min(((i + 1) / totalChunks) * 100, 100);
        setUploadProgress(progress);
        
        // 模拟网络延迟
        await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
      }

      // 读取视频文件获取基本信息
      const videoInfo = await new Promise<VideoInfo>((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          
          resolve({
            id: `video_${Date.now()}`,
            path: URL.createObjectURL(file),
            name: file.name,
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
            fps: 30, // 默认帧率
            format: file.name.split('.').pop() || 'mp4',
            size: file.size,
            thumbnail: '', // 可以后续生成
            createdAt: new Date().toISOString(),
          });
        };
        
        video.onerror = () => {
          URL.revokeObjectURL(video.src);
          reject(new Error('无法读取视频文件'));
        };
        
        video.src = URL.createObjectURL(file);
      });

      setUploadProgress(100);
      setUploadStatus('completed');

      // 保存视频信息到状态
      setVideo(videoInfo);
      notify.success('视频上传成功');

      // 跳转到下一步
      if (onNext) {
        onNext();
      } else {
        setTimeout(() => goToNextStep(), 500);
      }
    } catch (error) {
      notify.error(error, '视频处理失败，请重试');
      logger.error('VideoUpload error:', { error });
    } finally {
      setUploading(false);
    }
  }, [setVideo, goToNextStep, onNext]);

  // 处理暂停/继续上传
  const handlePauseResume = () => {
    if (uploadStatus === 'uploading') {
      setUploadStatus('paused');
      uploadStatusRef.current = 'paused';
      notify.info('上传已暂停');
    } else if (uploadStatus === 'paused') {
      setUploadStatus('uploading');
      uploadStatusRef.current = 'uploading';
      notify.info('继续上传中...');
    }
  };

  // 处理删除视频
  const handleDelete = () => {
    setVideo(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    uploadStatusRef.current = 'idle';
    setCurrentFile(null);
    chunkStore.clear('current');
  };

  // 拖拽事件处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  };

  // 如果已有视频，显示视频信息
  if (state.currentVideo) {
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepTitle}>
          <Title level={4}>已上传视频</Title>
          <Paragraph>
            您已成功上传视频，可以继续下一步进行 AI 分析
          </Paragraph>
        </div>

        <Card className={styles.videoInfoCard}>
          {/* 视频预览 */}
          <div className={styles.videoPreview}>
            <video
              src={state.currentVideo.path}
              controls
            />
            <div className={styles.playOverlay}>
              <PlayCircleOutlined className={styles.playIcon} />
            </div>
          </div>

          {/* 视频详细信息 */}
          <div className={styles.videoDetails}>
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>文件名</div>
              <div className={styles.detailValue}>
                <Tooltip title={state.currentVideo.name}>
                  {state.currentVideo.name.length > 15 
                    ? state.currentVideo.name.slice(0, 15) + '...' 
                    : state.currentVideo.name}
                </Tooltip>
              </div>
            </div>
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>时长</div>
              <div className={styles.detailValue}>{formatDuration(state.currentVideo.duration)}</div>
            </div>
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>分辨率</div>
              <div className={styles.detailValue}>{state.currentVideo.width}x{state.currentVideo.height}</div>
            </div>
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>格式</div>
              <div className={styles.detailValue}>{state.currentVideo.format.toUpperCase()}</div>
            </div>
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>大小</div>
              <div className={styles.detailValue}>{formatFileSize(state.currentVideo.size)}</div>
            </div>
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>帧率</div>
              <div className={styles.detailValue}>{state.currentVideo.fps} fps</div>
            </div>
          </div>

          <div className={styles.videoActions}>
            <Button 
              danger 
              icon={<DeleteOutlined />}
              onClick={handleDelete}
            >
              删除视频
            </Button>
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={goToNextStep}
            >
              下一步：AI 分析
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 上传区域
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepTitle}>
        <Title level={4}>上传视频</Title>
        <Paragraph>
          支持 MP4、MOV、AVI、MKV、WEBM 格式，最大 2GB
        </Paragraph>
      </div>

      {state.stepStatus['project-create'] ? (
        <Card>
          {/* 上传进度显示 */}
          {uploading ? (
            <div className={styles.uploadProgress}>
              <div className={styles.progressWrapper}>
                <ProcessingProgress
                  percent={Math.round(uploadProgress)}
                  status={uploadStatus === 'completed' ? 'success' : 'active'}
                  statusText={uploadStatus === 'completed' ? '上传完成' : uploadStatus === 'paused' ? '已暂停' : '正在上传...'}
                  type="circle"
                  size="large"
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': uploadStatus === 'completed' ? '#52c41a' : '#87d068',
                  }}
                />
              </div>
              
              {currentFile && (
                <div className={styles.progressInfo}>
                  <Space>
                    <FileOutlined />
                    <span className={styles.fileName}>{currentFile.name}</span>
                  </Space>
                  <span className={styles.fileSize}>
                    {formatFileSize((currentFile.size * uploadProgress) / 100)} / {formatFileSize(currentFile.size)}
                  </span>
                </div>
              )}
              
              <div className={styles.progressTip}>
                <Space>
                  <ThunderboltOutlined style={{ color: '#faad14' }} />
                  <Text type="secondary">
                    {uploadStatus === 'paused' 
                      ? '点击继续按钮恢复上传' 
                      : uploadProgress < 100 
                        ? '支持断点续传，上传中断后可继续' 
                        : '视频处理中，请稍候...'}
                  </Text>
                </Space>
              </div>
              
              <Divider />
              
              <Space>
                <Button 
                  icon={uploadStatus === 'paused' ? <SyncOutlined /> : <PauseCircleOutlined />}
                  onClick={handlePauseResume}
                  disabled={uploadStatus === 'completed'}
                >
                  {uploadStatus === 'paused' ? '继续' : '暂停'}
                </Button>
              </Space>
            </div>
          ) : (
            <div
              className={`${styles.uploadArea} ${dragOver ? styles.dragOver : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Dragger
                showUploadList={false}
                beforeUpload={(file) => {
                  handleUpload(file);
                  return false; // 阻止默认上传行为
                }}
                accept={VIDEO_EXTENSIONS.join(',')}
                disabled={uploading}
              >
                <p className={styles.uploadIcon}>
                  <CloudUploadOutlined />
                </p>
                <p className={styles.uploadText}>
                  <Text strong>点击或拖拽视频文件到此处上传</Text>
                </p>
                <p className={styles.uploadText}>
                  <Text type="secondary" className={styles.subText}>
                    支持 {VIDEO_EXTENSIONS.join('、')} 格式
                  </Text>
                </p>
              </Dragger>
            </div>
          )}

          <Alert
            message={
              <Space>
                <InfoCircleOutlined />
                <span>上传说明</span>
              </Space>
            }
            description={
              <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                <li>请上传清晰的视频文件以获得最佳分析效果</li>
                <li>视频时长建议 1-30 分钟</li>
                <li>上传后系统将自动分析视频内容</li>
                <li>支持断点续传，大文件上传更稳定</li>
              </ul>
            }
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Card>
      ) : (
        <Alert
          message="请先创建项目"
          description="请先完成项目创建，然后上传视频"
          type="warning"
          showIcon
        />
      )}
    </div>
  );
};

export default VideoUpload;
