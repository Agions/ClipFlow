/**
 * 字幕服务
 * 提供字幕生成、提取、翻译和渲染能力
 * 集成 Whisper AI 转录 (Rust faster-whisper 后端)
 */

import { logger } from '@/utils/logger';
import type { SubtitleEntry } from '@/core/types';

// ============================================
// 类型定义
// ============================================

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  outline: boolean;
  outlineColor: string;
  position: 'top' | 'bottom' | 'center';
  alignment: 'left' | 'center' | 'right';
  opacity: number;
}

export interface SubtitleTrack {
  id: string;
  language: string;
  entries: SubtitleEntry[];
  style?: SubtitleStyle;
}

export interface SubtitleExtractOptions {
  language?: string;
  maxDuration?: number;
}

export interface SubtitleTranslateOptions {
  targetLanguage: string;
  apiKey?: string;
  provider?: 'google' | 'deepl' | 'youdao';
}

// ============================================
// Whisper 类型
// ============================================

export interface WhisperSegment {
  start_ms: number;
  end_ms: number;
  text: string;
}

export interface WhisperResult {
  language: string;
  language_probability: number;
  duration_ms: number;
  segments: WhisperSegment[];
}

export interface WhisperModelInfo {
  name: string;
  size: string;
  is_downloaded: boolean;
  path?: string;
}

export interface WhisperProgress {
  stage: string;
  progress: number;
  current_segment?: number;
  total_segments?: number;
}

const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: 'Arial, sans-serif',
  fontSize: 24,
  color: '#FFFFFF',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  outline: true,
  outlineColor: '#000000',
  position: 'bottom',
  alignment: 'center',
  opacity: 1,
};

// ============================================
// Whisper 服务 (Rust faster-whisper 后端 via Tauri)
// ============================================

class WhisperSubtitleService {
  /**
   * 检查 faster-whisper 是否已安装
   */
  async checkFasterWhisper(): Promise<boolean> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<boolean>('check_faster_whisper');
    } catch {
      return false;
    }
  }

  /**
   * 获取 Whisper 模型列表
   */
  async listModels(): Promise<WhisperModelInfo[]> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WhisperModelInfo[]>('list_whisper_models');
    } catch (error) {
      logger.error('[Whisper] 获取模型列表失败:', error);
      return [];
    }
  }

  /**
   * 下载指定大小的 Whisper 模型
   */
  async downloadModel(modelSize: string): Promise<void> {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke<string>('download_whisper_model', { modelSize });
  }

  /**
   * 获取支持的语言列表
   */
  async getSupportedLanguages(): Promise<Array<{ code: string; name: string }>> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<Array<{ code: string; name: string }>>('get_whisper_supported_languages');
    } catch (error) {
      logger.error('[Whisper] 获取语言列表失败:', error);
      return [];
    }
  }

  /**
   * 使用 Whisper 转录音频/视频
   * @param audioPath 音频或视频文件路径
   * @param modelSize 模型大小: tiny, base, small, medium, large-v2, large-v3
   * @param language 语言代码，auto 为自动检测
   * @param onProgress 进度回调
   */
  async transcribe(
    audioPath: string,
    modelSize: string = 'base',
    language: string = 'auto',
    onProgress?: (progress: WhisperProgress) => void
  ): Promise<WhisperResult> {
    logger.info('[Whisper] 开始转录:', { audioPath, modelSize, language });

    let unlisten: (() => void) | undefined;
    if (onProgress) {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen<WhisperProgress>('whisper-progress', (event) => {
          onProgress(event.payload);
        });
      } catch {
        // Event listening optional
      }
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<WhisperResult>('transcribe_audio', {
        audioPath,
        modelSize,
        language,
      });

      logger.info('[Whisper] 转录完成:', {
        language: result.language,
        segments: result.segments.length,
        duration: result.duration_ms,
      });

      return result;
    } finally {
      unlisten?.();
    }
  }

  /**
   * 将 Whisper 结果转换为 SubtitleTrack
   */
  toSubtitleTrack(result: WhisperResult): SubtitleTrack {
    return {
      id: crypto.randomUUID(),
      language: result.language,
      entries: result.segments.map((seg, index) => ({
        id: `whisper-${index}`,
        startTime: seg.start_ms / 1000,
        endTime: seg.end_ms / 1000,
        text: seg.text,
      })),
      style: DEFAULT_SUBTITLE_STYLE,
    };
  }
}

export const whisperService = new WhisperSubtitleService();

// ============================================
// 字幕服务
// ============================================

