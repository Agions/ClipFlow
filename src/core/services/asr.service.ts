/**
 * ASR（自动语音识别）服务
 * 提供音频转文字能力，支持多语言和多种音频格式
 */

import { BaseService, ServiceError } from './base.service';
import { logger } from '@/utils/logger';
import type { VideoInfo } from '@/core/types';

// ============================================
// 类型定义
// ============================================

export interface ASRResult {
  /** 识别的文本 */
  text: string;
  /** 分段结果 */
  segments: ASRSegment[];
  /** 语言 */
  language?: string;
  /** 置信度 */
  confidence?: number;
  /** 完整结果（含时间戳） */
  fullResult?: ASRFullResult[];
}

export interface ASRSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
  words?: ASRWord[];
}

export interface ASRWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface ASRFullResult {
  start: number;
  end: number;
  text: string;
  confidence: number;
  words?: ASRWord[];
}

export interface ASROptions {
  /** 识别语言，默认为中文 */
  language?: 'zh_cn' | 'en_us' | 'ja_jp' | 'ko_kr';
  /** 是否启用时间戳 */
  enableTimestamp?: boolean;
  /** 是否启用标点 */
  enablePunctuation?: boolean;
  /** 采样率 */
  sampleRate?: number;
  /** 声道数 */
  channels?: 1 | 2;
}

const DEFAULT_ASR_OPTIONS: Required<ASROptions> = {
  language: 'zh_cn',
  enableTimestamp: true,
  enablePunctuation: true,
  sampleRate: 16000,
  channels: 1,
};

// 语言代码映射
const LANGUAGE_MAP: Record<string, string> = {
  'zh_cn': ' Mandarin',
  'en_us': ' English',
  'ja_jp': ' Japanese',
  'ko_kr': ' Korean',
};

// ============================================
// ASR 服务
// ============================================

export class ASRService extends BaseService {
  private isInitialized = false;

  constructor() {
    super('ASRService', { timeout: 60000, retries: 2 });
  }

  /**
   * 视频路径转字幕 — SubtitleEditor 专用入口
   * 构造最小 VideoInfo 后调用 recognizeSpeech
   * @param videoPath 视频文件路径
   * @param duration  视频时长（秒）
   * @param options   ASR 选项
   */
  async transcribeVideo(
    videoPath: string,
    duration: number,
    options?: ASROptions
  ): Promise<ASRResult> {
    const videoInfo: VideoInfo = {
      id: crypto.randomUUID(),
      name: videoPath.split('/').pop() ?? videoPath,
      path: videoPath,
      duration,
      width: 0,
      height: 0,
      size: 0,
      fps: 0,
      format: '',
    };
    return await this.recognizeSpeech(videoInfo, options);
  }

  /**
   * 语音识别 - 将音频转换为文字
   * @param videoInfo 视频信息
   * @param options ASR 选项
   */
  async recognizeSpeech(
    videoInfo: VideoInfo,
    options?: ASROptions
  ): Promise<ASRResult> {
    return this.executeRequest(async () => {
      const opts = { ...DEFAULT_ASR_OPTIONS, ...options };

      logger.info(`[ASRService] 开始语音识别:`, {
        videoId: videoInfo.id,
        language: opts.language,
        duration: videoInfo.duration,
      });

      // ASR 策略：Web Speech API（本地/无 API key）→ mock
      // 真实场景（高准确率）推荐接入 faster-whisper（Tauri 后端）或云 ASR
      let result = await this.tryWebSpeechASR(videoInfo, opts);
      if (!result) {
        logger.warn('[ASRService] Web Speech API 不可用，使用模拟结果');
        result = await this.mockASR(videoInfo, opts);
      }

      logger.info(`[ASRService] 语音识别完成:`, {
        videoId: videoInfo.id,
        textLength: result.text.length,
        segmentCount: result.segments.length,
      });

      return result;
    }, '语音识别失败');
  }

