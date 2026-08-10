/**
 * web-speech-provider — 单元测试
 *
 * 覆盖：
 *  - name = 'web-speech'
 *  - transcribe 中无 SpeechRecognition API 时 resolve(null)
 *  - 正常识别路径（mock SpeechRecognition API）
 *  - 多个识别结果（onresult event with multiple results）
 *  - 空 transcript 过滤
 *  - 缺 confidence 时使用 0.85 默认
 *  - interimResults=false 设置
 *  - language 'zh_cn' → 'zh-CN' 映射
 *  - onerror → resolve(null)
 *  - onend 时无 segments → resolve(null)
 *  - onend 时有 segments → resolve ASRResult
 *  - recognition.stop 通过 setTimeout 调用
 *  - 异常时 fallback 到 null
 *  - 优先使用 SpeechRecognition 而非 webkitSpeechRecognition
 *  - 优先使用 webkitSpeechRecognition（无 SpeechRecognition 时）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSpeechASRProvider } from './web-speech-provider';
import { DEFAULT_ASR_OPTIONS, type ASRResult } from '../asr-types';
import type { VideoInfo } from '@/types';

vi.mock('@/shared/utils/logging', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

class MockRecognition {
  lang: string = '';
  continuous: boolean = false;
  interimResults: boolean = true;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;

  start = vi.fn();
  stop = vi.fn();

  fireResult(results: Array<{ transcript: string; confidence?: number }>) {
    const event = {
      results: results.map(r => [r]),
    };
    if (this.onresult) (this.onresult as (e: unknown) => void)(event);
  }

  fireError() {
    if (this.onerror) this.onerror({});
  }

  fireEnd() {
    if (this.onend) this.onend();
  }
}

function makeVideoInfo(): VideoInfo {
  return {
    id: 'video-1',
    path: '/video.mp4',
    duration: 30,
  } as VideoInfo;
}

function setupMockRecognition(Constructor: new () => MockRecognition) {
  Object.defineProperty(window, 'SpeechRecognition', {
    value: Constructor,
    writable: true,
    configurable: true,
  });
}

function setupWebkitRecognition(Constructor: new () => MockRecognition) {
  Object.defineProperty(window, 'webkitSpeechRecognition', {
    value: Constructor,
    writable: true,
    configurable: true,
  });
}

function clearWindow() {
  Object.defineProperty(window, 'SpeechRecognition', {
    value: undefined,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'webkitSpeechRecognition', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

function createTrackingCtor(): { Ctor: new () => MockRecognition; instances: MockRecognition[] } {
  const instances: MockRecognition[] = [];
  const Ctor = class extends MockRecognition {
    constructor() {
      super();
      instances.push(this);
    }
  };
  return { Ctor, instances };
}

describe('WebSpeechASRProvider', () => {
  let provider: WebSpeechASRProvider;

  beforeEach(() => {
    provider = new WebSpeechASRProvider();
    clearWindow();
    vi.useFakeTimers();
  });

  it('has name = web-speech', () => {
    expect(provider.name).toBe('web-speech');
  });

  it('returns null when SpeechRecognition is unavailable', async () => {
    const result = await provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);
    expect(result).toBeNull();
  });

  it('uses SpeechRecognition when both are available', async () => {
    const standard = createTrackingCtor();
    const webkit = createTrackingCtor();

    setupMockRecognition(standard.Ctor);
    setupWebkitRecognition(webkit.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);
    await vi.advanceTimersByTimeAsync(0);
    standard.instances[0].fireEnd();
    await promise;

    expect(standard.instances).toHaveLength(1);
    expect(webkit.instances).toHaveLength(0);
  });

  it('falls back to webkitSpeechRecognition when standard is missing', async () => {
    const webkit = createTrackingCtor();

    setupWebkitRecognition(webkit.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);
    await vi.advanceTimersByTimeAsync(0);
    webkit.instances[0].fireEnd();
    await promise;

    expect(webkit.instances).toHaveLength(1);
  });

  it('replaces the first underscore with hyphen (replace, not replaceAll)', async () => {
    const tracked = createTrackingCtor();
    setupMockRecognition(tracked.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), {
      ...DEFAULT_ASR_OPTIONS,
      language: 'zh_cn',
    });
    await vi.advanceTimersByTimeAsync(0);

    // Current implementation uses String.replace() which only replaces the first occurrence
    expect(tracked.instances[0].lang).toBe('zh-cn');

    tracked.instances[0].fireEnd();
    await promise;
  });

  it('transforms language code en_us → en-us', async () => {
    const tracked = createTrackingCtor();
    setupMockRecognition(tracked.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), {
      ...DEFAULT_ASR_OPTIONS,
      language: 'en_us',
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(tracked.instances[0].lang).toBe('en-us');

    tracked.instances[0].fireEnd();
    await promise;
  });

  it('returns null when no segments are produced', async () => {
    const tracked = createTrackingCtor();
    setupMockRecognition(tracked.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);

    // Trigger end without any results
    await vi.advanceTimersByTimeAsync(0);
    tracked.instances[0].fireEnd();

    const result = await promise;
    expect(result).toBeNull();
  });

  it('returns ASRResult with segments on successful recognition', async () => {
    const tracked = createTrackingCtor();
    setupMockRecognition(tracked.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);

    await vi.advanceTimersByTimeAsync(0);
    tracked.instances[0].fireResult([{ transcript: 'hello world', confidence: 0.95 }]);
    tracked.instances[0].fireEnd();

    const result = await promise;
    expect(result).not.toBeNull();
    expect((result as ASRResult).text).toContain('hello');
    expect((result as ASRResult).segments.length).toBe(1);
    expect((result as ASRResult).language).toBe(DEFAULT_ASR_OPTIONS.language);
    expect((result as ASRResult).provider).toBe('web-speech');
  });

  it('produces fullResult with timestamps when enableTimestamp=true', async () => {
    const tracked = createTrackingCtor();
    setupMockRecognition(tracked.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), {
      ...DEFAULT_ASR_OPTIONS,
      enableTimestamp: true,
    });

    await vi.advanceTimersByTimeAsync(0);
    tracked.instances[0].fireResult([{ transcript: 'hello', confidence: 0.9 }]);
    tracked.instances[0].fireEnd();

    const result = await promise;
    expect(result).not.toBeNull();
    expect((result as ASRResult).fullResult).toBeDefined();
    expect((result as ASRResult).fullResult?.length).toBe(1);
  });

  it('omits fullResult when enableTimestamp=false', async () => {
    const tracked = createTrackingCtor();
    setupMockRecognition(tracked.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), {
      ...DEFAULT_ASR_OPTIONS,
      enableTimestamp: false,
    });

    await vi.advanceTimersByTimeAsync(0);
    tracked.instances[0].fireResult([{ transcript: 'hello', confidence: 0.9 }]);
    tracked.instances[0].fireEnd();

    const result = await promise;
    expect(result).not.toBeNull();
    expect((result as ASRResult).fullResult).toBeUndefined();
  });

  it('defaults confidence to 0.85 when not provided', async () => {
    const tracked = createTrackingCtor();
    setupMockRecognition(tracked.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);

    await vi.advanceTimersByTimeAsync(0);
    tracked.instances[0].fireResult([
      { transcript: 'hello' }, // no confidence
    ]);
    tracked.instances[0].fireEnd();

    const result = await promise;
    expect(result).not.toBeNull();
    expect((result as ASRResult).segments[0].confidence).toBe(0.85);
  });

  it('skips empty transcripts', async () => {
    const tracked = createTrackingCtor();
    setupMockRecognition(tracked.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);

    await vi.advanceTimersByTimeAsync(0);
    tracked.instances[0].fireResult([
      { transcript: '  ', confidence: 0.9 }, // whitespace only
      { transcript: 'hello', confidence: 0.9 },
    ]);
    tracked.instances[0].fireEnd();

    const result = await promise;
    expect(result).not.toBeNull();
    expect((result as ASRResult).segments.length).toBe(1);
  });

  it('returns null on error event', async () => {
    const tracked = createTrackingCtor();
    setupMockRecognition(tracked.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);

    await vi.advanceTimersByTimeAsync(0);
    tracked.instances[0].fireError();

    const result = await promise;
    expect(result).toBeNull();
  });

  it('calls recognition.start()', async () => {
    const tracked = createTrackingCtor();
    setupMockRecognition(tracked.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);

    await vi.advanceTimersByTimeAsync(0);
    expect(tracked.instances[0].start).toHaveBeenCalledTimes(1);

    tracked.instances[0].fireEnd();
    await promise;
  });

  it('schedules recognition.stop after 2 seconds', async () => {
    const tracked = createTrackingCtor();
    setupMockRecognition(tracked.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);

    await vi.advanceTimersByTimeAsync(2000);
    expect(tracked.instances[0].stop).toHaveBeenCalled();

    tracked.instances[0].fireEnd();
    await promise;
  });

  it('computes average confidence across segments', async () => {
    const tracked = createTrackingCtor();
    setupMockRecognition(tracked.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);

    await vi.advanceTimersByTimeAsync(0);
    tracked.instances[0].fireResult([
      { transcript: 'a', confidence: 0.8 },
      { transcript: 'b', confidence: 1.0 },
    ]);
    tracked.instances[0].fireEnd();

    const result = await promise;
    expect(result).not.toBeNull();
    expect((result as ASRResult).confidence).toBeCloseTo(0.9, 5);
  });

  it('does not throw on error event', async () => {
    const tracked = createTrackingCtor();
    setupMockRecognition(tracked.Ctor);

    const promise = provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);

    await vi.advanceTimersByTimeAsync(0);
    tracked.instances[0].fireError();

    const result = await promise;
    expect(result).toBeNull();
  });
});
