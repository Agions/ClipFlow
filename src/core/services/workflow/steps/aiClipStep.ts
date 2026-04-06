import { logger } from '@/utils/logger';
import { aiClipService } from '../../aiClip.service';
import type { VideoInfo } from '@/core/types';
import type { ClipAnalysisResult } from '../../aiClip/types';

export interface AIClipConfig {
  enabled: boolean;
  autoClip: boolean;
  detectSceneChange: boolean;
  detectSilence: boolean;
  removeSilence: boolean;
  targetDuration?: number;
  pacingStyle: 'fast' | 'normal' | 'slow';
}

/**
 * 执行 AI 剪辑步骤
 * @returns ClipAnalysisResult 或 null（未启用时）
 * @throws AI 剪辑失败时抛出错误，由 WorkflowEngine 重试
 */
export async function executeAIClipStep(
  videoInfo: VideoInfo,
  aiClipConfig: AIClipConfig,
  updateProgress?: (progress: number) => void
): Promise<ClipAnalysisResult | null> {
  if (!aiClipConfig?.enabled) return null;

  const clipConfig = {
    detectSceneChange: aiClipConfig.detectSceneChange ?? true,
    detectSilence: aiClipConfig.detectSilence ?? true,
    detectKeyframes: true,
    detectEmotion: false,
    removeSilence: aiClipConfig.removeSilence ?? true,
    trimDeadTime: true,
    autoTransition: true,
    transitionType: 'fade' as const,
    aiOptimize: true,
    targetDuration: aiClipConfig.targetDuration,
    pacingStyle: aiClipConfig.pacingStyle ?? 'normal',
  };

  let result: ClipAnalysisResult;

  if (aiClipConfig.autoClip) {
    result = await aiClipService.smartClip(
      videoInfo,
      clipConfig.targetDuration,
      clipConfig.pacingStyle
    );
  } else {
    result = await aiClipService.analyzeVideo(videoInfo, clipConfig);
  }

  updateProgress?.(68);
  logger.info('[executeAIClipStep] AI 剪辑步骤完成', {
    cutPoints: result.cutPoints.length,
    suggestions: result.suggestions.length,
  });

  return result;
}
