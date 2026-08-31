/**
 * 智谱 AI (Zhipu) 模型目录（2026年8月最新）
 */
import type { AIModel } from '@/types';

export const zhipuModels: AIModel[] = [
  {
    id: 'glm-5.3',
    name: 'GLM-5.3',
    provider: 'zhipu',
    category: ['text', 'code', 'image', 'video'],
    description: '智谱 AI 2026 年 8 月最新升级旗舰，100 万长上下文，专为复杂 Agent 编剧工作流与影视分析调优。',
    features: ['1M 上下文', '中文优化', '多模态', 'Agentic'],
    tokenLimit: 1000000,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'see open.bigmodel.cn' },
  },
  {
    id: 'glm-5.2',
    name: 'GLM-5.2',
    provider: 'zhipu',
    category: ['text', 'code', 'image'],
    description: '智谱 AI 旗舰模型，100 万上下文架构，多智能体协作与长篇文档生成性能优异。',
    features: ['1M 上下文', '中文优化', '高性能'],
    tokenLimit: 1000000,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'see open.bigmodel.cn' },
  },
  {
    id: 'glm-5',
    name: 'GLM-5',
    provider: 'zhipu',
    category: ['text', 'code', 'image'],
    description: '智谱 AI 744B MoE 基础大模型，中文表达地道自然。',
    features: ['中文优化', '多模态', 'MoE'],
    tokenLimit: 128000,
    contextWindow: 128000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'see open.bigmodel.cn' },
  },
  {
    id: 'glm-5-turbo',
    name: 'GLM-5 Turbo',
    provider: 'zhipu',
    category: ['text', 'code', 'image'],
    description: '智谱 AI 高速低成本模型，适合短剧分镜头批量打标与低延迟生成。',
    features: ['高速', '低成本', '中文优化'],
    tokenLimit: 128000,
    contextWindow: 128000,
    isPro: false,
    pricing: { input: 0, output: 0, unit: 'see open.bigmodel.cn' },
  },
];
