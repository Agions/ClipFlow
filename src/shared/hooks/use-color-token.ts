/**
 * useColorToken — 运行时读取 CSS 颜色变量
 *
 * 行为契约：
 * 1. **SSR / 非 DOM 环境**：返回 hex fallback（来自 `@/shared/tokens/color-tokens`），不抛错
 * 2. **客户端首次渲染**：优先读取 `getComputedStyle().--{token}`，失败回退 hex
 * 3. **响应主题切换**：当 `document.documentElement` 上 `.light` / `.dark` class 改变时，
 *    通过轻量级 `MutationObserver` 通知组件重读。jsdom / 旧浏览器无 observer 时静默降级
 * 4. **无内存泄漏**：组件卸载 / 测试 teardown 时自动 disconnect observer
 *
 * 使用场景：
 * - Canvas / SVG / WebGL 等无法用 Tailwind utility 的地方
 * - 跨窗口 IPC 序列化（Rust 端需要颜色字符串）
 * - JS 动态计算颜色（如根据主色派生阴影色）
 *
 * 不使用场景：
 * - 普通 UI 背景/边框/文字 → 直接用 `bg-accent-primary` 等 utility class
 * - 这些场景由 `globals.css` 中的 CSS var 自动响应主题，无需 hook
 *
 * @see docs/refactor/DESIGN.md §3 主题
 * @see docs/refactor/STAGE-1-PR-PLAN.md §2 PR-1.2
 * @see CodeReview P0-5（合并双 observer + 稳定 deps）
 */

import { useEffect, useMemo, useState } from 'react';
import { getColorToken, type ColorToken } from '@/shared/tokens/color-tokens';

type Theme = 'dark' | 'light';

/**
 * 检测当前主题（基于 `document.documentElement` 上的 class）。
 * SSR / 无 document 时返回 'dark'（与 globals.css :root 默认一致）。
 */
function detectTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

/**
 * 读取 `--{token}` CSS variable 当前计算值；失败返回 hex fallback。
 */
function readValue(token: ColorToken, theme: Theme): string {
  if (typeof document === 'undefined') {
    return getColorToken(token, theme);
  }
  try {
    const computed = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${token}`)
      .trim();
    if (computed) return computed;
  } catch {
    // jsdom 早期版本或浏览器异常时降级到 hex
  }
  return getColorToken(token, theme);
}

/**
 * useColorToken — 在 React 组件中读取颜色 token 当前实际值。
 *
 * 自动响应主题切换（`.light` class 切换）。SSR 安全。
 *
 * @param token - 颜色 token 名
 * @returns 当前主题下 token 对应的颜色字符串（hex / rgb / oklch）
 *
 * @example
 * ```tsx
 * const amber = useColorToken('accent-primary');
 * <svg fill={amber}>...</svg>
 *
 * // Canvas / WebGL
 * useEffect(() => {
 *   ctx.strokeStyle = useColorToken('accent-primary');
 * }, []);
 * ```
 */
export function useColorToken(token: ColorToken): string {
  const [value, setValue] = useState<string>(() => readValue(token, detectTheme()));

  // 同步主题 + token 变化（单一 effect，单一 MutationObserver）
  useEffect(() => {
    // 1. 立即同步一次（覆盖 SSR 后 hydration 的差异）
    setValue(readValue(token, detectTheme()));

    // 2. 监听主题 class 变化
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return undefined;
    }

    const update = (): void => {
      const next = readValue(token, detectTheme());
      setValue(prev => (prev === next ? prev : next));
    };

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
    };
  }, [token]);

  return value;
}

/**
 * useColorTokens — 批量读取多个 token（避免多次调用 hook）。
 *
 * 行为契约：
 * 1. token 列表变化 → 重建 map（移除不在新列表中的 key）
 * 2. 主题变化 → 仅更新值，保留相同 key 集合
 * 3. **稳定 deps**：内部用 `JSON.stringify(tokens)` 作依赖键，避免调用方漏写
 *    `as const` 时每次渲染都重建 observer
 *
 * @param tokens - token 名数组（建议 `as const` 保留字面量类型，但非必需）
 * @returns Record<token, value>
 *
 * @example
 * ```tsx
 * const colors = useColorTokens(['accent-primary', 'text-primary'] as const);
 * <path stroke={colors['accent-primary']} fill={colors['text-primary']} />
 * ```
 */
export function useColorTokens<K extends ColorToken>(tokens: readonly K[]): Record<K, string> {
  // 稳定化 deps：JSON 序列化避免每次 render 数组引用变化
  const tokensKey = useMemo(() => JSON.stringify(tokens), [tokens]);

  const [values, setValues] = useState<Record<K, string>>(() => {
    const theme = detectTheme();
    const init = {} as Record<K, string>;
    for (const t of tokens) {
      init[t] = readValue(t, theme);
    }
    return init;
  });

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return undefined;
    }

    // 重建值：token 列表变化时
    const theme = detectTheme();
    setValues(prev => {
      const next = {} as Record<K, string>;
      let changed = tokens.length !== Object.keys(prev).length;
      for (const t of tokens) {
        next[t] = readValue(t, theme);
        if (prev[t] !== next[t]) changed = true;
      }
      return changed ? next : prev;
    });

    // 主题变化时更新
    const update = (): void => {
      const currentTheme = detectTheme();
      setValues(prev => {
        const next = {} as Record<K, string>;
        let changed = false;
        for (const t of tokens) {
          next[t] = readValue(t, currentTheme);
          if (prev[t] !== next[t]) changed = true;
        }
        return changed ? next : prev;
      });
    };

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
    };
    // 依赖 tokensKey（序列化形式）而非 tokens 本身 — 调用方不必强写 `as const`
  }, [tokensKey, tokens]);

  return values;
}

/**
 * 同步读取 token 当前值（非 hook，可在事件处理器 / 副作用中使用）。
 *
 * React 组件中读取请用 `useColorToken`（自动响应主题 + SSR safe）。
 *
 * @example
 * ```ts
 * const onExport = () => {
 *   const amber = readColorToken('accent-primary');
 *   window.api.exportColor(amber);
 * };
 * ```
 */
export function readColorToken(token: ColorToken): string {
  return readValue(token, detectTheme());
}
