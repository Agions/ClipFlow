/**
 * subtitle-asr tauri 方法薄包装测试
 *
 * 两个方法都委托给 invoke — 验证参数传递 + 类型断言即可。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../invoke', () => ({
  invoke: vi.fn(),
  TauriCommand: {
    TRANSCRIBE_AUDIO: 'transcribe_audio',
    TRANSLATE_TEXT: 'translate_text',
  },
}));

import { invoke, TauriCommand } from '../invoke';
import { subtitleAsr } from './subtitle-asr';

const mockedInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockedInvoke.mockReset();
});

describe('subtitleAsr.transcribeAudio', () => {
  it('invokes transcribe_audio with the provided options and returns the result', async () => {
    const track = { id: 't1', entries: [] } as unknown as Awaited<
      ReturnType<typeof subtitleAsr.transcribeAudio>
    >;
    mockedInvoke.mockResolvedValueOnce(track);

    const result = await subtitleAsr.transcribeAudio({
      audioPath: '/a.mp3',
      modelSize: 'base',
      language: 'auto',
    });

    expect(invoke).toHaveBeenCalledWith(TauriCommand.TRANSCRIBE_AUDIO, {
      audioPath: '/a.mp3',
      modelSize: 'base',
      language: 'auto',
    });
    expect(result).toBe(track);
  });

  it('forwards only the keys provided (no defaults injected)', async () => {
    mockedInvoke.mockResolvedValueOnce({ id: 't1', entries: [] } as never);

    await subtitleAsr.transcribeAudio({ audioPath: '/a.mp3' });

    expect(invoke).toHaveBeenCalledWith(TauriCommand.TRANSCRIBE_AUDIO, {
      audioPath: '/a.mp3',
    });
  });
});

describe('subtitleAsr.translateText', () => {
  it('invokes translate_text with text/fromLang/toLang and returns the string', async () => {
    mockedInvoke.mockResolvedValueOnce('bonjour');

    const result = await subtitleAsr.translateText('hello', 'en', 'fr');

    expect(invoke).toHaveBeenCalledWith(TauriCommand.TRANSLATE_TEXT, {
      text: 'hello',
      fromLang: 'en',
      toLang: 'fr',
    });
    expect(result).toBe('bonjour');
  });
});
