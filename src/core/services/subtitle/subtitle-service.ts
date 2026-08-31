/**
 * 字幕服务
 * 职责：字幕生成、提取、翻译和渲染
 *
 * 重构说明：
 * - Whisper 相关逻辑已提取到 whisperService.ts
 * - 本服务专注于字幕格式处理和翻译
 * - 继承 BaseService 统一错误处理（Phase 2）
 */

import { BaseService } from '../providers/base-service';
import { logger } from '@/shared/utils/logging';
import type { SubtitleEntry, VideoInfo, SubtitleStyle, SubtitleTrack } from '@/types';
import { whisperService, type WhisperProgress } from './whisper-service';
import { trackToSRT, trackToVTT, trackToASS } from './subtitle-formatters';
import { AppError } from '@/core/errors';
import { tauri } from '@/core/tauri';
import { ASR_LANG_CODES, TRANSLATION_LANG_NAMES, normalizeLangCode } from './language-codes';
import { createMinimalVideoInfo } from '@/types/video-info';
import { OUT_SUBTITLE_FG, OUT_SUBTITLE_STROKE, OUT_SUBTITLE_BG } from '@/core/video/output-colors';

// ============================================================
// 类型定义
// ============================================================

export interface SubtitleExtractOptions {
  language?: string;
  maxDuration?: number;
}

export interface SubtitleTranslateOptions {
  targetLanguage: string;
  provider?: string;
}

const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: 'Arial, sans-serif',
  fontSize: 24,
  color: OUT_SUBTITLE_FG,
  backgroundColor: OUT_SUBTITLE_BG,
  outline: true,
  outlineColor: OUT_SUBTITLE_STROKE,
  position: 'bottom',
  alignment: 'center',
  opacity: 1,
};

// ============================================================
// 字幕服务
// ============================================================

export class SubtitleService extends BaseService {
  constructor() {
    super('SubtitleService', { timeout: 300_000, retries: 2 }); // 5 分钟超时
  }

  /**
   * 使用 Whisper AI 转录字幕（Rust faster-whisper 后端）
   * @param audioPath 音频或视频路径
   * @param modelSize Whisper 模型大小
   * @param language 语言代码，auto 为自动检测
   * @param onProgress 进度回调
   */
  async transcribeWithWhisper(
    audioPath: string,
    modelSize: string = 'base',
    language: string = 'auto',
    onProgress?: (progress: WhisperProgress) => void
  ): Promise<SubtitleTrack> {
    return this.executeRequest(async () => {
      logger.info('[SubtitleService] Whisper 转录:', { audioPath, modelSize, language });

      try {
        const result = await whisperService.transcribe(audioPath, modelSize, language, onProgress);
        const { language: detectedLanguage, entries } = whisperService.toSubtitleFormat(result);

        return {
          id: crypto.randomUUID(),
          language: detectedLanguage,
          entries,
          style: DEFAULT_SUBTITLE_STYLE,
        };
      } catch (error) {
        logger.error('[SubtitleService] Whisper 转录失败，改用 ASR:', error);
        return this.extractSubtitles(audioPath, { language });
      }
    }, 'Whisper 转录');
  }

