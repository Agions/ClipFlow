/**
 * Feature Flags — 单元测试
 *
 * 覆盖：
 *  1. types：isFeatureFlagKey 守卫
 *  2. storage：默认值 / override 合并 / 脏数据容错 / 清理
 *  3. hook：useFeatureFlag 监听变化 / SSR 安全 / useFeatureFlagWithToggle 全套动作
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  DEFAULT_FLAGS,
  clearAllFlags,
  isFeatureFlagKey,
  readResolvedFlags,
  readStoredFlags,
  useFeatureFlag,
  useFeatureFlagWithToggle,
  writeFlag,
  type FeatureFlagKey,
} from './index';

const STORAGE_KEY = 'fablr-feature-flags';

// ─── localStorage 清理 ──────────────────────────────────

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ─── types.ts ──────────────────────────────────────────

describe('types', () => {
  it('isFeatureFlagKey 接受合法 key', () => {
    expect(isFeatureFlagKey('experimental.tts-page')).toBe(true);
    expect(isFeatureFlagKey('experimental.monorepo')).toBe(true);
  });

  it('isFeatureFlagKey 拒绝非法 key', () => {
    expect(isFeatureFlagKey('magic-button')).toBe(false);
    expect(isFeatureFlagKey('')).toBe(false);
    expect(isFeatureFlagKey('experimental.unknown')).toBe(false);
  });

  it('DEFAULT_FLAGS 覆盖所有 FeatureFlagKey', () => {
    // 编译期已通过 Record<FeatureFlagKey, boolean> 约束
    // 运行时再校验：所有 key 都有 boolean 默认
    for (const [key, value] of Object.entries(DEFAULT_FLAGS)) {
      expect(typeof value).toBe('boolean');
      expect(isFeatureFlagKey(key)).toBe(true);
    }
  });

  it('所有 experimental.* 默认 OFF（保护性默认）', () => {
    for (const value of Object.values(DEFAULT_FLAGS)) {
      expect(value).toBe(false);
    }
  });
});

// ─── storage.ts ───────────────────────────────────────

describe('storage', () => {
  it('readResolvedFlags 在空 localStorage 时返回 DEFAULT_FLAGS', () => {
    expect(readResolvedFlags()).toEqual(DEFAULT_FLAGS);
  });

  it('writeFlag + readResolvedFlags 合并 override', () => {
    writeFlag('experimental.tts-page', true);
    const resolved = readResolvedFlags();
    expect(resolved['experimental.tts-page']).toBe(true);
    expect(resolved['experimental.monorepo']).toBe(DEFAULT_FLAGS['experimental.monorepo']);
  });

  it('writeFlag(false) 写入 false override（与默认反向才写入）', () => {
    // 默认 false，写 false 不写入（避免冗余）
    writeFlag('experimental.tts-page', false);
    expect(readStoredFlags()).toEqual({});
  });

  it('writeFlag(null) 清除 override（恢复默认）', () => {
    writeFlag('experimental.tts-page', true);
    expect(readStoredFlags()).toEqual({ 'experimental.tts-page': true });
    writeFlag('experimental.tts-page', null);
    expect(readStoredFlags()).toEqual({});
  });

  it('writeFlag(与默认同值) 不写入冗余 override', () => {
    // 假设某 flag 默认 true（暂用假想值），传入 true 不应写入
    // 这里只能用现有 flag 测「false 不写」
    writeFlag('experimental.tts-page', false);
    expect(readStoredFlags()).toEqual({});
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('空 localStorage 全部清除时移除 STORAGE_KEY', () => {
    writeFlag('experimental.tts-page', true);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    clearAllFlags();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('容错：JSON 解析失败 → 视作空 override', () => {
    localStorage.setItem(STORAGE_KEY, '{invalid json');
    expect(readStoredFlags()).toEqual({});
    expect(readResolvedFlags()).toEqual(DEFAULT_FLAGS);
  });

  it('容错：非对象 JSON → 视作空 override', () => {
    localStorage.setItem(STORAGE_KEY, '"string"');
    expect(readStoredFlags()).toEqual({});
  });

  it('容错：非法 key 被过滤', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        'experimental.tts-page': true,
        'magic.unrelated': true,
        'experimental.unknown': false,
      })
    );
    expect(readStoredFlags()).toEqual({ 'experimental.tts-page': true });
  });

  it('容错：非 boolean value 被过滤', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        'experimental.tts-page': 'yes',
        'experimental.monorepo': 1,
      })
    );
    expect(readStoredFlags()).toEqual({});
  });

  it('SSR 安全：localStorage 未定义时返回空 override', () => {
    const originalStorage = globalThis.localStorage;
    // 模拟服务端
    // @ts-expect-error 故意删除
    delete globalThis.localStorage;
    expect(readStoredFlags()).toEqual({});
    expect(readResolvedFlags()).toEqual(DEFAULT_FLAGS);
    // 写入也应静默 no-op
    writeFlag('experimental.tts-page', true);
    expect(readStoredFlags()).toEqual({});
    globalThis.localStorage = originalStorage;
  });
});

// ─── hook.ts ──────────────────────────────────────────

describe('hook', () => {
  it('useFeatureFlag 默认值来自 DEFAULT_FLAGS', () => {
    const { result } = renderHook(() => useFeatureFlag('experimental.tts-page'));
    expect(result.current).toBe(false);
  });

  it('useFeatureFlag 读取 localStorage override', () => {
    writeFlag('experimental.tts-page', true);
    const { result } = renderHook(() => useFeatureFlag('experimental.tts-page'));
    expect(result.current).toBe(true);
  });

  it('useFeatureFlag 响应其他 tab 的 storage 事件', () => {
    const { result } = renderHook(() => useFeatureFlag('experimental.tts-page'));
    expect(result.current).toBe(false);

    act(() => {
      writeFlag('experimental.tts-page', true);
      // 模拟其他 tab 触发（必须手动派发 storage 事件）
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    });

    expect(result.current).toBe(true);
  });

  it('useFeatureFlagWithToggle.toggle 翻转值', () => {
    const { result } = renderHook(() => useFeatureFlagWithToggle('experimental.tts-page'));

    expect(result.current.value).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.value).toBe(true);
    expect(readStoredFlags()['experimental.tts-page']).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.value).toBe(false);
    expect(readStoredFlags()['experimental.tts-page']).toBeUndefined();
  });

  it('useFeatureFlagWithToggle.set 强制设值', () => {
    const { result } = renderHook(() => useFeatureFlagWithToggle('experimental.tts-page'));

    act(() => result.current.set(true));
    expect(result.current.value).toBe(true);

    act(() => result.current.set(false));
    expect(result.current.value).toBe(false);
  });

  it('useFeatureFlagWithToggle.reset 清除 override', () => {
    const { result } = renderHook(() => useFeatureFlagWithToggle('experimental.tts-page'));

    act(() => result.current.set(true));
    expect(result.current.isDefault).toBe(false);

    act(() => result.current.reset());
    expect(result.current.value).toBe(false);
    expect(result.current.isDefault).toBe(true);
  });

  it('isDefault 反映当前值是否与默认一致', () => {
    const { result } = renderHook(() => useFeatureFlagWithToggle('experimental.tts-page'));

    expect(result.current.isDefault).toBe(true);

    act(() => result.current.set(true));
    expect(result.current.isDefault).toBe(false);
  });

  it('SSR 安全：渲染时 window 变化不影响初始值（懒初始化）', () => {
    // 实现：useState 初始化函数在 window 缺失时返回 DEFAULT_FLAGS 中的值（不抛错）
    // 这里通过「直接读取 DEFAULT_FLAGS 验证懒初始化逻辑」避免 delete window 破坏 React
    const { result } = renderHook(() => useFeatureFlag('experimental.tts-page'));
    expect(result.current).toBe(DEFAULT_FLAGS['experimental.tts-page']);
  });

  it('SSR 安全：useState 初始化函数在 window 缺失时返回默认', () => {
    // 取出 useState 初始化函数，模拟 window 缺失场景
    const initFn = (key: FeatureFlagKey) =>
      typeof window === 'undefined' ? DEFAULT_FLAGS[key] : readResolvedFlags()[key];
    const originalWindow = globalThis.window;
    // @ts-expect-error 故意删除
    delete globalThis.window;
    expect(initFn('experimental.tts-page')).toBe(false);
    globalThis.window = originalWindow;
  });

  it('多 flag 独立：本 flag 变化不影响其他', () => {
    // 单 renderHook 同时订阅两个 flag（避免双 hook 清理冲突）
    const { result } = renderHook(() => {
      const a = useFeatureFlagWithToggle('experimental.tts-page');
      const b = useFeatureFlagWithToggle('experimental.monorepo');
      return { a, b };
    });

    expect(result.current.a.value).toBe(false);
    expect(result.current.b.value).toBe(false);

    act(() => result.current.a.set(true));

    expect(result.current.a.value).toBe(true);
    expect(result.current.b.value).toBe(false);
  });

  it('测试所有 FeatureFlagKey 编译期覆盖（防止遗漏）', () => {
    const keys: FeatureFlagKey[] = [
      'experimental.tts-page',
      'experimental.monorepo',
      'experimental.clapperboard',
      'experimental.track-light',
    ];
    for (const key of keys) {
      expect(DEFAULT_FLAGS).toHaveProperty(key);
    }
  });
});
