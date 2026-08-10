/**
 * createPersistedStore 测试
 *
 * 覆盖：
 * - 默认 storage（localStorage）
 * - 自定义 storage / partialize
 * - 返回 store 具备状态设置与读取能力
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPersistedStore } from './create-persisted-store';

interface CounterState {
  count: number;
  tick: () => void;
  reset: () => void;
}

interface SimpleState {
  x: string;
  setX: (v: string) => void;
}

beforeEach(() => {
  localStorage.clear();
});

describe('createPersistedStore', () => {
  it('creates a zustand store, defaults to localStorage storage', () => {
    const useStore = createPersistedStore<CounterState>({
      name: 'counter-default',
      devtoolsName: 'CounterDefault',
      // Provide a passthrough partialize so zustand doesn't error
      partialize: s => ({ ...s }),
      state: set => ({
        count: 0,
        tick: () => set(s => ({ count: s.count + 1 })),
        reset: () => set({ count: 0 }),
      }),
    });

    expect(typeof useStore).toBe('function');
    const { getState } = useStore;
    expect(getState().count).toBe(0);
    expect(getState().tick).toBeInstanceOf(Function);
  });

  it('partially persists only the fields selected by partialize()', () => {
    const useStore = createPersistedStore<{ a: number; b: number; setA: (v: number) => void }>({
      name: 'partial-store',
      devtoolsName: 'Partial',
      partialize: state => ({ a: state.a }),
      state: set => ({
        a: 1,
        b: 2,
        setA: (v: number) => set({ a: v }),
      }),
    });

    const { setState } = useStore;
    setState({ a: 10, b: 20 });

    // After setState triggers persist, the persisted JSON should only contain 'a'
    const persisted = localStorage.getItem('partial-store');
    expect(persisted).not.toBeNull();
    const parsed = JSON.parse(persisted!);
    expect(parsed.state.a).toBe(10);
    expect(parsed.state.b).toBeUndefined();
  });

  it('uses the provided custom storage when supplied', () => {
    const customStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    const useStore = createPersistedStore<SimpleState>({
      name: 'custom-store',
      devtoolsName: 'Custom',
      storage: customStorage as unknown as ReturnType<
        typeof import('zustand/middleware').createJSONStorage
      >,
      partialize: s => ({ ...s }),
      state: set => ({
        x: 'init',
        setX: (v: string) => set({ x: v }),
      }),
    });

    useStore.setState({ x: 'hello' });

    // zustand passes the value object directly to setItem when no JSON wrapper is provided
    expect(customStorage.setItem).toHaveBeenCalledTimes(1);
    const [key, value] = customStorage.setItem.mock.calls[0];
    expect(key).toBe('custom-store');
    expect((value as { state: { x: string } }).state.x).toBe('hello');
  });
});
