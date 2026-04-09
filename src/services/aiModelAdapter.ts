import type { ModelProvider } from '@/core/types';
import type { LegacyAIModelType } from './aiService';

const PROVIDER_TO_LEGACY_MODEL: Record<ModelProvider, LegacyAIModelType> = {
  openai: 'openai',
  anthropic: 'anthropic',
  google: 'google',
  alibaba: 'qianwen',
  zhipu: 'chatglm',
  iflytek: 'spark',
  deepseek: 'deepseek',
  moonshot: 'moonshot',
  azure: 'openai',
  local: 'openai',
  custom: 'openai',
};

export const resolveLegacyModel = (provider: ModelProvider): LegacyAIModelType =>
  PROVIDER_TO_LEGACY_MODEL[provider] ?? 'deepseek';

export const getLegacyModelCompatMap = (): Readonly<Record<ModelProvider, LegacyAIModelType>> =>
  PROVIDER_TO_LEGACY_MODEL;
