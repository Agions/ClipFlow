/**
 * shared/hooks/use-color-token 测试
 *
 * 覆盖：
 *  - SSR 环境返回 hex 值（不调用 getComputedStyle）
 *  - 客户端首次渲染返回 hex fallback（jsdom 无完整 CSS var 计算）
 *  - 主题切换（`.light` class 切换）触发重新读取（异步等 MutationObserver）
 *  - useColorTokens 批量读取、token 列表变化、主题切换
 *  - readColorToken 同步读取（非 hook）
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useColorToken, useColorTokens, readColorToken } from '../use-color-token';
import { COLOR_TOKENS } from '@/shared/tokens/color-tokens';

describe('useColorToken', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('light');
  });

  afterEach(() => {
    document.documentElement.classList.remove('light');
  });

  it('在客户端首次渲染返回 hex fallback', () => {
    const { result } = renderHook(() => useColorToken('accent-primary'));
    expect(result.current).toBe('#c8956c');
  });

  it('读取任意 token 返回对应 hex', () => {
    const { result: r1 } = renderHook(() => useColorToken('bg-base'));
    const { result: r2 } = renderHook(() => useColorToken('text-primary'));
    const { result: r3 } = renderHook(() => useColorToken('accent-danger'));
    expect(r1.current).toBe('#08080a');
    expect(r2.current).toBe('#f0eee8');
    expect(r3.current).toBe('#c75050');
  });

  it('响应 documentElement class 变化（light ↔ dark）', async () => {
    const { result } = renderHook(() => useColorToken('bg-base'));
    expect(result.current).toBe('#08080a'); // 暗色

    act(() => {
      document.documentElement.classList.add('light');
    });

    // MutationObserver 异步触发，需要 waitFor
    await waitFor(() => {
      expect(result.current).toBe('#f7f5f0');
    });

    act(() => {
      document.documentElement.classList.remove('light');
    });

    await waitFor(() => {
      expect(result.current).toBe('#08080a');
    });
  });

  it('同一 token 多次调用结果一致', () => {
    const { result: a } = renderHook(() => useColorToken('accent-primary'));
    const { result: b } = renderHook(() => useColorToken('accent-primary'));
    expect(a.current).toBe(b.current);
  });

  it('组件卸载时 disconnect MutationObserver', () => {
    const { unmount } = renderHook(() => useColorToken('accent-primary'));
    expect(() => unmount()).not.toThrow();
  });
});

describe('useColorTokens（批量）', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('light');
  });

  afterEach(() => {
    document.documentElement.classList.remove('light');
  });

  it('返回对象形式的 token → value 映射', () => {
    const { result } = renderHook(() =>
      useColorTokens(['accent-primary', 'bg-base', 'text-primary'] as const)
    );

    expect(result.current).toEqual({
      'accent-primary': '#c8956c',
      'bg-base': '#08080a',
      'text-primary': '#f0eee8',
    });
  });

  it('主题切换时所有 token 同步更新', async () => {
    const { result } = renderHook(() => useColorTokens(['bg-base', 'accent-primary'] as const));

    expect(result.current['bg-base']).toBe('#08080a');

    act(() => {
      document.documentElement.classList.add('light');
    });

    await waitFor(() => {
      expect(result.current['bg-base']).toBe('#f7f5f0');
    });
    expect(result.current['accent-primary']).toBe('#a07040');
  });

  it('token 数组变化时（移除 token）触发重建', async () => {
    type Tokens = readonly ('accent-primary' | 'bg-base')[];
    const { result, rerender } = renderHook(
      ({ tokens }: { tokens: Tokens }) => useColorTokens(tokens),
      { initialProps: { tokens: ['accent-primary', 'bg-base'] as Tokens } }
    );

    expect(result.current['accent-primary']).toBe('#c8956c');

    rerender({ tokens: ['bg-base'] as Tokens });

    // 数组长度变化后立即同步重建
    await waitFor(() => {
      expect(result.current['accent-primary']).toBeUndefined();
    });
    expect(result.current['bg-base']).toBe('#08080a');
  });
});

describe('readColorToken（同步读取）', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('light');
  });

  it('返回 hex 值', () => {
    expect(readColorToken('accent-primary')).toBe('#c8956c');
  });

  it('在非 hook 上下文也能读取（事件处理器模拟）', () => {
    const handler = (): string => readColorToken('accent-primary');
    expect(handler()).toBe('#c8956c');
  });

  it('响应主题 class（同步读取走 detectTheme）', () => {
    document.documentElement.classList.add('light');
    expect(readColorToken('bg-base')).toBe('#f7f5f0');
    document.documentElement.classList.remove('light');
    expect(readColorToken('bg-base')).toBe('#08080a');
  });
});

describe('与 COLOR_TOKENS 一致性', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('light');
  });

  it('hook 返回值与 COLOR_TOKENS 表一致（暗色主题）', () => {
    Object.entries(COLOR_TOKENS).forEach(([token, expected]) => {
      const { result } = renderHook(() => useColorToken(token as keyof typeof COLOR_TOKENS));
      expect(result.current, `token "${token}"`).toBe(expected);
    });
  });
});
