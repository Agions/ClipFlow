/**
 * 尺寸 Token 运行时映射表
 *
 * 适用：组件高度、宽度、图标尺寸等结构性尺寸。
 * 替代 Tailwind 硬编码（如 `h-6`, `w-8`, `size-4`）以建立统一语义。
 *
 * 真值（CSS custom properties）定义在 `src/styles/globals.css :root`。
 * 本文件作为：
 *  1. 类型单一可信源：`SizeToken` 字面量联合类型
 *  2. SSR / 非 DOM 环境 fallback：`SIZE_TOKENS` 提供 px 数值
 *  3. CI 校验对照表：`scripts/check-color-tokens.ts` 扩展校验
 *
 * ⚠️ 修改流程同 color-tokens.ts（见该文件 §注释）。
 *
 * @see docs/refactor/DESIGN.md §2.2
 * @see docs/refactor/STAGE-1-PR-PLAN.md §3 PR-1.8
 */

/**
 * 控制尺寸 token（按钮、输入框等交互控件高度）。
 *
 * - `control-xs`: 24px — Tag、紧凑 chip
 * - `control-sm`: 28px — 紧凑按钮、小输入框
 * - `control-md`: 32px — **默认按钮**、输入框
 * - `control-lg`: 40px — 大型 CTA、Hero 按钮
 * - `control-xl`: 48px — 巨型操作（如录制、确认）
 */
export type ControlSizeToken =
  | 'control-xs'
  | 'control-sm'
  | 'control-md'
  | 'control-lg'
  | 'control-xl';

/**
 * 通用尺寸 token（方形组件 / 图标）。
 *
 * - `icon-xs`: 12px — 内联微小图标
 * - `icon-sm`: 16px — 表单字段图标
 * - `icon-md`: 20px — **默认图标**
 * - `icon-lg`: 24px — 大型图标
 * - `spin-sm`: 16px — 小 spinner
 * - `spin-md`: 24px — **默认 spinner**
 * - `spin-lg`: 32px — 大型 spinner（全屏 loading）
 */
export type SizeToken =
  | ControlSizeToken
  | 'icon-xs'
  | 'icon-sm'
  | 'icon-md'
  | 'icon-lg'
  | 'spin-sm'
  | 'spin-md'
  | 'spin-lg';

/**
 * 尺寸 Token 映射表。
 *
 * 值与 `globals.css :root` 中 `--size-{token}` CSS variable 严格一致。
 */
export const SIZE_TOKENS: Record<SizeToken, number> = {
  // control
  'control-xs': 24,
  'control-sm': 28,
  'control-md': 32,
  'control-lg': 40,
  'control-xl': 48,
  // icon
  'icon-xs': 12,
  'icon-sm': 16,
  'icon-md': 20,
  'icon-lg': 24,
  // spin
  'spin-sm': 16,
  'spin-md': 24,
  'spin-lg': 32,
};

/**
 * 安全读取尺寸 token px 值。
 *
 * @param token - 尺寸 token 名
 * @returns px 数值（number）
 *
 * @example
 * ```ts
 * getSizeToken('control-md'); // → 32
 * getSizeToken('spin-lg');    // → 32
 * ```
 */
export function getSizeToken(token: SizeToken): number {
  return SIZE_TOKENS[token];
}

/**
 * 将尺寸 token 转换为 CSS var 字符串（供内联 style / SVG 属性）。
 *
 * @example
 * ```tsx
 * <div style={{ height: sizeTokenToCssVar('control-md') }} />
 * // → 'var(--size-control-md)'
 * ```
 */
export function sizeTokenToCssVar(token: SizeToken): string {
  return `var(--size-${token})`;
}

/**
 * 尺寸 token 数量（编译时常量）。
 */
export const SIZE_TOKEN_COUNT = Object.keys(SIZE_TOKENS).length;
