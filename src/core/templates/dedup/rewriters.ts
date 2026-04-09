import type { ScriptSegment, ScriptData } from '@/core/types';
import type { DuplicateResult } from './types';
import { SYNONYMS, SENTENCE_PATTERNS, ALTERNATIVE_PHRASES } from './types';

export function mergeSegments(
  segments: ScriptSegment[],
  duplicate: DuplicateResult
): ScriptSegment[] {
  const sourceIndex = segments.findIndex((s) => s.id === duplicate.source.segmentId);
  const targetIndex = segments.findIndex((s) => s.id === duplicate.target.segmentId);

  if (sourceIndex >= 0 && targetIndex >= 0) {
    segments[sourceIndex] = {
      ...segments[sourceIndex],
      content: `${segments[sourceIndex].content} ${segments[targetIndex].content}`,
      endTime: segments[targetIndex].endTime
    };
    segments.splice(targetIndex, 1);
  }

  return segments;
}

export function rewriteSegment(
  segment: ScriptSegment,
  similarity: number,
  autoVariant: boolean,
  variantFn?: (content: string, similarity: number) => { content: string }
): ScriptSegment {
  let content = segment.content ?? '';

  if (autoVariant && variantFn) {
    const result = variantFn(content, similarity);
    content = result.content;
  } else {
    if (similarity >= 0.9) {
      content = completeRewrite(content);
    } else if (similarity >= 0.8) {
      content = majorRewrite(content);
    } else {
      content = minorRewrite(content);
    }
  }

  return {
    ...segment,
    content
  };
}

export function completeRewrite(content: string): string {
  let rewritten = content;

  for (const [word, alternatives] of Object.entries(SYNONYMS)) {
    const regex = new RegExp(word, 'g');
      if (regex.test(rewritten)) {
      const replacement = alternatives[Math.floor(Math.random() * alternatives.length)] ?? word;
      rewritten = rewritten.replace(regex, replacement);
    }
  }

  for (const patterns of Object.values(SENTENCE_PATTERNS)) {
    for (const pattern of patterns) {
      rewritten = rewritten.replace(pattern.from, pattern.to as string);
    }
  }

  return rewritten;
}

export function majorRewrite(content: string): string {
  let rewritten = content;

  for (const [word, alternatives] of Object.entries(SYNONYMS)) {
    const regex = new RegExp(word, 'g');
    if (regex.test(rewritten) && Math.random() > 0.5) {
      const replacement = alternatives[Math.floor(Math.random() * alternatives.length)] ?? word;
      rewritten = rewritten.replace(regex, replacement);
    }
  }

  return rewritten;
}

export function minorRewrite(content: string): string {
  const transitions = ['此外', '同时', '另外', '值得一提的是'];
  const transition = transitions[Math.floor(Math.random() * transitions.length)] ?? '此外';

  if (!content.startsWith(transition)) {
    return `${transition}，${content}`;
  }

  return content;
}

export function replaceTemplatePhrases(segment: ScriptSegment): ScriptSegment {
  let content = segment.content ?? '';

  for (const [category, phrases] of Object.entries(ALTERNATIVE_PHRASES)) {
    const originalPhrases = getOriginalPhrases(category);
    for (const phrase of originalPhrases) {
      if (content.includes(phrase)) {
        const replacement = getAlternativePhrase(category, phrase);
        content = content.replace(phrase, replacement);
      }
    }
  }

  return {
    ...segment,
    content
  };
}

function getOriginalPhrases(category: string): string[] {
  const originals: Record<string, string[]> = {
    intro: [
      '大家好，欢迎来到',
      '今天给大家带来',
      '今天要和大家分享',
      '今天我们要聊的是',
      '最近我发现',
      '今天给大家推荐'
    ],
    transition: [
      '接下来我们看看',
      '那么接下来',
      '说完这个，我们再来看看',
      '不仅如此',
      '更重要的是',
      '除此之外',
      '另外值得一提的是'
    ],
    conclusion: [
      '好了，今天的分享就到这里',
      '以上就是今天的全部内容',
      '希望今天的分享对你有帮助',
      '如果你觉得有用，记得点赞收藏',
      '我们下期再见',
      '感谢大家的观看'
    ],
    emphasis: [
      '非常重要',
      '值得注意的是',
      '关键点在于',
      '这里需要特别注意',
      '这一点很关键',
      '千万不要忽视'
    ],
    subjective: [
      '我觉得',
      '个人认为',
      '在我看来',
      '说实话',
      '老实说',
      '坦白讲',
      '不得不说'
    ]
  };
  return originals[category] || [];
}

function getAlternativePhrase(category: string, original: string): string {
  const alternatives = ALTERNATIVE_PHRASES[category] || [original];
  const filtered = alternatives.filter((a) => a !== original);

  if (filtered.length > 0) {
    return filtered[Math.floor(Math.random() * filtered.length)] ?? original;
  }

  return original;
}

export function generateOriginalityReport(
  script: ScriptData,
  duplicates: DuplicateResult[]
): { score: number; suggestions: string[] } {
  const totalSegments = script.segments.length;
  const duplicateCount = new Set(duplicates.map((d) => d.target.segmentId)).size;
  const score = Math.max(0, 100 - (duplicateCount / totalSegments) * 100);

  const suggestions: string[] = [];

  if (score < 60) {
    suggestions.push('原创性较低，建议大幅修改内容');
  } else if (score < 80) {
    suggestions.push('原创性一般，建议优化重复段落');
  }

  const templateCount = duplicates.filter((d) => d.type === 'template').length;
  if (templateCount > 0) {
    suggestions.push(`检测到 ${templateCount} 处模板化表达，建议使用更原创的语言`);
  }

  const exactCount = duplicates.filter((d) => d.type === 'exact').length;
  if (exactCount > 0) {
    suggestions.push(`检测到 ${exactCount} 处完全重复内容，建议删除或合并`);
  }

  return { score: Math.round(score), suggestions };
}
