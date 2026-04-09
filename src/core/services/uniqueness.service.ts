/**
 * 唯一性保障服务
 * 确保每次生成的视频解说都是原创唯一的
 */

import type { ScriptData } from '@/core/types';
import { storageService } from './storage.service';

// 内容指纹
interface ContentFingerprint {
  id: string;
  scriptId: string;
  hash: string;
  keywords: string[];
  structure: string;
  createdAt: string;
}

// 唯一性检查结果
interface UniquenessCheckResult {
  isUnique: boolean;
  similarity: number;
  matchedScript?: {
    id: string;
    title: string;
    createdAt: string;
  };
  differences: string[];
  suggestions: string[];
}

// 生成配置
interface UniquenessConfig {
  // 强制唯一性
  enforceUniqueness: boolean;
  // 相似度阈值（低于此值视为唯一）
  similarityThreshold: number;
  // 历史记录检查
  checkHistory: boolean;
  // 自动重写
  autoRewrite: boolean;
  // 重写尝试次数
  maxRewriteAttempts: number;
  // 添加随机性
  addRandomness: boolean;
}

type FingerprintStore = Record<string, ContentFingerprint>;

class UniquenessService {
  private config: UniquenessConfig;
  private fingerprints: Map<string, ContentFingerprint> = new Map();

  constructor(config: Partial<UniquenessConfig> = {}) {
    this.config = {
      enforceUniqueness: true,
      similarityThreshold: 0.3,
      checkHistory: true,
      autoRewrite: true,
      maxRewriteAttempts: 3,
      addRandomness: true,
      ...config
    };

    this.loadFingerprints();
  }

  /**
   * 加载历史指纹
   */
  private loadFingerprints(): void {
    const stored = storageService.get<FingerprintStore>('script_fingerprints');
    if (stored) {
      try {
        this.fingerprints = new Map<string, ContentFingerprint>(Object.entries(stored));
      } catch {
        this.fingerprints = new Map();
      }
    }
  }

  /**
   * 保存指纹
   */
  private saveFingerprints(): void {
    const data = Object.fromEntries(this.fingerprints) as FingerprintStore;
    storageService.set('script_fingerprints', data);
  }

