/**
 * AI Model 配置测试
 */

import { describe, it, expect } from 'vitest';
import {
  AI_MODELS,
  MODEL_PROVIDERS,
  getModelById,
  getModelsByProvider,
  getModelsByCategory,
  DEFAULT_MODEL_ID,
} from './models.config';
import type { ModelProvider, ModelCategory } from '@/core/types';

describe('AI_MODELS', () => {
  it('should have at least one model', () => {
    expect(AI_MODELS.length).toBeGreaterThan(0);
  });

  it('each model should have required fields', () => {
    AI_MODELS.forEach(model => {
      expect(model.id).toBeDefined();
      expect(model.name).toBeDefined();
      expect(model.provider).toBeDefined();
    });
  });
});

describe('MODEL_PROVIDERS', () => {
  it('should have at least one provider', () => {
    const keys = Object.keys(MODEL_PROVIDERS);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('each provider should have name and website', () => {
    Object.entries(MODEL_PROVIDERS).forEach(([key, provider]) => {
      expect(provider.name).toBeDefined();
      expect(provider.website).toBeDefined();
    });
  });
});

describe('getModelById', () => {
  it('should find existing model', () => {
    const model = AI_MODELS[0];
    const found = getModelById(model.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(model.id);
  });

  it('should return undefined for non-existent model', () => {
    const found = getModelById('non-existent-model');
    expect(found).toBeUndefined();
  });
});

describe('getModelsByProvider', () => {
  it('should filter models by provider', () => {
    const provider = AI_MODELS[0].provider;
    const models = getModelsByProvider(provider);
    models.forEach(m => {
      expect(m.provider).toBe(provider);
    });
  });
});

describe('getModelsByCategory', () => {
  it('should filter models by category', () => {
    const models = getModelsByCategory('general');
    models.forEach(m => {
      expect(m.category).toContain('general');
    });
  });
});

describe('DEFAULT_MODEL_ID', () => {
  it('should be a valid model id', () => {
    const model = getModelById(DEFAULT_MODEL_ID);
    expect(model).toBeDefined();
  });
});
