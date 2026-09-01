/**
 * useVideoUpload — 视频上传自定义 Hook
 */

import { useCallback, useRef, useEffect } from 'react';
import { useReducerHookFactory } from '@/shared/hooks/use-reducer-hook';
import { useProjectStore } from '@/stores';
import type { WorkflowState } from '@/core/workflow';
import { logger } from '@/shared/utils/logging';
import { notify } from '@/shared';
import { MAX_FILE_SIZE } from '@/shared/constants';
import {
  videoUploadReducer,
  initialVideoUploadState,
} from './video-upload-reducer';
import {
  VIDEO_EXTENSIONS,
  CHUNK_SIZE,
  PAUSE_CHECK_INTERVAL_MS,
  UPLOAD_DELAY_MIN_MS,
  UPLOAD_DELAY_RANGE_MS,
  chunkStore,
} from '../config/video-upload-config';
import type { VideoInfo } from '@/types';

export interface UseVideoUploadReturn {
  state: ReturnType<ReturnType<typeof useReducerHookFactory<typeof videoUploadReducer, typeof initialVideoUploadState>>['state']>;
  projectState: WorkflowState;
  validateFile: (file: File) => { valid: boolean; error?: string };
  handleUpload: (file: File) => Promise<void>;
  handlePauseResume: () => void;
  handleDelete: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleClick: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  goToNextStep: () => void;
}

export function useVideoUpload(onNext?: () => void): UseVideoUploadReturn {
  const { state: projectState, setVideo, goToNextStep } = useProjectStore();
  const { state, dispatch } = useReducerHookFactory(videoUploadReducer, initialVideoUploadState);
  const { uploadStatus } = state;

  const uploadStatusRef = useRef<string>('idle');
  useEffect(() => {
    uploadStatusRef.current = uploadStatus;
  }, [uploadStatus]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pauseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const goToNextStepRef = useRef(goToNextStep);
  const onNextRef = useRef(onNext);

  useEffect(() => {
    goToNextStepRef.current = goToNextStep;
    onNextRef.current = onNext;
  }, [goToNextStep, onNext]);

  useEffect(() => {
    return () => {
      if (pauseIntervalRef.current !== null) {
        clearInterval(pauseIntervalRef.current);
        pauseIntervalRef.current = null;
      }
    };
  }, []);

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!VIDEO_EXTENSIONS.includes(ext)) {
      return { valid: false, error: `不支持的视频格式: ${ext}` };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: '视频文件不能超过 2GB' };
    }
    return { valid: true };
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      notify.error(null, validation.error || '文件校验失败');
      return;
    }

    dispatch({ type: 'START_UPLOAD', payload: file });

    const uploadId = `upload_${Date.now()}`;
    chunkStore.clear(uploadId);

    try {
      const chunkSize = CHUNK_SIZE;
      const totalChunks = Math.ceil(file.size / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        if (uploadStatusRef.current === 'paused') {
          await new Promise<void>((resolve, reject) => {
            let active = true;
            const checkResume = setInterval(() => {
              if (!active) return;
              if (uploadStatusRef.current === 'cancelled' || uploadStatusRef.current === 'error') {
                active = false;
                clearInterval(checkResume);
                if (pauseIntervalRef.current === checkResume) {
                  pauseIntervalRef.current = null;
                }
                reject(new Error('Upload cancelled or errored while paused'));
                return;
              }
              if (uploadStatusRef.current === 'uploading') {
                active = false;
                clearInterval(checkResume);
                if (pauseIntervalRef.current === checkResume) {
                  pauseIntervalRef.current = null;
                }
                resolve();
              }
            }, PAUSE_CHECK_INTERVAL_MS);
            pauseIntervalRef.current = checkResume;
          });
        }

        const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
        chunkStore.addChunk(uploadId, chunk, i);

        const progress = Math.min(((i + 1) / totalChunks) * 100, 100);
        dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: progress });

        await new Promise(r => setTimeout(r, UPLOAD_DELAY_MIN_MS + Math.random() * UPLOAD_DELAY_RANGE_MS));
      }

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
            fps: 30,
            format: file.name.split('.').pop() || 'mp4',
            size: file.size,
            thumbnail: '',
            createdAt: new Date().toISOString(),
          });
        };

        video.onerror = () => {
          URL.revokeObjectURL(video.src);
          reject(new Error('无法读取视频文件'));
        };

        video.src = URL.createObjectURL(file);
      });

      dispatch({ type: 'COMPLETE_UPLOAD', payload: undefined });
      setVideo(videoInfo);
      notify.success('视频上传成功');

      if (onNextRef.current) {
        onNextRef.current();
      } else {
        setTimeout(() => goToNextStepRef.current(), 500);
      }
    } catch (error) {
      notify.error(error, '视频处理失败，请重试');
      logger.error('VideoUpload error:', { error });
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false });
    }
  }, [validateFile, setVideo, dispatch]);

  const handlePauseResume = useCallback(() => {
    if (uploadStatus === 'uploading') {
      notify.info('上传已暂停');
    } else if (uploadStatus === 'paused') {
      notify.info('继续上传中...');
    }
    dispatch({ type: 'TOGGLE_PAUSE', payload: undefined });
  }, [uploadStatus, dispatch]);

  const handleDelete = useCallback(() => {
    setVideo(null);
    dispatch({ type: 'RESET', payload: undefined });
    chunkStore.clear('current');
  }, [setVideo, dispatch]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_DRAG_ACTIVE', payload: true });
  }, [dispatch]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_DRAG_ACTIVE', payload: false });
  }, [dispatch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_DRAG_ACTIVE', payload: false });
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  }, [dispatch, handleUpload]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  }, [handleUpload]);

  return {
    state,
    projectState,
    validateFile,
    handleUpload,
    handlePauseResume,
    handleDelete,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleClick,
    handleFileChange,
    goToNextStep,
  };
}
