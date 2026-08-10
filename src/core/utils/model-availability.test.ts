/**
 * core/utils/model-availability.ts — 单元测试
 */
import { describe, it, expect } from 'vitest';
import type { ModelProvider } from '@/types';
import { DEFAULT_MODEL_ID } from '../config/ai-models-config';
import {
  getConfiguredProviders,
  getAvailableModelsFromApiKeys,
  resolveDefaultModelId,
  type ApiKeyMap,
} from './model-availability';

interface TestModel {
  id: string;
  provider?: ModelProvider;
  isAvailable?: boolean;
}

const MODELS: TestModel[] = [
  { id: 'openai-gpt4', provider: 'openai' },
  { id: 'anthropic-claude', provider: 'anthropic' },
  { id: 'google-gemini', provider: 'google', isAvailable: false },
  { id: 'no-provider', provider: undefined },
];

// ─── getConfiguredProviders ──────────────────────────────────────────────────

describe('getConfiguredProviders', () => {
  it('returns empty set when apiKeys is empty', () => {
    expect(getConfiguredProviders({}).size).toBe(0);
  });

  it('includes providers with non-empty trimmed key', () => {
    const keys: ApiKeyMap = { openai: { key: 'sk-123' }, anthropic: { key: 'sk-ant' } };
    const result = getConfiguredProviders(keys);
    expect(result.has('openai')).toBe(true);
    expect(result.has('anthropic')).toBe(true);
    expect(result.size).toBe(2);
  });

  it('excludes providers with empty key', () => {
    const keys: ApiKeyMap = { openai: { key: '' } };
    expect(getConfiguredProviders(keys).size).toBe(0);
  });

  it('excludes providers with whitespace-only key', () => {
    const keys: ApiKeyMap = { openai: { key: '   ' }, anthropic: { key: '\t\n' } };
    expect(getConfiguredProviders(keys).size).toBe(0);
  });

  it('excludes providers with undefined key', () => {
    const keys: ApiKeyMap = { openai: { key: undefined } };
    expect(getConfiguredProviders(keys).size).toBe(0);
  });

  it('excludes providers with no config (empty object)', () => {
    const keys: ApiKeyMap = { openai: {} };
    expect(getConfiguredProviders(keys).size).toBe(0);
  });

  it('treats isValid=true/false as independent of key validity', () => {
    const keys: ApiKeyMap = { openai: { key: 'sk-123', isValid: false } };
    expect(getConfiguredProviders(keys).has('openai')).toBe(true);
  });
});

// ─── getAvailableModelsFromApiKeys ───────────────────────────────────────────

describe('getAvailableModelsFromApiKeys', () => {
  it('returns models whose provider is in configured set', () => {
    const keys: ApiKeyMap = { openai: { key: 'sk' } };
    const result = getAvailableModelsFromApiKeys(keys, MODELS);
    // openai-gpt4 显式 provider=openai；no-provider 回落为 openai 默认
    expect(result.map(m => m.id).sort()).toEqual(['no-provider', 'openai-gpt4']);
  });

  it('returns models from multiple providers when keys configured', () => {
    const keys: ApiKeyMap = { openai: { key: 'sk' }, anthropic: { key: 'sk-ant' } };
    const result = getAvailableModelsFromApiKeys(keys, MODELS);
    // openai + anthropic + no-provider (default openai)
    expect(result.map(m => m.id).sort()).toEqual([
      'anthropic-claude',
      'no-provider',
      'openai-gpt4',
    ]);
  });

  it('excludes models with isAvailable=false', () => {
    const keys: ApiKeyMap = { google: { key: 'g-key' } };
    const result = getAvailableModelsFromApiKeys(keys, MODELS);
    expect(result.find(m => m.id === 'google-gemini')).toBeUndefined();
  });

  it('keeps models with isAvailable=undefined (treated as available)', () => {
    const keys: ApiKeyMap = { openai: { key: 'sk' } };
    const result = getAvailableModelsFromApiKeys(keys, MODELS);
    expect(result.find(m => m.id === 'openai-gpt4')).toBeDefined();
  });

  it('excludes models with no provider when provider not configured', () => {
    const keys: ApiKeyMap = {};
    const result = getAvailableModelsFromApiKeys(keys, MODELS);
    // 'no-provider' falls back to 'openai' default but openai not configured
    expect(result.find(m => m.id === 'no-provider')).toBeUndefined();
  });

  it('includes no-provider models when default provider (openai) is configured', () => {
    const keys: ApiKeyMap = { openai: { key: 'sk' } };
    const result = getAvailableModelsFromApiKeys(keys, MODELS);
    // 'no-provider' treated as 'openai' (default fallback)
    expect(result.find(m => m.id === 'no-provider')).toBeDefined();
  });

  it('returns empty when no keys configured', () => {
    const result = getAvailableModelsFromApiKeys({}, MODELS);
    expect(result).toEqual([]);
  });

  it('uses default catalog when no modelCatalog provided', () => {
    const keys: ApiKeyMap = { openai: { key: 'sk' } };
    // 默认 catalog 是 AI_MODELS（实际数据），只要确保不抛错
    expect(() => getAvailableModelsFromApiKeys(keys)).not.toThrow();
  });
});

// ─── resolveDefaultModelId ───────────────────────────────────────────────────

describe('resolveDefaultModelId', () => {
  const available: TestModel[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('returns modelId when it exists in availableModels', () => {
    expect(resolveDefaultModelId('b', available)).toBe('b');
  });

  it('returns first available model when modelId missing', () => {
    expect(resolveDefaultModelId('nonexistent', available)).toBe('a');
  });

  it('returns DEFAULT_MODEL_ID when modelId undefined and list empty', () => {
    expect(resolveDefaultModelId(undefined, [])).toBe(DEFAULT_MODEL_ID);
  });

  it('returns DEFAULT_MODEL_ID when modelId empty string and list empty', () => {
    expect(resolveDefaultModelId('', [])).toBe(DEFAULT_MODEL_ID);
  });

  it('falls back to DEFAULT_MODEL_ID when modelId not found AND list empty', () => {
    expect(resolveDefaultModelId('missing', [])).toBe(DEFAULT_MODEL_ID);
  });

  it('prefers first available when modelId missing AND list non-empty', () => {
    expect(resolveDefaultModelId(undefined, available)).toBe('a');
  });
});
