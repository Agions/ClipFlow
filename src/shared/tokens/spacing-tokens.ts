/**
 * 间距 Token 映射表
 *
 * 4px 基准网格阶梯，与 `src/styles/globals.css :root --space-*` 严格一致。
 *
 * @see docs/refactor/DESIGN.md §2.2
 * @see docs/refactor/STAGE-1-PR-PLAN.md §2 PR-1.2
 */

export type SpacingToken =
  | 'space-1' // 4px
  | 'space-2' // 8px
  | 'space-3' // 12px
  | 'space-4' // 16px — 默认容器内边距
  | 'space-5' // 20px
  | 'space-6' // 24px — Section 内边距
  | 'space-8' // 32px — 区块间距
  | 'space-10' // 40px
  | 'space-12' // 48px — Hero 区
  | 'space-16'; // 64px — 大型分隔

/**
 * 间距 Token 映射表（像素值）。
 *
 * 4 倍倍数体系；禁止 5px / 7px / 9px 等"非 4 倍数"间距。
 * 修改需同步 `globals.css` 真值 + `tailwind.config.ts`。
 */
export const SPACING_TOKENS = {
  'space-1': 4,
  'space-2': 8,
  'space-3': 12,
  'space-4': 16,
  'space-5': 20,
  'space-6': 24,
  'space-8': 32,
  'space-10': 40,
  'space-12': 48,
  'space-16': 64,
} as const satisfies Record<SpacingToken, number>;

/**
 * 安全读取间距值（返回 number，单位 px）。
 *
 * @param token - 间距 token
 * @returns 像素值（number）
 *
 * @example
 * ```ts
 * const gap = getSpacingToken('space-4');
 * // → 16
 * ```
 */
export function getSpacingToken(token: SpacingToken): number {
  return SPACING_TOKENS[token];
}

/**
 * 间距 token 数量。
 */
export const SPACING_TOKEN_COUNT = Object.keys(SPACING_TOKENS).length;
