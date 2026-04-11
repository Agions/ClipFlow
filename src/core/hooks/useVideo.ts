/**
 * 视频处理 Hook
 * 统一的视频上传、分析和处理
 */

import { useState, useCallback, useRef } from 'react';
import type { VideoInfo, VideoAnalysis, Scene } from '@/core/types';

interface TaskStatusInfo {
  id?: string;
  type?: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface UseVideoReturn {
  // 视频信息
  video: VideoInfo | null;
  analysis: VideoAnalysis | null;
  
  // 上传状态
  isUploading: boolean;
  uploadProgress: number;
  
  // 分析状态
  isAnalyzing: boolean;
  analysisProgress: number;
  
  // 任务状态
  taskStatus: TaskStatusInfo | null;
  
  // 操作方法
  uploadVideo: (file: File) => Promise<VideoInfo | null>;
  analyzeVideo: (videoId: string) => Promise<VideoAnalysis | null>;
  cancelAnalysis: () => void;
  extractThumbnail: (timestamp: number) => Promise<string | null>;
  extractKeyframes: (interval?: number) => Promise<string[]>;
  
  // 状态
  error: string | null;
  isLoading: boolean;
}

// 支持的格式
const SUPPORTED_FORMATS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'];
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

// 获取视频信息
const getVideoInfo = (file: File): Promise<VideoInfo> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      
      const info: VideoInfo = {
        id: crypto.randomUUID(),
        path: url,
        name: file.name,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        fps: 30, // 默认
        format: file.name.split('.').pop()?.toLowerCase() || 'mp4',
        size: file.size,
        createdAt: new Date().toISOString()
      };
      
      resolve(info);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取视频文件'));
    };
    
    video.src = url;
  });
};

// 生成缩略图
const generateThumbnail = (videoUrl: string, timestamp: number = 0): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.crossOrigin = 'anonymous';
    
    video.onloadeddata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      video.currentTime = timestamp;
    };
    
    video.onseeked = () => {
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnail);
      } else {
        reject(new Error('无法创建画布上下文'));
      }
    };
    
    video.onerror = () => {
      reject(new Error('无法加载视频'));
    };
    
    video.src = videoUrl;
  });
};

export function useVideo(): UseVideoReturn {
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [taskStatus, setTaskStatus] = useState<TaskStatusInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 上传视频
  const uploadVideo = useCallback(async (file: File): Promise<VideoInfo | null> => {
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // 验证文件类型
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !SUPPORTED_FORMATS.includes(ext)) {
        throw new Error(`不支持的格式: ${ext}。请使用: ${SUPPORTED_FORMATS.join(', ')}`);
      }
      
      // 验证文件大小
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`文件过大: ${(file.size / 1024 / 1024).toFixed(0)}MB。最大支持 2GB`);
      }
      
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      // 获取视频信息
      const info = await getVideoInfo(file);
      
      // 生成缩略图
      const thumbnail = await generateThumbnail(info.path);
      info.thumbnail = thumbnail;
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setVideo(info);
      
      return info;
    } catch (_err) {
      setError(_err instanceof Error ? _err.message : '上传失败');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);
  
  // 分析视频
  const analyzeVideo = useCallback(async (videoId: string): Promise<VideoAnalysis | null> => {
    if (!video) return null;
    
    setError(null);
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    // 创建任务状态
    const task: TaskStatusInfo = {
      id: crypto.randomUUID(),
      type: 'analysis',
      status: 'running',
      progress: 0,
      message: '开始分析视频...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setTaskStatus(task);
    
    try {
      // 模拟分析过程
      const steps = [
        { progress: 10, message: '提取关键帧...', delay: 1000 },
        { progress: 30, message: '场景检测...', delay: 2000 },
        { progress: 50, message: '对象识别...', delay: 2000 },
        { progress: 70, message: '情感分析...', delay: 1500 },
        { progress: 90, message: '生成摘要...', delay: 1000 }
      ];
      
      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
        setAnalysisProgress(step.progress);
        setTaskStatus((prev) => prev ? {
          ...prev,
          progress: step.progress,
          message: step.message,
          updatedAt: new Date().toISOString()
        } : null);
      }
      
      // 生成模拟分析结果
      const analysisResult: VideoAnalysis = {
        id: crypto.randomUUID(),
        videoId,
        scenes: generateMockScenes(video.duration),
        keyframes: generateMockKeyframes(video.duration),
        objects: [],
        emotions: [],
        summary: `视频时长 ${formatDuration(video.duration)}，分辨率 ${video.width}x${video.height}，包含 ${Math.floor(video.duration / 30)} 个场景。`,
        createdAt: new Date().toISOString()
      };
      
      setAnalysisProgress(100);
      setAnalysis(analysisResult);
      setTaskStatus(prev => prev ? {
        ...prev,
        status: 'completed',
        progress: 100,
        message: '分析完成',
        completedAt: new Date().toISOString()
      } : null);
      
      return analysisResult;
    } catch (_err) {
      setError(_err instanceof Error ? _err.message : '分析失败');
      setTaskStatus(prev => prev ? {
        ...prev,
        status: 'failed',
        error: _err instanceof Error ? _err.message : '分析失败'
      } : null);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [video]);
  
  // 取消分析
  const cancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAnalyzing(false);
    setTaskStatus(prev => prev ? {
      ...prev,
      status: 'cancelled',
      message: '已取消'
    } : null);
  }, []);
  
  // 提取缩略图
  const extractThumbnail = useCallback(async (timestamp: number): Promise<string | null> => {
    if (!video) return null;
    
    try {
      return await generateThumbnail(video.path, timestamp);
    } catch (_err) {
      setError('提取缩略图失败');
      return null;
    }
  }, [video]);
  
  // 提取关键帧
  const extractKeyframes = useCallback(async (interval: number = 5): Promise<string[]> => {
    if (!video) return [];
    
    const keyframes: string[] = [];
    const count = Math.floor(video.duration / interval);
    
    for (let i = 0; i < count; i++) {
      const timestamp = i * interval;
      const thumbnail = await extractThumbnail(timestamp);
      if (thumbnail) {
        keyframes.push(thumbnail);
      }
    }
    
    return keyframes;
  }, [video, extractThumbnail]);
  
  return {
    video,
    analysis,
    isUploading,
    uploadProgress,
    isAnalyzing,
    analysisProgress,
    taskStatus,
    uploadVideo,
    analyzeVideo,
    cancelAnalysis,
    extractThumbnail,
    extractKeyframes,
    error,
    isLoading
  };
}

// 辅助函数
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function generateMockScenes(duration: number): Scene[] {
  const scenes: Scene[] = [];
  const sceneCount = Math.floor(duration / 30);

  for (let i = 0; i < sceneCount; i++) {
    scenes.push({
      id: crypto.randomUUID(),
      startTime: i * 30,
      endTime: Math.min((i + 1) * 30, duration),
      type: 'action',
      score: 0.8,
      thumbnail: '',
      description: `场景 ${i + 1}`,
      tags: ['场景', `片段${i + 1}`]
    });
  }

  return scenes;
}

function generateMockKeyframes(duration: number) {
  const keyframes = [];
  const count = Math.floor(duration / 5);
  
  for (let i = 0; i < count; i++) {
    keyframes.push({
      id: crypto.randomUUID(),
      timestamp: i * 5,
      thumbnail: '',
      description: `关键帧 ${i + 1}`
    });
  }
  
  return keyframes;
}
