/**
 * script-generation-service — 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./ai-api-client', () => ({
  invokeAIModel: vi.fn(),
  AIServiceError: class extends Error {
    constructor(
      message: string,
      public statusCode?: number
    ) {
      super(message);
      this.name = 'AIServiceError';
    }
  },
}));

vi.mock('@/core/services/auth/api-key-service', () => ({
  getApiKey: vi.fn(),
}));

import { invokeAIModel, AIServiceError } from './ai-api-client';
import { getApiKey } from '@/core/services/auth/api-key-service';
import {
  scriptGenerationService,
  generateScriptWithModel,
  parseGeneratedScript,
  generateScriptWithOpenAI,
  analyzeKeyFramesWithAI,
} from './script-generation-service';

const invokeMock = vi.mocked(invokeAIModel);
const getApiKeyMock = vi.mocked(getApiKey);

beforeEach(() => {
  invokeMock.mockReset();
  getApiKeyMock.mockReset();
});

// ─── scriptGenerationService ─────────────────────────────────────────────────

describe('scriptGenerationService.generateScript', () => {
  it('builds prompt and invokes AI model', async () => {
    invokeMock.mockResolvedValue('生成的脚本');
    const result = await scriptGenerationService.generateScript(
      'openai',
      'sk-test',
      { summary: 's' },
      { style: 'informative' }
    );
    expect(invokeMock).toHaveBeenCalledOnce();
    expect(invokeMock.mock.calls[0][0]).toBe('openai');
    expect(invokeMock.mock.calls[0][1]).toBe('sk-test');
    expect(invokeMock.mock.calls[0][2]).toContain('信息型'); // informative style keyword
    expect(result).toBe('生成的脚本');
  });

  it('works without options', async () => {
    invokeMock.mockResolvedValue('text');
    await scriptGenerationService.generateScript('deepseek', 'k', { summary: 'x' });
    expect(invokeMock).toHaveBeenCalledOnce();
  });

  it('propagates AIServiceError from invokeAIModel', async () => {
    invokeMock.mockRejectedValue(new AIServiceError('rate limit'));
    await expect(scriptGenerationService.generateScript('openai', 'k', {})).rejects.toThrow(
      'rate limit'
    );
  });
});

describe('scriptGenerationService.buildPrompt', () => {
  it('exposes buildScriptPrompt (passthrough re-export)', () => {
    const result = scriptGenerationService.buildPrompt(
      { summary: 's', keyMoments: [{ timestamp: 0, description: 'd', importance: 5 }] },
      { tone: 'humorous' }
    );
    expect(result).toContain('s');
    expect(result).toContain('幽默');
  });
});

describe('scriptGenerationService.parseScriptContent', () => {
  it('parses segment content (delegates to script-parser)', () => {
    const content = '[00:10] First\n[00:20] Second';
    const segments = scriptGenerationService.parseScriptContent(content);
    expect(segments).toHaveLength(2);
    expect(segments[0].content).toContain('First');
  });
});

describe('scriptGenerationService.createScriptDraft', () => {
  it('creates AIScriptDraft shape', () => {
    const draft = scriptGenerationService.createScriptDraft('[00:10] Body', 'proj-1');
    expect(draft.projectId).toBe('proj-1');
    expect(draft.content).toBeInstanceOf(Array);
    expect(draft.fullText).toContain('Body');
    expect(typeof draft.id).toBe('string');
    expect(typeof draft.createdAt).toBe('string');
    expect(typeof draft.updatedAt).toBe('string');
  });
});

// ─── generateScriptWithModel (alias) ──────────────────────────────────────────

describe('generateScriptWithModel', () => {
  it('is the same function reference as scriptGenerationService.generateScript', () => {
    expect(generateScriptWithModel).toBe(scriptGenerationService.generateScript);
  });
});

// ─── parseGeneratedScript ─────────────────────────────────────────────────────

describe('parseGeneratedScript', () => {
  it('returns AIScriptDraft with projectId and parsed segments', () => {
    const draft = parseGeneratedScript('[00:10] Body\n[00:20] More', 'proj-1');
    expect(draft.projectId).toBe('proj-1');
    expect(draft.content.length).toBeGreaterThan(0);
  });
});

// ─── generateScriptWithOpenAI ─────────────────────────────────────────────────

describe('generateScriptWithOpenAI', () => {
  const videoMeta = {
    path: '/v/a.mp4',
    duration: 60,
    width: 1920,
    height: 1080,
    fps: 30,
    codec: 'h264',
    bitrate: 5000,
  };

  beforeEach(() => {
    getApiKeyMock.mockReset();
  });

  it('returns generated text when API key is configured', async () => {
    getApiKeyMock.mockResolvedValue('sk-openai');
    invokeMock.mockResolvedValue('openai-script');

    const out = await generateScriptWithOpenAI(videoMeta, ['kf1', 'kf2'], { style: 'informative' });
    expect(out).toBe('openai-script');
    // generateScript 调用 invokeAIModel(modelType, apiKey, prompt) — settings 融合进 prompt
    expect(invokeMock).toHaveBeenCalledWith(
      'openai',
      'sk-openai',
      expect.stringContaining('kf1\nkf2')
    );
    const prompt = invokeMock.mock.calls[0][2] as string;
    expect(prompt).toContain('信息型'); // informative style keyword
  });

  it('throws AIServiceError (wrapping AppError) when no API key', async () => {
    getApiKeyMock.mockResolvedValue(null as never);
    await expect(generateScriptWithOpenAI(videoMeta, [], {})).rejects.toBeInstanceOf(
      AIServiceError
    );
  });

  it('normalizes style/tone: invalid → undefined (no style/tone text in prompt)', async () => {
    getApiKeyMock.mockResolvedValue('sk');
    invokeMock.mockResolvedValue('text');

    await generateScriptWithOpenAI(videoMeta, [], {
      style: 'mystery' as never,
      tone: 'moody' as never,
    });
    // settings 融合进 prompt：未识别值应走 fallback
    const prompt = invokeMock.mock.calls[0][2] as string;
    expect(prompt).toContain('请生成一个专业、信息丰富的解说脚本'); // 默认 style 文本
    expect(prompt).toContain('使用中立、专业的语气'); // 默认 tone 文本
  });

  it('passes through valid style/tone into prompt content', async () => {
    getApiKeyMock.mockResolvedValue('sk');
    invokeMock.mockResolvedValue('text');

    await generateScriptWithOpenAI(videoMeta, [], {
      style: 'dramatic',
      tone: 'serious',
    });
    const prompt = invokeMock.mock.calls[0][2] as string;
    expect(prompt).toContain('情感丰富、紧张'); // dramatic 引导
    expect(prompt).toContain('严肃、庄重'); // serious 引导
  });

  it('wraps non-AIServiceError into AIServiceError', async () => {
    getApiKeyMock.mockResolvedValue('sk');
    invokeMock.mockRejectedValue(new Error('network down'));

    await expect(generateScriptWithOpenAI(videoMeta, [], {})).rejects.toBeInstanceOf(
      AIServiceError
    );
  });

  it('re-raises AIServiceError without wrapping', async () => {
    getApiKeyMock.mockResolvedValue('sk');
    const original = new AIServiceError('quota exceeded', 429);
    invokeMock.mockRejectedValue(original);

    await expect(generateScriptWithOpenAI(videoMeta, [], {})).rejects.toBe(original);
  });
});

// ─── analyzeKeyFramesWithAI ───────────────────────────────────────────────────

describe('analyzeKeyFramesWithAI', () => {
  it('returns placeholder description per path', async () => {
    const out = await analyzeKeyFramesWithAI(['/a.jpg', '/b.jpg', '/c.jpg']);
    expect(out).toEqual([
      '[关键帧 1] 来自 /a.jpg',
      '[关键帧 2] 来自 /b.jpg',
      '[关键帧 3] 来自 /c.jpg',
    ]);
  });

  it('handles empty array', async () => {
    const out = await analyzeKeyFramesWithAI([]);
    expect(out).toEqual([]);
  });
});
