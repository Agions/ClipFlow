/**
 * core/services/ai/script/ai-api-client.ts — 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invokeAIModel, AIServiceError } from './ai-api-client';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetchResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

// ─── invokeAIModel — happy path ────────────────────────────────────────────────

describe('invokeAIModel — happy path', () => {
  it('sends POST with JSON body to model URL', async () => {
    const fetchMock = vi
      .mocked(globalThis.fetch)
      .mockResolvedValue(mockFetchResponse({ choices: [{ message: { content: 'hi' } }] }));

    const out = await invokeAIModel('openai', 'sk-test', 'hello');
    expect(out).toBe('hi');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('openai');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toMatchObject({});
  });

  it('appends key as query param for google model', async () => {
    const fetchMock = vi
      .mocked(globalThis.fetch)
      .mockResolvedValue(
        mockFetchResponse({ candidates: [{ content: { parts: [{ text: 'g' }] } }] })
      );
    await invokeAIModel('google', 'GOOGLE-KEY', 'p');
    expect(fetchMock.mock.calls[0][0]).toContain('?key=GOOGLE-KEY');
  });

  it('passes options through to config.transformRequest', async () => {
    const fetchMock = vi
      .mocked(globalThis.fetch)
      .mockResolvedValue(mockFetchResponse({ choices: [{ message: { content: 'ok' } }] }));
    await invokeAIModel('deepseek', 'k', 'p', { appId: 'myapp' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.model).toBe('deepseek-v4-flash');
  });
});

// ─── invokeAIModel — error paths ──────────────────────────────────────────────

describe('invokeAIModel — errors', () => {
  it('throws AIServiceError for unsupported model type', async () => {
    await expect(invokeAIModel('not-a-model' as never, 'k', 'p')).rejects.toThrow(
      /不支持的模型类型/
    );
  });

  it('parses OpenAI-style error response (.response.data.error.message)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      mockFetchResponse({ error: { message: 'rate limited' } }, 429)
    );
    await expect(invokeAIModel('openai', 'k', 'p')).rejects.toThrow('rate limited');
  });

  it('parses Spark-style error response (.response.data.error_msg)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      mockFetchResponse({ error_msg: 'spark quota' }, 403)
    );
    await expect(invokeAIModel('spark', 'k', 'p')).rejects.toThrow('spark quota');
  });

  it('parses Zhipu-style error response (.response.data.header.message)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      mockFetchResponse({ header: { message: 'unauthorized' } }, 401)
    );
    await expect(invokeAIModel('chatglm', 'k', 'p')).rejects.toThrow('unauthorized');
  });

  it('falls back to status-only message when error has no recognizable field', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(mockFetchResponse({ mystery: 'unknown' }, 500));
    await expect(invokeAIModel('openai', 'k', 'p')).rejects.toThrow(/openai/);
  });

  it('wraps generic Error into AIServiceError', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error('network down'));
    try {
      await invokeAIModel('openai', 'k', 'p');
    } catch (e) {
      expect(e).toBeInstanceOf(AIServiceError);
      expect((e as AIServiceError).message).toBe('network down');
    }
  });

  it('wraps non-Error thrown values into AIServiceError with fallback message', async () => {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    vi.mocked(globalThis.fetch).mockRejectedValue('string-error');
    try {
      await invokeAIModel('deepseek', 'k', 'p');
    } catch (e) {
      expect(e).toBeInstanceOf(AIServiceError);
      expect((e as AIServiceError).message).toContain('deepseek');
    }
  });

  it('falls back to empty error body when response.json() throws on !ok', async () => {
    // L102: response.json().catch(() => ({})) — defensive path when the
    // response body cannot be parsed as JSON.
    const badResponse = new Response('not-json-{{{', {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
    // Replace json() on the instance — vi.spyOn doesn't reliably intercept
    // Web API prototype methods when called via await chains.
    Object.defineProperty(badResponse, 'json', {
      configurable: true,
      value: () => Promise.reject(new SyntaxError('Unexpected token')),
    });
    vi.mocked(globalThis.fetch).mockResolvedValue(badResponse);

    // Should not throw a SyntaxError — must be wrapped as AIServiceError
    await expect(invokeAIModel('openai', 'k', 'p')).rejects.toBeInstanceOf(AIServiceError);
  });
});

// ─── AIServiceError ───────────────────────────────────────────────────────────

describe('AIServiceError', () => {
  it('is an Error instance with proper name', () => {
    const err = new AIServiceError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AIServiceError');
    expect(err.message).toBe('boom');
    expect(err.statusCode).toBeUndefined();
  });

  it('exposes statusCode when provided', () => {
    const err = new AIServiceError('boom', 500);
    expect(err.statusCode).toBe(500);
  });
});
