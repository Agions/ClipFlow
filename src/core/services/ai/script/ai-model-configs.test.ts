/**
 * AI_MODEL_CONFIGS / STYLE_GUIDANCE_MAP / TONE_GUIDANCE_MAP — 单元测试
 */
import { describe, it, expect } from 'vitest';
import {
  AI_MODEL_CONFIGS,
  STYLE_GUIDANCE_MAP,
  TONE_GUIDANCE_MAP,
  type AIModelType,
} from './ai-model-configs';

describe('AI_MODEL_CONFIGS', () => {
  const expectedModels: AIModelType[] = [
    'openai',
    'anthropic',
    'google',
    'qianwen',
    'spark',
    'chatglm',
    'deepseek',
    'moonshot',
  ];

  it('contains all 8 expected models', () => {
    expectedModels.forEach(m => {
      expect(AI_MODEL_CONFIGS[m]).toBeDefined();
    });
    expect(Object.keys(AI_MODEL_CONFIGS)).toHaveLength(expectedModels.length);
  });

  it.each(expectedModels)('%s has url/model/headers/transforms', model => {
    const cfg = AI_MODEL_CONFIGS[model];
    expect(typeof cfg.url).toBe('string');
    expect(cfg.url.length).toBeGreaterThan(0);
    expect(typeof cfg.model).toBe('string');
    expect(cfg.model.length).toBeGreaterThan(0);
    expect(typeof cfg.headers).toBe('function');
    expect(typeof cfg.transformRequest).toBe('function');
    expect(typeof cfg.transformResponse).toBe('function');
  });

  describe('OpenAI', () => {
    it('headers include Bearer Authorization', () => {
      const h = AI_MODEL_CONFIGS.openai.headers('sk-test');
      expect(h['Authorization']).toBe('Bearer sk-test');
      expect(h['Content-Type']).toBe('application/json');
    });

    it('transformRequest builds messages array', () => {
      const body = AI_MODEL_CONFIGS.openai.transformRequest('hello') as {
        model: string;
        messages: Array<{ role: string; content: string }>;
      };
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].role).toBe('user');
      expect(body.messages[0].content).toBe('hello');
    });

    it('transformResponse extracts content from choices[0]', () => {
      const data = { choices: [{ message: { content: 'hi' } }] };
      expect(AI_MODEL_CONFIGS.openai.transformResponse(data)).toBe('hi');
    });
  });

  describe('Anthropic', () => {
    it('headers use x-api-key and anthropic-version', () => {
      const h = AI_MODEL_CONFIGS.anthropic.headers('sk-ant-1');
      expect(h['x-api-key']).toBe('sk-ant-1');
      expect(h['anthropic-version']).toBe('2023-06-01');
    });

    it('transformRequest builds messages array', () => {
      const body = AI_MODEL_CONFIGS.anthropic.transformRequest('hello') as {
        model: string;
        messages: Array<{ role: string; content: string }>;
        temperature: number;
        max_tokens: number;
      };
      expect(body.model).toBe('claude-3-5-sonnet-latest');
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0]).toEqual({ role: 'user', content: 'hello' });
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(4000);
    });

    it('transformResponse finds text-type content', () => {
      const data = { content: [{ type: 'text', text: 'answer' }] };
      expect(AI_MODEL_CONFIGS.anthropic.transformResponse(data)).toBe('answer');
    });

    it('transformResponse returns empty string when no text content', () => {
      expect(AI_MODEL_CONFIGS.anthropic.transformResponse({ content: [] })).toBe('');
      expect(AI_MODEL_CONFIGS.anthropic.transformResponse({})).toBe('');
    });
  });

  describe('Google', () => {
    it('headers do not require Authorization (uses query key)', () => {
      const h = AI_MODEL_CONFIGS.google.headers('whatever');
      expect(h).toEqual({ 'Content-Type': 'application/json' });
    });

    it('transformResponse extracts first part of first candidate', () => {
      const data = { candidates: [{ content: { parts: [{ text: 'gemini answer' }] } }] };
      expect(AI_MODEL_CONFIGS.google.transformResponse(data)).toBe('gemini answer');
    });

    it('transformResponse returns empty when structure is missing', () => {
      expect(AI_MODEL_CONFIGS.google.transformResponse({})).toBe('');
      expect(AI_MODEL_CONFIGS.google.transformResponse({ candidates: [] })).toBe('');
    });
  });

  describe('Spark (Xunfei)', () => {
    it('transformRequest includes appId from options', () => {
      const body = AI_MODEL_CONFIGS.spark.transformRequest('hi', { appId: 'app-1' }) as {
        header: { app_id: string };
      };
      expect(body.header.app_id).toBe('app-1');
    });

    it('transformResponse throws on non-zero header code', () => {
      const data = { header: { code: 1001, message: 'rate limit' } };
      expect(() => AI_MODEL_CONFIGS.spark.transformResponse(data)).toThrow();
    });

    it('transformResponse throws when header is missing entirely', () => {
      // header undefined → typed.header?.code === undefined → !== 0 truthy → throws
      expect(() => AI_MODEL_CONFIGS.spark.transformResponse({})).toThrow();
    });

    it('transformResponse falls back to "未知错误" when message is missing', () => {
      const data = { header: { code: 1001 } }; // code 非 0，message 缺失 → 错误信息兜底
      try {
        AI_MODEL_CONFIGS.spark.transformResponse(data);
        expect.fail('应该抛出');
      } catch (e) {
        const err = e as { statusCode?: number; userMessage?: string; message: string };
        expect(err.statusCode).toBe(1001);
        expect(err.userMessage).toContain('未知错误');
        expect(err.message).toContain('未知错误');
      }
    });

    it('transformResponse extracts payload.choices[0].text on success', () => {
      const data = {
        header: { code: 0, message: 'ok' },
        payload: { choices: [{ text: 'spark reply' }] },
      };
      expect(AI_MODEL_CONFIGS.spark.transformResponse(data)).toBe('spark reply');
    });

    it('transformResponse returns empty when payload is missing on success', () => {
      // header.code === 0，所以走 success 路径但 payload undefined → '' 兜底。
      const data = { header: { code: 0, message: 'ok' } };
      expect(AI_MODEL_CONFIGS.spark.transformResponse(data)).toBe('');
    });

    it('transformResponse returns empty when payload.choices is empty on success', () => {
      const data = {
        header: { code: 0, message: 'ok' },
        payload: { choices: [] },
      };
      expect(AI_MODEL_CONFIGS.spark.transformResponse(data)).toBe('');
    });
  });

  describe('ChatGLM / DeepSeek / Moonshot / Qwen', () => {
    it('all use Bearer-style Authorization', () => {
      ['chatglm', 'deepseek', 'moonshot', 'qianwen'].forEach(m => {
        const cfg = AI_MODEL_CONFIGS[m as AIModelType];
        const h = cfg.headers('sk');
        expect(h['Authorization']).toBe('Bearer sk');
      });
    });

    it('all extract content from choices[0].message.content', () => {
      ['chatglm', 'deepseek', 'moonshot', 'qianwen'].forEach(m => {
        const cfg = AI_MODEL_CONFIGS[m as AIModelType];
        const data = { choices: [{ message: { content: `${m}-reply` } }] };
        expect(cfg.transformResponse(data)).toBe(`${m}-reply`);
      });
    });

    it.each(['chatglm', 'deepseek', 'moonshot', 'qianwen'] as AIModelType[])(
      '%s.transformRequest builds messages array',
      model => {
        const cfg = AI_MODEL_CONFIGS[model];
        const body = cfg.transformRequest('hello world') as {
          model: string;
          messages?: Array<{ role: string; content: string }>;
          temperature?: number;
          max_tokens?: number;
        };
        expect(body.model).toBeTruthy();
        if (body.messages) {
          expect(body.messages[0]).toEqual({ role: 'user', content: 'hello world' });
        }
      }
    );
  });
});

describe('STYLE_GUIDANCE_MAP', () => {
  it('has 4 styles', () => {
    expect(Object.keys(STYLE_GUIDANCE_MAP).sort()).toEqual(
      ['casual', 'dramatic', 'entertaining', 'informative'].sort()
    );
  });

  it('each entry is a non-empty string', () => {
    Object.entries(STYLE_GUIDANCE_MAP).forEach(([key, value]) => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });
});

describe('TONE_GUIDANCE_MAP', () => {
  it('has 5 tones', () => {
    expect(Object.keys(TONE_GUIDANCE_MAP).sort()).toEqual(
      ['enthusiastic', 'humorous', 'inspirational', 'neutral', 'serious'].sort()
    );
  });

  it('each entry is a non-empty string', () => {
    Object.entries(TONE_GUIDANCE_MAP).forEach(([key, value]) => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });
});
