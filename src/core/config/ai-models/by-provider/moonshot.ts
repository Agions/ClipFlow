/**
 * Moonshot / Kimi 模型目录（2026年8月最新）
 */
import type { AIModel } from '@/types';

export const moonshotModels: AIModel[] = [
  {
    id: 'kimi-k3',
    name: 'Kimi K3',
    provider: 'moonshot',
    category: ['text', 'code', 'image', 'video'],
    description: '月之暗面 2026 年 7 月最新 2.8T MoE 旗舰大模型，100 万原生多模态上下文，支持多 Agent 协同编剧与长篇解说稿生成。',
    features: ['2.8T MoE', '1M 原生多模态', '中文专家', 'Agent 编剧'],
    tokenLimit: 1000000,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'see platform.moonshot.cn' },
  },
  {
    id: 'kimi-k2.6',
    name: 'Kimi K2.6',
    provider: 'moonshot',
    category: ['text', 'code', 'image'],
    description: '月之暗面 Agent Swarm 多智能体旗舰，原生多模态，长程剧本创作与分镜设计极强。',
    features: ['Agent Swarm', '原生多模态', '中文专家'],
    tokenLimit: 256000,
    contextWindow: 256000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'see platform.moonshot.cn' },
  },
  {
    id: 'kimi-k2.5',
    name: 'Kimi K2.5',
    provider: 'moonshot',
    category: ['text', 'code', 'image'],
    description: '月之暗面经典长上下文模型，适合中长篇影视解说与台词润色。',
    features: ['长上下文', '中文专家', '稳定'],
    tokenLimit: 256000,
    contextWindow: 256000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'see platform.moonshot.cn' },
  },
  {
    id: 'kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    provider: 'moonshot',
    category: ['text', 'code'],
    description: '月之暗面深度思考增强版，适合复杂情节反转与逻辑排查。',
    features: ['深度思考', '逻辑严密', '中文专家'],
    tokenLimit: 64000,
    contextWindow: 64000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'see platform.moonshot.cn' },
  },
];