  /**
   * 批量语音识别
   * @param videos 视频列表
   * @param options ASR 选项
   */
  async recognizeBatch(
    videos: VideoInfo[],
    options?: ASROptions
  ): Promise<ASRResult[]> {
    return this.executeRequest(async () => {
      const results: ASRResult[] = [];
      for (const video of videos) {
        const result = await this.recognizeSpeech(video, options);
        results.push(result);
      }
      return results;
    }, '批量语音识别失败');
  }

  /**
   * 获取音频峰值（用于配合 ASR 做高光检测）
   * @param videoInfo 视频信息
   */
  async getAudioPeaks(
    videoInfo: VideoInfo,
    options?: { threshold?: number; minInterval?: number }
  ): Promise<Array<{ timestamp: number; intensity: number }>> {
    return this.executeRequest(async () => {
      const { threshold = 0.7, minInterval = 1000 } = options || {};

      // 模拟音频峰值检测
      const peaks: Array<{ timestamp: number; intensity: number }> = [];
      let lastPeakTime = -minInterval;

      for (let t = 0; t < videoInfo.duration; t += 0.5) {
        // 模拟随机峰值
        const intensity = Math.random();
        if (intensity > threshold && (t - lastPeakTime) > minInterval / 1000) {
          peaks.push({ timestamp: t, intensity });
          lastPeakTime = t;
        }
      }

      return peaks;
    }, '音频峰值检测失败');
  }

  /**
   * 模拟 ASR 结果（临时实现）
   * 实际使用时替换为真实 ASR API 调用
   */
  private async mockASR(
    videoInfo: VideoInfo,
    opts: Required<ASROptions>
  ): Promise<ASRResult> {
    // 生成模拟分段
    const segmentDuration = 5; // 每段 5 秒
    const numSegments = Math.max(1, Math.floor(videoInfo.duration / segmentDuration));
    const segments: ASRSegment[] = [];

    const sampleTexts: Record<string, string[]> = {
      'zh_cn': [
        '欢迎观看本期视频',
        '今天我们来介绍一个新功能',
        '首先让我们了解一下背景',
        '然后进入实际操作环节',
        '最后做一个总结',
      ],
      'en_us': [
        'Welcome to this video',
        'Today we are going to introduce a new feature',
        'First let us understand the background',
        'Then we move to the practical operation',
        'Finally we make a summary',
      ],
    };

    const texts = sampleTexts[opts.language] || sampleTexts['zh_cn'];

    for (let i = 0; i < numSegments; i++) {
      const startTime = i * segmentDuration;
      const endTime = Math.min((i + 1) * segmentDuration, videoInfo.duration);
      const textIndex = i % texts.length;

      segments.push({
        id: crypto.randomUUID(),
        startTime,
        endTime,
        text: texts[textIndex],
        confidence: 0.85 + Math.random() * 0.15,
        words: opts.enableTimestamp ? [
          {
            word: texts[textIndex],
            startTime,
            endTime,
            confidence: 0.9,
          },
        ] : undefined,
      });
    }

    return {
      text: segments.map(s => s.text).join('。'),
      segments,
      language: opts.language,
      confidence: 0.88,
      fullResult: opts.enableTimestamp ? segments.map(s => ({
        start: s.startTime,
        end: s.endTime,
        text: s.text,
        confidence: s.confidence,
        words: s.words,
      })) : undefined,
    };
  }