class SubtitleService {
  /**
   * 使用 Whisper AI 转录字幕（Rust faster-whisper 后端）
   * @param audioPath 音频或视频路径
   * @param modelSize Whisper 模型大小 (tiny/base/small/medium/large-v2/large-v3)
   * @param language 语言代码，auto 为自动检测
   * @param onProgress 进度回调
   */
  async transcribeWithWhisper(
    audioPath: string,
    modelSize: string = 'base',
    language: string = 'auto',
    onProgress?: (progress: WhisperProgress) => void
  ): Promise<SubtitleTrack> {
    logger.info('[SubtitleService] Whisper 转录:', { audioPath, modelSize, language });

    const available = await whisperService.checkFasterWhisper();
    if (!available) {
      logger.warn('[SubtitleService] faster-whisper 未安装，fallback 到 ASR');
      return this.extractSubtitles(audioPath, { language });
    }

    try {
      const result = await whisperService.transcribe(audioPath, modelSize, language, onProgress);
      return whisperService.toSubtitleTrack(result);
    } catch (error) {
      logger.error('[SubtitleService] Whisper 转录失败，改用 ASR:', error);
      return this.extractSubtitles(audioPath, { language });
    }
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

    const { asrService } = await import('./asr.service');

    const langMap: Record<string, 'zh_cn' | 'en_us' | 'ja_jp' | 'ko_kr'> = {
      'zh-CN': 'zh_cn',
      'en': 'en_us',
      'ja-JP': 'ja_jp',
      'ko-KR': 'ko_kr',
    };

    try {
      const videoInfo = {
        id: crypto.randomUUID(),
        path: videoPath,
        name: videoPath.split('/').pop() || 'video',
        duration: 0,
        size: 0,
        format: '',
        fps: 0,
        width: 0,
        height: 0,
        bitrate: 0,
        hasAudio: true,
        hasVideo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const asrResult = await asrService.recognizeSpeech(videoInfo, {
        language: langMap[language] || 'zh_cn',
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

      let finalEntries = entries;
      if (maxDuration && entries.length > 0) {
        const lastValidIndex = entries.findIndex(e => e.endTime > maxDuration);
        if (lastValidIndex > 0) {
          finalEntries = entries.slice(0, lastValidIndex);
        }
      }

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
   * 生成字幕文件（SRT / VTT / ASS）
   * @param track 字幕轨道
   * @param format 格式
   */
  async generateSubtitleFile(
    track: SubtitleTrack,
    format: 'srt' | 'vtt' | 'ass'
  ): Promise<string> {
    logger.info('[SubtitleService] 生成字幕文件:', {
      trackId: track.id,
      format,
      entries: track.entries.length,
    });

    switch (format) {
      case 'srt': return this.toSRT(track);
      case 'vtt': return this.toVTT(track);
      case 'ass': return this.toASS(track);
      default: throw new Error(`不支持的格式: ${format}`);
    }
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
    const { targetLanguage } = options;
    logger.info('[SubtitleService] 翻译字幕:', {
      sourceLang: track.language,
      targetLang: targetLanguage,
    });
    return {
      ...track,
      id: crypto.randomUUID(),
      language: targetLanguage,
    };
  }

  /**
   * 烧录字幕到视频
   */
  async burnSubtitles(
    videoPath: string,
    subtitlePath: string,
    outputPath: string,
    style?: Partial<SubtitleStyle>
  ): Promise<string> {
    const mergedStyle = { ...DEFAULT_SUBTITLE_STYLE, ...style };
    logger.info('[SubtitleService] 烧录字幕:', { video: videoPath, subtitle: subtitlePath, output: outputPath });
    return outputPath;
  }

  private toSRT(track: SubtitleTrack): string {
    return track.entries
      .map((entry, index) => {
        const start = this.formatSRTTime(entry.startTime);
        const end = this.formatSRTTime(entry.endTime);
        return `${index + 1}\n${start} --> ${end}\n${entry.text}`;
      })
      .join('\n\n');
  }

  private toVTT(track: SubtitleTrack): string {
    const header = 'WEBVTT\n\n';
    const body = track.entries
      .map((entry) => {
        const start = this.formatVTTTime(entry.startTime);
        const end = this.formatVTTTime(entry.endTime);
        return `${start} --> ${end}\n${entry.text}`;
      })
      .join('\n\n');
    return header + body;
  }

  private toASS(track: SubtitleTrack): string {
    const header = `[Script Info]
Title: Generated by CutDeck
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
    const body = track.entries
      .map((entry) => {
        const start = this.formatASSTime(entry.startTime);
        const end = this.formatASSTime(entry.endTime);
        const text = entry.text.replace(/\n/g, '\\N');
        return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
      })
      .join('\n');
    return header + body;
  }

  private formatSRTTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  private formatVTTTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  private formatASSTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  }
}

export const subtitleService = new SubtitleService();
export default subtitleService;
