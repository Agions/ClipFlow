/**
 * DeepSeek 模型目录（2026年8月最新）
 */
import type { AIModel } from '@/types';

export const deepseekModels: AIModel[] = [
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek-V4-Pro',
    provider: 'deepseek',
    category: ['text', 'code'],
    description: 'DeepSeek 2026 年 8 月 GA 正式版深度思考旗舰，支持 Thinking Effort 自由调节，擅长复杂伏笔梳理、人物动机推断与分镜逻辑。',
    features: ['深度思考', 'GA 旗舰', '长程逻辑', '低成本'],
    tokenLimit: 128000,
    contextWindow: 128000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'see platform.deepseek.com' },
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek-V4-Flash',
    provider: 'deepseek',
    category: ['text', 'code'],
    description: 'DeepSeek 2026 最新高速极速模型，极高性价比，适合批量短视频台词生成与口语化改写。',
    features: ['极速响应', '超高性价比', '中文重写'],
    tokenLimit: 128000,
    contextWindow: 128000,
    isPro: false,
    pricing: { input: 0, output: 0, unit: 'see platform.deepseek.com' },
  },
];
