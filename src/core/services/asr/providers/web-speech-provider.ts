/**
 * Web Speech API ASR Provider
 * 使用浏览器内置 Web Speech API 进行语音识别
 * 优点：无 API key 依赖，实时性好
 * 缺点：准确率低于 Whisper/云 ASR，仅支持部分语言
 */
import { logger } from '../../../../shared/utils/logging';
import type { VideoInfo } from '@/types';
import type {
  ASRResult,
  ASRSegment,
  ASROptions,
  SpeechRecognitionCtor,
  SpeechRecognitionEvent,
} from '../asr-types';
import type { IASRProvider } from './types';

/**
 * Web Speech API 策略实现
 * 注意：浏览器 API 仅作 fallback，准确性低于 Rust Whisper
 */

// 浏览器 API 签名保留供未来扩展
export class WebSpeechASRProvider implements IASRProvider {
  readonly name = 'web-speech';

  async transcribe(
    // @ts-expect-error - videoInfo 预留以支持未来媒体约束
    videoInfo: VideoInfo,
    opts: Required<ASROptions>
  ): Promise<ASRResult | null> {
    return new Promise(resolve => {
      const SpeechRecognitionCtor = this._getSpeechRecognitionConstructor();
      if (!SpeechRecognitionCtor) {
        resolve(null);
        return;
      }

      try {
        const result = this._runRecognition(SpeechRecognitionCtor, opts);
        resolve(result);
      } catch (err) {
        // 注意：L37/L38 catch 分支在当前实现下属于 dead code — _runRecognition
        // 内部所有可能抛错的代码都在 `new Promise(...)` 的 executor 内执行，
        // 抛错会被 Promise 边界自动吸收为 rejected Promise 而非同步抛出。
        // 此处保留作为防御性逻辑（若未来 _runRecognition 重构为同步入口或
        // executor 之前的代码被扩展时可自动生效）。
        logger.warn('[WebSpeechASR] Web Speech 调用失败:', String(err));
        resolve(null);
      }
    });
  }

  /** 获取浏览器支持的 SpeechRecognition 构造函数 */
  private _getSpeechRecognitionConstructor(): SpeechRecognitionCtor | undefined {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition;
  }

  /** 启动识别并返回结果（已结束的 Promise） */
  private _runRecognition(
    SpeechRecognitionCtor: SpeechRecognitionCtor,
    opts: Required<ASROptions>
  ): Promise<ASRResult | null> {
    return new Promise(resolve => {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = opts.language.replace('_', '-');
      recognition.continuous = true;
      recognition.interimResults = false;

      const segments: ASRSegment[] = [];
      let startTime = 0;
      let currentText = '';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
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
            fullResult: opts.enableTimestamp
              ? segments.map(s => ({
                  start: s.startTime,
                  end: s.endTime,
                  text: s.text,
                  confidence: s.confidence,
                }))
              : undefined,
            provider: this.name,
          });
        } else {
          resolve(null);
        }
      };

      recognition.start();
      // Web Speech API 需要麦克风，这里模拟 2 秒后结束
      setTimeout(() => recognition.stop(), 2000);
    });
  }
}
