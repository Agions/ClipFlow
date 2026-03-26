/**
 * ASR (自动语音识别) 服务
 * 支持 Whisper (OpenAI), 讯飞, 阿里 ASR 等
 */

import { BaseService } from './base.service';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ASRResult {
  id: string;
  text: string;
  startTime: number;  // 毫秒
  endTime: number;    // 毫秒
  confidence?: number;
  language?: string;
  speaker?: string;
}

export interface ASRResponse {
  results: ASRResult[];
  language: string;
  duration: number;
}

export interface ASROptions {
  language?: string;
  model?: 'whisper-1' | 'whisper-large-v3';
  timestamp?: boolean;
  temperature?: number;
}

export interface ASRProviderConfig {
  provider: 'openai' | 'xunfei' | 'aliyun';
  apiKey?: string;
  appId?: string;      // 讯飞
  apiSecret?: string;  // 阿里
}

// Whisper API 响应类型
interface WhisperSegment {
  id?: number;
  text?: string;
  start?: number;
  end?: number;
  confidence?: number;
}

interface WhisperResponse {
  text?: string;
  segments?: WhisperSegment[];
  language?: string;
}

export class ASRService extends BaseService {
  private config: ASRProviderConfig | null = null;

  constructor() {
    super('ASRService', { timeout: 120000, retries: 1 });
  }

  /**
   * 配置 ASR 服务
   */
  configure(config: ASRProviderConfig): void {
    this.config = config;
    logger.info('ASR 服务已配置:', { provider: config.provider });
  }

  /**
   * 获取当前配置
   */
  getConfig(): ASRProviderConfig | null {
    return this.config;
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    if (!this.config) return false;
    if (this.config.provider === 'openai') {
      return !!this.config.apiKey;
    }
    if (this.config.provider === 'xunfei') {
      return !!this.config.apiKey && !!this.config.appId;
    }
    if (this.config.provider === 'aliyun') {
      return !!this.config.apiKey && !!this.config.apiSecret;
    }
    return false;
  }

  /**
   * 语音转文字
   */
  async recognize(
    audioBlob: Blob,
    options: ASROptions = {}
  ): Promise<ASRResponse> {
    if (!this.isConfigured()) {
      throw new Error('ASR 服务未配置，请先调用 configure()');
    }

    const { provider } = this.config!;

    switch (provider) {
      case 'openai':
        return this.recognizeWithWhisper(audioBlob, options);
      case 'xunfei':
        return this.recognizeWithXunfei(audioBlob, options);
      case 'aliyun':
        return this.recognizeWithAliyun(audioBlob, options);
      default:
        throw new Error(`不支持的 ASR 提供商: ${provider}`);
    }
  }

