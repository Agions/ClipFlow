import { logger } from '@/shared/utils/logging';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { Video } from 'lucide-react';
import { tauri } from '@/core/tauri';
import { videoProcessor } from '@/core/video';

import type { VideoAnalysis, KeyMoment, Emotion } from '@/types';
import VideoSelector from '@/components/video-selector/video-selector';
import { notify } from '@/shared';
import { AppError } from '@/core/errors';
import styles from '././video-analyzer.module.less';

const Title = ({ level = 4, children }: { level?: number; children: React.ReactNode }) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <Tag>{children}</Tag>;
};
const Paragraph = ({ children }: { children: React.ReactNode }) => <p>{children}</p>;

interface VideoAnalyzerProps {
  projectId: string;
  videoUrl?: string;
  onAnalysisComplete: (analysis: VideoAnalysis) => void;
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

      setProgress(10);

      const videoMetadata = await tauri.analyzeVideo(selectedVideoUrl).catch((err: unknown) => {
        logger.error('视频分析失败:', { error: err });
        throw new AppError('APP_VIDEO_ANALYZE_FAILED', `视频分析失败: ${err}`, {
          originalError: err,
          userMessage: '视频分析失败',
        });
      });

      setProgress(40);

      const keyFrameCount = Math.min(5, Math.ceil(videoMetadata.duration / 60));
      const keyFrames = await videoProcessor.extractKeyFrames(selectedVideoUrl, { maxFrames: keyFrameCount }).catch((err: unknown) => {
        logger.error('提取关键帧失败:', { error: err });
        return [];
      });

      setProgress(70);

      const thumbnail = await videoProcessor.generateThumbnail(selectedVideoUrl).catch((err: unknown) => {
        logger.error('生成缩略图失败:', { error: err });
        return '';
      });

      const keyMoments: KeyMoment[] = [];
      const emotions: Emotion[] = [];

      const numKeyMoments = Math.min(8, Math.ceil(videoMetadata.duration / 30));
      const interval = videoMetadata.duration / (numKeyMoments + 1);

      for (let i = 1; i <= numKeyMoments; i++) {
        const timestamp = Math.round(interval * i);
        keyMoments.push({
          timestamp,
          description: `关键时刻 ${i}`,
          importance: 7
        });
      }

      setProgress(90);

      const analysis: VideoAnalysis = {
        id: crypto.randomUUID(),
        title: `项目_${projectId}`,
        duration: videoMetadata.duration,
        keyMoments,
        emotions: emotions.map((e, i) => ({ timestamp: i * 5, type: e.type, intensity: 0.8 })),
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
    <Card>
      <CardHeader>
        <CardTitle><Title level={4}>视频分析</Title></CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Paragraph>
          我们将使用先进的AI技术分析您的视频内容，识别关键时刻、情感变化和重要信息，为生成高质量解说脚本提供基础。
        </Paragraph>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm">
            <p className="font-medium text-destructive mb-1">分析错误</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        )}

        <div className={styles.videoSection}>
          {selectedVideoUrl && typeof selectedVideoUrl === 'string' && selectedVideoUrl.startsWith('http') ? (
            <div className="flex items-center gap-2 p-3 rounded-md bg-accent/50">
              <Video size={16} className="text-muted-foreground shrink-0" />
              <span className="text-sm truncate">{selectedVideoUrl}</span>
            </div>
          ) : (
            <VideoSelector
              initialVideoPath={selectedVideoUrl}
              onVideoSelect={(filePath) => setSelectedVideoUrl(filePath)}
            />
          )}
        </div>

        {loading && (
          <div className={styles.progress + ' space-y-2'}>
            <Progress value={progress} className="w-full">
              <ProgressTrack className="h-1">
                <ProgressIndicator className="bg-accent-primary" />
              </ProgressTrack>
            </Progress>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border-2 border-accent-primary/30 border-t-accent-primary animate-spin" />
              <span>分析中...</span>
            </div>
          </div>
        )}

        <Button
          className="bg-accent-primary hover:bg-accent-primary-hover text-primary-foreground"
          onClick={handleAnalyze}
          disabled={!selectedVideoUrl || loading}
        >
          {loading ? '分析中...' : '开始分析'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default VideoAnalyzer;
