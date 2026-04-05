/**
 * Whisper 字幕转录工作流步骤
 *
 * 使用 faster-whisper (Rust 后端) 将音视频转录为带时间戳的字幕，
 * 然后可用于烧录字幕或导出为 SRT/VTT/ASS 格式。
 */

import { logger } from '@/utils/logger';
import { whisperService } from '@/core/services/subtitle.service';
import type { VideoInfo } from '@/core/types';
import type { EditorSegment } from '@/components/SubtitleEditor/SubtitleEditor';

export interface SubtitleStepResult {
  /** 转录得到的字幕片段 */
  segments: EditorSegment[];
  /** 检测到的语言 */
  language: string;
  /** 语言检测置信度 */
  languageProbability: number;
  /** 总时长（毫秒） */
  durationMs: number;
  /** 使用的模型 */
  model: string;
}

// Default Whisper model to use
const DEFAULT_WHISPER_MODEL = 'base';

export interface SubtitleStepOptions {
  /** Whisper 模型大小 */
  model?: string;
  /** 语言代码，auto 为自动检测 */
  language?: string;
  /** 是否自动烧录到输出视频 */
  burnToVideo?: boolean;
}

/**
 * 执行 Whisper 字幕转录步骤
 *
 * @param videoInfo 视频信息（含路径）
 * @param projectId 项目 ID（用于日志）
 * @param options 转录选项
 * @param updateProgress 进度回调 (0-100)
 */
export async function executeSubtitleStep(
  videoInfo: VideoInfo,
  projectId: string,
  options: SubtitleStepOptions = {},
  updateProgress: (progress: number) => void = () => {}
): Promise<SubtitleStepResult> {
  const { model = DEFAULT_WHISPER_MODEL, language = 'auto' } = options;

  logger.info('[SubtitleStep] 开始执行:', {
    projectId,
    video: videoInfo.name,
    model,
    language,
  });

  // 步骤 1: 检查 faster-whisper 可用性 (0-10%)
  updateProgress(2);
  const available = await whisperService.checkFasterWhisper();
  if (!available) {
    logger.warn('[SubtitleStep] faster-whisper 不可用，尝试 ASR fallback');
    // Fallback is handled by whisperService.transcribe internally
  }

  // 步骤 2: 执行转录 (10-90%)
  updateProgress(10);
  const result = await whisperService.transcribe(
    videoInfo.path,
    model,
    language,
    (prog) => {
      // prog.progress is 0-1
      const stageProgress = prog.progress * 80; // 10-90%
      updateProgress(10 + stageProgress);
    }
  );

  // 步骤 3: 转换结果 (90-100%)
  updateProgress(90);
  const segments: EditorSegment[] = result.segments.map((seg, i) => ({
    id: `whisper-${projectId}-${i}`,
    startMs: seg.start_ms,
    endMs: seg.end_ms,
    text: seg.text,
  }));

  updateProgress(100);

  logger.info('[SubtitleStep] 执行完成:', {
    projectId,
    language: result.language,
    segments: segments.length,
  });

  return {
    segments,
    language: result.language,
    languageProbability: result.language_probability,
    durationMs: result.duration_ms,
    model,
  };
}
