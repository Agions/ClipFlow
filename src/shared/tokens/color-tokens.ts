/**
 * 颜色 Token 运行时映射表
 *
 * 真值（CSS custom properties）定义在 `src/styles/globals.css :root` 与 `.light`。
 * 本文件作为：
 *   1. **类型单一可信源**：所有 `ColorToken` 字面量类型在此推断，避免散落定义。
 *   2. **SSR / 非 DOM 环境 fallback**：当 `getComputedStyle` 不可用时（如 Node 端、
 *      Canvas / WebGL 渲染、跨窗口 IPC 序列化），使用本映射的 hex 值。
 *   3. **CI 校验对照表**：`scripts/check-color-tokens.ts`（PR-1.2 同期落地）会
 *      扫描 globals.css 并校验本表覆盖度，禁止出现"CSS 有而 TS 无"或反之。
 *
 * ⚠️ 修改流程：
 *   1. 改 `globals.css` 真值
 *   2. 同步本表 hex
 *   3. 同步 `tailwind.config.ts` utility
 *   4. 更新 `docs/refactor/DESIGN.md` §2.1
 *   5. CI `check-color-tokens` 通过后才允许合入
 *
 * @see docs/refactor/DESIGN.md §2.1
 * @see docs/refactor/STAGE-1-PR-PLAN.md §2 PR-1.2
 */

/**
 * 颜色 Token 字面量联合类型。
 * 新增 token 必须同时更新：`COLOR_TOKENS` 本表 + `globals.css` + `tailwind.config.ts`。
 */
export type ColorToken =
  // ── 背景层（7 阶）──
  | 'bg-base'
  | 'bg-primary'
  | 'bg-secondary'
  | 'bg-tertiary'
  | 'bg-elevated'
  | 'bg-hover'
  | 'bg-active'
  // ── 边框（4 阶）──
  | 'border-subtle'
  | 'border-default'
  | 'border-strong'
  | 'border-active'
  // ── 文字（4 阶）──
  | 'text-primary'
  | 'text-secondary'
  | 'text-tertiary'
  | 'text-disabled'
  // ── 强调色 — 琥珀系（6 个）──
  | 'accent-primary'
  | 'accent-primary-hover'
  | 'accent-primary-dim'
  | 'accent-gold'
  | 'accent-amber'
  | 'accent-warm'
  // ── 功能色（5 类）──
  | 'accent-secondary'
  | 'accent-success'
  | 'accent-warning'
  | 'accent-danger'
  | 'accent-info'
  // ── 时间线（3 类）──
  | 'timeline-video'
  | 'timeline-audio'
  | 'timeline-subtitle';

/**
 * 颜色 Token 映射表（暗色主题 · 默认）。
 *
 * 值与 `src/styles/globals.css :root` 中的 `--{token}` CSS variable 严格一致。
 * 修改时务必同步 CSS 真值。
 */
export const COLOR_TOKENS = {
  // ── 背景层 ──
  'bg-base': '#08080a',
  'bg-primary': '#0c0c0e',
  'bg-secondary': '#111114',
  'bg-tertiary': '#161619',
  'bg-elevated': '#1a1a1e',
  'bg-hover': '#1f1f24',
  'bg-active': '#26262c',

  // ── 边框 ──
  'border-subtle': '#1e1e23',
  'border-default': '#2a2a31',
  'border-strong': '#38383f',
  'border-active': '#4a4a52',

  // ── 文字 ──
  'text-primary': '#f0eee8',
  'text-secondary': '#9a9690',
  'text-tertiary': '#6b6760',
  'text-disabled': '#4a4742',

  // ── 强调色 — 琥珀 ──
  'accent-primary': '#c8956c',
  'accent-primary-hover': '#d4a574',
  'accent-primary-dim': '#8a6848',
  'accent-gold': '#d4a574',
  'accent-amber': '#c49660',
  'accent-warm': '#b8856a',

  // ── 功能色 ──
  'accent-secondary': '#6b8cce',
  'accent-success': '#5a9e6f',
  'accent-warning': '#c49660',
  'accent-danger': '#c75050',
  'accent-info': '#6b8cce',

  // ── 时间线 ──
  'timeline-video': '#8b7ec8',
  'timeline-audio': '#5a9e9e',
  'timeline-subtitle': '#c49660',
} as const satisfies Record<ColorToken, string>;

/**
 * 浅色主题 fallback 映射表。
 *
 * 对应 `globals.css .light` 类下的 token 值。仅在用户显式启用浅色主题时使用。
 * 完整 CSS 主题切换仍走 `useAppStore.setTheme()` → `document.documentElement.classList`。
 */
export const COLOR_TOKENS_LIGHT: Record<ColorToken, string> = {
  'bg-base': '#f7f5f0',
  'bg-primary': '#faf8f4',
  'bg-secondary': '#f0ede6',
  'bg-tertiary': '#e8e4dc',
  'bg-elevated': '#ffffff',
  'bg-hover': '#e2ddd4',
  'bg-active': '#d8d2c8',

  'border-subtle': '#e2ddd4',
  'border-default': '#d0c9bd',
  'border-strong': '#b8b0a2',
  'border-active': '#a0968a',

  'text-primary': '#1a1814',
  'text-secondary': '#6b6560',
  'text-tertiary': '#9a948c',
  'text-disabled': '#b8b0a2',

  'accent-primary': '#a07040',
  'accent-primary-hover': '#b8856a',
  'accent-primary-dim': '#d4b896',
  'accent-gold': '#a07040',
  'accent-amber': '#8a6030',
  'accent-warm': '#b8856a',

  'accent-secondary': '#4a6a9e',
  'accent-success': '#3a7e4f',
  'accent-warning': '#a07040',
  'accent-danger': '#a73030',
  'accent-info': '#4a6a9e',

  'timeline-video': '#6a5e9e',
  'timeline-audio': '#3a7e7e',
  'timeline-subtitle': '#a07040',
};

/**
 * 安全读取 token hex 值。
 *
 * @param token - 颜色 token 名
 * @param theme - 主题（'dark' | 'light'），默认 'dark'
 * @returns 对应主题下的 hex 字符串
 *
 * @example
 * ```ts
 * const amber = getColorToken('accent-primary');
 * // → '#c8956c'
 * ```
 */
export function getColorToken(token: ColorToken, theme: 'dark' | 'light' = 'dark'): string {
  const map = theme === 'light' ? COLOR_TOKENS_LIGHT : COLOR_TOKENS;
  return map[token];
}

/**
 * 将 token 转换为 CSS `var(--xxx)` 字符串（供 `style` 属性 / SVG `fill` 等）。
 *
 * @example
 * ```tsx
 * <div style={{ background: colorTokenToCssVar('accent-primary') }} />
 * // → 'var(--accent-primary)'
 * ```
 */
export function colorTokenToCssVar(token: ColorToken): string {
  return `var(--${token})`;
}

/**
 * 颜色 token 数量（编译时常量）。CI 校验脚本会使用此值确认覆盖率。
 */
export const COLOR_TOKEN_COUNT = Object.keys(COLOR_TOKENS).length;
