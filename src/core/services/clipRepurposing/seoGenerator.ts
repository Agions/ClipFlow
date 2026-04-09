/**
 * SEO Meta Generator — 为每个短片段生成平台优化元数据
 *
 * 支持平台：
 *   - YouTube Shorts
 *   - TikTok
 *   - Instagram Reels
 *
 * 生成内容：
 *   - 标题（≤60 字符）
 *   - 描述（≤150 字符）
 *   - Hashtags（5-10 个）
 */

import type { ClipScore } from './clipScorer';

export type SocialPlatform = 'youtube' | 'tiktok' | 'instagram' | 'douyin' | 'xiaohongshu' | 'bilibili' | 'youtube_shorts';

// ============================================================
// Types
// ============================================================

export interface SEOMetadata {
  title: string;       // ≤60 chars
  description: string; // ≤150 chars
  hashtags: string[];   // 5-10 个
  platform: SocialPlatform;
}

export interface SEOGenerateOptions {
  platform: SocialPlatform;
  /** 片段主题关键词（从转录中提取的） */
  topicKeywords?: string[];
  /** 目标语言 */
  language?: 'zh' | 'en';
  /** 是否追加平台原生 hashtag */
  includeNativeHashtags?: boolean;
}

// ============================================================
// Platform-Specific Title Templates
// ============================================================

const TITLE_TEMPLATES_ZH: string[] = [
  '你绝对想不到…{hook}',
  '{hook}！看完我震惊了',
  '这{topic}技巧，学会了受用终身',
  '{hook}的{topic}秘密',
  '揭秘：{hook}背后的真相',
  '{topic}必看：{hook}',
  '这个{topic}技巧太绝了',
  '{hook}！大多数人不知道的',
];

const TITLE_TEMPLATES_EN: string[] = [
  'You won\'t believe this {topic}...',
  '{hook} — here\'s why it matters',
  'The {topic} secret nobody talks about',
  'Why {hook} changes everything',
  '{topic} tips that actually work',
  'This {hook} changed my perspective',
  'The truth about {topic} (honest)',
  '{hook} — must watch!',
];

// High-engagement hashtags by platform
const PLATFORM_HASHTAGS: Record<SocialPlatform, string[]> = {
  youtube: [
    '#YouTubeShorts', '#Shorts', '#Viral', '#Trending',
    '#FYP', '#ForYou', '#TrendingContent',
  ],
  tiktok: [
    '#fyp', '#foryou', '#foryoupage', '#viral',
    '#trending', '#tiktokviral', '#xyzbca',
  ],
  instagram: [
    '#reels', '#instareels', '#viral', '#trending',
    '#instagram reels', '#explorepage',
  ],
  douyin: [
    '#抖音', '#douyin', '#抖音热门', '#抖音创作者',
    '#推荐', '#热门', '#流量扶持',
  ],
  xiaohongshu: [
    '#小红书', '#小红书推荐', '#小红书博主', '#笔记',
    '#种草', '#干货', '#流量扶持',
  ],
  bilibili: [
    '#bilibili', '#B站', '#必剪', '#创作激励',
    '#弹幕', '#UP主', '#热门视频',
  ],
  youtube_shorts: [
    '#YouTubeShorts', '#Shorts', '#油管短视频', '#viral',
    '#trending', '#fyp', '#foryou',
  ],
};

// ============================================================
// SEO Generator
// ============================================================

export class SEOGenerator {
  private language: 'zh' | 'en';

  constructor(language: 'zh' | 'en' = 'zh') {
    this.language = language;
  }

  /**
   * 为单个片段生成 SEO 元数据
   */
  generate(clipScore: ClipScore, options: SEOGenerateOptions): SEOMetadata {
    const { platform } = options;
    const transcript = clipScore.clip.transcript ?? '';
    const topic = this.extractTopic(transcript, options.topicKeywords);
    const hook = this.extractHook(transcript);
    const hashtags = this.generateHashtags(transcript, topic, platform, options.includeNativeHashtags ?? true);

    return {
      title: this.buildTitle(hook, topic),
      description: this.buildDescription(clipScore, topic, platform),
      hashtags,
      platform,
    };
  }

  /**
   * 批量生成
   */
  generateBatch(clips: ClipScore[], options: SEOGenerateOptions): SEOMetadata[] {
    return clips.map(clip => this.generate(clip, options));
  }

  // --------------------------------------------------------
  // Private
  // --------------------------------------------------------

