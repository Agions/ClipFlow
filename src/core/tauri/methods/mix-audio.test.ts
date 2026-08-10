/**
 * Mix Audio Tauri Methods — 单元测试
 *
 * 测试两个 invoke 封装方法：mixAudio 与 getAudioDuration。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../invoke', () => ({
  invoke: vi.fn(),
  TauriCommand: {
    MIX_AUDIO: 'mix_audio',
    GET_AUDIO_DURATION: 'get_audio_duration',
  },
}));

import { invoke, TauriCommand } from '../invoke';
import { mixAudio } from './mix-audio';

const invokeMock = vi.mocked(invoke);

describe('mixAudio tauri methods', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  describe('mixAudio.mixAudio', () => {
    it('invokes MIX_AUDIO command with the full options object', async () => {
      invokeMock.mockResolvedValue('/out/mixed.mp4');

      const result = await mixAudio.mixAudio({
        videoPath: '/in/video.mp4',
        ttsAudioPath: '/in/tts.wav',
        outputPath: '/out/mixed.mp4',
        ttsVolume: 0.8,
        backgroundVolume: 0.4,
        offsetSeconds: 1.5,
      });

      expect(result).toBe('/out/mixed.mp4');
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.MIX_AUDIO, {
        videoPath: '/in/video.mp4',
        ttsAudioPath: '/in/tts.wav',
        outputPath: '/out/mixed.mp4',
        ttsVolume: 0.8,
        backgroundVolume: 0.4,
        offsetSeconds: 1.5,
      });
    });

    it('forwards even when only the required fields are provided', async () => {
      invokeMock.mockResolvedValue('/out/minimal.mp4');

      const result = await mixAudio.mixAudio({
        videoPath: '/in/video.mp4',
        ttsAudioPath: '/in/tts.wav',
        outputPath: '/out/minimal.mp4',
      });

      expect(result).toBe('/out/minimal.mp4');
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.MIX_AUDIO, {
        videoPath: '/in/video.mp4',
        ttsAudioPath: '/in/tts.wav',
        outputPath: '/out/minimal.mp4',
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('ffmpeg failed'));

      await expect(
        mixAudio.mixAudio({
          videoPath: '/in/video.mp4',
          ttsAudioPath: '/in/tts.wav',
          outputPath: '/out/mixed.mp4',
        })
      ).rejects.toThrow('ffmpeg failed');
    });
  });

  describe('mixAudio.getAudioDuration', () => {
    it('invokes GET_AUDIO_DURATION with audioPath and returns the duration', async () => {
      invokeMock.mockResolvedValue(12.345);

      const result = await mixAudio.getAudioDuration('/in/audio.wav');

      expect(result).toBe(12.345);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GET_AUDIO_DURATION, {
        audioPath: '/in/audio.wav',
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('decode failed'));

      await expect(mixAudio.getAudioDuration('/bad.wav')).rejects.toThrow('decode failed');
    });
  });
});
