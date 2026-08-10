/**
 * core/errors/normalize.ts — 单元测试
 *
 * 覆盖策略：
 * 1. AppError 原样返回（passthrough）
 * 2. TauriBridgeError → 保留 command / retryable / kind
 * 3. ServiceError → 保留 code / statusCode
 * 4. 普通 Error → fallback 包装
 * 5. string / object / null / undefined → fallback message
 * 6. isRetryable 通过归一化结果判定
 * 7. fallbackCode 参数可定制
 */
import { describe, it, expect } from 'vitest';
import { normalizeError, isRetryable } from './normalize';
import { AppError } from '@/shared/errors';
import { TauriBridgeError } from '@/core/tauri/invoke';
import { ServiceError } from '../services/providers/base-service';

// ─── Passthrough ─────────────────────────────────────────────────────────────

describe('normalizeError — AppError passthrough', () => {
  it('returns the original AppError unchanged', () => {
    const original = new AppError('APP_FOO', 'foo', { severity: 'warning' });
    const result = normalizeError(original);
    expect(result).toBe(original);
  });

  it('does not wrap AppError even when fallbackCode differs', () => {
    const original = new AppError('APP_KEEP', 'kept');
    const result = normalizeError(original, 'APP_OTHER');
    expect(result).toBe(original);
    expect(result.code).toBe('APP_KEEP');
  });
});

// ─── TauriBridgeError ────────────────────────────────────────────────────────

describe('normalizeError — TauriBridgeError', () => {
  it('maps retryable=true to severity=warning', () => {
    const err = new TauriBridgeError('timeout', 'CMD_FOO' as never, undefined, true);
    const result = normalizeError(err);
    expect(result).toBeInstanceOf(AppError);
    expect(result.code).toBe('APP_TAURI_BRIDGE');
    expect(result.severity).toBe('warning');
    expect(result.retryable).toBe(true);
    expect(result.originalError).toBe(err);
    expect(result.context).toMatchObject({
      bridge: { command: 'CMD_FOO', retryable: true },
    });
  });

  it('maps retryable=false to severity=error', () => {
    const err = new TauriBridgeError('hard fail', 'CMD_BAR' as never);
    const result = normalizeError(err);
    expect(result.severity).toBe('error');
    expect(result.retryable).toBe(false);
  });

  it('includes kind in bridge context when present', () => {
    // 构造一个带 kind 字段的对象（模拟 PR-2.3 之后版本）
    const errWithKind = Object.assign(
      new TauriBridgeError('x', 'CMD_X' as never, undefined, false),
      { kind: 'network' }
    );
    const result = normalizeError(errWithKind);
    const bridge = (result.context as { bridge: { kind?: string } }).bridge;
    expect(bridge.kind).toBe('network');
  });

  it('omits kind when not present on TauriBridgeError', () => {
    const err = new TauriBridgeError('x', 'CMD_X' as never);
    const result = normalizeError(err);
    const bridge = (result.context as { bridge: { kind?: string } }).bridge;
    expect(bridge).not.toHaveProperty('kind');
  });
});

// ─── ServiceError ────────────────────────────────────────────────────────────

describe('normalizeError — ServiceError', () => {
  it('uses code as AppError.code, defaults to APP_SERVICE_ERROR when missing', () => {
    const withCode = new ServiceError('msg', 'SRV_CODE', 500);
    expect(normalizeError(withCode).code).toBe('SRV_CODE');

    const withoutCode = new ServiceError('msg');
    expect(normalizeError(withoutCode).code).toBe('APP_SERVICE_ERROR');
  });

  it('preserves statusCode and severity=error', () => {
    const err = new ServiceError('msg', 'CODE', 404);
    const result = normalizeError(err);
    expect(result.statusCode).toBe(404);
    expect(result.severity).toBe('error');
  });

  it('wraps originalError or fallback to err itself', () => {
    const inner = new Error('inner');
    const err = new ServiceError('msg', 'CODE', 500, inner);
    const result = normalizeError(err);
    expect(result.originalError).toBe(inner);

    const noInner = new ServiceError('msg', 'CODE', 500);
    const result2 = normalizeError(noInner);
    expect(result2.originalError).toBe(noInner);
  });

  it('builds service context with code/statusCode', () => {
    const err = new ServiceError('msg', 'CODE_X', 418);
    const result = normalizeError(err);
    expect(result.context).toMatchObject({
      service: { code: 'CODE_X', statusCode: 418 },
    });
  });
});

