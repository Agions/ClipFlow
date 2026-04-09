/**
 * 页面层模型常量（用于简单展示）
 * 与 core/config/models.config.ts 保持同一命名体系
 */

import { AI_MODELS as CORE_MODELS, MODEL_PROVIDERS } from '@/core/config/models.config';
import type { ModelProvider } from '@/core/types';

export type { ModelProvider };

export interface AIModel {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  maxTokens: number;
  icon?: string;
}

export const AI_MODELS: AIModel[] = CORE_MODELS.map((model) => ({
  id: model.id,
  name: model.name,
  provider: model.provider ?? 'openai',
  description: model.description ?? '',
  maxTokens: model.tokenLimit ?? 0,
}));

export const PROVIDER_NAMES: Record<ModelProvider, string> = Object.fromEntries(
  Object.entries(MODEL_PROVIDERS).map(([provider, config]) => [provider, config.name])
) as Record<ModelProvider, string>;

export const PROVIDER_ICONS: Record<ModelProvider, string> = {
  openai: '🤖',
  anthropic: '🧠',
  google: '🔵',
  iflytek: '🟢',
  alibaba: '🟠',
  zhipu: '⚪',
  moonshot: '🌙',
  deepseek: '🔮',
  azure: '☁️',
  local: '💻',
  custom: '⚙️',
};
