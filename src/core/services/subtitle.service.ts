/**
 * 智能字幕服务
 * 语音转字幕、翻译、导入导出
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

/**
 * 字幕条目
 */
export interface SubtitleEntry {
  id: string;
  startTime: number; // 毫秒
  endTime: number;
  text: string;
  language?: string;
  speaker?: string;
  confidence?: number;
}

/**
 * 字幕格式
 */
export type SubtitleFormat = 'srt' | 'ass' | 'vtt' | 'lrc';

/**
 * 字幕样式（用于 ASS 格式）
 */
export interface SubtitleStyle {
  fontName: string;
  fontSize: number;
  primaryColor: string;    // ARGB: &HAARRGGBB
  outlineColor: string;
  shadowColor: string;
  bold: boolean;
  italic: boolean;
  outline: number;
  shadow: number;
  alignment: number;        // 1-9 (bottom-left to top-right)
  marginL: number;
  marginR: number;
  marginV: number;
}

/** 内置字幕样式预设 */
export const SUBTITLE_PRESETS: Record<string, SubtitleStyle> = {
  /** 默认白字黑边 */
  default: {
    fontName: 'Arial',
    fontSize: 20,
    primaryColor: '&H00FFFFFF',
    outlineColor: '&H00000000',
    shadowColor: '&H00000000',
    bold: false,
    italic: false,
    outline: 2,
    shadow: 2,
    alignment: 2,
    marginL: 10,
    marginR: 10,
    marginV: 10,
  },
  /** 高对比白字（电影感） */
  cinematic: {
    fontName: 'Microsoft YaHei',
    fontSize: 24,
    primaryColor: '&H00FFFFFF',
    outlineColor: '&H00202020',
    shadowColor: '&H00000000',
    bold: true,
    italic: false,
    outline: 3,
    shadow: 1,
    alignment: 2,
    marginL: 20,
    marginR: 20,
    marginV: 15,
  },
  /** 明亮背景用黑字 */
  light: {
    fontName: 'Arial',
    fontSize: 22,
    primaryColor: '&H00202020',
    outlineColor: '&H00FFFFFF',
    shadowColor: '&H00CCCCCC',
    bold: false,
    italic: false,
    outline: 1,
    shadow: 2,
    alignment: 2,
    marginL: 10,
    marginR: 10,
    marginV: 10,
  },
  /** 小屏移动端 */
  mobile: {
    fontName: 'Arial',
    fontSize: 16,
    primaryColor: '&H00FFFFFF',
    outlineColor: '&H00000000',
    shadowColor: '&H00000000',
    bold: false,
    italic: false,
    outline: 2,
    shadow: 3,
    alignment: 2,
    marginL: 8,
    marginR: 8,
    marginV: 8,
  },
};

/**
 * 字幕数据
 */
export interface SubtitleData {
  entries: SubtitleEntry[];
  language: string;
  format: SubtitleFormat;
  title?: string;
}

/**
 * 翻译结果
 */
export interface TranslationResult {
  original: string;
  translated: string;
  language: string;
}

/**
 * ASR 选项
 */
export interface ASROptions {
  language?: string;
  model?: 'base' | 'small' | 'medium' | 'large';
  timestamp?: boolean;
  speaker?: boolean;
}

/**
 * 智能字幕服务
 */
export class SubtitleService {
  /**
   * 语音转字幕 (ASR)
   */
  async recognizeSpeech(
    audioBuffer: ArrayBuffer,
    options?: ASROptions
  ): Promise<SubtitleData> {
    logger.info('语音识别中...', options);
    
    // TODO: 实现真正的 ASR - 需要集成 Whisper/讯飞/阿里 ASR 等服务
    return {
      entries: [],
      language: options?.language || 'zh-CN',
      format: 'srt',
    };
  }

  /**
   * 从音频文件路径提取字幕
   */
  async extractFromAudio(
    audioPath: string,
    options?: ASROptions
  ): Promise<SubtitleData> {
    logger.info('从音频提取字幕', { audioPath, options });
    return this.recognizeSpeech(new ArrayBuffer(0), options);
  }

