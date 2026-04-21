/**
 * AI 模型管理 Hook
 * 统一的模型选择、配置和管理
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useModelStore } from '@/store';
import { AI_MODELS, DEFAULT_MODEL_ID, MODEL_PROVIDERS, getModelById, getModelsByProvider, getRecommendedModels } from '@/core/config/models.config';
import type { AIModel, ModelProvider, ModelCategory, AIModelSettings } from '@/core/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { resolveDefaultModelId } from '@/core/utils/model-availability';

export interface UseModelReturn {
  // 模型列表
  allModels: AIModel[];
  availableModels: AIModel[];
  modelsByProvider: Record<ModelProvider, AIModel[]>;
  recommendedModels: Record<string, AIModel[]>;
  
  // 当前选择
  selectedModel: AIModel | undefined;
  selectedProvider: ModelProvider | undefined;
  
  // 模型配置
  modelSettings: AIModelSettings;
  isConfigured: boolean;
  
  // 操作方法
  selectModel: (modelId: string) => void;
  updateSettings: (settings: Partial<AIModelSettings>) => void;
  configureAPI: (provider: ModelProvider, apiKey: string, apiSecret?: string) => Promise<boolean>;
  testConnection: () => Promise<boolean>;
  
  // 过滤
  filterByCategory: (category: ModelCategory) => AIModel[];
  filterByProvider: (provider: ModelProvider) => AIModel[];
  
  // 状态
  isLoading: boolean;
  error: string | null;
}

export function useModel(): UseModelReturn {
  const store = useModelStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeys] = useLocalStorage<Partial<Record<ModelProvider, { key: string; isValid?: boolean }>>>('api_keys', {});
  const [defaultModelId, setDefaultModelId] = useLocalStorage<string>('default_model', DEFAULT_MODEL_ID);

  useEffect(() => {
    (Object.keys(MODEL_PROVIDERS) as ModelProvider[]).forEach((provider) => {
      const configuredKey = apiKeys[provider]?.key?.trim() || '';
      const currentSettings = store.aiModelsSettings[provider];
      const shouldEnable = configuredKey.length > 0;
      const currentKey = currentSettings?.apiKey || '';

      if (currentSettings?.enabled !== shouldEnable || currentKey !== configuredKey) {
        store.updateAIModelSettings(provider, {
          enabled: shouldEnable,
          apiKey: configuredKey || undefined,
        });
      }
    });
  }, [apiKeys, store]);

  // 按提供商分组的模型
  const modelsByProvider = useMemo(() => {
    const providers: ModelProvider[] = [
      'openai',
      'anthropic',
      'google',
      'alibaba',
      'zhipu',
      'iflytek',
      'deepseek',
      'moonshot',
    ];
    return Object.fromEntries(
      providers.map(p => [p, getModelsByProvider(p)])
    ) as Record<ModelProvider, AIModel[]>;
  }, []);
  
  // 获取可用模型（已配置的）
  const availableModels = useMemo(() => {
    return AI_MODELS.filter(model => {
      const settings = store.aiModelsSettings[model.provider ?? 'openai'];
      return model.isAvailable !== false && settings?.enabled && settings?.apiKey;
    });
  }, [store.aiModelsSettings]);

  const selectedModel = useMemo(() => {
    const modelFromDefault = getModelById(defaultModelId);
    if (modelFromDefault && modelFromDefault.isAvailable !== false) {
      return modelFromDefault;
    }

    const providerFallbackModel = getModelsByProvider(store.selectedAIModel as ModelProvider).find(
      (model) => model.isAvailable !== false
    );
    if (providerFallbackModel) {
      return providerFallbackModel;
    }

    return AI_MODELS.find((model) => model.isAvailable !== false);
  }, [defaultModelId, store.selectedAIModel]);

  const selectedProvider = selectedModel?.provider ?? (store.selectedAIModel as ModelProvider);
  const modelSettings = store.aiModelsSettings[selectedProvider] || { enabled: false };

  // 检查是否已配置
  const isConfigured = useMemo(() => {
    if (!selectedProvider) return false;
    const settings = store.aiModelsSettings[selectedProvider];
    return settings?.enabled && !!settings?.apiKey;
  }, [selectedProvider, store.aiModelsSettings]);

  useEffect(() => {
    const fallbackCatalog = AI_MODELS.filter((model) => model.isAvailable !== false);
    const nextDefaultModelId = resolveDefaultModelId(
      defaultModelId,
      availableModels.length > 0 ? availableModels : fallbackCatalog
    );
    if (nextDefaultModelId !== defaultModelId) {
      setDefaultModelId(nextDefaultModelId);
    }
  }, [availableModels, defaultModelId, setDefaultModelId]);
  
  // 推荐模型
  const recommendedModels = useMemo(() => ({
    script: getRecommendedModels('script'),
    analysis: getRecommendedModels('analysis'),
    code: getRecommendedModels('code'),
    fast: getRecommendedModels('fast')
  }), []);
  
  // 选择模型
  const selectModel = useCallback((modelId: string) => {
    const model = getModelById(modelId);
    if (model) {
      setDefaultModelId(model.id);
      store.setSelectedAIModel(model.provider ?? 'openai');
      setError(null);
    }
  }, [setDefaultModelId, store]);
  
  // 更新设置
  const updateSettings = useCallback((settings: Partial<AIModelSettings>) => {
    if (selectedModel) {
      store.updateAIModelSettings(selectedModel.provider ?? 'openai', settings);
    }
  }, [selectedModel, store]);
  
  // 配置 API
  const configureAPI = useCallback(async (
    provider: ModelProvider,
    apiKey: string,
    apiSecret?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 验证 API Key 格式
      const providerConfig = MODEL_PROVIDERS[provider];
      if (!providerConfig) {
        throw new Error('未知的提供商');
      }
      
      // 这里可以添加实际的 API 验证逻辑
      // const isValid = await validateAPIKey(provider, apiKey, apiSecret);
      
      // 更新 store
      store.updateAIModelSettings(provider, {
        enabled: true,
        apiKey
      });
      
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '配置失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [store]);
  
  // 测试连接
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!selectedModel || !isConfigured) {
      setError('模型未配置');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 这里添加实际的 API 测试逻辑
      // const response = await testModelAPI(selectedModel.provider, modelSettings);
      
      // 模拟测试
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '连接测试失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel, isConfigured, modelSettings]);
  
  // 按分类过滤
  const filterByCategory = useCallback((category: ModelCategory): AIModel[] => {
    return AI_MODELS.filter(model => (model.category ?? ['general']).includes(category));
  }, []);
  
  // 按提供商过滤
  const filterByProvider = useCallback((provider: ModelProvider): AIModel[] => {
    return getModelsByProvider(provider);
  }, []);
  
  return {
    allModels: AI_MODELS,
    availableModels,
    modelsByProvider,
    recommendedModels,
    selectedModel,
    selectedProvider,
    modelSettings,
    isConfigured,
    selectModel,
    updateSettings,
    configureAPI,
    testConnection,
    filterByCategory,
    filterByProvider,
    isLoading,
    error
  };
}

// 使用特定任务推荐的模型
export function useRecommendedModel(task: 'script' | 'analysis' | 'code' | 'fast') {
  const { recommendedModels, selectModel, selectedModel } = useModel();
  
  const recommended = recommendedModels[task];
  const currentRecommended = recommended.find(m => m.id === selectedModel?.id);
  
  const selectRecommended = useCallback((index: number = 0) => {
    if (recommended[index]) {
      selectModel(recommended[index].id);
    }
  }, [recommended, selectModel]);
  
  return {
    recommended,
    currentRecommended,
    selectRecommended
  };
}

// 使用模型成本估算
export function useModelCost() {
  const { selectedModel, modelSettings } = useModel();
  
  const estimateCost = useCallback((inputTokens: number, outputTokens: number): number => {
    if (!selectedModel?.pricing) return 0;
    
    const { input, output } = selectedModel.pricing;
    return (inputTokens / 1000) * input + (outputTokens / 1000) * output;
  }, [selectedModel]);
  
  const estimateScriptCost = useCallback((wordCount: number): number => {
    // 估算：输入约 500 tokens，输出约 wordCount * 1.5 tokens
    return estimateCost(500, wordCount * 1.5);
  }, [estimateCost]);
  
  const formatCost = useCallback((cost: number): string => {
    if (cost < 0.001) return '¥0.001';
    return `¥${cost.toFixed(3)}`;
  }, []);
  
  return {
    estimateCost,
    estimateScriptCost,
    formatCost,
    pricing: selectedModel?.pricing
  };
}

export interface UseModelCostReturn {
  estimateCost: (inputTokens: number, outputTokens: number) => number;
  estimateScriptCost: (wordCount: number) => number;
  formatCost: (cost: number) => string;
  pricing: AIModel['pricing'] | undefined;
}
