/**
 * whisper-rust-provider — 单元测试
 *
 * 覆盖：
 *  - name = 'rust-whisper'
 *  - transcribe 正常路径（带 words / 不带 words）
 *  - whisperResult 为 null/空 → return null + warn
 *  - whisperService.transcribe 抛错 → return null + warn（catch 路径）
 *  - enableTimestamp 控制 fullResult
 *  - language 映射 (zh_cn/en_us/auto)
 *  - _convertSegments 转换毫秒→秒、probability 默认值
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../subtitle/whisper-service', () => ({
  whisperService: {
    transcribe: vi.fn(),
  },
}));

vi.mock('../../../../shared/utils/logging', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { whisperService } from '../../subtitle/whisper-service';
import { RustWhisperASRProvider } from './whisper-rust-provider';
import { DEFAULT_ASR_OPTIONS, type RustWhisperSegment, type ASRSegment } from '../asr-types';
import type { VideoInfo } from '@/types';

const mockedTranscribe = vi.mocked(whisperService.transcribe);

const sampleSegments: RustWhisperSegment[] = [
  { start_ms: 0, end_ms: 1000, text: 'hello', probability: 0.9 },
  { start_ms: 1000, end_ms: 2000, text: '  world  ', probability: undefined },
];

const segmentsWithWords: RustWhisperSegment[] = [
  {
    start_ms: 0,
    end_ms: 1000,
    text: 'word',
    probability: 0.8,
    words: [{ start_ms: 0, end_ms: 500, word: 'word', probability: 0.85 }],
  },
];

beforeEach(() => {
  mockedTranscribe.mockReset();
});

function makeVideoInfo(): VideoInfo {
  return { id: 'v', path: '/v.mp4', duration: 30 } as VideoInfo;
}

describe('RustWhisperASRProvider', () => {
  it('has name = rust-whisper', () => {
    const p = new RustWhisperASRProvider();
    expect(p.name).toBe('rust-whisper');
  });

  it('transcribes and converts segments to ASRResult (L37-L57)', async () => {
    mockedTranscribe.mockResolvedValue({
      language: 'en',
      language_probability: 0.95,
      duration_ms: 2000,
      segments: sampleSegments,
    });

    const provider = new RustWhisperASRProvider();
    const result = await provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);

    expect(result).not.toBeNull();
    expect(result!.text).toBe('hello world'); // trimmed
    expect(result!.language).toBe(DEFAULT_ASR_OPTIONS.language);
    expect(result!.confidence).toBe(0.95);
    expect(result!.provider).toBe('rust-whisper');
    expect(result!.segments).toHaveLength(2);
    expect((result!.segments[0] as ASRSegment).startTime).toBe(0);
    expect((result!.segments[1] as ASRSegment).endTime).toBe(2);
    expect((result!.segments[1] as ASRSegment).text).toBe('world'); // trimmed
  });

  it('uses default probability when seg.probability undefined (L71)', async () => {
    mockedTranscribe.mockResolvedValue({
      language: 'en',
      language_probability: undefined as unknown as number,
      duration_ms: 2000,
      segments: sampleSegments, // second segment has probability undefined
    });

    const provider = new RustWhisperASRProvider();
    const result = await provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);
    expect(result!.confidence).toBe(0.9); // default when language_probability missing
    expect((result!.segments[1] as ASRSegment).confidence).toBe(0.95); // default when seg.probability missing
  });

  it('converts word-level timing when present (L72)', async () => {
    mockedTranscribe.mockResolvedValue({
      language: 'en',
      language_probability: 0.8,
      duration_ms: 1000,
      segments: segmentsWithWords,
    });

    const provider = new RustWhisperASRProvider();
    const result = await provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);
    const seg = result!.segments[0] as ASRSegment;
    expect(seg.words).toBeDefined();
    expect(seg.words![0].word).toBe('word');
    expect(seg.words![0].startTime).toBe(0);
    expect(seg.words![0].endTime).toBe(0.5);
  });

  it('includes fullResult when enableTimestamp=true (L49)', async () => {
    mockedTranscribe.mockResolvedValue({
      language: 'en',
      language_probability: 0.9,
      duration_ms: 2000,
      segments: sampleSegments,
    });

    const provider = new RustWhisperASRProvider();
    const result = await provider.transcribe(makeVideoInfo(), {
      ...DEFAULT_ASR_OPTIONS,
      enableTimestamp: true,
    });
    expect(result!.fullResult).toBeDefined();
    expect(result!.fullResult).toHaveLength(2);
  });

  it('omits fullResult when enableTimestamp=false (L55 undefined)', async () => {
    mockedTranscribe.mockResolvedValue({
      language: 'en',
      language_probability: 0.9,
      duration_ms: 2000,
      segments: sampleSegments,
    });

    const provider = new RustWhisperASRProvider();
    const result = await provider.transcribe(makeVideoInfo(), {
      ...DEFAULT_ASR_OPTIONS,
      enableTimestamp: false,
    });
    expect(result!.fullResult).toBeUndefined();
  });

  it('returns null and warns when whisperResult is null (L32-L34)', async () => {
    mockedTranscribe.mockResolvedValue(null as unknown as never);

    const provider = new RustWhisperASRProvider();
    const result = await provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);
    expect(result).toBeNull();
    const { logger } = await import('../../../../shared/utils/logging');
    expect(logger.warn).toHaveBeenCalledWith('[RustWhisperASR] Rust Whisper 返回空结果');
  });

  it('returns null and warns when segments is empty (L32-L34)', async () => {
    mockedTranscribe.mockResolvedValue({
      language: 'en',
      language_probability: 0.9,
      duration_ms: 0,
      segments: [],
    });

    const provider = new RustWhisperASRProvider();
    const result = await provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);
    expect(result).toBeNull();
    const { logger } = await import('../../../../shared/utils/logging');
    expect(logger.warn).toHaveBeenCalledWith('[RustWhisperASR] Rust Whisper 返回空结果');
  });

  it('returns null and warns when whisperService.transcribe throws (L58-L60)', async () => {
    mockedTranscribe.mockRejectedValue(new Error('rust crash'));

    const provider = new RustWhisperASRProvider();
    const result = await provider.transcribe(makeVideoInfo(), DEFAULT_ASR_OPTIONS);
    expect(result).toBeNull();
    const { logger } = await import('../../../../shared/utils/logging');
    expect(logger.warn).toHaveBeenCalledWith(
      '[RustWhisperASR] Rust Whisper 调用失败:',
      'Error: rust crash'
    );
  });

  it('maps zh_cn language → "zh" whisper arg', async () => {
    mockedTranscribe.mockResolvedValue({
      language: 'zh',
      language_probability: 0.9,
      duration_ms: 1000,
      segments: sampleSegments,
    });
    const provider = new RustWhisperASRProvider();
    await provider.transcribe(makeVideoInfo(), { ...DEFAULT_ASR_OPTIONS, language: 'zh_cn' });
    expect(mockedTranscribe).toHaveBeenCalledWith('/v.mp4', 'base', 'zh');
  });

  it('maps en_us language → "en" whisper arg', async () => {
    mockedTranscribe.mockResolvedValue({
      language: 'en',
      language_probability: 0.9,
      duration_ms: 1000,
      segments: sampleSegments,
    });
    const provider = new RustWhisperASRProvider();
    await provider.transcribe(makeVideoInfo(), { ...DEFAULT_ASR_OPTIONS, language: 'en_us' });
    expect(mockedTranscribe).toHaveBeenCalledWith('/v.mp4', 'base', 'en');
  });

  it('passes "auto" for unknown language code', async () => {
    mockedTranscribe.mockResolvedValue({
      language: 'auto',
      language_probability: 0.9,
      duration_ms: 1000,
      segments: sampleSegments,
    });
    const provider = new RustWhisperASRProvider();
    await provider.transcribe(makeVideoInfo(), {
      ...DEFAULT_ASR_OPTIONS,
      language: 'ja_jp' as never,
    });
    expect(mockedTranscribe).toHaveBeenCalledWith('/v.mp4', 'base', 'auto');
  });
});