  /**
   * 翻译字幕
   */
  async translateSubtitles(
    subtitles: SubtitleData,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<SubtitleData> {
    logger.info('翻译字幕到', targetLanguage);
    
    return {
      ...subtitles,
      language: targetLanguage,
      entries: subtitles.entries.map(entry => ({
        ...entry,
        text: `[${targetLanguage}] ${entry.text}`,
      })),
    };
  }

  /**
   * 导出 SRT 格式
   */
  exportToSRT(subtitles: SubtitleData): string {
    return subtitles.entries.map((entry, index) => {
      const startTime = this.formatSRTTime(entry.startTime);
      const endTime = this.formatSRTTime(entry.endTime);
      return `${index + 1}\n${startTime} --> ${endTime}\n${entry.text}\n`;
    }).join('\n');
  }

  /**
   * 导出 ASS 格式
   */
  exportToASS(subtitles: SubtitleData, styleName: keyof typeof SUBTITLE_PRESETS = 'default'): string {
    const style = SUBTITLE_PRESETS[styleName] || SUBTITLE_PRESETS.default;
    
    const styleLine = [
      'Style: Default',
      style.fontName,
      style.fontSize.toString(),
      style.primaryColor,
      '&H000000FF', // SecondaryColour
      style.outlineColor,
      style.shadowColor,
      style.bold ? '1' : '0',
      style.italic ? '1' : '0',
      '0', // Underline
      '0', // StrikeOut
      '100', // ScaleX
      '100', // ScaleY
      '0',   // Spacing
      '0',   // Angle
      '1',   // BorderStyle
      style.outline.toString(),
      style.shadow.toString(),
      style.alignment.toString(),
      style.marginL.toString(),
      style.marginR.toString(),
      style.marginV.toString(),
      '1',   // Encoding
    ].join(',');

    const header = `[Script Info]
Title: ClipFlow Subtitles
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${styleLine}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
    
    const events = subtitles.entries.map(entry => {
      const startTime = this.formatASSTime(entry.startTime);
      const endTime = this.formatASSTime(entry.endTime);
      return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${entry.text}`;
    }).join('\n');
    
    return header + events;
  }

  /**
   * 导出 VTT 格式
   */
  exportToVTT(subtitles: SubtitleData): string {
    const header = 'WEBVTT\n\n';
    const entries = subtitles.entries.map(entry => {
      const startTime = this.formatVTTTime(entry.startTime);
      const endTime = this.formatVTTTime(entry.endTime);
      return `${startTime} --> ${endTime}\n${entry.text}\n`;
    }).join('\n');
    
    return header + entries;
  }

  /**
   * 导入 SRT 格式
   */
  importFromSRT(content: string): SubtitleData {
    const entries: SubtitleEntry[] = [];
    const blocks = content.trim().split(/\n\n+/);
    
    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 3) continue;
      
      const timeLine = lines[1];
      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      
      if (timeMatch) {
        const startTime = 
          parseInt(timeMatch[1]) * 3600000 +
          parseInt(timeMatch[2]) * 60000 +
          parseInt(timeMatch[3]) * 1000 +
          parseInt(timeMatch[4]);
        
        const endTime = 
          parseInt(timeMatch[5]) * 3600000 +
          parseInt(timeMatch[6]) * 60000 +
          parseInt(timeMatch[7]) * 1000 +
          parseInt(timeMatch[8]);
        
        const text = lines.slice(2).join('\n');
        
        entries.push({
          id: uuidv4(),
          startTime,
          endTime,
          text,
        });
      }
    }
    
    return { entries, language: 'zh-CN', format: 'srt' };
  }

  /**
   * 格式化 SRT 时间
   */
  private formatSRTTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
  }

  /**
   * 格式化 ASS 时间
   */
  private formatASSTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }

  /**
   * 格式化 VTT 时间
   */
  private formatVTTTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }
}

export const subtitleService = new SubtitleService();
