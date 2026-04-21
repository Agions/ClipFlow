import { describe, it, expect, vi } from 'vitest';
import { withRetry, withRetryAndFallback } from './retry';

describe('withRetry', () => {
  it('should succeed on first try', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, 3, 100);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure then succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, 3, 10);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after all retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(withRetry(fn, 2, 10)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('withRetryAndFallback', () => {
  it('should return fallback after retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const result = await withRetryAndFallback(fn, 'fallback', { attempts: 2, delayMs: 10 });
    expect(result).toBe('fallback');
  });

  it('should return fn result if succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetryAndFallback(fn, 'fallback', { attempts: 3, delayMs: 10 });
    expect(result).toBe('success');
  });
});
