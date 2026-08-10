/**
 * Transition Suggestion Engine — 单元测试
 *
 * 覆盖：
 * - suggestTransition 单段推荐
 * - suggestTransitions 批量推荐
 * - findRule / findRuleByType 查询
 */

import { describe, it, expect } from 'vitest';
import {
  suggestTransition,
  suggestTransitions,
  findRule,
  findRuleByType,
} from './transition-suggestion';
import type { SmartVideoSegment } from '@/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function segment(overrides: Partial<SmartVideoSegment> = {}): SmartVideoSegment {
  return {
    startMs: 0,
    endMs: 5000,
    durationMs: 5000,
    segmentType: 'content',
    confidence: 0.8,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('suggestTransition', () => {
  it('returns dissolve for scene change', () => {
    const s = suggestTransition(segment({ isSceneChange: true }));
    expect(s.type).toBe('dissolve');
    expect(s.confidence).toBeGreaterThan(0);
  });

  it('returns glitch for scene change with action', () => {
    const s = suggestTransition(
      segment({ segmentType: 'action', isSceneChange: true }),
      segment({ segmentType: 'action' })
    );
    expect(s.type).toBe('glitch');
  });

  it('uses rule matrix for prev->curr', () => {
    const prev = segment({ segmentType: 'dialogue' });
    const curr = segment({ segmentType: 'action' });
    const s = suggestTransition(curr, prev);
    expect(s.type).toBe('wipe');
  });

  it('falls back to content default when no rule matches', () => {
    const curr = segment({ segmentType: 'content' });
    const s = suggestTransition(curr);
    expect(s.type).toBe('dissolve');
  });

  it('adjusts duration for short segments', () => {
    const short = segment({ durationMs: 2000 });
    const s = suggestTransition(short);
    expect(s.duration).toBe(250);
  });

  it('adjusts duration for long segments', () => {
    const long = segment({ durationMs: 20000 });
    const s = suggestTransition(long);
    expect(s.duration).toBe(600);
  });
});

describe('suggestTransitions', () => {
  it('returns empty array for empty input', () => {
    expect(suggestTransitions([])).toEqual([]);
  });

  it('maps over segments and attaches suggestedTransition', () => {
    const segs = [segment({ segmentType: 'action' }), segment({ segmentType: 'dialogue' })];
    const result = suggestTransitions(segs);
    expect(result).toHaveLength(2);
    expect(result[0].suggestedTransition).toBeDefined();
    expect(result[1].suggestedTransition).toBeDefined();
  });
});

describe('findRule', () => {
  it('returns rule for known prev->curr', () => {
    const rule = findRule('action', 'dialogue');
    expect(rule).not.toBeNull();
    expect(rule?.type).toBe('fade');
  });

  it('returns null for unknown pair', () => {
    expect(findRule('unknown', 'unknown')).toBeNull();
  });
});

describe('findRuleByType', () => {
  it('returns first rule matching type', () => {
    const hit = findRuleByType('wipe');
    expect(hit).not.toBeNull();
    expect(hit?.rule.type).toBe('wipe');
  });

  it('returns null for unknown type', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(findRuleByType('nonexistent' as any)).toBeNull();
  });

  it('returns first rule when multiple rules share a type', () => {
    // 'fade' appears in multiple rules; verify we always get a defined entry.
    const hit = findRuleByType('fade');
    expect(hit).not.toBeNull();
    expect(hit?.rule.type).toBe('fade');
    expect(hit?.key).toMatch(/->.+$/);
  });
});

// ── Edge case coverage for branch matrix ────────────────────────────────────

describe('suggestTransition — scene change branches', () => {
  it('uses dissolve for transition-type segment in scene change (curr)', () => {
    const s = suggestTransition(segment({ segmentType: 'transition', isSceneChange: true }));
    expect(s.type).toBe('dissolve');
    expect(s.confidence).toBe(0.85);
    expect(s.reason).toContain('transition');
  });

  it('uses dissolve for transition-type segment in scene change (prev)', () => {
    // 前片段是 transition、当前是 content 但 isSceneChange=true。
    const prev = segment({ segmentType: 'transition' });
    const curr = segment({ segmentType: 'content', isSceneChange: true });
    const s = suggestTransition(curr, prev);
    expect(s.type).toBe('dissolve');
    expect(s.confidence).toBe(0.85);
  });
});

