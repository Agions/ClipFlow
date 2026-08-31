/**
 * Anthropic 模型目录（2026年8月最新）
 */
import type { AIModel } from '@/types';

export const anthropicModels: AIModel[] = [
  {
    id: 'claude-fable-5',
    name: 'Claude Fable 5',
    provider: 'anthropic',
    category: ['text', 'code', 'image', 'video'],
    description: 'Anthropic 2026 年最新超级 Agent 旗舰（5 系列），100 万超长上下文，支持复杂长篇剧情架构、人物小传与长篇解说编剧。',
    features: ['超长长程规划', '1M 上下文', '顶级智能', '多模态'],
    tokenLimit: 1000000,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'see anthropic.com/pricing' },
  },
  {
    id: 'claude-opus-5',
    name: 'Claude Opus 5',
    provider: 'anthropic',
    category: ['text', 'code', 'image'],
    description: 'Anthropic 2026 顶级推理旗舰，擅长复杂长剧本分镜精细润色、情节逻辑反转与情绪曲线把控。',
    features: ['最高智能', '深度推理', '剧本编导'],
    tokenLimit: 500000,
    contextWindow: 500000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'see anthropic.com/pricing' },
  },
  {
    id: 'claude-sonnet-5',
    name: 'Claude Sonnet 5',
    provider: 'anthropic',
    category: ['text', 'code', 'image'],
    description: 'Anthropic 2026 最新主力旗舰，极速响应与高智商兼备，日常剧本研磨与分镜生成的首选模型。',
    features: ['速度与智能均衡', '长文处理', '中文优化'],
    tokenLimit: 200000,
    contextWindow: 200000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'see anthropic.com/pricing' },
  },
  {
    id: 'claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    category: ['text', 'code'],
    description: 'Anthropic 高速轻量模型，极低延迟，适合批量台词打标与快速改写。',
    features: ['超低延迟', '高性价比', '批量处理'],
    tokenLimit: 200000,
    contextWindow: 200000,
    isPro: false,
    pricing: { input: 0, output: 0, unit: 'see anthropic.com/pricing' },
  },
];
