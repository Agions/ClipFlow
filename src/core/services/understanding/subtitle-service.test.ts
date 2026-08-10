/**
 * subtitle-service 测试
 * 覆盖字幕转录单步能力：whisper 复用、参数透传、结果标准化
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../subtitle/whisper-service', () => ({
  whisperService: {
    transcribe: vi.fn(),
    toSubtitleFormat: vi.fn(),
  },
}));

vi.mock('@/shared/utils/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { whisperService } from '../subtitle/whisper-service';
import { transcribeSubtitles } from './subtitle-service';

const transcribeMock = vi.mocked(whisperService.transcribe);
const toSubtitleFormatMock = vi.mocked(whisperService.toSubtitleFormat);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('transcribeSubtitles', () => {
  it('复用 whisperService 转录并标准化为 SubtitleEntry[]', async () => {
    transcribeMock.mockResolvedValue({
      language: 'zh',
      language_probability: 0.97,
      duration_ms: 100_000,
      segments: [{ start_ms: 0, end_ms: 3_000, text: '你好' }],
    });
    toSubtitleFormatMock.mockReturnValue({
      language: 'zh',
      entries: [{ id: 'whisper-0', startTime: 0, endTime: 3, text: '你好' }],
    });

    const entries = await transcribeSubtitles('/tmp/movie.mp4', { modelSize: 'small' });

    expect(whisperService.transcribe).toHaveBeenCalledWith(
      '/tmp/movie.mp4',
      'small',
      'auto',
      undefined
    );
    expect(entries).toEqual([
      { id: 'subtitle-0', startTime: 0, endTime: 3, text: '你好', confidence: 0.97 },
    ]);
  });

  it('默认使用 base 模型与 auto 语言', async () => {
    transcribeMock.mockResolvedValue({
      language: 'zh',
      language_probability: 1,
      duration_ms: 0,
      segments: [],
    });
    toSubtitleFormatMock.mockReturnValue({ language: 'zh', entries: [] });

    await transcribeSubtitles('/tmp/movie.mp4');

    expect(whisperService.transcribe).toHaveBeenCalledWith(
      '/tmp/movie.mp4',
      'base',
      'auto',
      undefined
    );
  });

  it('转发进度回调', async () => {
    const onProgress = vi.fn();
    transcribeMock.mockResolvedValue({
      language: 'zh',
      language_probability: 1,
      duration_ms: 0,
      segments: [],
    });
    toSubtitleFormatMock.mockReturnValue({ language: 'zh', entries: [] });

    await transcribeSubtitles('/tmp/movie.mp4', { onProgress });

    expect(whisperService.transcribe).toHaveBeenCalledWith(
      '/tmp/movie.mp4',
      'base',
      'auto',
      onProgress
    );
  });

  it('空路径抛错', async () => {
    await expect(transcribeSubtitles('')).rejects.toThrow('视频路径不能为空');
    expect(whisperService.transcribe).not.toHaveBeenCalled();
  });
});
