/**
 * subtitle-service — L0 内容理解层：字幕转录（ASR）
 *
 * 复用 `core/services/subtitle/whisper-service`（Rust faster-whisper 后端），
 * 输出统一为 `SubtitleEntry[]`（秒制时间，与 Storyline 领域模型对齐）。
 */

import { logger } from '@/shared/utils/logging';
import { whisperService, type WhisperProgress } from '../subtitle/whisper-service';
import type { SubtitleEntry } from '@/types';

export interface TranscribeOptions {
  /** Whisper 模型大小：tiny/base/small/medium/large-v2/large-v3 */
  modelSize?: string;
  /** 语言代码，auto 为自动检测 */
  language?: string;
  /** 转录进度回调 */
  onProgress?: (progress: WhisperProgress) => void;
}

/**
 * 字幕转录：Whisper ASR 转写视频/音频
 *
 * @param videoPath 视频或音频绝对路径
 * @param options 转录参数
 * @returns 字幕条目列表（秒制时间）
 */
export async function transcribeSubtitles(
  videoPath: string,
  options: TranscribeOptions = {}
): Promise<SubtitleEntry[]> {
  if (!videoPath?.trim()) {
    throw new Error('视频路径不能为空');
  }
  const { modelSize = 'base', language = 'auto', onProgress } = options;

  logger.info('[Understanding] 字幕转录开始', { videoPath, modelSize, language });
  const result = await whisperService.transcribe(videoPath, modelSize, language, onProgress);
  const { entries } = whisperService.toSubtitleFormat(result);

  return entries.map((entry, index) => ({
    ...entry,
    id: `subtitle-${index}`,
    confidence: result.language_probability,
  }));
}
