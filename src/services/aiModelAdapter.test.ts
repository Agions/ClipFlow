import { describe, it, expect } from 'vitest';
import { resolveLegacyModel, getLegacyModelCompatMap } from './aiModelAdapter';
import type { ModelProvider } from '@/core/types';

describe('aiModelAdapter', () => {
  describe('resolveLegacyModel', () => {
    it('should resolve openai provider', () => {
      expect(resolveLegacyModel('openai')).toBe('openai');
    });

    it('should resolve anthropic provider', () => {
      expect(resolveLegacyModel('anthropic')).toBe('anthropic');
    });

    it('should resolve google provider', () => {
      expect(resolveLegacyModel('google')).toBe('google');
    });

    it('should resolve alibaba to qianwen', () => {
      expect(resolveLegacyModel('alibaba')).toBe('qianwen');
    });

    it('should resolve zhipu to chatglm', () => {
      expect(resolveLegacyModel('zhipu')).toBe('chatglm');
    });

    it('should resolve iflytek to spark', () => {
      expect(resolveLegacyModel('iflytek')).toBe('spark');
    });

    it('should resolve moonshot to moonshot', () => {
      expect(resolveLegacyModel('moonshot')).toBe('moonshot');
    });

    it('should resolve deepseek to deepseek', () => {
      expect(resolveLegacyModel('deepseek')).toBe('deepseek');
    });

    it('should resolve azure to openai', () => {
      expect(resolveLegacyModel('azure')).toBe('openai');
    });

    it('should resolve local to openai', () => {
      expect(resolveLegacyModel('local')).toBe('openai');
    });

    it('should resolve custom to openai', () => {
      expect(resolveLegacyModel('custom')).toBe('openai');
    });

    it('should return deepseek as default for unknown provider', () => {
      expect(resolveLegacyModel('unknown' as ModelProvider)).toBe('deepseek');
    });
  });

  describe('getLegacyModelCompatMap', () => {
    it('should return a frozen object', () => {
      const map = getLegacyModelCompatMap();
      expect(Object.isFrozen(map)).toBe(true);
    });

    it('should contain all known providers', () => {
      const map = getLegacyModelCompatMap();
      const providers: ModelProvider[] = [
        'openai', 'anthropic', 'google', 'alibaba',
        'zhipu', 'iflytek', 'deepseek', 'moonshot', 'azure', 'local', 'custom',
      ];
      providers.forEach((p) => {
        expect(p in map).toBe(true);
      });
    });

    it('should have same values as direct resolve calls', () => {
      const map = getLegacyModelCompatMap();
      const providers: ModelProvider[] = [
        'openai', 'anthropic', 'google', 'alibaba',
        'zhipu', 'iflytek', 'deepseek', 'moonshot', 'azure', 'local', 'custom',
      ];
      providers.forEach((p) => {
        expect(map[p]).toBe(resolveLegacyModel(p));
      });
    });
  });
});
