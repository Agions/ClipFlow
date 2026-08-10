/**
 * base.service 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseService, ServiceError, type RequestConfig } from './base-service';

/**
 * 创建一个用于测试的 BaseService 派生类
 * 暴露 protected 方法以便直接断言
 */
class TestService extends BaseService {
  constructor(name = 'TestService', config: RequestConfig = {}) {
    super(name, config);
  }

  // 暴露 protected 方法
  public callHandleError(error: unknown, context?: string): ServiceError {
    return this.handleError(error, context);
  }

  public callExecuteRequest<T>(requestFn: () => Promise<T>, context?: string): Promise<T> {
    return this.executeRequest(requestFn, context);
  }

  public callRetryRequest<T>(
    requestFn: () => Promise<T>,
    retries?: number,
    delayMs?: number,
    retryOn?: (error: ServiceError) => boolean
  ): Promise<T> {
    return this.retryRequest(requestFn, retries, delayMs, retryOn);
  }

  public callNormalizeError(error: unknown): ServiceError {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this as any).normalizeError(error);
  }

  public getConfig(): RequestConfig {
    return this.config;
  }
}

describe('ServiceError', () => {
  describe('constructor', () => {
    it('should create error with message only', () => {
      const error = new ServiceError('Something went wrong');
      expect(error.message).toBe('Something went wrong');
      expect(error.name).toBe('ServiceError');
      expect(error instanceof Error).toBe(true);
    });

    it('should create error with code', () => {
      const error = new ServiceError('Not found', 'NOT_FOUND');
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create error with status code', () => {
      const error = new ServiceError('Bad request', 'BAD_REQUEST', 400);
      expect(error.statusCode).toBe(400);
    });

    it('should capture original error', () => {
      const original = new Error('Original error');
      const error = new ServiceError('Wrapped error', 'WRAPPED', 500, original);
      expect(error.originalError).toBe(original);
    });

    it('should mark as retryable', () => {
      const error = new ServiceError('Network error', 'NETWORK', 503, undefined, true);
      expect(error.retryable).toBe(true);
    });

    it('should not be retryable by default', () => {
      const error = new ServiceError('Error');
      expect(error.retryable).toBeUndefined();
    });
  });

  describe('stack trace', () => {
    it('should have a stack trace', () => {
      const error = new ServiceError('Test error');
      expect(error.stack).toBeDefined();
    });
  });
});

// ─── BaseService ──────────────────────────────────────────────────────────────

