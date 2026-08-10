/**
 * AppError 单元测试
 *
 * 覆盖：
 * - 构造函数 + 各字段默认值
 * - toJSON 序列化
 * - AppError.from 转换任意错误
 */

import { describe, it, expect } from 'vitest';
import { AppError } from './app-error';

describe('AppError constructor', () => {
  it('uses defaults for severity and retryable when options omitted', () => {
    const err = new AppError('APP_TEST', 'oops');
    expect(err.code).toBe('APP_TEST');
    expect(err.message).toBe('oops');
    expect(err.name).toBe('AppError');
    expect(err.severity).toBe('error');
    expect(err.retryable).toBe(false);
    expect(err.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(err.userMessage).toBeUndefined();
    expect(err.statusCode).toBeUndefined();
    expect(err.context).toBeUndefined();
    expect(err.originalError).toBeUndefined();
  });

  it('stores all options when provided', () => {
    const original = new Error('inner');
    const err = new AppError('APP_API', 'API failed', {
      severity: 'fatal',
      userMessage: '请稍后重试',
      statusCode: 502,
      retryable: true,
      context: { provider: 'openai', model: 'gpt-4' },
      originalError: original,
    });
    expect(err.severity).toBe('fatal');
    expect(err.userMessage).toBe('请稍后重试');
    expect(err.statusCode).toBe(502);
    expect(err.retryable).toBe(true);
    expect(err.context).toEqual({ provider: 'openai', model: 'gpt-4' });
    expect(err.originalError).toBe(original);
  });

  it('is an instance of Error', () => {
    const err = new AppError('APP_TEST', 'msg');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('preserves stack trace', () => {
    const err = new AppError('APP_TEST', 'msg');
    expect(typeof err.stack).toBe('string');
  });
});

describe('AppError.toJSON', () => {
  it('serializes all public fields including the original error message', () => {
    const err = new AppError('APP_API', 'API failed', {
      severity: 'warning',
      userMessage: '网络不稳定',
      statusCode: 429,
      retryable: true,
      context: { endpoint: '/v1/chat' },
      originalError: new Error('timeout'),
    });

    const json = err.toJSON();
    expect(json.name).toBe('AppError');
    expect(json.code).toBe('APP_API');
    expect(json.message).toBe('API failed');
    expect(json.severity).toBe('warning');
    expect(json.userMessage).toBe('网络不稳定');
    expect(json.statusCode).toBe(429);
    expect(json.retryable).toBe(true);
    expect(json.context).toEqual({ endpoint: '/v1/chat' });
    expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(json.originalError).toEqual({ name: 'Error', message: 'timeout' });
  });

  it('serializes non-Error originalError verbatim', () => {
    const err = new AppError('APP_API', 'msg', { originalError: 'plain string error' });
    const json = err.toJSON();
    expect(json.originalError).toBe('plain string error');
  });

  it('serializes when options are missing (undefined fields allowed)', () => {
    const err = new AppError('APP_TEST', 'msg');
    const json = err.toJSON();
    expect(json.userMessage).toBeUndefined();
    expect(json.statusCode).toBeUndefined();
    expect(json.context).toBeUndefined();
    expect(json.originalError).toBeUndefined();
  });
});

describe('AppError.from', () => {
  it('returns the same instance when input is already an AppError', () => {
    const original = new AppError('APP_X', 'x');
    const result = AppError.from(original);
    expect(result).toBe(original);
  });

  it('wraps a generic Error using the fallback code', () => {
    const original = new TypeError('bad arg');
    const result = AppError.from(original, 'APP_TYPE');
    expect(result).toBeInstanceOf(AppError);
    expect(result.code).toBe('APP_TYPE');
    expect(result.message).toBe('bad arg');
    expect(result.severity).toBe('error');
    expect(result.originalError).toBe(original);
  });

  it('uses APP_UNKNOWN as the default fallback code', () => {
    const result = AppError.from(new Error('mystery'));
    expect(result.code).toBe('APP_UNKNOWN');
    expect(result.message).toBe('mystery');
  });

  it('converts a non-Error value (string) into an AppError', () => {
    const result = AppError.from('just a string');
    expect(result).toBeInstanceOf(AppError);
    expect(result.code).toBe('APP_UNKNOWN');
    expect(result.message).toBe('just a string');
    expect(result.originalError).toBeUndefined();
  });

  it('converts null into an AppError with message "null"', () => {
    const result = AppError.from(null);
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('null');
  });

  it('converts undefined into an AppError with message "undefined"', () => {
    const result = AppError.from(undefined);
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('undefined');
  });
});