/**
 * GenerateSEOStep — 为每个片段生成平台优化元数据
 *
 * 输入：ClipScore[]（评分后的片段）
 * 输出：SEOMetadata[]（与输入顺序对应）
 *
 * 支持平台：YouTube / TikTok / Instagram / 抖音 / 小红书 / B站
 */

import { createStep, type Step, type PipelineContext, type StepOptions, reportProgress } from '../Step';
import type { ClipScore } from '@/core/services/clipRepurposing/clipScorer';
import { SEOGenerator } from '@/core/services/clipRepurposing/seoGenerator';
import type { SEOMetadata, SocialPlatform } from '@/core/services/clipRepurposing/seoGenerator';
import { logger } from '@/utils/logger';

// ============================================================
// Metadata
// ============================================================

const STEP_META = {
  name: 'generate-seo',
  description: '批量生成 SEO 元数据（标题/描述/hashtags）',
  estimatedDuration: 3,
};

// ============================================================
// Input / Output
// ============================================================

export interface GenerateSEOInput {
  clips: ClipScore[];
  platform: SocialPlatform;
  language?: 'zh' | 'en';
}

export type GenerateSEOOutput = SEOMetadata[];

// ============================================================
// Step Implementation
// ============================================================

export const generateSEOStep: Step<GenerateSEOInput, GenerateSEOOutput> =
  createStep(STEP_META, (input, _ctx, options) => {
    const { clips, platform, language = 'zh' } = input;

    reportProgress(options?.onProgress, STEP_META.name, 0.2, '生成 SEO 元数据...');

    const generator = new SEOGenerator(language);
    const results = generator.generateBatch(clips, {
      platform,
      includeNativeHashtags: true,
    });

    reportProgress(options?.onProgress, STEP_META.name, 0.9, `生成 ${results.length} 组元数据`);
    logger.info(`[GenerateSEOStep] 完成，${results.length} 组元数据`);

    return results;
  });
