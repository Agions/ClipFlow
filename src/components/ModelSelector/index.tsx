/**
 * 模型选择器组件
 * 专业的 AI 模型选择界面
 */

import React, { useMemo, useCallback } from 'react';
import { Alert } from 'antd';
import {
  useModel,
  useModelCost,
  useRecommendedModel
} from '@/hooks/useModel';
import type { AIModel, ModelProvider } from '@/core/types';
import { useModelFilter } from './hooks/useModelFilter';
import { useModelSelection } from './hooks/useModelSelection';
import { ModelHeader } from './ModelHeader';
import { ModelRecommendations } from './ModelRecommendations';
import { ModelFilter } from './ModelFilter';
import { ModelList } from './ModelList';
import { ModelFooter } from './ModelFooter';
import styles from './index.module.less';

interface ModelSelectorProps {
  onSelect?: (modelId: string) => void;
  onConfigure?: (provider: ModelProvider) => void;
  compact?: boolean;
  showCost?: boolean;
  taskType?: 'script' | 'analysis' | 'code' | 'fast';
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  onSelect,
  onConfigure,
  compact = false,
  showCost = true,
  taskType
}) => {
  // 使用核心 hooks
  const {
    selectedModel,
    isConfigured,
    availableModels,
    selectModel,
    testConnection,
    isLoading,
    error
  } = useModel();

  const { formatCost, estimateScriptCost } = useModelCost();
  const { recommended, currentRecommended, selectRecommended } = useRecommendedModel(taskType || 'script');

  // 使用自定义 hooks
  const {
    category,
    provider,
    searchQuery,
    setCategory,
    setProvider,
    setSearchQuery,
    filteredModels
  } = useModelFilter({ models: availableModels });

  const {
    isTesting,
    handleSelect,
    handleTest,
    handleConfigure
  } = useModelSelection({ onSelect, onConfigure });

  // 获取可用模型 ID 列表
  const availableModelIds = useMemo(() => 
    availableModels.map(m => m.id),
    [availableModels]
  );

  // 处理模型选择
  const handleModelSelect = useCallback((model: AIModel) => {
    selectModel(model.id);
    handleSelect(model);
  }, [selectModel, handleSelect]);

  // 处理推荐模型选择
  const handleRecommendedSelect = useCallback((index: number) => {
    selectRecommended(index);
    const model = recommended[index];
    if (model) {
      handleSelect(model);
    }
  }, [recommended, selectRecommended, handleSelect]);

  // 处理测试连接
  const handleTestConnection = useCallback(async () => {
    await handleTest(testConnection);
  }, [handleTest, testConnection]);

  // 处理配置
  const handleConfigureClick = useCallback(() => {
    if (selectedModel?.provider) {
      handleConfigure(selectedModel.provider);
    }
  }, [selectedModel, handleConfigure]);

  // 获取模型成本
  const getModelCost = useCallback((model: AIModel): string | null => {
    if (!model.pricing) return null;
    return formatCost(estimateScriptCost(500));
  }, [formatCost, estimateScriptCost]);

  return (
    <div className={styles.container}>
      {/* 头部 */}
      <ModelHeader
        selectedModel={selectedModel}
        isConfigured={isConfigured}
      />

      {/* 错误提示 */}
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          className={styles.alert}
        />
      )}

      {/* 任务推荐 */}
      {taskType && (
        <ModelRecommendations
          models={recommended}
          currentModelId={currentRecommended?.id}
          onSelect={handleRecommendedSelect}
        />
      )}

      {/* 过滤器 */}
      <ModelFilter
        category={category}
        provider={provider}
        searchQuery={searchQuery}
        onCategoryChange={setCategory}
        onProviderChange={setProvider}
        onSearchChange={setSearchQuery}
      />

      {/* 模型列表 */}
      <ModelList
        models={filteredModels}
        selectedModelId={selectedModel?.id}
        availableModelIds={availableModelIds}
        isLoading={isLoading}
        isCompact={compact}
        showCost={showCost}
        getModelCost={getModelCost}
        onSelect={handleModelSelect}
      />

      {/* 底部操作 */}
      {!compact && (
        <ModelFooter
          provider={selectedModel?.provider}
          isConfigured={isConfigured}
          isTesting={isTesting}
          onConfigure={handleConfigureClick}
          onTest={handleTestConnection}
        />
      )}
    </div>
  );
};

export default ModelSelector;