describe('suggestTransition — switch fallback (no rule match)', () => {
  // 同时让 RULE_MATRIX[key] 拿不到、且 ct 命中某个 case，
  // 验证 line 128 (rule falsy) 和 lines 133-144 (switch 各 case)。
  // 通过给 prev 一个非标准化类型（如 'reaction'），组合 `reaction->action` 不在矩阵中。

  it('switch case "action": no rule match → wipe', () => {
    const prev = segment({ segmentType: 'reaction' });
    const curr = segment({ segmentType: 'action' });
    const s = suggestTransition(curr, prev);
    expect(s.type).toBe('wipe');
    expect(s.confidence).toBe(0.7);
  });

  it('switch case "dialogue": no rule match → fade', () => {
    const prev = segment({ segmentType: 'reaction' });
    const curr = segment({ segmentType: 'dialogue' });
    const s = suggestTransition(curr, prev);
    expect(s.type).toBe('fade');
    expect(s.confidence).toBe(0.68);
  });

  it('switch case "silence": no rule match → fade', () => {
    const prev = segment({ segmentType: 'reaction' });
    const curr = segment({ segmentType: 'silence' });
    const s = suggestTransition(curr, prev);
    expect(s.type).toBe('fade');
    expect(s.confidence).toBe(0.65);
  });

  it('switch case "transition": no rule match → fade', () => {
    const prev = segment({ segmentType: 'reaction' });
    const curr = segment({ segmentType: 'transition' });
    const s = suggestTransition(curr, prev);
    expect(s.type).toBe('fade');
    expect(s.confidence).toBe(0.6);
  });

  it('switch case "content": no rule match → dissolve', () => {
    // prev='reaction' (non-standard)、curr='content' 时 key='reaction->content'
    // 不在 RULE_MATRIX 中，必须通过 switch 的 content case 兜底。
    const prev = segment({ segmentType: 'reaction' });
    const curr = segment({ segmentType: 'content' });
    const s = suggestTransition(curr, prev);
    expect(s.type).toBe('dissolve');
    expect(s.confidence).toBe(0.55);
  });

  it('switch default case: unrecognized curr type → dissolve', () => {
    const prev = segment({ segmentType: 'reaction' });
    const curr = segment({ segmentType: 'unknown_typo' });
    const s = suggestTransition(curr, prev);
    expect(s.type).toBe('dissolve');
    expect(s.confidence).toBe(0.55);
  });

  it('switch default case: prev=null is normalized to "unknown", still hits default', () => {
    const curr = segment({ segmentType: 'mystery' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = suggestTransition(curr, null as any);
    expect(s.type).toBe('dissolve');
  });
});

describe('suggestTransition — duration via endMs-startMs fallback', () => {
  it('returns short duration when durationMs undefined but segment is short', () => {
    const short = segment({ startMs: 0, endMs: 2000, durationMs: undefined as unknown as number });
    const s = suggestTransition(short);
    expect(s.duration).toBe(250);
  });

  it('returns long duration when durationMs undefined but segment is long', () => {
    const long = segment({ startMs: 0, endMs: 20_000, durationMs: undefined as unknown as number });
    const s = suggestTransition(long);
    expect(s.duration).toBe(600);
  });

  it('returns default duration when durationMs undefined and segment length is medium', () => {
    const medium = segment({
      startMs: 0,
      endMs: 5_000,
      durationMs: undefined as unknown as number,
    });
    const s = suggestTransition(medium);
    expect(s.duration).toBe(400);
  });
});

describe('normType — normalization edge cases', () => {
  // 通过 suggestTransition 的 prev 参数间接验证：

  it('normalizes prev.segmentType with uppercase and whitespace', () => {
    // RULE_MATRIX 查 "ACTION->ACTION"，归一化后命中。
    const prev = segment({ segmentType: '  ACTION  ' as unknown as string });
    const curr = segment({ segmentType: 'action' });
    const s = suggestTransition(curr, prev);
    // 'action->action' in matrix → slide, confidence 0.85
    expect(s.type).toBe('slide');
    expect(s.confidence).toBe(0.85);
  });

  it('treats empty segmentType as "content"', () => {
    // prev 归一化为 'content'，key = 'content->content'，命中规则 dissolve。
    const prev = segment({ segmentType: '' as unknown as string });
    const curr = segment({ segmentType: 'content' });
    const s = suggestTransition(curr, prev);
    expect(s.type).toBe('dissolve');
  });
});

describe('suggestTransitions — additional paths', () => {
  it('returns empty for non-array input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(suggestTransitions(null as any)).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(suggestTransitions(undefined as any)).toEqual([]);
  });

  it('attaches next-pointer for each non-tail segment', () => {
    // 内部把 next 传给 suggestTransition，未来扩展 curr→next 规则时使用；
    // 当前实现以 void next 引用。验证不会因为 next 引用导致行为异常。
    const segs = [
      segment({ segmentType: 'silence' }),
      segment({ segmentType: 'dialogue' }),
      segment({ segmentType: 'action' }),
    ];
    const result = suggestTransitions(segs);
    expect(result).toHaveLength(3);
    result.forEach(r => {
      expect(r.suggestedTransition).toBeDefined();
      expect(typeof r.suggestedTransition?.type).toBe('string');
    });
  });
});