  /**
   * 从视频中提取字幕（OCR + ASR）
   * @param videoPath 视频路径
   * @param options 提取选项
   */
  async extractSubtitles(
    videoPath: string,
    options?: SubtitleExtractOptions
  ): Promise<SubtitleTrack> {
    const { language = 'zh-CN', maxDuration } = options || {};

    logger.info('[SubtitleService] 提取字幕:', { videoPath, language });

    const { asrService } = await import('../asr/asr-service');

    try {
      const videoInfo: VideoInfo = createMinimalVideoInfo(videoPath);

      const asrResult = await asrService.recognizeSpeech(videoInfo, {
        language: ASR_LANG_CODES[language] || 'zh_cn',
        enableTimestamp: true,
        enablePunctuation: true,
      });

      const entries: SubtitleEntry[] = asrResult.segments.map((segment, index) => ({
        id: `subtitle-${index}`,
        startTime: segment.startTime,
        endTime: segment.endTime,
        text: segment.text,
        confidence: segment.confidence,
      }));

      // 片段合并
      const merged = this.mergeShortEntries(entries);

      // 质量分级
      const withQuality = this.addQualityLabels(merged);

      // 按最大时长截断
      const finalEntries = this.truncateByDuration(withQuality, maxDuration);

      logger.info('[SubtitleService] 字幕提取完成:', {
        count: finalEntries.length,
        language,
      });

      return {
        id: crypto.randomUUID(),
        language,
        entries: finalEntries,
        style: DEFAULT_SUBTITLE_STYLE,
      };
    } catch (error) {
      logger.error('[SubtitleService] ASR 识别失败:', error);
      return {
        id: crypto.randomUUID(),
        language,
        entries: [],
        style: DEFAULT_SUBTITLE_STYLE,
      };
    }
  }

  /**
   * 合并过短的字幕片段
   * @param entries 原始字幕条目
   * @returns 合并后的字幕条目
   */
  private mergeShortEntries(entries: SubtitleEntry[]): SubtitleEntry[] {
    const MIN_SUBTITLE_DURATION = 0.5; // 秒
    const SENTENCE_END_CHARS = new Set(['。', '！', '？', '…', '．', '!', '?', '～']);

    return entries.reduce<SubtitleEntry[]>((acc, entry) => {
      const duration = entry.endTime - entry.startTime;

      if (duration < MIN_SUBTITLE_DURATION && acc.length > 0) {
        const prev = acc[acc.length - 1];
        const prevEndsWithSentence =
          prev.text.length > 0 && SENTENCE_END_CHARS.has(prev.text[prev.text.length - 1]);

        // 若前段已以句子标点结尾，不再跨句合并
        if (!prevEndsWithSentence) {
          prev.text = prev.text + (prev.text ? ' ' : '') + entry.text;
          prev.endTime = entry.endTime;
          prev.confidence = Math.min(prev.confidence ?? 1, entry.confidence ?? 1);
        } else {
          acc.push({ ...entry });
        }
      } else {
        acc.push({ ...entry });
      }

      return acc;
    }, []);
  }

  /**
   * 添加质量标签
   * @param entries 字幕条目
   * @returns 带质量标签的字幕条目
   */
  private addQualityLabels(
    entries: SubtitleEntry[]
  ): Array<SubtitleEntry & { quality: 'high' | 'medium' | 'low' }> {
    const HIGH_THRESHOLD = 0.85;
    const LOW_THRESHOLD = 0.6;

    const calcQuality = (confidence: number | undefined): 'high' | 'medium' | 'low' => {
      if (confidence === undefined) return 'medium';
      if (confidence >= HIGH_THRESHOLD) return 'high';
      if (confidence < LOW_THRESHOLD) return 'low';
      return 'medium';
    };

    return entries.map(e => ({ ...e, quality: calcQuality(e.confidence) }));
  }

  /**
   * 按最大时长截断字幕
   * @param entries 字幕条目
   * @param maxDuration 最大时长（秒）
   * @returns 截断后的字幕条目
   */
  private truncateByDuration(
    entries: Array<SubtitleEntry & { quality: string }>,
    maxDuration?: number
  ): Array<SubtitleEntry & { quality: string }> {
    if (!maxDuration || entries.length === 0) return entries;

    const lastValidIndex = entries.findIndex(e => e.endTime > maxDuration);
    return lastValidIndex > 0 ? entries.slice(0, lastValidIndex) : entries;
  }