  private extractTopic(transcript: string, userKeywords?: string[]): string {
    // 从用户指定的关键词中优先选择
    if (userKeywords && userKeywords.length > 0) {
      return userKeywords[0];
    }

    // 从转录文本中提取高频实词
    const words = transcript
      .replace(/[^\w\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2)
      .filter(w => !STOP_WORDS.has(w.toLowerCase()));

    const freq: Record<string, number> = {};
    for (const w of words) {
      freq[w] = (freq[w] ?? 0) + 1;
    }

    const sorted = Object.entries(freq).sort(([, a], [, b]) => b - a);
    return sorted[0]?.[0] ?? '精彩片段';
  }

  private extractHook(transcript: string): string {
    // 从转录中提取高注意力开头
    const trimmed = transcript.trim();

    // 取前 40 字作为 hook
    if (trimmed.length <= 40) return trimmed;

    // 尝试找到句子边界
    const punctIdx = Math.max(
      trimmed.slice(0, 40).lastIndexOf('。'),
      trimmed.slice(0, 40).lastIndexOf('！'),
      trimmed.slice(0, 40).lastIndexOf('，'),
      trimmed.slice(0, 40).lastIndexOf('...'),
    );

    if (punctIdx > 20) {
      return trimmed.slice(0, punctIdx + 1);
    }
    return trimmed.slice(0, 40) + '...';
  }

  private buildTitle(hook: string, topic: string): string {
    const templates = this.language === 'zh' ? TITLE_TEMPLATES_ZH : TITLE_TEMPLATES_EN;
    const tmpl = templates[Math.floor(Math.random() * templates.length)];

    const filled = tmpl
      .replace('{hook}', hook.replace(/[。，！、]/g, '').slice(0, 20))
      .replace('{topic}', topic.slice(0, 15));

    // 截断到 60 字符
    return filled.length > 60 ? filled.slice(0, 57) + '...' : filled;
  }

  private buildDescription(
    clipScore: ClipScore,
    topic: string,
    _platform: SocialPlatform,
  ): string {
    const { totalScore, reasons } = clipScore;
    const duration = clipScore.clip.endTime - clipScore.clip.startTime;

    if (this.language === 'zh') {
      const scoreLabel = totalScore >= 80 ? '必看' : totalScore >= 60 ? '推荐' : '精选';
      const highlight = reasons[0] ?? topic;
      return `${scoreLabel}片段 | 时长 ${Math.round(duration)}s | ${highlight}。#Shorts`;
    } else {
      const scoreLabel = totalScore >= 80 ? 'Must Watch' : totalScore >= 60 ? 'Recommended' : 'Selected';
      return `${scoreLabel} clip | ${Math.round(duration)}s | ${reasons[0] ?? topic}. #Shorts`;
    }
  }

  private generateHashtags(
    transcript: string,
    topic: string,
    platform: SocialPlatform,
    includeNative: boolean,
  ): string[] {
    const hashtags = new Set<string>();

    // 平台原生 hashtag
    if (includeNative) {
      for (const tag of PLATFORM_HASHTAGS[platform]) {
        hashtags.add(tag);
      }
    }

    // 从转录中提取的内容 hashtag
    const contentTags = this.extractContentHashtags(transcript, topic);
    for (const tag of contentTags) {
      hashtags.add(tag);
    }

    // 截取 5-10 个
    return Array.from(hashtags).slice(0, 10);
  }

  private extractContentHashtags(transcript: string, topic: string): string[] {
    const tags: string[] = [];

    // 话题词
    if (topic && topic.length >= 2) {
      const clean = topic.replace(/\s+/g, '');
      if (this.language === 'zh') {
        tags.push(`#${clean}`);
        if (clean.length <= 4) tags.push(`#${clean}技巧`);
      } else {
        tags.push(`#${clean.replace(/\s+/g, '')}`);
      }
    }

    // 从转录中的高 engagement 词
    const words = transcript
      .replace(/[^\w\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && w.length <= 6)
      .filter(w => !STOP_WORDS.has(w.toLowerCase()));

    for (const w of words.slice(0, 5)) {
      if (this.language === 'zh') {
        tags.push(`#${w}`);
      } else {
        tags.push(`#${w.charAt(0).toUpperCase() + w.slice(1)}`);
      }
    }

    return tags;
  }
}

export const seoGenerator = new SEOGenerator();
export default seoGenerator;

// ============================================================
// Stop Words（排除这些高频无意义词）
// ============================================================

const STOP_WORDS = new Set([
  // 中文停用词
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '里', '什么', '怎么', '为什么', '可以', '这个', '那个',
  // English
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'and', 'or', 'but', 'if', 'then', 'so', 'because', 'that', 'this',
  'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which',
]);
