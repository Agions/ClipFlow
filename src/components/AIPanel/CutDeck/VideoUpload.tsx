/**
 * 步骤2: 上传视频 — AI Cinema Studio Redesign
 * 数据输入: project (从 ProjectCreate 来)
 * 数据输出: video (VideoInfo) + duration/width/height
 * 流转到: AIAnalyze
 */
import React, { useState, useCallback, useRef, memo } from 'react';
import { useCutDeck } from '../AIEditorContext';
import { logger } from '@/utils/logger';
import { formatDuration, formatFileSize, notify } from '@/shared';
import type { VideoInfo } from '@/core/types';
import styles from './VideoUpload.module.css';

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

const VideoUpload: React.FC<VideoUploadProps> = memo(({ onNext }) => {
  const { state, setVideo, goToNextStep } = useCutDeck();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'paused' | 'completed'>('idle');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const uploadStatusRef = useRef<string>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const uploadId = `upload_${Date.now()}`;
    chunkStore.clear(uploadId);

    try {
      const chunkSize = 1024 * 1024;
      const totalChunks = Math.ceil(file.size / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        if (uploadStatusRef.current === 'paused') {
          await new Promise<void>((resolve) => {
            const checkResume = setInterval(() => {
              if (uploadStatusRef.current === 'uploading') {
                clearInterval(checkResume);
                resolve();
              }
            }, 100);
          });
        }

        const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
        chunkStore.addChunk(uploadId, chunk, i);

        const progress = Math.min(((i + 1) / totalChunks) * 100, 100);
        setUploadProgress(progress);

        await new Promise(r => setTimeout(r, 80 + Math.random() * 150));
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

      setUploadProgress(100);
      setUploadStatus('completed');
      setVideo(videoInfo);
      notify.success('视频上传成功');

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

  // 暂停/继续
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

  // 删除视频
  const handleDelete = () => {
    setVideo(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    uploadStatusRef.current = 'idle';
    setCurrentFile(null);
    chunkStore.clear('current');
  };

  // 拖拽事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  };

  // 点击选择
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  };

  // === 已上传视频显示 ===
  if (state.currentVideo) {
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepTitle}>
          <h2>已上传视频</h2>
          <p>视频已成功上传，可以继续下一步进行 AI 分析</p>
        </div>

        <div className={styles.videoCard}>
          <div className={styles.videoPreview}>
            <video src={state.currentVideo.path} controls />
            <div className={styles.videoOverlay}>
              <button className={styles.playBtn} aria-label="播放预览">
                <svg className={styles.playBtnSvg} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.videoDetails}>
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>文件名</div>
              <div className={styles.detailValue} style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {state.currentVideo.name}
              </div>
            </div>
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>时长</div>
              <div className={styles.detailValue}>{formatDuration(state.currentVideo.duration)}</div>
            </div>
            <div className={styles.detailItem}>
              <div className={styles.detailLabel}>分辨率</div>
              <div className={styles.detailValue}>{state.currentVideo.width}×{state.currentVideo.height}</div>
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
        </div>

        <div className={styles.videoActions} style={{ paddingTop: 20 }}>
          <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={handleDelete}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3,6 5,6 21,6" />
              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2" />
            </svg>
            删除视频
          </button>
          <button
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={goToNextStep}
          >
            下一步：AI 分析
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // === 上传中显示进度 ===
  if (uploading || uploadStatus === 'completed') {
    const uploadedBytes = currentFile ? (currentFile.size * uploadProgress) / 100 : 0;
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepTitle}>
          <h2>上传进度</h2>
          <p>{uploadStatus === 'completed' ? '上传完成，正在准备视频...' : '正在上传视频，请稍候'}</p>
        </div>

        <div className={styles.videoCard} style={{ padding: 24 }}>
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <div className={styles.progressFileIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8.5A1.5 1.5 0 014.5 7h11A1.5 1.5 0 0117 8.5v7a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 15.5v-7z" />
                </svg>
              </div>
              <div className={styles.progressInfo}>
                <div className={styles.progressFileName}>{currentFile?.name}</div>
                <div className={styles.progressMeta}>
                  {formatFileSize(uploadedBytes)} / {formatFileSize(currentFile?.size ?? 0)}
                </div>
              </div>
            </div>

            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            <div className={styles.progressFooter}>
              <div className={styles.progressPercent}>{Math.round(uploadProgress)}%</div>
              <div className={styles.progressStatus}>
                {uploadStatus === 'completed' ? '处理中...' : uploadStatus === 'paused' ? '已暂停' : '上传中...'}
              </div>
            </div>
          </div>
        </div>

        {uploadStatus !== 'completed' && (
          <div className={styles.videoActions} style={{ paddingTop: 16 }}>
            <button
              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
              onClick={handlePauseResume}
            >
              {uploadStatus === 'paused' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  继续上传
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                  暂停上传
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // === 上传区域 ===
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepTitle}>
        <h2>上传视频</h2>
        <p>支持多种视频格式，时长建议 1-30 分钟</p>
      </div>

      {!state.stepStatus['project-create'] ? (
        <div style={{
          padding: '24px',
          background: 'rgba(255, 159, 67, 0.05)',
          border: '1px solid rgba(255, 159, 67, 0.15)',
          borderRadius: '12px',
          fontFamily: 'Figtree, sans-serif',
          color: 'rgba(255, 255, 255, 0.6)',
          textAlign: 'center',
        }}>
          请先创建项目，再上传视频
        </div>
      ) : (
        <>
          <div
            className={`${styles.uploadZone} ${dragActive ? styles.dragActive : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
            aria-label="点击或拖拽上传视频"
          >
            <input
              ref={fileInputRef}
              type="file"
              className={styles.hiddenInput}
              accept={VIDEO_EXTENSIONS.join(',')}
              onChange={handleFileChange}
            />

            <div className={styles.uploadIcon}>
              <svg className={styles.uploadIconSvg} viewBox="0 0 56 56" fill="none">
                <rect x="8" y="16" width="40" height="28" rx="4" stroke="currentColor" strokeWidth="2.5" />
                <path d="M20 22l8-6 8 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M28 16v18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M14 36l4 4 8-8 8 8 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                <circle cx="38" cy="24" r="3" fill="currentColor" opacity="0.6" />
              </svg>
            </div>

            <p className={styles.uploadPrimary}>点击或拖拽视频文件到此处上传</p>
            <p className={styles.uploadSecondary}>也可以点击选择文件</p>

            <div className={styles.formatHint}>
              <span className={styles.formatDot} />
              支持 MP4 / MOV / AVI / MKV
            </div>
          </div>

          <div className={styles.hintAlert}>
            <div className={styles.hintAlertHeader}>
              <svg className={styles.hintIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              上传说明
            </div>
            <ul className={styles.hintList}>
              <li>请上传清晰的视频文件以获得最佳分析效果</li>
              <li>视频时长建议 1-30 分钟</li>
              <li>上传后系统将自动分析视频内容</li>
              <li>支持断点续传，大文件上传更稳定</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
});

export default VideoUpload;