describe('BaseService', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('constructor', () => {
    it('stores name and config with defaults', () => {
      const svc = new TestService('svc-name');
      expect(svc.getConfig()).toEqual({});
    });

    it('stores custom config', () => {
      const cfg: RequestConfig = { retries: 5, retryDelay: 200, timeout: 3000 };
      const svc = new TestService('svc-name', cfg);
      expect(svc.getConfig()).toEqual(cfg);
    });
  });

  describe('normalizeError (private)', () => {
    it('passes through existing ServiceError unchanged', () => {
      const svc = new TestService();
      const original = new ServiceError('orig', 'CODE', 400);
      const result = svc.callNormalizeError(original);
      expect(result).toBe(original);
    });

    it('wraps a plain Error into ServiceError preserving message', () => {
      const svc = new TestService();
      const original = new Error('boom');
      const result = svc.callNormalizeError(original);
      expect(result).toBeInstanceOf(ServiceError);
      expect(result.message).toBe('boom');
      expect(result.originalError).toBe(original);
    });

    it('converts non-Error values via String()', () => {
      const svc = new TestService();
      const result = svc.callNormalizeError('plain-string');
      expect(result).toBeInstanceOf(ServiceError);
      expect(result.message).toBe('plain-string');
    });

    it('converts number values via String()', () => {
      const svc = new TestService();
      const result = svc.callNormalizeError(42);
      expect(result.message).toBe('42');
    });

    it('converts null to "null"', () => {
      const svc = new TestService();
      const result = svc.callNormalizeError(null);
      expect(result.message).toBe('null');
    });

    it('converts undefined to "undefined"', () => {
      const svc = new TestService();
      const result = svc.callNormalizeError(undefined);
      expect(result.message).toBe('undefined');
    });
  });

  describe('handleError', () => {
    it('logs error and throws ServiceError', () => {
      const svc = new TestService('MyService');
      const original = new Error('failed');

      expect(() => svc.callHandleError(original, 'doing thing')).toThrow(ServiceError);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('uses default context when none provided', () => {
      const svc = new TestService('MyService');
      expect(() => svc.callHandleError(new Error('x'))).toThrow('x');
    });

    it('passes ServiceError through unchanged', () => {
      const svc = new TestService('MyService');
      const inner = new ServiceError('inner', 'CODE', 500);
      try {
        svc.callHandleError(inner, 'ctx');
      } catch (e) {
        expect(e).toBe(inner);
      }
    });

    it('converts non-Error values before throwing', () => {
      const svc = new TestService('MyService');
      try {
        svc.callHandleError('just-a-string', 'ctx');
      } catch (e) {
        expect(e).toBeInstanceOf(ServiceError);
        expect((e as ServiceError).message).toBe('just-a-string');
      }
    });
  });

  describe('executeRequest', () => {
    it('returns the requestFn result on success', async () => {
      const svc = new TestService();
      const result = await svc.callExecuteRequest(async () => 42, 'op');
      expect(result).toBe(42);
    });

    it('throws ServiceError when requestFn throws Error', async () => {
      const svc = new TestService();
      await expect(
        svc.callExecuteRequest(async () => {
          throw new Error('boom');
        }, 'ctx')
      ).rejects.toThrow('boom');
    });

    it('wraps non-Error thrown values', async () => {
      const svc = new TestService();
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      await expect(
        svc.callExecuteRequest(async () => {
          throw 'plain';
        }, 'ctx')
      ).rejects.toThrow('plain');
    });

    it('passes through ServiceError directly', async () => {
      const svc = new TestService();
      const inner = new ServiceError('svc', 'CODE', 500);
      try {
        await svc.callExecuteRequest(async () => {
          throw inner;
        }, 'ctx');
      } catch (e) {
        expect(e).toBe(inner);
      }
    });

    it('logs the error via logger.error', async () => {
      const svc = new TestService('MyService');
      await svc
        .callExecuteRequest(async () => {
          throw new Error('fail');
        }, 'doing work')
        .catch(() => undefined);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('retryRequest — default config', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns the result on first success', async () => {
      const svc = new TestService();
      const fn = vi.fn().mockResolvedValue('ok');
      const promise = svc.callRetryRequest(fn);
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable errors and eventually succeeds', async () => {
      const svc = new TestService();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail-1'))
        .mockRejectedValueOnce(new Error('fail-2'))
        .mockResolvedValueOnce('ok');
      const promise = svc.callRetryRequest(fn);
      // Allow all timers / microtasks to settle
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws lastError after exhausting all retries (default retries=3 → 4 total attempts)', async () => {
      const svc = new TestService();
      const fn = vi.fn().mockRejectedValue(new Error('always fail'));
      const promise = svc.callRetryRequest(fn).catch(e => e);
      await vi.runAllTimersAsync();
      const err = (await promise) as ServiceError;
      expect(err).toBeInstanceOf(ServiceError);
      expect(err.message).toBe('always fail');
      expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('stops retrying when retryOn returns false (no inter-attempt delay)', async () => {
      const svc = new TestService();
      const fn = vi.fn().mockRejectedValue(new Error('no retry'));
      const retryOn = vi.fn().mockReturnValue(false);
      const promise = svc.callRetryRequest(fn, 3, 10, retryOn).catch(e => e);
      await vi.runAllTimersAsync();
      const err = (await promise) as ServiceError;
      // retryOn=false means "do not back off"; loop still runs all attempts.
      expect(err).toBeInstanceOf(ServiceError);
      expect(err.message).toBe('no retry');
      expect(fn).toHaveBeenCalledTimes(4);
      expect(retryOn).toHaveBeenCalledTimes(3);
      // delay should never be invoked (no setTimeout calls with our delay value)
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('uses default retryOn (status codes 408/429/500/502/503/504 are retryable)', async () => {
      const svc = new TestService();
      const retryableStatuses = [408, 429, 500, 502, 503, 504];

      for (const status of retryableStatuses) {
        const fn = vi
          .fn()
          .mockRejectedValueOnce(new ServiceError('transient', undefined, status))
          .mockResolvedValueOnce('ok');
        const promise = svc.callRetryRequest(fn, 2, 1);
        await vi.runAllTimersAsync();
        const result = await promise;
        expect(result).toBe('ok');
        expect(fn).toHaveBeenCalledTimes(2);
      }
    });

    it('does not back off for non-default-retryable statuses (e.g. 400), but still exhausts attempts', async () => {
      const svc = new TestService();
      const fn = vi.fn().mockRejectedValue(new ServiceError('client error', undefined, 400));
      const promise = svc.callRetryRequest(fn, 2, 1).catch(e => e);
      await vi.runAllTimersAsync();
      const err = (await promise) as ServiceError;
      expect(err).toBeInstanceOf(ServiceError);
      expect(err.statusCode).toBe(400);
      // 1 initial + 2 retries = 3 attempts (each fail; loop continues without backoff)
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('applies exponential backoff (delay * 2^attempt) on consecutive failures', async () => {
      const svc = new TestService('backoff-svc');
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      // 4 failures followed by success → backoffs at attempts 0,1,2,3 = 100,200,400,800
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('f1'))
        .mockRejectedValueOnce(new Error('f2'))
        .mockRejectedValueOnce(new Error('f3'))
        .mockRejectedValueOnce(new Error('f4'))
        .mockResolvedValueOnce('ok');

      const promise = svc.callRetryRequest(fn, 5, 100);
      await vi.runAllTimersAsync();
      await promise;

      const delays = setTimeoutSpy.mock.calls
        .map(c => c[1])
        .filter((d): d is number => typeof d === 'number');
      expect(delays).toEqual(expect.arrayContaining([100, 200, 400, 800]));
      setTimeoutSpy.mockRestore();
    });

    it('logs retry attempts as warnings', async () => {
      const svc = new TestService('warn-svc');
      const fn = vi.fn().mockRejectedValueOnce(new Error('transient')).mockResolvedValueOnce('ok');

      const promise = svc.callRetryRequest(fn, 3, 1);
      await vi.runAllTimersAsync();
      await promise;

      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('retryRequest — config fallbacks', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('uses this.config.retries when retries argument omitted', async () => {
      const svc = new TestService('cfg-svc', { retries: 2 });
      const fn = vi.fn().mockRejectedValue(new Error('always'));
      const promise = svc.callRetryRequest(fn).catch(e => e);
      await vi.runAllTimersAsync();
      const err = (await promise) as ServiceError;
      expect(fn).toHaveBeenCalledTimes(3); // 1 + retries(2)
      expect(err.message).toBe('always');
    });

    it('uses this.config.retryDelay when delayMs argument omitted', async () => {
      const svc = new TestService('cfg-svc', { retryDelay: 250 });
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      const fn = vi.fn().mockRejectedValueOnce(new Error('f1')).mockResolvedValueOnce('ok');

      const promise = svc.callRetryRequest(fn, 3);
      await vi.runAllTimersAsync();
      await promise;

      const delays = setTimeoutSpy.mock.calls
        .map(c => c[1])
        .filter((d): d is number => typeof d === 'number');
      expect(delays).toContain(250);
      setTimeoutSpy.mockRestore();
    });

    it('uses this.config.retryOn when retryOn argument omitted (does not back off)', async () => {
      const configRetryOn = vi.fn().mockReturnValue(false);
      const svc = new TestService('cfg-svc', { retryOn: configRetryOn });
      const fn = vi.fn().mockRejectedValue(new Error('any'));

      const promise = svc.callRetryRequest(fn, 3, 1).catch(e => e);
      await vi.runAllTimersAsync();
      const err = (await promise) as ServiceError;

      // retryOn=false → loop exhausts all attempts (1 + retries(3) = 4)
      expect(fn).toHaveBeenCalledTimes(4);
      expect(configRetryOn).toHaveBeenCalledTimes(3);
      expect(err.message).toBe('any');
    });

    it('call args override this.config values', async () => {
      const svc = new TestService('cfg-svc', { retries: 5, retryDelay: 9999 });
      const fn = vi.fn().mockRejectedValue(new Error('always'));
      const promise = svc.callRetryRequest(fn, 1, 5).catch(e => e);
      await vi.runAllTimersAsync();
      const err = (await promise) as ServiceError;
      expect(fn).toHaveBeenCalledTimes(2); // 1 + retries(1)
      expect(err.message).toBe('always');
    });
  });

  describe('retryRequest — error normalization', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('normalizes thrown non-Error values to ServiceError before lastError assignment', async () => {
      const svc = new TestService();
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      const fn = vi.fn().mockRejectedValue('not-an-error');
      const promise = svc.callRetryRequest(fn, 0).catch(e => e);
      await vi.runAllTimersAsync();
      const err = (await promise) as ServiceError;
      expect(err).toBeInstanceOf(ServiceError);
      expect(err.message).toBe('not-an-error');
    });

    it('preserves originalError reference for wrapped errors', async () => {
      const svc = new TestService();
      const original = new Error('original-cause');
      const fn = vi.fn().mockRejectedValue(original);
      const promise = svc.callRetryRequest(fn, 0).catch(e => e);
      await vi.runAllTimersAsync();
      const err = (await promise) as ServiceError;
      expect(err.originalError).toBe(original);
    });
  });
});
