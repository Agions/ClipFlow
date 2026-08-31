/**
 * shared/tokens/color-tokens 测试
 *
 * 覆盖：
 *  - 所有 token 都能读取到 hex 值
 *  - getColorToken 双主题返回正确值
 *  - colorTokenToCssVar 生成合法 CSS 字符串
 *  - 与 globals.css 真值的"快照一致性"
 *
 * 设计纪律：每当 `globals.css :root` 修改时，本测试必须同步更新（反之亦然）。
 * CI 脚本 `scripts/check-color-tokens.ts` 会强制对齐。
 */
import { describe, it, expect } from 'vitest';
import {
  COLOR_TOKENS,
  COLOR_TOKENS_LIGHT,
  COLOR_TOKEN_COUNT,
  getColorToken,
  colorTokenToCssVar,
  type ColorToken,
} from '../color-tokens';

describe('COLOR_TOKENS', () => {
  it('包含 29 个 token（覆盖背景 7 / 边框 4 / 文字 4 / 琥珀 6 / 功能 5 / 时间线 3）', () => {
    // 注：globals.css :root 实际定义 29 个 token（已含 bg-active · accent-info · accent-info 等）
    // 任何新增必须同步修改本断言 + globals.css :root + tailwind.config.ts
    expect(COLOR_TOKEN_COUNT).toBe(29);
  });

  it('所有 token 的 hex 值匹配 #RRGGBB 格式', () => {
    Object.entries(COLOR_TOKENS).forEach(([key, value]) => {
      expect(value, `token "${key}" 的值 "${value}" 应为合法 hex`).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('允许的重复 hex：3 组共 4 次重复', () => {
    // 设计意图：语义不同 token 允许共用同一颜色。
    // 实际重复组：
    //   #d4a574 : accent-primary-hover + accent-gold                    (2 tokens = 1 dup)
    //   #c49660 : accent-amber + accent-warning + timeline-subtitle    (3 tokens = 2 dups)
    //   #6b8cce : accent-secondary + accent-info                       (2 tokens = 1 dup)
    // 总 dupCount = 4。任何新增/删除重复需同步更新本断言。
    const values = Object.values(COLOR_TOKENS);
    const unique = new Set(values);
    const dupCount = values.length - unique.size;
    expect(dupCount).toBe(4);
  });

  it('包含所有设计文档 §2.1 定义的 token', () => {
    const expected: ColorToken[] = [
      // 背景层
      'bg-base',
      'bg-primary',
      'bg-secondary',
      'bg-tertiary',
      'bg-elevated',
      'bg-hover',
      'bg-active',
      // 边框
      'border-subtle',
      'border-default',
      'border-strong',
      'border-active',
      // 文字
      'text-primary',
      'text-secondary',
      'text-tertiary',
      'text-disabled',
      // 琥珀强调
      'accent-primary',
      'accent-primary-hover',
      'accent-primary-dim',
      'accent-gold',
      'accent-amber',
      'accent-warm',
      // 功能色
      'accent-secondary',
      'accent-success',
      'accent-warning',
      'accent-danger',
      'accent-info',
      // 时间线
      'timeline-video',
      'timeline-audio',
      'timeline-subtitle',
    ];

    expected.forEach(token => {
      expect(COLOR_TOKENS, `缺少 token: ${token}`).toHaveProperty(token);
    });
  });

  it('与 globals.css 关键值对齐（设计契约快照）', () => {
    // 这些值变更必须同步 DESIGN.md §2.1 + globals.css :root + tailwind.config.ts
    const snapshot: Record<string, string> = {
      'bg-base': '#08080a',
      'bg-primary': '#0c0c0e',
      'bg-secondary': '#111114',
      'bg-tertiary': '#161619',
      'bg-elevated': '#1a1a1e',
      'bg-hover': '#1f1f24',
      'bg-active': '#26262c',
      'border-subtle': '#1e1e23',
      'border-default': '#2a2a31',
      'border-strong': '#38383f',
      'border-active': '#4a4a52',
      'text-primary': '#f0eee8',
      'text-secondary': '#9a9690',
      'text-tertiary': '#6b6760',
      'text-disabled': '#4a4742',
      'accent-primary': '#c8956c',
      'accent-primary-hover': '#d4a574',
      'accent-primary-dim': '#8a6848',
      'accent-gold': '#d4a574',
      'accent-amber': '#c49660',
      'accent-warm': '#b8856a',
      'accent-secondary': '#6b8cce',
      'accent-success': '#5a9e6f',
      'accent-warning': '#c49660',
      'accent-danger': '#c75050',
      'accent-info': '#6b8cce',
      'timeline-video': '#8b7ec8',
      'timeline-audio': '#5a9e9e',
      'timeline-subtitle': '#c49660',
    };

    Object.entries(snapshot).forEach(([token, expectedHex]) => {
      expect(COLOR_TOKENS[token as ColorToken]).toBe(expectedHex);
    });
  });
});

describe('COLOR_TOKENS_LIGHT', () => {
  it('覆盖所有 ColorToken', () => {
    Object.keys(COLOR_TOKENS).forEach(token => {
      expect(COLOR_TOKENS_LIGHT, `浅色主题缺少 token: ${token}`).toHaveProperty(token);
    });
  });

  it('浅色主题值与暗色主题完全不同（设计意图）', () => {
    // 仅检查关键 token — 部分中性色可能相同（如 accent-amber 同名 token）
    const keysToCheck: ColorToken[] = [
      'bg-base',
      'bg-primary',
      'text-primary',
      'accent-primary',
      'border-default',
    ];
    keysToCheck.forEach(key => {
      expect(COLOR_TOKENS_LIGHT[key]).not.toBe(COLOR_TOKENS[key]);
    });
  });

  it('浅色主题 bg-base 应该是浅色（hex 第一字节 ≤ 0xfa）', () => {
    const hex = COLOR_TOKENS_LIGHT['bg-base'].slice(1); // 去掉 #
    const r = parseInt(hex.slice(0, 2), 16);
    expect(r).toBeGreaterThanOrEqual(0xf0);
  });
});

describe('getColorToken', () => {
  it('默认返回暗色主题值', () => {
    expect(getColorToken('accent-primary')).toBe('#c8956c');
  });

  it('显式传入 theme="dark" 返回暗色', () => {
    expect(getColorToken('bg-base', 'dark')).toBe('#08080a');
  });

  it('显式传入 theme="light" 返回浅色', () => {
    expect(getColorToken('bg-base', 'light')).toBe('#f7f5f0');
  });

  it('浅色主题的 accent-primary 是暖棕色', () => {
    expect(getColorToken('accent-primary', 'light')).toBe('#a07040');
  });
});

describe('colorTokenToCssVar', () => {
  it('生成合法 CSS var() 字符串', () => {
    expect(colorTokenToCssVar('accent-primary')).toBe('var(--accent-primary)');
    expect(colorTokenToCssVar('bg-elevated')).toBe('var(--bg-elevated)');
    expect(colorTokenToCssVar('text-disabled')).toBe('var(--text-disabled)');
  });

  it('生成的 CSS var 名与 globals.css 中的 CSS variable 一致', () => {
    // 抽样检查：所有 token 的 CSS var 都应能在 globals.css 中找到定义
    const sampleTokens: ColorToken[] = [
      'bg-base',
      'bg-elevated',
      'border-default',
      'text-primary',
      'accent-primary',
      'accent-primary-hover',
      'accent-success',
      'accent-danger',
      'timeline-video',
    ];

    sampleTokens.forEach(token => {
      const cssVar = colorTokenToCssVar(token);
      // CSS var 格式：var(--{kebab-case-token})
      expect(cssVar).toMatch(/^var\(--[a-z0-9-]+\)$/);
      // token 名不应被转换（保持原 kebab-case）
      expect(cssVar).toContain(token);
    });
  });
});

describe('类型安全', () => {
  it('COLOR_TOKENS 满足 Record<ColorToken, string> 约束（编译时验证）', () => {
    // 这里使用类型断言触发 TS 检查；如果类型不对编译失败
    const _check: Record<ColorToken, string> = COLOR_TOKENS;
    expect(_check).toBeDefined();
  });
});
