/**
 * ClipScorer — 多维评分引擎
 *
 * 对每个候选片段打分，输出排序后的片段列表。
 *
 * 评分维度（6 个信号）：
 *   1. laughter_density    — 笑声/鼓掌密度
 *   2. emotion_peak       — 情感峰值（惊喜/愤怒/兴奋）
 *   3. speech_completeness — 对话完整性（是否被打断）
 *   4. silence_ratio      — 有声占比（过低=纯静音，过高=嘈杂）
 *   5. speaking_pace      — 语速健康度（太快/太慢都要扣分）
 *   6. keyword_boost      — 关键词命中（高 engagement 词）
 *
 * 评分范围：0-100，权重可配置。
 */

import type { VideoAnalysis } from '@/core/types';
import type { Scene } from '@/core/types';

// ============================================================
// Data Types
// ============================================================

export interface CandidateClip {
  id?: string;
  startTime: number;   // 秒
  endTime: number;     // 秒
  duration?: number;   // 秒
  sceneType: string;   // 场景类型标签
  transcript: string; // 原始转录文本
  audioEnergy?: number; // 音频能量（0-1，可选）
}

export interface ClipScore {
  clip: CandidateClip;
  totalScore: number; // 综合分 0-100
  laughterDensity: number;
  emotionPeak: number;
  speechCompleteness: number;
  silenceRatio: number;
  speakingPace: number;
  keywordBoost: number;
  dimensions?: { width: number; height: number };
  reasons: string[]; // 可读原因描述
}

export interface ScorerWeights {
  laughterDensity: number;
  emotionPeak: number;
  speechCompleteness: number;
  silenceRatio: number;
  speakingPace: number;
  keywordBoost: number;
}

export interface ClipScorerOptions {
  weights?: Partial<ScorerWeights>;
  minClipDuration?: number; // 秒，最短片段，默认 15s
  maxClipDuration?: number; // 秒，最长片段，默认 120s
  targetClipCount?: number; // 目标输出片段数，默认 5
}

// ============================================================
// High-Engagement Keywords（需中英双语）
// ============================================================

const HIGH_ENGAGEMENT_KEYWORDS = [
  // 中文
  '必须', '一定', '揭秘', '真相', '秘密', '关键', '重要',
  '竟然', '没想到', '令人震惊', '太惊讶了', '难以置信',
  '第一次', '终于', '终于明白', '后悔', '经验', '建议',
  '推荐', '必看', '干货', '技巧', '秘诀', '窍门',
  '搞笑', '笑死', '太逗了', '绝了', '炸裂', '爆笑',
  '感动', '泪目', '太励志', '热血', '燃', '热血沸腾',
  '冲突', '矛盾', '反转', '意外', '震惊', '崩溃',
  '绝了', '太牛了', '厉害', '佩服', '震撼',
  // English
  'must watch', 'secret', 'truth', 'revealed', 'honest',
  'first time', 'finally', 'regret', 'lesson', 'advice',
  'you won\'t believe', 'shocking', 'amazing', 'incredible',
  'funny', 'laughing', 'hilarious', 'omg', 'wow',
  'emotional', 'touching', 'inspiring', 'motivational',
  'twist', 'plot twist', 'surprising', 'unexpected',
];

// ============================================================
// Scorer
// ============================================================

export class ClipScorer {
  private weights: ScorerWeights;
  private minClipDuration: number;
  private maxClipDuration: number;
  private targetClipCount: number;