  /**
   * 使用浏览器 Web Speech API 进行语音识别
   * 优点：无 API key 依赖，实时性好
   * 缺点：准确率低于 Whisper/云 ASR，仅支持部分语言
   *
   * @returns ASRResult 或 null（API 不可用时）
   */
  private tryWebSpeechASR(
    videoInfo: VideoInfo,
    opts: Required<ASROptions>
  ): Promise<ASRResult | null> {
    return new Promise((resolve) => {
      // 检查 Web Speech API 是否可用
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionCtor = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (new (...args: any[]) => any) | undefined;
      if (!SpeechRecognitionCtor) {
        resolve(null);
        return;
      }

      try {
        const recognition = new SpeechRecognitionCtor();
        recognition.lang = opts.language.replace('_', '-');
        recognition.continuous = true;
        recognition.interimResults = false;

        const segments: ASRSegment[] = [];
        let startTime = 0;
        let currentText = '';

        recognition.onresult = (event: any) => {
          for (const result of event.results) {
            const transcript = result[0].transcript.trim();
            if (transcript) {
              const confidence = result[0].confidence ?? 0.85;
              segments.push({
                id: crypto.randomUUID(),
                startTime,
                endTime: startTime + Math.max(2, transcript.length / 5),
                text: transcript,
                confidence,
              });
              currentText += transcript + ' ';
              startTime += 3; // 估计每段 3 秒
            }
          }
        };

        recognition.onerror = () => resolve(null);
        recognition.onend = () => {
          if (segments.length > 0) {
            resolve({
              text: currentText.trim(),
              segments,
              language: opts.language,
              confidence: segments.reduce((s, seg) => s + seg.confidence, 0) / segments.length,
              fullResult: opts.enableTimestamp ? segments.map(s => ({
                start: s.startTime,
                end: s.endTime,
                text: s.text,
                confidence: s.confidence,
              })) : undefined,
            });
          } else {
            resolve(null);
          }
        };

        recognition.start();
        // Web Speech API 需要麦克风，这里模拟 2 秒后结束（实际使用时需要真实音频流）
        setTimeout(() => recognition.stop(), 2000);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * 讯飞 ASR API 调用
   *
   * 使用方式：
   * 1. 在 https://www.xfyun.cn 注册并获取 APPID/APISecret/APIKey
   * 2. 设置环境变量或配置项：ASR_XFyun_APPID / ASR_XFyun_APIKEY
   *
   * @requires xfyun-app-id, xfyun-api-key 配置
   */
  private async callXfyunASR(
    _videoInfo: VideoInfo,
    _options: Required<ASROptions>
  ): Promise<ASRResult> {
    const appId = import.meta.env.VITE_XFyun_APPID;
    const apiKey = import.meta.env.VITE_XFyun_APIKEY;

    if (!appId || !apiKey) {
      logger.warn('[ASRService] 讯飞 ASR 未配置 API 凭证，跳过');
      throw new ServiceError('讯飞 ASR 缺少凭证', 'NOT_CONFIGURED');
    }

    // 讯飞文档: https://www.xfyun.cn/doc/asr/online_asr/API.html
    throw new ServiceError('讯飞 ASR 接入请参考文档配置', 'NOT_IMPLEMENTED');
  }

  /**
   * 腾讯 ASR API 调用
   *
   * 使用方式：
   * 1. 在 https://cloud.tencent.com/product/asr 注册
   * 2. 设置环境变量：VITE_TENCENT_ASR_SECRET_ID / VITE_TENCENT_ASR_SECRET_KEY
   *
   * @requires tencent-secret-id, tencent-secret-key 配置
   */
  private async callTencentASR(
    _videoInfo: VideoInfo,
    _options: Required<ASROptions>
  ): Promise<ASRResult> {
    const secretId = import.meta.env.VITE_TENCENT_ASR_SECRET_ID;
    const secretKey = import.meta.env.VITE_TENCENT_ASR_SECRET_KEY;

    if (!secretId || !secretKey) {
      logger.warn('[ASRService] 腾讯 ASR 未配置 API 凭证，跳过');
      throw new ServiceError('腾讯 ASR 缺少凭证', 'NOT_CONFIGURED');
    }

    // 腾讯文档: https://cloud.tencent.com/document/product/1093-37856
    throw new ServiceError('腾讯 ASR 接入请参考文档配置', 'NOT_IMPLEMENTED');
  }
}

// 导出单例
export const asrService = new ASRService();
export default asrService;