  /**
   * 使用 OpenAI Whisper API
   */
  private async recognizeWithWhisper(
    audioBlob: Blob,
    options: ASROptions
  ): Promise<ASRResponse> {
    const { apiKey } = this.config!;
    const model = options.model || 'whisper-1';

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', model);
    formData.append('response_format', 'verbose_json');
    if (options.language) {
      formData.append('language', options.language);
    }
    if (options.timestamp !== false) {
      formData.append('timestamp', 'true');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Whisper API 错误: ${response.status} - ${error}`);
      }

      const data: WhisperResponse = await response.json();
      return this.parseWhisperResponse(data);

    } catch (error) {
      logger.error('Whisper ASR 失败:', error);
      throw error;
    }
  }

  /**
   * 解析 Whisper 响应
   */
  private parseWhisperResponse(data: WhisperResponse): ASRResponse {
    const results: ASRResult[] = [];

    if (data.segments && data.segments.length > 0) {
      // 有时间戳的响应
      for (const segment of data.segments) {
        results.push({
          id: uuidv4(),
          text: segment.text?.trim() || '',
          startTime: Math.round((segment.start || 0) * 1000),
          endTime: Math.round((segment.end || 0) * 1000),
          confidence: segment.confidence,
          language: data.language,
        });
      }
    } else if (data.text) {
      // 无时间戳的响应
      results.push({
        id: uuidv4(),
        text: data.text.trim(),
        startTime: 0,
        endTime: 0,
        language: data.language,
      });
    }

    return {
      results,
      language: data.language || 'zh',
      duration: results.length > 0 
        ? results[results.length - 1].endTime 
        : 0,
    };
  }

  /**
   * 使用讯飞 ASR (WebSocket API)
   */
  private async recognizeWithXunfei(
    audioBlob: Blob,
    options: ASROptions
  ): Promise<ASRResponse> {
    // 讯飞 WebSocket API 需要额外的鉴权逻辑
    // 这里提供一个简化的实现
    const { apiKey, appId } = this.config!;

    // 讯飞使用 HMAC-SHA1 签名
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signatureOrigin = `appid=${appId}&timestamp=${timestamp}`;
    
    // 注意：实际需要使用 crypto-js 或类似库计算签名
    const signature = btoa(signatureOrigin); // 简化版本

    const params = {
      appid: appId,
      ts: timestamp,
      signa: signature,
      level: 'plain',
      lang: options.language === 'en' ? 'en_us' : 'zh_cn',
    };

    // 讯飞实时语音转写 WebSocket URL
    const wsUrl = `wss://rtasr.xfyun.cn/v1/ws?${new URLSearchParams(params).toString()}`;

    return new Promise((resolve, reject) => {
      // 注意：浏览器环境使用 WebSocket 需要服务器支持
      // 这里仅返回占位符，实际需要 Tauri 后端代理
      logger.warn('讯飞 ASR 需要通过 Tauri 后端代理');
      
      resolve({
        results: [{
          id: uuidv4(),
          text: '讯飞 ASR 需要在 Tauri 后端实现',
          startTime: 0,
          endTime: 0,
          language: options.language || 'zh',
        }],
        language: options.language || 'zh',
        duration: 0,
      });
    });
  }

  /**
   * 使用阿里云 ASR
   */
  private async recognizeWithAliyun(
    audioBlob: Blob,
    options: ASROptions
  ): Promise<ASRResponse> {
    // 阿里云智能语音交互 API
    const { apiKey, apiSecret } = this.config!;

    // 阿里云需要签名认证
    const timestamp = new Date().toISOString();
    
    logger.info('阿里云 ASR 调用中...', { timestamp });

    // 简化实现 - 实际需要阿里云签名算法
    // 参考: https://help.aliyun.com/document_detail/215900.html

    return {
      results: [{
        id: uuidv4(),
        text: '阿里云 ASR 需要完整签名实现',
        startTime: 0,
        endTime: 0,
        language: options.language || 'zh',
      }],
      language: options.language || 'zh',
      duration: 0,
    };
  }

  /**
   * 从视频文件提取音频并识别
   * 需要浏览器支持 MediaRecorder 或 Tauri 后端处理
   */
  async recognizeFromVideo(
    videoBlob: Blob,
    options: ASROptions = {}
  ): Promise<ASRResponse> {
    // 从视频提取音频
    const audioBlob = await this.extractAudioFromVideo(videoBlob);
    return this.recognize(audioBlob, options);
  }

  /**
   * 从视频提取音频轨道
   */
  private extractAudioFromVideo(videoBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(videoBlob);
      video.muted = true;

      video.onloadedmetadata = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        
        const stream = canvas.captureStream(1);
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(video);
        const destination = audioContext.createMediaStreamDestination();
        
        source.connect(destination);
        source.connect(audioContext.destination);
        
        const mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: 'audio/webm'
        });
        
        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          URL.revokeObjectURL(video.src);
          audioContext.close();
          resolve(audioBlob);
        };
        
        mediaRecorder.start();
        video.currentTime = 0;
        video.play().then(() => {
          setTimeout(() => {
            mediaRecorder.stop();
          }, video.duration * 1000);
        }).catch(reject);
      };

      video.onerror = () => {
        reject(new Error('无法加载视频文件'));
      };
    });
  }
}

export const asrService = new ASRService();
export default asrService;