  /**
   * 生成字幕文件（SRT / VTT / ASS）
   * @param track 字幕轨道
   * @param format 格式
   */
  async generateSubtitleFile(track: SubtitleTrack, format: 'srt' | 'vtt' | 'ass'): Promise<string> {
    return this.executeRequest(async () => {
      logger.info('[SubtitleService] 生成字幕文件:', {
        trackId: track.id,
        format,
        entries: track.entries.length,
      });

      switch (format) {
        case 'srt':
          return trackToSRT(track);
        case 'vtt':
          return trackToVTT(track);
        case 'ass':
          return trackToASS(track);
        default:
          throw new AppError('APP_SUBTITLE_FORMAT_UNSUPPORTED', `不支持的格式: ${format}`, {
            userMessage: `字幕格式不支持: ${format}`,
          });
      }
    }, '生成字幕文件');
  }

  /**
   * 翻译字幕
   * @param track 字幕轨道
   * @param options 翻译选项
   */
  async translateSubtitles(
    track: SubtitleTrack,
    options: SubtitleTranslateOptions
  ): Promise<SubtitleTrack> {
    const { targetLanguage, provider = 'mymemory' } = options;

    return this.executeRequest(async () => {
      logger.info('[SubtitleService] 翻译字幕:', {
        sourceLang: track.language,
        targetLang: targetLanguage,
        provider,
      });

      const targetLangName = TRANSLATION_LANG_NAMES[targetLanguage] || targetLanguage;

      // 分批翻译
      const BATCH_SIZE = 20;
      const translatedEntries: SubtitleEntry[] = [];

      for (let i = 0; i < track.entries.length; i += BATCH_SIZE) {
        const batch = track.entries.slice(i, i + BATCH_SIZE);
        const textsToTranslate = batch.map(e => e.text).join('\n');

        try {
          const translatedText = await this.translateText(
            textsToTranslate,
            targetLangName,
            provider
          );
          const lines = translatedText.split('\n').filter(l => l.trim());

          batch.forEach((entry, index) => {
            translatedEntries.push({
              ...entry,
              id: `${entry.id}-tl`,
              text: lines[index]?.trim() || entry.text,
            });
          });
        } catch (error) {
          logger.warn('[SubtitleService] 批次翻译失败，使用原文:', error);
          translatedEntries.push(...batch.map(e => ({ ...e, id: `${e.id}-tl` })));
        }
      }

      return {
        ...track,
        id: crypto.randomUUID(),
        language: targetLanguage,
        entries: translatedEntries,
      };
    }, '翻译字幕');
  }

  /**
   * 调用翻译 API
   */
  private async translateText(
    text: string,
    targetLang: string,
    _provider: string
  ): Promise<string> {
    const langCode = normalizeLangCode(targetLang);

    try {
      const translated = await tauri.translateText(text, 'en', langCode);
      if (!translated) {
        throw new AppError('APP_TRANSLATE_EMPTY', 'Translation returned empty result', {
          userMessage: '翻译结果为空',
          retryable: true,
        });
      }
      return translated;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AppError('APP_TRANSLATE_API_FAILED', `Translation failed: ${message}`, {
        statusCode: 500,
        userMessage: '翻译 API 调用失败',
        retryable: true,
        originalError: error,
      });
    }
  }

  /**
   * 烧录字幕到视频
   * 通过 Tauri invoke 调用 Rust backend 的 export_video 命令
   */
  async burnSubtitles(
    videoPath: string,
    subtitlePath: string,
    outputPath: string,
    _style?: Partial<SubtitleStyle>
  ): Promise<string> {
    return this.executeRequest(async () => {
      logger.info('[SubtitleService] 烧录字幕:', {
        video: videoPath,
        subtitle: subtitlePath,
        output: outputPath,
      });

      const result = await tauri.exportVideo({
        inputPath: videoPath,
        outputPath,
        format: 'mp4',
        resolution: 'original',
        frameRate: 30,
        videoCodec: 'h264',
        audioCodec: 'aac',
        crf: 23,
        subtitleEnabled: true,
        subtitlePath,
        burnSubtitles: true,
      });

      logger.info('[SubtitleService] 字幕烧录完成:', result);
      return result.outputPath;
    }, '烧录字幕');
  }
}

// 导出单例
export const subtitleService = new SubtitleService();