// ─── Plain Error ─────────────────────────────────────────────────────────────

describe('normalizeError — plain Error', () => {
  it('wraps into AppError with fallback code', () => {
    const result = normalizeError(new Error('plain'));
    expect(result).toBeInstanceOf(AppError);
    expect(result.code).toBe('APP_UNKNOWN');
    expect(result.message).toBe('plain');
    expect(result.severity).toBe('error');
    expect(result.originalError).toBeInstanceOf(Error);
  });

  it('uses custom fallbackCode', () => {
    const result = normalizeError(new Error('e'), 'APP_CUSTOM');
    expect(result.code).toBe('APP_CUSTOM');
  });

  it('preserves stack-less errors as well', () => {
    const result = normalizeError(new TypeError('type'));
    expect(result.message).toBe('type');
    expect((result.originalError as Error).name).toBe('TypeError');
  });
});

// ─── Non-Error values ────────────────────────────────────────────────────────

describe('normalizeError — non-Error values', () => {
  it('uses string value as message when err is a string', () => {
    const result = normalizeError('a string error');
    expect(result.message).toBe('a string error');
    expect(result.code).toBe('APP_UNKNOWN');
    expect(result.originalError).toBe('a string error');
  });

  it('falls back to "Unknown error" for object values', () => {
    const result = normalizeError({ weird: true });
    expect(result.message).toBe('Unknown error');
    expect(result.originalError).toEqual({ weird: true });
  });

  it('handles null', () => {
    const result = normalizeError(null);
    expect(result.message).toBe('Unknown error');
  });

  it('handles undefined', () => {
    const result = normalizeError(undefined);
    expect(result.message).toBe('Unknown error');
  });

  it('handles number', () => {
    const result = normalizeError(42);
    // typeof 42 !== 'string' → 'Unknown error'
    expect(result.message).toBe('Unknown error');
  });

  it('respects custom fallbackCode for non-Error values', () => {
    const result = normalizeError({ x: 1 }, 'APP_OBJECT');
    expect(result.code).toBe('APP_OBJECT');
  });
});

// ─── isRetryable ─────────────────────────────────────────────────────────────

describe('isRetryable', () => {
  it('returns true for retryable TauriBridgeError', () => {
    const err = new TauriBridgeError('timeout', 'CMD' as never, undefined, true);
    expect(isRetryable(err)).toBe(true);
  });

  it('returns false for non-retryable TauriBridgeError', () => {
    const err = new TauriBridgeError('hard', 'CMD' as never);
    expect(isRetryable(err)).toBe(false);
  });

  it('returns false for plain Error', () => {
    expect(isRetryable(new Error('x'))).toBe(false);
  });

  it('returns false for AppError without retryable flag', () => {
    expect(isRetryable(new AppError('APP', 'msg'))).toBe(false);
  });

  it('returns true when AppError.retryable=true', () => {
    expect(isRetryable(new AppError('APP', 'msg', { retryable: true }))).toBe(true);
  });

  it('returns false for string error', () => {
    expect(isRetryable('plain string')).toBe(false);
  });
});

// ─── Priority chain ──────────────────────────────────────────────────────────

describe('normalizeError — priority chain', () => {
  it('AppError wins over instanceof Error checks', () => {
    const appErr = new AppError('APP', 'app-msg');
    expect(normalizeError(appErr)).toBe(appErr);
  });

  it('TauriBridgeError wins over generic Error (instanceof chain)', () => {
    // TauriBridgeError extends Error
    const tauriErr = new TauriBridgeError('msg', 'CMD' as never);
    // should be classified as TauriBridgeError, not generic Error
    const result = normalizeError(tauriErr);
    expect(result.code).toBe('APP_TAURI_BRIDGE');
  });

  it('ServiceError wins over plain Error (because of code field)', () => {
    const svc = new ServiceError('msg', 'SRV', 500);
    const result = normalizeError(svc);
    expect(result.code).toBe('SRV');
  });
});
