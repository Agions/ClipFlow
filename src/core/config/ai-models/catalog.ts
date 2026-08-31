/**
 * AI 模型目录聚合 + 查找工具
 *
 * Stage 8 PR-3.1 重构：
 * - AI_MODELS 50 个条目从单一文件拆为 8 个 provider 文件（models/ 子目录）
 * - 本文件仅负责聚合 + 推荐配置 + 查找函数
 * - 添加新模型：在对应 provider 文件加 1 条；新 provider：新建 models/<name>.ts 并 import
 */
import type { AIModel, ModelProvider, ModelCategory } from '@/types';
import { openaiModels } from './by-provider/openai';
import { anthropicModels } from './by-provider/anthropic';
import { googleModels } from './by-provider/google';
import { deepseekModels } from './by-provider/deepseek';
import { alibabaModels } from './by-provider/alibaba';
import { moonshotModels } from './by-provider/moonshot';
import { zhipuModels } from './by-provider/zhipu';
import { iflytekModels } from './by-provider/iflytek';

/** 全部 AI 模型（聚合自 8 个 provider 文件） */
export const AI_MODELS: AIModel[] = [
  ...openaiModels,
  ...anthropicModels,
  ...googleModels,
  ...deepseekModels,
  ...alibabaModels,
  ...moonshotModels,
  ...zhipuModels,
  ...iflytekModels,
];

// =============================================================================
// 推荐配置（按任务类型）
// =============================================================================

export const MODEL_RECOMMENDATIONS: Record<string, string[]> = {
  script:   ['qwen3.8-max', 'claude-fable-5', 'gpt-5.6-sol', 'kimi-k3', 'glm-5.3', 'deepseek-v4-pro'],
  analysis: ['gemini-3.7-flash', 'gpt-5.6-sol', 'claude-fable-5', 'qwen3.8-max'],
  code:     ['claude-opus-5', 'deepseek-v4-pro', 'gpt-5.6-sol', 'qwen3.8-27b'],
  fast:     ['qwen3.6-flash', 'gpt-5.6-luna', 'gemini-3.5-flash-lite', 'deepseek-v4-flash', 'glm-5-turbo'],
};

// =============================================================================
// 模型查找纯函数
// =============================================================================

/** 根据 ID 精确查找模型 */
export const getModelById = (id: string): AIModel | undefined => {
  return AI_MODELS.find((model) => model.id === id);
};

/** 按提供者筛选模型列表 */
export const getModelsByProvider = (provider: ModelProvider): AIModel[] => {
  return AI_MODELS.filter((model) => model.provider === provider);
};

/** 按能力类别筛选模型 */
export const getModelsByCategory = (category: ModelCategory): AIModel[] => {
  return AI_MODELS.filter((model) => (model.category ?? ['general']).includes(category));
};

/** 获取指定任务类型的推荐模型列表 */
export const getRecommendedModels = (task: keyof typeof MODEL_RECOMMENDATIONS): AIModel[] => {
  const modelIds = MODEL_RECOMMENDATIONS[task] || [];
  return modelIds.map((id) => getModelById(id)).filter(Boolean) as AIModel[];
};