  constructor(options: ClipScorerOptions = {}) {
    this.weights = {
      laughterDensity: 0.20,
      emotionPeak: 0.20,
      speechCompleteness: 0.20,
      silenceRatio: 0.10,
      speakingPace: 0.10,
      keywordBoost: 0.20,
      ...options.weights,
    };

    this.minClipDuration = options.minClipDuration ?? 15;
    this.maxClipDuration = options.maxClipDuration ?? 120;
    this.targetClipCount = options.targetClipCount ?? 5;

    // 归一化权重
    const total = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 1.0) > 0.001) {
      for (const k of Object.keys(this.weights) as (keyof ScorerWeights)[]) {
        this.weights[k] /= total;
      }
    }
  }

  /**
   * 对所有候选片段打分
   * @param clips 候选片段列表
   * @returns 按 totalScore 降序排列的 ClipScore 列表
   */
  score(clips: CandidateClip[]): ClipScore[] {
    if (!clips.length) return [];

    const results: ClipScore[] = [];

    for (const clip of clips) {
      try {
        results.push(this.scoreSingle(clip));
      } catch (err) {
        // 失败时给最低分
        results.push({
          clip,
          totalScore: 0,
          laughterDensity: 0,
          emotionPeak: 0,
          speechCompleteness: 0,
          silenceRatio: 0,
          speakingPace: 0,
          keywordBoost: 0,
          reasons: [`评分异常: ${err}`],
        });
      }
    }

    results.sort((a, b) => b.totalScore - a.totalScore);
    return results;
  }

  /**
   * 返回 top N 片段
   */
  topClips(clips: CandidateClip[]): ClipScore[] {
    return this.score(clips).slice(0, this.targetClipCount);
  }

  private scoreSingle(clip: CandidateClip): ClipScore {
    const duration = clip.endTime - clip.startTime;
    const transcript = clip.transcript ?? '';

    const laughterScore = this.scoreLaughter(clip, transcript);
    const emotionScore = this.scoreEmotion(transcript);
    const completenessScore = this.scoreCompleteness(clip, transcript);
    const silenceScore = this.scoreSilenceRatio(clip);
    const paceScore = this.scorePace(transcript, duration);
    const keywordScore = this.scoreKeywords(transcript);

    const total =
      laughterScore * this.weights.laughterDensity +
      emotionScore * this.weights.emotionPeak +
      completenessScore * this.weights.speechCompleteness +
      silenceScore * this.weights.silenceRatio +
      paceScore * this.weights.speakingPace +
      keywordScore * this.weights.keywordBoost;

    // 时长惩罚
    let finalScore = total;
    if (duration < this.minClipDuration) {
      finalScore *= 0.7;
    } else if (duration > this.maxClipDuration) {
      finalScore *= 0.85;
    }

    const reasons = this.buildReasons(
      laughterScore, emotionScore, completenessScore,
      silenceScore, paceScore, keywordScore,
      transcript, duration,
    );

    return {
      clip,
      totalScore: Math.round(finalScore * 100) / 100,
      laughterDensity: Math.round(laughterScore * 100) / 100,
      emotionPeak: Math.round(emotionScore * 100) / 100,
      speechCompleteness: Math.round(completenessScore * 100) / 100,
      silenceRatio: Math.round(silenceScore * 100) / 100,
      speakingPace: Math.round(paceScore * 100) / 100,
      keywordBoost: Math.round(keywordScore * 100) / 100,
      reasons,
    };
  }

  // --------------------------------------------------------
  // Dimension Scorers
  // --------------------------------------------------------

  private scoreLaughter(_clip: CandidateClip, transcript: string): number {
    const lc = transcript.toLowerCase();
    const laughWords = ['笑', '哈哈', 'laughter', 'laughing', 'haha', 'lol', '掌声', 'applause'];
    const laughCount = laughWords.reduce((sum, kw) => sum + (lc.includes(kw) ? 1 : 0), 0);
    const duration = _clip.endTime - _clip.startTime;
    const density = laughCount / Math.max(duration / 60, 1);
    // 基准：每分钟 2 次笑声 = 60 分
    return Math.min(100, (density / 2.0) * 60);
  }

  private scoreEmotion(transcript: string): number {
    const emotionKeywords = [
      '震惊', '惊讶', '惊人', '不敢相信', 'wow', 'omg', 'shocking',
      '愤怒', '生气', '气死我了', 'angry', 'furious',
      '兴奋', '太棒了', '激动', 'amazing', 'incredible', 'exciting',
      '搞笑', '笑死', '太逗', 'hilarious', 'funny',
      '感动', '泪目', '心疼', 'touching', 'emotional',
      '绝了', '太牛了', '厉害', '佩服', '震撼',
    ];
    const hits = emotionKeywords.reduce((sum, kw) => sum + (transcript.includes(kw) ? 1 : 0), 0);
    return Math.min(100, hits * 20);
  }

  private scoreCompleteness(_clip: CandidateClip, transcript: string): number {
    if (!transcript.trim()) return 0;
    const startsMid = /^[a-z]/.test(transcript);
    const endsComplete = /[。！？.!？]$/.test(transcript.trim());
    let score = 50;
    if (!startsMid) score += 25;
    if (endsComplete) score += 25;
    return score;
  }

  private scoreSilenceRatio(clip: CandidateClip): number {
    const duration = clip.endTime - clip.startTime;
    const transcriptLen = (clip.transcript ?? '').length;
    // 正常说话速度约 150 字/分钟
    const expectedChars = (duration / 60) * 150;
    const ratio = Math.min(transcriptLen / Math.max(expectedChars, 1), 2.0);

    if (ratio < 0.3) return (ratio / 0.3) * 40;
    if (ratio > 1.5) return Math.max(0, 100 - (ratio - 1.5) / 0.5 * 30);
    return 70 + Math.min(30, ((ratio - 0.3) / 1.2) * 30);
  }

  private scorePace(transcript: string, duration: number): number {
    if (duration === 0) return 0;
    const charsPerMin = (transcript.length / duration) * 60;
    if (charsPerMin >= 100 && charsPerMin <= 200) return 80;
    if (charsPerMin < 100) return Math.max(0, (charsPerMin / 100) * 50);
    return Math.max(0, 80 - ((charsPerMin - 200) / 100) * 40);
  }

  private scoreKeywords(transcript: string): number {
    const textLower = transcript.toLowerCase();
    const hits = HIGH_ENGAGEMENT_KEYWORDS.filter(kw =>
      textLower.includes(kw.toLowerCase())
    ).length;
    return Math.min(100, hits * 15);
  }

  private buildReasons(
    laughter: number, emotion: number, completeness: number,
    silence: number, pace: number, keywords: number,
    transcript: string, duration: number,
  ): string[] {
    const reasons: string[] = [];
    if (laughter > 60) reasons.push('笑声密集');
    if (emotion > 60) reasons.push('情感充沛');
    if (completeness > 80) reasons.push('对话完整');
    if (keywords > 30) reasons.push('高吸引力关键词');
    if (silence > 70) reasons.push('声音清晰');
    if (duration < this.minClipDuration) reasons.push(`时长偏短(${Math.round(duration)}s)`);
    else if (duration > this.maxClipDuration) reasons.push(`时长偏长(${Math.round(duration)}s)`);
    if (reasons.length === 0) reasons.push('综合评分');
    return reasons;
  }
}

export const clipScorer = new ClipScorer();
export default clipScorer;
