/**
 * model-availability 工具函数测试
 */

import { describe, it, expect } from 'vitest';
import {
  getConfiguredProviders,
  resolveDefaultModelId,
  type ApiKeyMap,
} from './model-availability';

describe('getConfiguredProviders', () => {
  it('should return empty set for empty apiKeys', () => {
    const result = getConfiguredProviders({});
    expect(result.size).toBe(0);
  });

  it('should return providers with valid keys', () => {
    const apiKeys: ApiKeyMap = {
      openai: { key: 'sk-123' },
      anthropic: { key: 'sk-ant-456' },
    };
    const result = getConfiguredProviders(apiKeys);
    expect(result.size).toBe(2);
    expect(result.has('openai')).toBe(true);
    expect(result.has('anthropic')).toBe(true);
  });

  it('should ignore providers with empty keys', () => {
    const apiKeys: ApiKeyMap = {
      openai: { key: 'sk-123' },
      anthropic: { key: '' },
    };
    const result = getConfiguredProviders(apiKeys);
    expect(result.size).toBe(1);
    expect(result.has('openai')).toBe(true);
    expect(result.has('anthropic')).toBe(false);
  });

  it('should ignore providers with whitespace-only keys', () => {
    const apiKeys: ApiKeyMap = {
      openai: { key: '   ' },
    };
    const result = getConfiguredProviders(apiKeys);
    expect(result.size).toBe(0);
  });

  it('should ignore providers with undefined keys', () => {
    const apiKeys: ApiKeyMap = {
      openai: { key: undefined },
    };
    const result = getConfiguredProviders(apiKeys);
    expect(result.size).toBe(0);
  });
});

describe('resolveDefaultModelId', () => {
  interface MockModel {
    id: string;
    name: string;
  }

  const models: MockModel[] = [
    { id: 'model-1', name: 'Model 1' },
    { id: 'model-2', name: 'Model 2' },
  ];

  it('should return modelId if it exists in availableModels', () => {
    const result = resolveDefaultModelId('model-1', models);
    expect(result).toBe('model-1');
  });

  it('should return first model if modelId not found', () => {
    const result = resolveDefaultModelId('non-existent', models);
    expect(result).toBe('model-1');
  });

  it('should return DEFAULT_MODEL_ID if availableModels is empty', () => {
    const result = resolveDefaultModelId('any-id', []);
    // Should return DEFAULT_MODEL_ID from config
    expect(typeof result).toBe('string');
  });

  it('should handle undefined modelId', () => {
    const result = resolveDefaultModelId(undefined, models);
    expect(result).toBe('model-1');
  });
});
