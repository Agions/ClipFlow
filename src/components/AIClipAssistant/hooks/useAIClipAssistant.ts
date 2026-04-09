import { useState, useCallback } from 'react';
import { aiClipService, type AIClipConfig, type ClipAnalysisResult, type ClipSegment } from '@/core/services/aiClip.service';
import type { VideoInfo } from '@/core/types';
import { notify } from '@/shared';

export const useAIClipAssistant = (
  videoInfo: VideoInfo,
  onAnalysisComplete?: (result: ClipAnalysisResult) => void,
  onApplySuggestions?: (segments: ClipSegment[]) => void
) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<ClipAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [previewSegments, setPreviewSegments] = useState<ClipSegment[]>([]);

  const [config, setConfig] = useState<AIClipConfig>({
    detectSceneChange: true,
    detectSilence: true,
    detectKeyframes: true,
    detectEmotion: true,
    sceneThreshold: 0.3,
    silenceThreshold: -40,
    minSilenceDuration: 0.5,
    keyframeInterval: 5,
    removeSilence: true,
    trimDeadTime: true,
    autoTransition: true,
    transitionType: 'fade',
    aiOptimize: true,
    targetDuration: undefined,
    pacingStyle: 'normal'
  });

  const updateConfig = useCallback((updates: Partial<AIClipConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    setError(null);
    setAnalysisProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const result = await aiClipService.analyzeVideo(videoInfo, config);

      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setAnalysisResult(result);

      const autoSelected = new Set(
        result.suggestions
          .filter((s) => s.autoApplicable && s.confidence > 0.8)
          .map((s) => s.id)
      );
      setSelectedSuggestions(autoSelected);

      onAnalysisComplete?.(result);
      notify.success('视频分析完成！');
      setCurrentStep(2);
    } catch (_err) {
      setError(_err instanceof Error ? _err.message : '分析失败');
      notify.error(_err, '视频分析失败');
    } finally {
      setAnalyzing(false);
    }
  }, [videoInfo, config, onAnalysisComplete]);

  const handleSmartClip = useCallback(async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const result = await aiClipService.smartClip(
        videoInfo,
        config.targetDuration,
        config.pacingStyle
      );

      setAnalysisResult(result);
      setPreviewSegments(result.segments);
      onAnalysisComplete?.(result);

      notify.success('智能剪辑完成！');
      setCurrentStep(3);
    } catch (_err) {
      setError(_err instanceof Error ? _err.message : '剪辑失败');
      notify.error(_err, '智能剪辑失败');
    } finally {
      setAnalyzing(false);
    }
  }, [videoInfo, config, onAnalysisComplete]);

  const handleApplySuggestions = useCallback(async () => {
    if (!analysisResult) return;

    const selectedIds = Array.from(selectedSuggestions);
    const segments = await aiClipService.applySuggestions(
      videoInfo,
      analysisResult.suggestions,
      selectedIds
    );

    setPreviewSegments(segments);
    onApplySuggestions?.(segments);

    notify.success(`已应用 ${selectedIds.length} 条建议`);
    setCurrentStep(3);
  }, [analysisResult, selectedSuggestions, videoInfo, onApplySuggestions]);

  const toggleSuggestion = useCallback((id: string) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllSuggestions = useCallback(() => {
    if (analysisResult) {
      setSelectedSuggestions(new Set(analysisResult.suggestions.map((s) => s.id)));
    }
  }, [analysisResult]);

  const deselectAllSuggestions = useCallback(() => {
    setSelectedSuggestions(new Set());
  }, []);

  return {
    currentStep,
    setCurrentStep,
    analyzing,
    analysisProgress,
    analysisResult,
    error,
    selectedSuggestions,
    previewSegments,
    config,
    updateConfig,
    handleAnalyze,
    handleSmartClip,
    handleApplySuggestions,
    toggleSuggestion,
    selectAllSuggestions,
    deselectAllSuggestions
  };
};
