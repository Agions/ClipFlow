import type { ScriptSegment } from '@/core/types';
import type { DuplicateResult, DedupConfig } from './types';
import { COMMON_PHRASES, SYNONYMS, SENTENCE_PATTERNS } from './types';

export function detectExactDuplicates(
  segments: ScriptSegment[],
  normalizeText: (text: string) => string
): DuplicateResult[] {
  const duplicates: DuplicateResult[] = [];
  const contentMap = new Map<string, string>();

  for (const segment of segments) {
    if (segment.content == null) continue;
    const normalized = normalizeText(segment.content);

    if (contentMap.has(normalized)) {
      const existingId = contentMap.get(normalized)!;
      const existing = segments.find((s) => s.id === existingId)!;

      duplicates.push({
        id: `dup_exact_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'exact',
        source: {
          segmentId: existing.id,
          content: existing.content,
          startTime: existing.startTime
        },
        target: {
          segmentId: segment.id,
          content: segment.content,
          startTime: segment.startTime
        },
        similarity: 1.0,
        suggestion: '内容完全重复，建议删除或合并'
      });
    } else {
      contentMap.set(normalized, segment.id);
    }
  }

  return duplicates;
}

export function detectSemanticDuplicates(
  segments: ScriptSegment[],
  threshold: number,
  calculateSimilarity: (text1: string, text2: string) => number
): DuplicateResult[] {
  const duplicates: DuplicateResult[] = [];

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      if (segments[i].content == null || segments[j].content == null) continue;
      const similarity = calculateSimilarity(segments[i].content, segments[j].content);

      if (similarity >= threshold) {
        duplicates.push({
          id: `dup_semantic_${Date.now()}_${i}_${j}`,
          type: 'similar',
          source: {
            segmentId: segments[i].id,
            content: segments[i].content,
            startTime: segments[i].startTime
          },
          target: {
            segmentId: segments[j].id,
            content: segments[j].content,
            startTime: segments[j].startTime
          },
          similarity,
          suggestion: generateSuggestion(similarity)
        });
      }
    }
  }

  return duplicates;
}

export function detectTemplateContent(segments: ScriptSegment[]): DuplicateResult[] {
  const duplicates: DuplicateResult[] = [];

  for (const segment of segments) {
    for (const [category, phrases] of Object.entries(COMMON_PHRASES)) {
      for (const phrase of phrases) {
        if (segment.content != null && segment.content.includes(phrase)) {
          duplicates.push({
            id: `dup_template_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: 'template',
            source: {
              segmentId: segment.id,
              content: phrase,
              startTime: segment.startTime
            },
            target: {
              segmentId: segment.id,
              content: segment.content,
              startTime: segment.startTime
            },
            similarity: 0.5,
            suggestion: `检测到${category}套话，建议替换为更原创的表达`
          });
        }
      }
    }
  }

  return duplicates;
}

export function detectStructuralDuplicates(
  segments: ScriptSegment[],
  threshold: number,
  calculateStructureSimilarity: (text1: string, text2: string) => number
): DuplicateResult[] {
  const duplicates: DuplicateResult[] = [];

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      if (segments[i].content == null || segments[j].content == null) continue;
      const structureSimilarity = calculateStructureSimilarity(
        segments[i].content,
        segments[j].content
      );

      if (structureSimilarity >= threshold) {
        duplicates.push({
          id: `dup_structural_${Date.now()}_${i}_${j}`,
          type: 'similar',
          source: {
            segmentId: segments[i].id,
            content: segments[i].content,
            startTime: segments[i].startTime
          },
          target: {
            segmentId: segments[j].id,
            content: segments[j].content,
            startTime: segments[j].startTime
          },
          similarity: structureSimilarity,
          suggestion: '句式结构相似，建议变换表达方式'
        });
      }
    }
  }

  return duplicates;
}

export function calculateSimilarity(text1: string, text2: string): number {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  return 1 - distance / maxLength;
}

export function calculateStructureSimilarity(text1: string, text2: string): number {
  const features1 = extractStructureFeatures(text1);
  const features2 = extractStructureFeatures(text2);
  const intersection = features1.filter((f) => features2.includes(f));
  const union = [...new Set([...features1, ...features2])];
  return intersection.length / union.length;
}

export function extractStructureFeatures(text: string): string[] {
  const features: string[] = [];

  if (/^(.+?)是(.+?)$/.test(text)) features.push('是字句');
  if (/^(.+?)让(.+?)$/.test(text)) features.push('使令句');
  if (/^(.+?)可以(.+?)$/.test(text)) features.push('可能句');
  if (/^(.+?)有(.+?)$/.test(text)) features.push('存在句');
  if (/^(.+?)在(.+?)$/.test(text)) features.push('处所句');

  if (text.includes('因为') || text.includes('由于')) features.push('因果');
  if (text.includes('但是') || text.includes('然而')) features.push('转折');
  if (text.includes('而且') || text.includes('并且')) features.push('递进');
  if (text.includes('如果') || text.includes('假如')) features.push('假设');

  return features;
}

export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[str1.length][str2.length];
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s，。！？、；：""''（）【】]/g, '')
    .trim();
}

export function generateSuggestion(similarity: number): string {
  if (similarity >= 0.9) return '内容高度相似，建议完全重写';
  if (similarity >= 0.8) return '内容较为相似，建议大幅修改';
  if (similarity >= 0.7) return '内容有一定相似度，建议调整表达方式';
  return '建议检查内容原创性';
}

export function deduplicateResults(results: DuplicateResult[]): DuplicateResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.source.segmentId}-${result.target.segmentId}`;
    const reverseKey = `${result.target.segmentId}-${result.source.segmentId}`;

    if (seen.has(key) || seen.has(reverseKey)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
