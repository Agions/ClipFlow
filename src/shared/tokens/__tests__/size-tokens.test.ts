/**
 * shared/tokens/size-tokens 测试
 *
 * 覆盖：
 *  - 14 个 size token（5 control + 4 icon + 3 spin + 2 其它）
 *  - SIZE_TOKEN_COUNT 一致
 *  - 所有 token 返回正整数 px 值
 *  - sizeTokenToCssVar 返回 `var(--size-{token})`
 *  - design contract 快照（防止意外改动）
 */
import { describe, it, expect } from 'vitest';
import { SIZE_TOKENS, SIZE_TOKEN_COUNT, getSizeToken, sizeTokenToCssVar } from '../size-tokens';

describe('SIZE_TOKENS', () => {
  it('count 等于 12（5 control + 4 icon + 3 spin）', () => {
    expect(SIZE_TOKEN_COUNT).toBe(12);
    expect(Object.keys(SIZE_TOKENS)).toHaveLength(12);
  });

  it('所有 token 值均为正整数 px', () => {
    Object.entries(SIZE_TOKENS).forEach(([name, value]) => {
      expect(typeof value, `token "${name}"`).toBe('number');
      expect(Number.isInteger(value), `token "${name}"`).toBe(true);
      expect(value, `token "${name}"`).toBeGreaterThan(0);
      expect(value, `token "${name}"`).toBeLessThan(200);
    });
  });

  it('control 体系从 xs → xl 单调递增（24/28/32/40/48）', () => {
    expect(SIZE_TOKENS['control-xs']).toBe(24);
    expect(SIZE_TOKENS['control-sm']).toBe(28);
    expect(SIZE_TOKENS['control-md']).toBe(32);
    expect(SIZE_TOKENS['control-lg']).toBe(40);
    expect(SIZE_TOKENS['control-xl']).toBe(48);
  });

  it('icon 体系从 xs → lg 单调递增（12/16/20/24）', () => {
    expect(SIZE_TOKENS['icon-xs']).toBe(12);
    expect(SIZE_TOKENS['icon-sm']).toBe(16);
    expect(SIZE_TOKENS['icon-md']).toBe(20);
    expect(SIZE_TOKENS['icon-lg']).toBe(24);
  });

  it('spin 体系从 sm → lg 单调递增（16/24/32）', () => {
    expect(SIZE_TOKENS['spin-sm']).toBe(16);
    expect(SIZE_TOKENS['spin-md']).toBe(24);
    expect(SIZE_TOKENS['spin-lg']).toBe(32);
  });

  it('design contract 快照（防止意外改动）', () => {
    expect(SIZE_TOKENS).toEqual({
      'control-xs': 24,
      'control-sm': 28,
      'control-md': 32,
      'control-lg': 40,
      'control-xl': 48,
      'icon-xs': 12,
      'icon-sm': 16,
      'icon-md': 20,
      'icon-lg': 24,
      'spin-sm': 16,
      'spin-md': 24,
      'spin-lg': 32,
    });
  });
});

describe('getSizeToken', () => {
  it('按 token 名返回 px number', () => {
    expect(getSizeToken('control-md')).toBe(32);
    expect(getSizeToken('spin-lg')).toBe(32);
    expect(getSizeToken('icon-xs')).toBe(12);
  });
});

describe('sizeTokenToCssVar', () => {
  it('返回 var(--size-{token}) 字符串', () => {
    expect(sizeTokenToCssVar('control-md')).toBe('var(--size-control-md)');
    expect(sizeTokenToCssVar('spin-lg')).toBe('var(--size-spin-lg)');
  });

  it('生成的字符串可被 React 直接使用', () => {
    // 模拟 React 风格的用法（虽然测试不渲染 DOM）
    const cssVar = sizeTokenToCssVar('icon-sm');
    expect(cssVar.startsWith('var(--')).toBe(true);
    expect(cssVar.endsWith(')')).toBe(true);
  });
});
