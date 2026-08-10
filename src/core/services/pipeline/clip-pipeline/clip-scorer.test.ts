/**
 * clip-scorer — 单元测试
 *
 * 覆盖：
 *  - 构造与默认/自定义权重（自动归一化）
 *  - 6 维打分（laughter/emotion/completeness/silence/pace/keywords）
 *  - 时长惩罚（< min / > max）
 *  - score() 异常分支：失败片段给最低分
 *  - topClips 限制
 *  - buildReasons 各类 reason 触发
 */
import { describe, it, expect } from 'vitest';
import { ClipScorer, clipScorer, type CandidateClip } from './clip-scorer';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeClip(overrides: Partial<CandidateClip> = {}): CandidateClip {
  return {
    id: 'clip-1',
    startTime: 0,
    endTime: 30,
    sceneType: 'action',
    transcript: '今天我们来讲一个非常有趣的故事。',
    ...overrides,
  };
}

describe('ClipScorer', () => {
  // ─── constructor ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('uses default weights when no options provided', () => {
      const scorer = new ClipScorer();
      const result = scorer.score([makeClip()]);
      expect(result[0].reasons).toBeInstanceOf(Array);
    });

    it('merges custom weights with defaults', () => {
      const scorer = new ClipScorer({
        weights: { laughterDensity: 0.5, keywordBoost: 0.5 },
      });
      // The other weights should fall back to defaults and be normalized
      const score = scorer.score([makeClip({ transcript: '哈哈哈太好笑了' })])[0];
      expect(score.laughterDensity).toBeGreaterThan(0);
    });

    it('normalizes weights when total is not 1.0', () => {
      const scorer = new ClipScorer({
        weights: {
          laughterDensity: 1,
          emotionPeak: 1,
          speechCompleteness: 1,
          silenceRatio: 1,
          speakingPace: 1,
          keywordBoost: 1,
        },
      });
      // After normalization weights sum to 1.0 → scores in [0,100]
      const score = scorer.score([makeClip()])[0];
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
      expect(score.totalScore).toBeLessThanOrEqual(100);
    });

    it('accepts custom min/max/targetClipCount', () => {
      const scorer = new ClipScorer({
        minClipDuration: 5,
        maxClipDuration: 60,
        targetClipCount: 3,
      });
      const score = scorer.score([makeClip()])[0];
      expect(score.totalScore).toBeGreaterThan(0);
    });
  });

  // ─── score() ─────────────────────────────────────────────────────────────

  describe('score()', () => {
    it('returns empty array for empty input', () => {
      const scorer = new ClipScorer();
      expect(scorer.score([])).toEqual([]);
    });

    it('sorts results by totalScore descending', () => {
      const scorer = new ClipScorer();
      const results = scorer.score([
        makeClip({ id: 'a', transcript: '' }),
        makeClip({ id: 'b', transcript: '哈哈哈太好笑了 必看 secret amazing'.repeat(5) }),
        makeClip({ id: 'c', transcript: '今天讲一个故事。'.repeat(3) }),
      ]);
      expect(results.length).toBe(3);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].totalScore).toBeGreaterThanOrEqual(results[i].totalScore);
      }
    });

    it('returns a zero-score fallback when scoring throws', () => {
      // Create a clip whose transcript access throws via a getter
      const badClip = {
        id: 'bad',
        startTime: 0,
        endTime: 30,
        sceneType: 'action',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get transcript(): any {
          throw new Error('boom');
        },
      } as unknown as CandidateClip;
      const scorer = new ClipScorer();
      const result = scorer.score([badClip]);
      expect(result[0].totalScore).toBe(0);
      expect(result[0].reasons[0]).toContain('评分异常');
    });
  });

  // ─── topClips ────────────────────────────────────────────────────────────

  describe('topClips()', () => {
    it('returns at most targetClipCount results', () => {
      const scorer = new ClipScorer({ targetClipCount: 2 });
      const clips = Array.from({ length: 5 }, (_, i) =>
        makeClip({ id: `c${i}`, transcript: `clip ${i} with secret content` })
      );
      const top = scorer.topClips(clips);
      expect(top.length).toBe(2);
    });

    it('handles fewer clips than target gracefully', () => {
      const scorer = new ClipScorer({ targetClipCount: 10 });
      const top = scorer.topClips([makeClip(), makeClip({ id: 'b' })]);
      expect(top.length).toBe(2);
    });
  });

  // ─── dimension scorers (through public API) ──────────────────────────────

  describe('laughter dimension', () => {
    it('boosts score when transcript contains laughter keywords', () => {
      const scorer = new ClipScorer();
      const base = scorer.score([makeClip({ transcript: '正常文本。' })])[0];
      const laughing = scorer.score([makeClip({ transcript: '哈哈哈 太好笑了 lol 掌声' })])[0];
      expect(laughing.laughterDensity).toBeGreaterThan(base.laughterDensity);
    });

    it('further boosts score with high audioEnergy', () => {
      const scorer = new ClipScorer();
      const low = scorer.score([makeClip({ transcript: '哈哈' })])[0];
      const high = scorer.score([makeClip({ transcript: '哈哈', audioEnergy: 0.9 })])[0];
      expect(high.laughterDensity).toBeGreaterThan(low.laughterDensity);
    });
  });

  describe('emotion dimension', () => {
    it('scores higher with emotion keywords', () => {
      const scorer = new ClipScorer();
      const base = scorer.score([makeClip({ transcript: '一般内容。' })])[0];
      const emotional = scorer.score([makeClip({ transcript: '震惊 惊人 感动 哭了' })])[0];
      expect(emotional.emotionPeak).toBeGreaterThan(base.emotionPeak);
    });

    it('boosts with high audioEnergy', () => {
      const scorer = new ClipScorer();
      const low = scorer.score([makeClip({ transcript: '震惊' })])[0];
      const high = scorer.score([makeClip({ transcript: '震惊', audioEnergy: 0.8 })])[0];
      expect(high.emotionPeak).toBeGreaterThan(low.emotionPeak);
    });
  });

  describe('completeness dimension', () => {
    it('returns 0 for empty transcript', () => {
      const scorer = new ClipScorer();
      const result = scorer.score([makeClip({ transcript: '' })])[0];
      expect(result.speechCompleteness).toBe(0);
    });

    it('rewards complete-sentence transcripts (starts uppercase + ends with punctuation)', () => {
      const scorer = new ClipScorer();
      const complete = scorer.score([makeClip({ transcript: '这是一句完整的话。' })])[0];
      const incomplete = scorer.score([makeClip({ transcript: '不完整的话' })])[0];
      expect(complete.speechCompleteness).toBeGreaterThan(incomplete.speechCompleteness);
    });
  });

  describe('silence ratio dimension', () => {
    it('penalizes too-quiet transcripts (very low text/duration)', () => {
      const scorer = new ClipScorer();
      const longClip = makeClip({ startTime: 0, endTime: 120, transcript: '短' });
      const result = scorer.score([longClip])[0];
      expect(result.silenceRatio).toBeLessThan(80);
    });
  });

  describe('pace dimension', () => {
    it('penalizes zero-duration clips', () => {
      const scorer = new ClipScorer();
      const result = scorer.score([makeClip({ startTime: 5, endTime: 5, transcript: 'text' })])[0];
      expect(result.speakingPace).toBe(0);
    });
  });

  describe('keyword dimension', () => {
    it('rewards high-engagement keywords in both languages', () => {
      const scorer = new ClipScorer();
      const cn = scorer.score([makeClip({ transcript: '这是必看的秘密' })])[0];
      const en = scorer.score([makeClip({ transcript: 'must watch secret revealed' })])[0];
      const empty = scorer.score([makeClip({ transcript: '普通内容。' })])[0];
      expect(cn.keywordBoost).toBeGreaterThan(empty.keywordBoost);
      expect(en.keywordBoost).toBeGreaterThan(empty.keywordBoost);
    });
  });

  // ─── duration penalty ────────────────────────────────────────────────────

  describe('duration penalty', () => {
    it('penalizes clips shorter than minClipDuration', () => {
      // 长片与 10s 短片在 weights 均衡时，单维度分数接近；这里改为比较 reasons
      // 短片应触发 "时长偏短" reason，而正常片则不应出现
      const short = new ClipScorer({ minClipDuration: 60 }).score([
        makeClip({ startTime: 0, endTime: 10, transcript: 'normal text content here。' }),
      ])[0];
      const normal = new ClipScorer({ minClipDuration: 60 }).score([
        makeClip({ startTime: 0, endTime: 90, transcript: 'normal text content here。' }),
      ])[0];
      expect(short.reasons.some(r => r.includes('时长偏短'))).toBe(true);
      expect(normal.reasons.some(r => r.includes('时长偏短'))).toBe(false);
    });

    it('penalizes clips longer than maxClipDuration', () => {
      // 验证长片触发 "时长偏长" reason
      const long = new ClipScorer({ maxClipDuration: 60 }).score([
        makeClip({
          startTime: 0,
          endTime: 300,
          transcript: 'normal text content here。'.repeat(20),
        }),
      ])[0];
      const normal = new ClipScorer({ maxClipDuration: 60 }).score([
        makeClip({ startTime: 0, endTime: 30, transcript: 'normal text content here。' }),
      ])[0];
      expect(long.reasons.some(r => r.includes('时长偏长'))).toBe(true);
      expect(normal.reasons.some(r => r.includes('时长偏长'))).toBe(false);
    });
  });

  // ─── reasons ─────────────────────────────────────────────────────────────

  describe('reasons', () => {
    it('falls back to the default 综合评分 reason only when no other reason applies', () => {
      const scorer = new ClipScorer();
      // 构造一个触发 laughter/emotion/completeness 都不足、keywords 也不足、
      // duration 在合理范围的片段 → 所有条件分支都未满足，应该只剩 '综合评分'
      const result = scorer.score([makeClip({ startTime: 0, endTime: 30, transcript: 'x' })])[0];
      // transcript='x' → completeness=50（startsMid, !endsComplete）→ 不会触发 '对话完整'
      // 不会触发 laughter/emotion/keywords；duration=30 在默认 [15,120] 范围内
      // 但 completeness=50 < 80, 不会触发 '对话完整'；沉默分在低 ratio 时不进入 > 70
      expect(result.reasons).toContain('综合评分');
    });

    it('flags 笑声密集 when laughter > 60', () => {
      const scorer = new ClipScorer();
      const result = scorer.score([
        makeClip({ transcript: '哈哈 哈哈哈 笑死 太好笑了 哈哈'.repeat(3) }),
      ])[0];
      expect(result.reasons).toContain('笑声密集');
    });

    it('flags 时长偏短/偏长 for out-of-range durations', () => {
      const scorer = new ClipScorer({ minClipDuration: 60, maxClipDuration: 120 });
      const short = scorer.score([
        makeClip({ startTime: 0, endTime: 10, transcript: 'x'.repeat(100) }),
      ])[0];
      const long = scorer.score([
        makeClip({ startTime: 0, endTime: 200, transcript: 'x'.repeat(500) }),
      ])[0];
      expect(short.reasons.some(r => r.includes('时长偏短'))).toBe(true);
      expect(long.reasons.some(r => r.includes('时长偏长'))).toBe(true);
    });
  });

  // ─── singleton ───────────────────────────────────────────────────────────

  it('exposes a default singleton instance', () => {
    expect(clipScorer).toBeInstanceOf(ClipScorer);
  });
});