  /**
   * 生成内容指纹
   */
  generateFingerprint(script: ScriptData): ContentFingerprint {
    const content = script.content;

    // 提取关键词
    const keywords = this.extractKeywords(content);

    // 生成结构签名
    const structure = this.generateStructureSignature(script);

    // 生成哈希
    const hash = this.generateHash(content);

    return {
      id: `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scriptId: script.id,
      hash,
      keywords,
      structure,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 提取关键词
   */
  private extractKeywords(content: string): string[] {
    // 分词并统计词频
    const words = content
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2);

    // 统计词频
    const wordCount = new Map<string, number>();
    for (const word of words) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }

    // 返回高频词（排除停用词）
    const stopWords = new Set([
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人',
      '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
      '你', '会', '着', '没有', '看', '好', '自己', '这', '那'
    ]);

    return Array.from(wordCount.entries())
      .filter(([word]) => !stopWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * 生成结构签名
   */
  private generateStructureSignature(script: ScriptData): string {
    const segments = script.segments;
    const structure = segments.map(s => {
      const content = s.content ?? '';
      const length = content.length;
      const sentences = content.split(/[。！？]/).length;
      return `${s.type}:${length}:${sentences}`;
    }).join('|');

    return structure;
  }

  /**
   * 生成哈希
   */
  private generateHash(content: string): string {
    // 简化版哈希
    let hash = 0;
    const normalized = content.toLowerCase().replace(/\s+/g, '');

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * 检查唯一性
   */
  checkUniqueness(script: ScriptData): UniquenessCheckResult {
    const fingerprint = this.generateFingerprint(script);

    // 检查历史记录
    if (this.config.checkHistory) {
      for (const [id, existingFp] of this.fingerprints) {
        const similarity = this.calculateFingerprintSimilarity(fingerprint, existingFp);

        if (similarity >= this.config.similarityThreshold) {
          return {
            isUnique: false,
            similarity,
            matchedScript: {
              id: existingFp.scriptId,
              title: '历史脚本',
              createdAt: existingFp.createdAt
            },
            differences: this.findDifferences(fingerprint, existingFp),
            suggestions: this.generateUniquenessSuggestions(similarity)
          };
        }
      }
    }

    return {
      isUnique: true,
      similarity: 0,
      differences: [],
      suggestions: ['内容唯一性良好']
    };
  }

  /**
   * 计算指纹相似度
   */
  private calculateFingerprintSimilarity(
    fp1: ContentFingerprint,
    fp2: ContentFingerprint
  ): number {
    // 哈希直接匹配
    if (fp1.hash === fp2.hash) {
      return 1.0;
    }

    // 关键词相似度
    const keywordSimilarity = this.calculateKeywordSimilarity(
      fp1.keywords,
      fp2.keywords
    );

    // 结构相似度
    const structureSimilarity = this.calculateStructureSimilarity(
      fp1.structure,
      fp2.structure
    );

    // 加权平均
    return keywordSimilarity * 0.6 + structureSimilarity * 0.4;
  }

  /**
   * 计算关键词相似度
   */
  private calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) {
      return 0;
    }

    return intersection.size / union.size;
  }

  /**
   * 计算结构相似度
   */
  private calculateStructureSimilarity(structure1: string, structure2: string): number {
    const parts1 = structure1.split('|');
    const parts2 = structure2.split('|');

    if (parts1.length !== parts2.length) {
      return 0;
    }

    let matchCount = 0;
    for (let i = 0; i < parts1.length; i++) {
      if (parts1[i] === parts2[i]) {
        matchCount++;
      }
    }

    return matchCount / parts1.length;
  }

  /**
   * 查找差异
   */
  private findDifferences(
    fp1: ContentFingerprint,
    fp2: ContentFingerprint
  ): string[] {
    const differences: string[] = [];

    // 关键词差异
    const uniqueKeywords = fp1.keywords.filter(k => !fp2.keywords.includes(k));
    if (uniqueKeywords.length > 0) {
      differences.push(`新增关键词: ${uniqueKeywords.slice(0, 5).join(', ')}`);
    }

    // 结构差异
    if (fp1.structure !== fp2.structure) {
      differences.push('段落结构不同');
    }

    return differences;
  }

  /**
   * 生成唯一性建议
   */
  private generateUniquenessSuggestions(similarity: number): string[] {
    const suggestions: string[] = [];

    if (similarity >= 0.8) {
      suggestions.push('⚠️ 内容与历史脚本高度相似，建议完全重写');
      suggestions.push('尝试更换解说角度或切入点');
      suggestions.push('使用不同的案例或数据支撑');
    } else if (similarity >= 0.5) {
      suggestions.push('内容与历史脚本有一定相似度');
      suggestions.push('建议调整部分段落表述');
      suggestions.push('增加新的观点或见解');
    } else {
      suggestions.push('内容与历史脚本略有相似');
      suggestions.push('可进行微调提高唯一性');
    }

    return suggestions;
  }

  /**
   * 注册脚本指纹
   */
  registerScript(script: ScriptData): void {
    const fingerprint = this.generateFingerprint(script);
    this.fingerprints.set(fingerprint.id, fingerprint);
    this.saveFingerprints();
  }

  /**
   * 确保唯一性（自动重写）
   */
  async ensureUniqueness(
    script: ScriptData,
    rewriteFn: (script: ScriptData) => Promise<ScriptData>
  ): Promise<{
    script: ScriptData;
    attempts: number;
    isUnique: boolean;
  }> {
    let currentScript = script;
    let attempts = 0;

    while (attempts < this.config.maxRewriteAttempts) {
      const check = this.checkUniqueness(currentScript);

      if (check.isUnique) {
        this.registerScript(currentScript);
        return {
          script: currentScript,
          attempts,
          isUnique: true
        };
      }

      if (!this.config.autoRewrite) {
        break;
      }

      // 自动重写
      attempts++;
      currentScript = await rewriteFn(currentScript);
    }

    return {
      script: currentScript,
      attempts,
      isUnique: false
    };
  }

  /**
   * 添加随机性
   */
  addRandomness(script: ScriptData): ScriptData {
    if (!this.config.addRandomness) {
      return script;
    }

    const variations = [
      // 开场变体
      ['大家好，今天', '欢迎来到本期，', '今天我们来聊聊', '这期内容我们要探讨'],
      // 过渡变体
      ['接下来', '然后', '随后', '接着'],
      // 强调变体
      ['非常重要', '值得注意', '关键在于', '核心要点是'],
      // 结尾变体
      ['总结一下', '总的来说', '归纳起来', '综上所述']
    ];

    let content = script.content;

    // 替换常用短语
    for (const group of variations) {
      const original = group[0];
      const alternatives = group.slice(1);
      const replacement =
        alternatives[Math.floor(Math.random() * alternatives.length)] ?? original;
      content = content.replace(new RegExp(original, 'g'), replacement);
    }

    // 随机调整段落顺序（保持逻辑性）
    const segments = [...script.segments];
    // 只对中间段落随机排序，保持开头和结尾
    if (segments.length > 3) {
      const middle = segments.slice(1, -1);
      const shuffled = this.shuffleArray(middle);
      segments.splice(1, middle.length, ...shuffled);
    }

    return {
      ...script,
      content,
      segments: segments.map((s, index) => ({
        ...s,
        id: `segment_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`
      })),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 打乱数组
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * 生成唯一性报告
   */
  generateUniquenessReport(script: ScriptData): {
    fingerprint: ContentFingerprint;
    check: UniquenessCheckResult;
    history: {
      totalScripts: number;
      recentScripts: number;
    };
  } {
    const fingerprint = this.generateFingerprint(script);
    const check = this.checkUniqueness(script);

    // 统计历史
    const allScripts = Array.from(this.fingerprints.values());
    const recentScripts = allScripts.filter(
      fp => new Date(fp.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    );

    return {
      fingerprint,
      check,
      history: {
        totalScripts: allScripts.length,
        recentScripts: recentScripts.length
      }
    };
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.fingerprints.clear();
    this.saveFingerprints();
  }

  /**
   * 获取配置
   */
  getConfig(): UniquenessConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<UniquenessConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const uniquenessService = new UniquenessService();
export default uniquenessService;

// 导出类型
export type {
  ContentFingerprint,
  UniquenessCheckResult,
  UniquenessConfig
};
