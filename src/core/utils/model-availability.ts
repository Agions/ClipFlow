import { AI_MODELS, DEFAULT_MODEL_ID } from '@/core/config/models.config';
import type { ModelProvider } from '@/core/types';

export interface ApiKeyConfig {
  key?: string;
  isValid?: boolean;
}

export type ApiKeyMap = Partial<Record<ModelProvider, ApiKeyConfig>>;

export const getConfiguredProviders = (apiKeys: ApiKeyMap): Set<ModelProvider> => {
  return new Set<ModelProvider>(
    Object.entries(apiKeys)
      .filter(([, config]) => Boolean(config?.key?.trim()))
      .map(([provider]) => provider as ModelProvider)
  );
};

export const getAvailableModelsFromApiKeys = <T extends { provider?: ModelProvider; isAvailable?: boolean }>(
  apiKeys: ApiKeyMap,
  modelCatalog: T[] = AI_MODELS as unknown as T[]
): T[] => {
  const configuredProviders = getConfiguredProviders(apiKeys);
  return modelCatalog.filter(
    (model) => model.isAvailable !== false && configuredProviders.has(model.provider)
  );
};

export const resolveDefaultModelId = <T extends { id: string }>(
  modelId: string | undefined,
  availableModels: T[]
): string => {
  if (availableModels.some((model) => model.id === modelId)) {
    return modelId as string;
  }
  if (availableModels.length > 0) {
    return availableModels[0].id;
  }
  return DEFAULT_MODEL_ID;
};
