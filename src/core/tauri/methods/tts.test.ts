/**
 * TTS Tauri Methods — 单元测试
 *
 * 测试三个 invoke 封装方法：
 *  - synthesizeSpeech：从返回对象解构 audioPath
 *  - listTTSBackends：直接转发
 *  - checkTTSAvailable：直接转发并强制返回 boolean
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../invoke', () => ({
  invoke: vi.fn(),
  TauriCommand: {
    SYNTHESIZE_SPEECH: 'synthesize_speech',
    LIST_TTS_BACKENDS: 'list_tts_backends',
    CHECK_TTS_AVAILABLE: 'check_tts_available',
  },
}));

import { invoke, TauriCommand } from '../invoke';
import { tts } from './tts';

const invokeMock = vi.mocked(invoke);

describe('tts tauri methods', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  describe('tts.synthesizeSpeech', () => {
    it('invokes SYNTHESIZE_SPEECH and returns audioPath from the response', async () => {
      invokeMock.mockResolvedValue({ audioPath: '/tmp/voice.wav', durationSecs: 3.2 });

      const result = await tts.synthesizeSpeech({
        text: '你好，世界',
        voice: 'zh-CN-XiaoxiaoNeural',
        speed: 1.1,
        format: 'wav',
        backend: 'edge',
      });

      expect(result).toBe('/tmp/voice.wav');
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.SYNTHESIZE_SPEECH, {
        text: '你好，世界',
        voice: 'zh-CN-XiaoxiaoNeural',
        speed: 1.1,
        format: 'wav',
        backend: 'edge',
      });
    });

    it('forwards optional fields with defaults when omitted', async () => {
      invokeMock.mockResolvedValue({ audioPath: '/tmp/min.wav', durationSecs: 1.0 });

      const result = await tts.synthesizeSpeech({
        text: 'hi',
        voice: 'en-US-AriaNeural',
      });

      expect(result).toBe('/tmp/min.wav');
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.SYNTHESIZE_SPEECH, {
        text: 'hi',
        voice: 'en-US-AriaNeural',
        speed: 1,
        format: 'mp3',
        backend: 'edge',
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('tts backend unavailable'));

      await expect(
        tts.synthesizeSpeech({ text: 'x', voice: 'zh-CN-XiaoxiaoNeural' })
      ).rejects.toThrow('tts backend unavailable');
    });
  });

  describe('tts.listTTSBackends', () => {
    it('invokes LIST_TTS_BACKENDS with undefined args and returns the list', async () => {
      const backends = [{ id: 'edge', name: 'Edge TTS' }];
      invokeMock.mockResolvedValue(backends);

      const result = await tts.listTTSBackends();

      expect(result).toEqual(backends);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.LIST_TTS_BACKENDS, undefined);
    });

    it('returns empty array when no backends are available', async () => {
      invokeMock.mockResolvedValue([]);

      const result = await tts.listTTSBackends();

      expect(result).toEqual([]);
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('ipc broken'));

      await expect(tts.listTTSBackends()).rejects.toThrow('ipc broken');
    });
  });

  describe('tts.checkTTSAvailable', () => {
    it('invokes CHECK_TTS_AVAILABLE and returns the boolean', async () => {
      invokeMock.mockResolvedValue(true);

      const result = await tts.checkTTSAvailable();

      expect(result).toBe(true);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.CHECK_TTS_AVAILABLE, undefined);
    });

    it('returns false when backend is missing', async () => {
      invokeMock.mockResolvedValue(false);

      const result = await tts.checkTTSAvailable();

      expect(result).toBe(false);
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('tts init failed'));

      await expect(tts.checkTTSAvailable()).rejects.toThrow('tts init failed');
    });
  });
});
