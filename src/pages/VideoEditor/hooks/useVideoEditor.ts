import { useState, useCallback, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { VideoSegment, extractKeyFrames, analyzeVideo } from '@/services/video';
import { clipWorkflowService } from '@/core/services/clip-workflow.service';
import type { VideoInfo } from '@/core/types';
import type { ClipSegment } from '@/core/services/aiClip.service';
import { notify } from '@/shared';
import { logger } from '@/utils/logger';

export const useVideoEditor = (projectId: string | undefined) => {
  // 视频状态
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // 片段状态
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [keyframes, setKeyframes] = useState<string[]>([]);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number>(-1);

  // 历史记录
  const [editHistory, setEditHistory] = useState<VideoSegment[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const historyIndexRef = useRef(-1);

  // 导出设置
  const [outputFormat, setOutputFormat] = useState<string>('mp4');
  const [videoQuality, setVideoQuality] = useState<string>('medium');

  // 操作状态
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const loadVideoLockRef = useRef(false);
  const smartClipLockRef = useRef(false);

  // 添加到历史记录
  const addToHistory = useCallback((newSegments: VideoSegment[]) => {
    setEditHistory((prev) => {
      const cursor = historyIndexRef.current;
      const newHistory = prev.slice(0, cursor + 1);
      const nextHistory = [...newHistory, newSegments];
      const nextIndex = nextHistory.length - 1;
      historyIndexRef.current = nextIndex;
      setHistoryIndex(nextIndex);
      return nextHistory;
    });
  }, []);

  // 加载视频
  const handleLoadVideo = useCallback(async () => {
    if (loading || analyzing || loadVideoLockRef.current) return;
    loadVideoLockRef.current = true;
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: '视频文件',
          extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
        }],
      });

      if (!selected || typeof selected !== 'string') {
        return;
      }

      setLoading(true);
      setAnalyzing(true);

      try {
        setVideoSrc(`file://${selected}`);

        const metadata = await analyzeVideo(selected);
        setDuration(metadata.duration);

        const newSegment: VideoSegment = {
          start: 0,
          end: metadata.duration,
        };

        setSegments([newSegment]);
        addToHistory([newSegment]);

        const frames = await extractKeyFrames(selected, {
          interval: Math.max(5, Math.floor(metadata.duration / 10)),
          maxFrames: 10,
        });

        setKeyframes(frames.map(frame => frame.path));

        notify.success('视频加载成功');
      } catch (error) {
        logger.error('视频分析失败:', error);
        notify.error(error, '视频分析失败，请检查文件格式');
      } finally {
        setAnalyzing(false);
        setLoading(false);
      }
    } catch (err) {
      logger.error('选择文件失败:', err);
    } finally {
      loadVideoLockRef.current = false;
    }
  }, [addToHistory, analyzing, loading]);

  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    historyIndexRef.current = newIndex;
    setHistoryIndex(newIndex);
    setSegments(editHistory[newIndex]);
  }, [historyIndex, editHistory]);

  // 重做
  const handleRedo = useCallback(() => {
    if (historyIndex >= editHistory.length - 1) return;
    const newIndex = historyIndex + 1;
    historyIndexRef.current = newIndex;
    setHistoryIndex(newIndex);
    setSegments(editHistory[newIndex]);
  }, [historyIndex, editHistory]);

  // 添加片段
  const handleAddSegment = useCallback(() => {
    if (duration <= 0) return;
    const baseStart = Math.max(0, Math.min(currentTime, Math.max(duration - 5, 0)));
    const baseEnd = Math.max(baseStart, Math.min(baseStart + 5, duration));
    const newSegment: VideoSegment = {
      start: baseStart,
      end: baseEnd,
    };

    const newSegments = [...segments, newSegment];
    setSegments(newSegments);
    addToHistory(newSegments);
    setSelectedSegmentIndex(newSegments.length - 1);
    notify.success('已添加新片段');
  }, [currentTime, duration, segments, addToHistory]);

  // 删除片段
  const handleDeleteSegment = useCallback((index: number) => {
    if (index < 0 || index >= segments.length) return;
    const newSegments = segments.filter((_, i) => i !== index);
    setSegments(newSegments);
    addToHistory(newSegments);
    setSelectedSegmentIndex((prev) => {
      if (prev === index) return -1;
      if (prev > index) return prev - 1;
      return prev;
    });
    notify.success('已删除片段');
  }, [segments, addToHistory]);

  // 选择片段
  const handleSelectSegment = useCallback((index: number) => {
    if (index === selectedSegmentIndex) return;
    if (index < -1 || index >= segments.length) return;
    setSelectedSegmentIndex(index);
    if (index >= 0 && segments[index]) {
      setCurrentTime(segments[index].start);
    }
  }, [segments, selectedSegmentIndex]);

  // 智能剪辑
  const handleSmartClip = useCallback(async () => {
    if (!videoSrc || analyzing || smartClipLockRef.current) return;
    smartClipLockRef.current = true;

    setAnalyzing(true);
    try {
      const videoInfo: VideoInfo = {
        id: projectId || 'new',
        path: videoSrc,
        name: '当前视频',
        duration,
        width: 1920,
        height: 1080,
        fps: 30,
        format: outputFormat,
        size: 0,
        createdAt: new Date().toISOString(),
      };

      const result = await clipWorkflowService.processVideo(videoInfo);

      const newSegments: VideoSegment[] = result.segments.map(seg => ({
        start: seg.sourceStart,
        end: seg.sourceEnd,
        type: 'video',
        content: `片段 ${segments.length + 1}`,
      }));

      setSegments(newSegments);
      addToHistory(newSegments);

      notify.success(`智能剪辑完成: ${result.segments.length} 个片段`);
    } catch (error) {
      notify.error(error, '智能剪辑失败');
    } finally {
      setAnalyzing(false);
      smartClipLockRef.current = false;
    }
  }, [projectId, videoSrc, duration, outputFormat, segments, addToHistory, analyzing]);

  // 应用 AI 建议
  const handleApplyAISuggestions = useCallback((aiSegments: ClipSegment[]) => {
    if (!Array.isArray(aiSegments) || aiSegments.length === 0) return;
    const newSegments = aiSegments.map(s => ({
      start: s.startTime,
      end: s.endTime,
      type: s.type === 'silence' ? 'silence' : 'video' as const,
      content: s.content,
    }));
    setSegments(newSegments);
    addToHistory(newSegments);
    notify.success('已应用 AI 剪辑建议');
  }, [addToHistory]);

  return {
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
    editHistory,
    historyIndex,
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
  };
};
