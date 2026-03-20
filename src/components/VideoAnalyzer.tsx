import React, { useState } from 'react';
import { Card, Button, Progress, Alert, Typography, Spin } from 'antd';
import { VideoCameraOutlined } from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { v4 as uuidv4 } from 'uuid';
import type { VideoAnalysis, KeyMoment, Emotion } from '../types';
import VideoSelector from './VideoSelector';
import { notify } from '@/shared';
import styles from './VideoAnalyzer.module.less';

const { Title, Paragraph } = Typography;

interface VideoAnalyzerProps {
  projectId: string;
  videoUrl?: string;
  onAnalysisComplete: (analysis: VideoAnalysis) => void;
}

interface AnalyzeVideoResult {
  title?: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
}

const VideoAnalyzer: React.FC<VideoAnalyzerProps> = ({
  projectId,
  videoUrl,
  onAnalysisComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | undefined>(videoUrl);

  const handleAnalyze = async () => {
    if (!selectedVideoUrl) {
      notify.error(null, '请先上传视频或输入视频链接');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 初始进度
      setProgress(10);
      
      // 调用Tauri后端分析视频
      const videoMetadata = await invoke<AnalyzeVideoResult>('analyze_video', { 
        path: selectedVideoUrl 
      }).catch(_err => {
        console.error('视频分析失败:', err);
        throw new Error(`视频分析失败: ${err}`);
      });
      
      setProgress(40);
      
      // 提取关键帧
      const keyFrameCount = Math.min(5, Math.ceil(videoMetadata.duration / 60));
      const keyFrames = await invoke<string[]>('extract_key_frames', {
        path: selectedVideoUrl,
        count: keyFrameCount
      }).catch(_err => {
        console.error('提取关键帧失败:', err);
        return [] as string[];
      });
      
      setProgress(70);
      
      // 生成缩略图
      const thumbnail = await invoke<string>('generate_thumbnail', {
        path: selectedVideoUrl
      }).catch(_err => {
        console.error('生成缩略图失败:', err);
        return '';
      });
      
      // 模拟关键时刻和情感分析
      // 在实际项目中，这部分应由AI模型完成
      const keyMoments: KeyMoment[] = [];
      const emotions: Emotion[] = [];
      
      // 生成均匀分布的关键时刻
      const numKeyMoments = Math.min(8, Math.ceil(videoMetadata.duration / 30));
      const interval = videoMetadata.duration / (numKeyMoments + 1);
      
      for (let i = 1; i <= numKeyMoments; i++) {
        const timestamp = Math.round(interval * i);
        keyMoments.push({
          timestamp,
          description: `关键时刻 ${i}`,
          importance: Math.random() * 5 + 5 // 5-10的重要性
        });
        
        // 同时添加情感标记
        if (i % 2 === 0) {
          emotions.push({
            timestamp,
            type: i % 4 === 0 ? '兴奋' : '平静',
            intensity: Math.random() * 0.5 + 0.5 // 0.5-1.0的强度
          });
        }
      }
      
      setProgress(90);
      
      // 构建分析结果
      const analysis: VideoAnalysis = {
        id: uuidv4(),
        title: videoMetadata.title || `项目_${projectId}`,
        duration: videoMetadata.duration,
        keyMoments,
        emotions: emotions.map(e => e.type),
        summary: `视频时长: ${Math.round(videoMetadata.duration)}秒，分辨率: ${videoMetadata.width}x${videoMetadata.height}，帧率: ${videoMetadata.fps}帧/秒。关键帧数量: ${keyFrames.length}。${thumbnail ? '已生成缩略图。' : ''}`
      };
      
      setProgress(100);
      
      notify.success('视频分析完成');
      onAnalysisComplete(analysis);
    } catch (error) {
      setError(error instanceof Error ? error.message : '视频分析失败');
      notify.error(error, '视频分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={styles.container}>
      <Title level={4}>视频分析</Title>
      <Paragraph>
        我们将使用先进的AI技术分析您的视频内容，识别关键时刻、情感变化和重要信息，为生成高质量解说脚本提供基础。
      </Paragraph>

      {error && (
        <Alert
          message="分析错误"
          description={error}
          type="error"
          showIcon
          className={styles.alert}
        />
      )}

      <div className={styles.videoSection}>
        {selectedVideoUrl && typeof selectedVideoUrl === 'string' && selectedVideoUrl.startsWith('http') ? (
          <div className={styles.videoInfo}>
            <VideoCameraOutlined className={styles.icon} />
            <span className={styles.url}>{selectedVideoUrl}</span>
          </div>
        ) : (
          <VideoSelector
            initialVideoPath={selectedVideoUrl}
            onVideoSelect={(filePath) => setSelectedVideoUrl(filePath)}
          />
        )}
      </div>

      {loading && (
        <div className={styles.progress}>
          <Progress percent={progress} status="active" />
          <Spin tip="分析中..." />
        </div>
      )}

      <Button
        type="primary"
        onClick={handleAnalyze}
        loading={loading}
        disabled={!selectedVideoUrl || loading}
        className={styles.button}
      >
        开始分析
      </Button>
    </Card>
  );
};

export default VideoAnalyzer; 
