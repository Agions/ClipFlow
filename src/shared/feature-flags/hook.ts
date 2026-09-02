/**
 * Feature Flags — React 集成 Hook
 *
 * 职责：在 React 组件订阅 localStorage 变化（多 tab 同步 + 手动 toggle）。
 * 不在 React 组件中的代码请直接使用 storage.ts 的 readResolvedFlags。
 *
 * 用法：
 *   const ttsPageEnabled = useFeatureFlag('experimental.tts-page');
 *   if (ttsPageEnabled) return <NewTtsPage />;
 *   return <OldMultiTrackTimeline />;
 */

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_FLAGS, type FeatureFlagKey } from './types';
import { readResolvedFlags, writeFlag } from './storage';

// ─── 单 flag hook ───────────────────────────────────────

/**
 * 读取单个 flag 的当前值。
 * 监听 localStorage 变化（多 tab 同步 + writeFlag 调用）。
 *
 * SSR 安全：服务端返回 DEFAULT_FLAGS 中的值（不会抛错）。
 *
 * @param key FeatureFlagKey
 * @returns 当前 flag 的 boolean 值
 */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const [value, setValue] = useState<boolean>(() => {
    if (typeof window === 'undefined') return DEFAULT_FLAGS[key];
    return readResolvedFlags()[key];
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 初始化对齐（避免 SSR/CSR mismatch）
    setValue(readResolvedFlags()[key]);

    // 监听其他 tab 切换 + 手动修改
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'fablr-feature-flags' || e.key === 'StoryFab-feature-flags' || e.key === null) {
        setValue(readResolvedFlags()[key]);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return value;
}

/**
 * 读取单个 flag 并暴露 toggle 方法。
 * 比 useFeatureFlag 更适合开关 UI（如设置面板）。
 */
export function useFeatureFlagWithToggle(key: FeatureFlagKey): {
  value: boolean;
  toggle: () => void;
  set: (next: boolean) => void;
  reset: () => void;
  isDefault: boolean;
} {
  const value = useFeatureFlag(key);
  const isDefault = value === DEFAULT_FLAGS[key];

  const set = useCallback(
    (next: boolean) => {
      writeFlag(key, next);
      // 触发同 tab 同步（存储事件不会在当前 tab 触发）
      window.dispatchEvent(new StorageEvent('storage', { key: 'fablr-feature-flags' }));
    },
    [key]
  );

  const toggle = useCallback(() => set(!value), [value, set]);

  const reset = useCallback(() => {
    writeFlag(key, null);
    window.dispatchEvent(new StorageEvent('storage', { key: 'fablr-feature-flags' }));
  }, [key]);

  return { value, toggle, set, reset, isDefault };
}
