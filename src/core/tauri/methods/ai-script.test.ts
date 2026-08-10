/**
 * AI Script Tauri Methods — 单元测试
 *
 * 测试三个 invoke 封装方法：
 *  - generateNarrationScript：传入字幕/风格/API key，输出 CommentaryScriptOutput
 *  - analyzeVideoForNarration：传入视频路径，输出 { videoType, summary, keyScenes }
 *  - listAvailableModels：返回可用模型列表
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../invoke', () => ({
  invoke: vi.fn(),
  TauriCommand: {
    GENERATE_NARRATION_SCRIPT: 'generate_narration_script',
    ANALYZE_VIDEO_FOR_NARRATION: 'analyze_video_for_narration',
    LIST_AVAILABLE_MODELS: 'list_available_models',
  },
}));

import { invoke, TauriCommand } from '../invoke';
import { aiScript } from './ai-script';

const invokeMock = vi.mocked(invoke);

describe('aiScript tauri methods', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  describe('aiScript.generateNarrationScript', () => {
    it('invokes GENERATE_NARRATION_SCRIPT with the full input object', async () => {
      const output = {
        script: '解说段落1\n解说段落2',
        meta: { provider: 'openai', model: 'gpt-4o-mini' },
      };
      invokeMock.mockResolvedValue(output);

      const result = await aiScript.generateNarrationScript({
        subtitles: '00:00 你好\n00:05 世界',
        style: 'casual',
        apiKey: 'sk-test',
        provider: 'openai',
      });

      expect(result).toEqual(output);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GENERATE_NARRATION_SCRIPT, {
        subtitles: '00:00 你好\n00:05 世界',
        style: 'casual',
        apiKey: 'sk-test',
        provider: 'openai',
      });
    });

    it('forwards even when optional style and provider are omitted', async () => {
      invokeMock.mockResolvedValue({ script: 'x' });

      await aiScript.generateNarrationScript({
        subtitles: '00:00 x',
        apiKey: 'sk-test',
      });

      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GENERATE_NARRATION_SCRIPT, {
        subtitles: '00:00 x',
        apiKey: 'sk-test',
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('api rate limited'));

      await expect(
        aiScript.generateNarrationScript({ subtitles: 's', apiKey: 'k' })
      ).rejects.toThrow('api rate limited');
    });
  });

  describe('aiScript.analyzeVideoForNarration', () => {
    it('invokes ANALYZE_VIDEO_FOR_NARRATION with videoPath + duration', async () => {
      const output = {
        videoType: 'tutorial',
        summary: '一段教学视频',
        keyScenes: [3, 15, 42],
      };
      invokeMock.mockResolvedValue(output);

      const result = await aiScript.analyzeVideoForNarration({
        videoPath: '/v/tutorial.mp4',
        duration: 60,
      });

      expect(result).toEqual(output);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.ANALYZE_VIDEO_FOR_NARRATION, {
        videoPath: '/v/tutorial.mp4',
        duration: 60,
      });
    });

    it('omits duration when not provided', async () => {
      invokeMock.mockResolvedValue({
        videoType: 'vlog',
        summary: 'vlog',
        keyScenes: [],
      });

      await aiScript.analyzeVideoForNarration({ videoPath: '/v/a.mp4' });

      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.ANALYZE_VIDEO_FOR_NARRATION, {
        videoPath: '/v/a.mp4',
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('ffprobe failed'));

      await expect(aiScript.analyzeVideoForNarration({ videoPath: '/v/a.mp4' })).rejects.toThrow(
        'ffprobe failed'
      );
    });
  });

  describe('aiScript.listAvailableModels', () => {
    it('invokes LIST_AVAILABLE_MODELS with empty object args and returns the list', async () => {
      const models = [
        { id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'openai', contextLimit: 128000 },
        { id: 'qwen-turbo', name: 'Qwen Turbo', provider: 'dashscope', contextLimit: 8000 },
      ];
      invokeMock.mockResolvedValue(models);

      const result = await aiScript.listAvailableModels();

      expect(result).toEqual(models);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.LIST_AVAILABLE_MODELS, {});
    });

    it('returns empty array when no models are available', async () => {
      invokeMock.mockResolvedValue([]);

      const result = await aiScript.listAvailableModels();

      expect(result).toEqual([]);
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('config missing'));

      await expect(aiScript.listAvailableModels()).rejects.toThrow('config missing');
    });
  });
});
