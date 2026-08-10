/**
 * notify / emitToast / subscribeToToast / withLock — 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emitToast, subscribeToToast, notify, toErrorMessage, withLock } from './notify';

describe('toErrorMessage', () => {
  it('extracts message from Error', () => {
    expect(toErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('returns fallback for empty Error.message', () => {
    expect(toErrorMessage(new Error('   '), 'fallback')).toBe('fallback');
  });

  it('returns string value as-is (trimmed)', () => {
    expect(toErrorMessage('oops', 'fallback')).toBe('oops');
    expect(toErrorMessage('  oops  ', 'fallback')).toBe('oops');
  });

  it('returns fallback for empty/whitespace string', () => {
    expect(toErrorMessage('', 'fallback')).toBe('fallback');
    expect(toErrorMessage('   ', 'fallback')).toBe('fallback');
  });

  it('returns fallback for non-string non-Error values', () => {
    expect(toErrorMessage(42, 'fallback')).toBe('fallback');
    expect(toErrorMessage(null, 'fallback')).toBe('fallback');
    expect(toErrorMessage(undefined, 'fallback')).toBe('fallback');
    expect(toErrorMessage({}, 'fallback')).toBe('fallback');
  });
});

describe('emitToast + subscribeToToast', () => {
  beforeEach(() => {
    // 不重置 listeners（模块级 Set）—每个 test 通过新增+清理隔离
  });

  it('delivers event to subscribed listener', () => {
    const listener = vi.fn();
    const unsub = subscribeToToast(listener);
    try {
      emitToast({ type: 'success', content: 'hi' });
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].content).toBe('hi');
    } finally {
      unsub();
    }
  });

  it('delivers to multiple listeners', () => {
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = subscribeToToast(a);
    const unsubB = subscribeToToast(b);
    try {
      emitToast({ type: 'info', content: 'multi' });
      expect(a).toHaveBeenCalledOnce();
      expect(b).toHaveBeenCalledOnce();
    } finally {
      unsubA();
      unsubB();
    }
  });

  it('unsubscribe stops delivery', () => {
    const listener = vi.fn();
    const unsub = subscribeToToast(listener);
    unsub();
    emitToast({ type: 'warning', content: 'after-unsub' });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('notify', () => {
  it('success() emits success toast and optional key', () => {
    const listener = vi.fn();
    const unsub = subscribeToToast(listener);
    try {
      notify.success('done', 'k1');
      expect(listener).toHaveBeenCalledWith({
        type: 'success',
        content: 'done',
        duration: 3,
        key: 'k1',
      });
    } finally {
      unsub();
    }
  });

  it('error() extracts message from Error and uses 2x duration', () => {
    const listener = vi.fn();
    const unsub = subscribeToToast(listener);
    try {
      notify.error(new Error('boom'), '操作失败');
      expect(listener).toHaveBeenCalledWith({
        type: 'error',
        content: 'boom',
        duration: 6,
        key: undefined,
      });
    } finally {
      unsub();
    }
  });

  it('warning() / info() / loading() emit correct type and duration', () => {
    const listener = vi.fn();
    const unsub = subscribeToToast(listener);
    try {
      notify.warning('小心');
      notify.info('提示');
      notify.loading('加载中', 'load-1');

      expect(listener).toHaveBeenNthCalledWith(1, {
        type: 'warning',
        content: '小心',
        duration: 3,
        key: undefined,
      });
      expect(listener).toHaveBeenNthCalledWith(2, {
        type: 'info',
        content: '提示',
        duration: 3,
        key: undefined,
      });
      expect(listener).toHaveBeenNthCalledWith(3, {
        type: 'loading',
        content: '加载中',
        duration: 0,
        key: 'load-1',
      });
    } finally {
      unsub();
    }
  });

  it('destroy() does not throw (no-op for now)', () => {
    expect(() => notify.destroy()).not.toThrow();
    expect(() => notify.destroy('k1')).not.toThrow();
  });
});

describe('withLock', () => {
  it('sets busy=true → fn() → busy=false on success', async () => {
    const setBusy = vi.fn();
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withLock(setBusy, '保存', fn);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledOnce();
    expect(setBusy).toHaveBeenNthCalledWith(1, true);
    expect(setBusy).toHaveBeenLastCalledWith(false);
    expect(setBusy).toHaveBeenCalledTimes(2);
  });

  it('emits error toast and returns undefined when fn() rejects', async () => {
    const setBusy = vi.fn();
    const fn = vi.fn().mockRejectedValue(new Error('网络异常'));
    const listener = vi.fn();
    const unsub = subscribeToToast(listener);
    try {
      const result = await withLock(setBusy, '上传', fn);
      expect(result).toBeUndefined();
      expect(setBusy).toHaveBeenLastCalledWith(false);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          content: '网络异常',
        })
      );
    } finally {
      unsub();
    }
  });

  it('still calls setBusy(false) even when fn throws synchronously', async () => {
    const setBusy = vi.fn();
    const fn = vi.fn(() => {
      throw new Error('同步炸了');
    });
    const listener = vi.fn();
    const unsub = subscribeToToast(listener);
    try {
      const result = await withLock(setBusy, '同步操作', fn);
      expect(result).toBeUndefined();
      expect(setBusy).toHaveBeenLastCalledWith(false);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', content: '同步炸了' })
      );
    } finally {
      unsub();
    }
  });

  it('uses fallback label when error message is empty', async () => {
    const setBusy = vi.fn();
    const fn = vi.fn().mockRejectedValue(new Error('   '));
    const listener = vi.fn();
    const unsub = subscribeToToast(listener);
    try {
      await withLock(setBusy, '导出', fn);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', content: '导出失败' })
      );
    } finally {
      unsub();
    }
  });
});
