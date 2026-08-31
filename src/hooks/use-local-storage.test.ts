/**
 * use-local-storage 测试
 *
 * Stage 9 PR-9：类型安全 localStorage hook 覆盖
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useLocalStorage from './use-local-storage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('reads existing value from localStorage on mount', () => {
    window.localStorage.setItem('test-key', JSON.stringify('stored-value'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('stored-value');
  });

  it('updates value and persists to localStorage on set', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
    expect(window.localStorage.getItem('test-key')).toBe(JSON.stringify('new-value'));
  });

  it('supports function updater', () => {
    const { result } = renderHook(() => useLocalStorage<number>('counter', 0));

    act(() => {
      result.current[1](prev => prev + 1);
    });
    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1](prev => prev + 1);
    });
    expect(result.current[0]).toBe(2);
  });

  it('handles complex objects', () => {
    interface User {
      name: string;
      age: number;
    }
    const { result } = renderHook(() => useLocalStorage<User>('user', { name: 'init', age: 0 }));

    act(() => {
      result.current[1]({ name: 'Alice', age: 30 });
    });

    expect(result.current[0]).toEqual({ name: 'Alice', age: 30 });
    expect(JSON.parse(window.localStorage.getItem('user')!)).toEqual({ name: 'Alice', age: 30 });
  });

  it('handles arrays', () => {
    const { result } = renderHook(() => useLocalStorage<number[]>('nums', []));

    act(() => {
      result.current[1]([1, 2, 3]);
    });

    expect(result.current[0]).toEqual([1, 2, 3]);
  });

  it('falls back to initial value on JSON parse error', () => {
    window.localStorage.setItem('bad-key', 'not valid json{');
    const { result } = renderHook(() => useLocalStorage('bad-key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('falls back to initial value when localStorage value is empty string', () => {
    window.localStorage.setItem('empty-key', '');
    const { result } = renderHook(() => useLocalStorage('empty-key', 'default'));
    // Empty string is falsy in JS, so the ternary returns initialValue
    expect(result.current[0]).toBe('default');
  });

  it('logs error and keeps state when localStorage.setItem fails', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // jsdom binds setItem directly on the localStorage instance, so we must
    // override it on the instance rather than on Storage.prototype.
    const originalSetItem = window.localStorage.setItem;
    Object.defineProperty(window.localStorage, 'setItem', {
      configurable: true,
      writable: true,
      value: () => {
        throw new Error('quota exceeded');
      },
    });

    const { result } = renderHook(() => useLocalStorage('quota-key', 'init'));

    act(() => {
      result.current[1]('new-value');
    });

    // State should still update even if storage fails
    expect(result.current[0]).toBe('new-value');
    // Error path executes logger.error → write() → console.error
    expect(errorSpy).toHaveBeenCalled();
    Object.defineProperty(window.localStorage, 'setItem', {
      configurable: true,
      writable: true,
      value: originalSetItem,
    });
    errorSpy.mockRestore();
  });
});
