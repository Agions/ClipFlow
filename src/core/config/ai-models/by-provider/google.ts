/**
 * Google Gemini 模型目录（2026年8月最新）
 */
import type { AIModel } from '@/types';

export const googleModels: AIModel[] = [
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    provider: 'google',
    category: ['text', 'code', 'image', 'video'],
    description: 'Google 2026 年 8 月最新多模态旗舰，100 万输入上下文与 6.4 万输出，全模态视频深度理解与 Agentic 规划首选。',
    features: ['1M 上下文', '全模态视频理解', 'Agentic 规划', '最高智能'],
    tokenLimit: 1000000,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'see ai.google.dev' },
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    provider: 'google',
    category: ['text', 'code', 'image', 'video'],
    description: 'Google 2026 年 7 月多模态高效率模型，长视频高光提取与音频转写兼备。',
    features: ['长视频理解', '高效多模态', '高性价比'],
    tokenLimit: 1000000,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'see ai.google.dev' },
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    provider: 'google',
    category: ['text', 'code', 'image'],
    description: 'Google 2026 超低延迟极速模型，适合批量自动化任务与实时转写。',
    features: ['超低延迟', '高并发', '极低成本'],
    tokenLimit: 500000,
    contextWindow: 500000,
    isPro: false,
    pricing: { input: 0, output: 0, unit: 'see ai.google.dev' },
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    category: ['text', 'code', 'image', 'video'],
    description: 'Google 经典超长上下文视频理解模型。',
    features: ['长视频理解', '多模态', '稳定'],
    tokenLimit: 1000000,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'see ai.google.dev' },
  },
];
