/**
 * cn — 单元测试（clsx + tailwind-merge 组合）
 */
import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('merges string classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters falsy values', () => {
    expect(cn('foo', false, null, undefined, 0, '', 'bar')).toBe('foo bar');
  });

  it('handles object form (clsx)', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('handles array form (clsx)', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('lets later tailwind class win (twMerge)', () => {
    // twMerge 保留最后一个相同 utility 类
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('returns empty string when no inputs', () => {
    expect(cn()).toBe('');
  });
});
