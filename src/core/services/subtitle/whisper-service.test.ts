/**
 * Whisper 服务回归基线测试
 * 目的：D2 修复命令契约后，为 whisper-service.ts 建立对照基线。
 *
 * 重要（如实反映现状，不做任何业务改动）：
 *   checkFasterWhisper 已删除 —— 它此前调用未注册的 Tauri 命令 `check_faster_whisper`，
 *   被 try/catch 吞掉、恒返回 false，等于把 Whisper 永远判为不可用。
 *   D2 改为「直接调用 transcribe_audio，失败回退 ASR」，因此本文件不再有
 *   checkFasterWhisper 用例，仅保留 transcribe / toSubtitleFormat 的真实契约。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { whisperService } from './whisper-service';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockedInvoke.mockReset();
});

describe('transcribe', () => {
  it('invokes transcribe_audio with mapped args and returns the result', async () => {
    const expected = {
      language: 'en',
      language_probability: 0.9,
      duration_ms: 5000,
      segments: [{ start_ms: 0, end_ms: 1000, text: 'hi' }],
    };
    mockedInvoke.mockResolvedValue(expected);

    const result = await whisperService.transcribe('/a.mp3', 'base', 'auto');

    expect(mockedInvoke).toHaveBeenCalledWith('transcribe_audio', {
      audioPath: '/a.mp3',
      modelSize: 'base',
      language: 'auto',
    });
    expect(result).toEqual(expected);
  });

  it('applies default modelSize=base and language=auto', async () => {
    mockedInvoke.mockResolvedValue({
      language: 'zh',
      language_probability: 1,
      duration_ms: 1000,
      segments: [],
    });

    await whisperService.transcribe('/a.mp3');

    expect(mockedInvoke).toHaveBeenCalledWith('transcribe_audio', {
      audioPath: '/a.mp3',
      modelSize: 'base',
      language: 'auto',
    });
  });
});

describe('toSubtitleFormat', () => {
  it('converts ms timestamps to seconds and prefixes entry ids with whisper-', () => {
    const result = {
      language: 'en',
      language_probability: 1,
      duration_ms: 2000,
      segments: [{ start_ms: 500, end_ms: 1500, text: 'hello' }],
    };

    const formatted = whisperService.toSubtitleFormat(result);

    expect(formatted.language).toBe('en');
    expect(formatted.entries).toEqual([
      { id: 'whisper-0', startTime: 0.5, endTime: 1.5, text: 'hello' },
    ]);
  });

  it('handles an empty segments array', () => {
    const formatted = whisperService.toSubtitleFormat({
      language: 'zh',
      language_probability: 0.9,
      duration_ms: 0,
      segments: [],
    });
    expect(formatted.language).toBe('zh');
    expect(formatted.entries).toEqual([]);
  });

  it('handles multiple segments with distinct indices', () => {
    const formatted = whisperService.toSubtitleFormat({
      language: 'zh',
      language_probability: 1,
      duration_ms: 5000,
      segments: [
        { start_ms: 0, end_ms: 1000, text: '你好' },
        { start_ms: 1000, end_ms: 2500, text: '世界' },
        { start_ms: 2500, end_ms: 5000, text: '明天更好' },
      ],
    });
    expect(formatted.entries).toHaveLength(3);
    expect(formatted.entries[0]).toEqual({
      id: 'whisper-0',
      startTime: 0,
      endTime: 1,
      text: '你好',
    });
    expect(formatted.entries[1]).toEqual({
      id: 'whisper-1',
      startTime: 1,
      endTime: 2.5,
      text: '世界',
    });
    expect(formatted.entries[2]).toEqual({
      id: 'whisper-2',
      startTime: 2.5,
      endTime: 5,
      text: '明天更好',
    });
  });
});

describe('transcribe with onProgress', () => {
  it('forwards onProgress events emitted on whisper-progress channel', async () => {
    // Default mock for invoke
    mockedInvoke.mockResolvedValue({
      language: 'zh',
      language_probability: 1,
      duration_ms: 100,
      segments: [],
    });

    const mockListen = vi.fn();
    vi.doMock('@tauri-apps/api/event', () => ({
      listen: mockListen,
    }));

    // Re-import whisperService to pick up the new mock
    vi.resetModules();
    const { whisperService: freshService } = await import('./whisper-service');

    mockListen.mockImplementation(
      async (_event: string, handler: (e: { payload: unknown }) => void) => {
        handler({
          payload: { stage: 'transcribing', progress: 50, current_segment: 3, total_segments: 10 },
        });
        return () => undefined;
      }
    );

    const progresses: Array<{ stage: string; progress: number }> = [];
    const result = await freshService.transcribe('/a.mp3', 'base', 'auto', p => {
      progresses.push({ stage: p.stage, progress: p.progress });
    });

    expect(mockListen).toHaveBeenCalledWith('whisper-progress', expect.any(Function));
    expect(progresses).toContainEqual({ stage: 'transcribing', progress: 50 });
    expect(result.duration_ms).toBe(100);

    vi.doUnmock('@tauri-apps/api/event');
    vi.resetModules();
  });

  it('does not throw when listen() rejects (event listening is optional)', async () => {
    mockedInvoke.mockResolvedValue({
      language: 'zh',
      language_probability: 1,
      duration_ms: 100,
      segments: [],
    });

    const mockListen = vi.fn();
    vi.doMock('@tauri-apps/api/event', () => ({
      listen: mockListen,
    }));

    vi.resetModules();
    const { whisperService: freshService } = await import('./whisper-service');
    mockListen.mockRejectedValue(new Error('event channel unavailable'));

    const result = await freshService.transcribe('/a.mp3', 'base', 'auto', () => {});
    expect(result.duration_ms).toBe(100);

    vi.doUnmock('@tauri-apps/api/event');
    vi.resetModules();
  });
});
