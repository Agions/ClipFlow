/**
 * Tauri invoke bridge 单元测试
 *
 * 覆盖：
 * - TauriBridgeError.fromInvoke 错误分类（retryable 检测 + 非 Error 包装）
 * - executeWithRetry 重试逻辑、AbortSignal、最终错误抛出
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { invoke, TauriBridgeError, TauriCommand } from './invoke';

const mockedTauriInvoke = vi.mocked(tauriInvoke);

beforeEach(() => {
  mockedTauriInvoke.mockReset();
});

describe('TauriBridgeError.fromInvoke', () => {
  it('wraps a generic Error and marks it non-retryable', () => {
    const wrapped = TauriBridgeError.fromInvoke(TauriCommand.CHECK_FFMPEG, new Error('boom'));
    expect(wrapped).toBeInstanceOf(TauriBridgeError);
    expect(wrapped.name).toBe('TauriBridgeError');
    expect(wrapped.command).toBe(TauriCommand.CHECK_FFMPEG);
    expect(wrapped.message).toContain('check_ffmpeg');
    expect(wrapped.message).toContain('boom');
    expect(wrapped.retryable).toBe(false);
    expect(wrapped.cause).toBeInstanceOf(Error);
  });

  it('marks an error retryable when its message contains "timeout"', () => {
    const wrapped = TauriBridgeError.fromInvoke(
      TauriCommand.EXPORT_VIDEO,
      new Error('operation timeout')
    );
    expect(wrapped.retryable).toBe(true);
  });

  it('marks an error retryable when its message contains "busy"', () => {
    const wrapped = TauriBridgeError.fromInvoke(
      TauriCommand.EXPORT_VIDEO,
      new Error('device busy')
    );
    expect(wrapped.retryable).toBe(true);
  });

  it('marks an error retryable when its message contains "temporary"', () => {
    const wrapped = TauriBridgeError.fromInvoke(
      TauriCommand.EXPORT_VIDEO,
      new Error('temporary failure')
    );
    expect(wrapped.retryable).toBe(true);
  });

  it('wraps a non-Error value and marks it non-retryable', () => {
    const wrapped = TauriBridgeError.fromInvoke(TauriCommand.CHECK_FFMPEG, 'a raw string error');
    expect(wrapped).toBeInstanceOf(TauriBridgeError);
    expect(wrapped.message).toContain('a raw string error');
    expect(wrapped.retryable).toBe(false);
    expect(wrapped.cause).toBe('a raw string error');
  });
});

describe('invoke (retry + abort)', () => {
  it('returns the underlying tauri invoke result', async () => {
    mockedTauriInvoke.mockResolvedValueOnce({ ok: true });
    const result = await invoke(TauriCommand.CHECK_FFMPEG);
    expect(result).toEqual({ ok: true });
  });

  it('retries up to the configured number of times before throwing', async () => {
    mockedTauriInvoke.mockRejectedValue(new Error('persistent failure'));

    await expect(invoke(TauriCommand.EXPORT_VIDEO, {}, { retries: 2 })).rejects.toBeInstanceOf(
      TauriBridgeError
    );

    // First attempt + 2 retries = 3 invocations
    expect(mockedTauriInvoke).toHaveBeenCalledTimes(3);
  });

  it('returns the result on the second attempt without throwing', async () => {
    mockedTauriInvoke
      .mockRejectedValueOnce(new Error('flaky failure'))
      .mockResolvedValueOnce({ ok: true });

    const result = await invoke(TauriCommand.CHECK_FFMPEG, {}, { retries: 1 });
    expect(result).toEqual({ ok: true });
    expect(mockedTauriInvoke).toHaveBeenCalledTimes(2);
  });

  it('throws a TauriBridgeError when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      invoke(TauriCommand.EXPORT_VIDEO, {}, { signal: controller.signal })
    ).rejects.toBeInstanceOf(TauriBridgeError);

    expect(mockedTauriInvoke).not.toHaveBeenCalled();
  });

  it('treats undefined options the same as empty options', async () => {
    mockedTauriInvoke.mockResolvedValueOnce(undefined);
    await invoke(TauriCommand.CHECK_FFMPEG, {}, undefined);
    expect(mockedTauriInvoke).toHaveBeenCalledTimes(1);
  });
});
