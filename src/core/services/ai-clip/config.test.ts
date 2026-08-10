/**
 * ai-clip/config — 单元测试
 *
 * 覆盖：
 *  - exportClipConfig 序列化
 *  - importClipConfig 正常解析 + 异常 fallback
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/utils/logging', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { exportClipConfig, importClipConfig } from './config';
import { DEFAULT_CLIP_CONFIG, type AIClipConfig } from './types';

const baseConfig: AIClipConfig = {
  ...DEFAULT_CLIP_CONFIG,
  sceneThreshold: 0.3,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('exportClipConfig', () => {
  it('serializes the config to a pretty JSON string', () => {
    const json = exportClipConfig(baseConfig);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(baseConfig);
  });

  it('uses 2-space indentation', () => {
    const json = exportClipConfig(baseConfig);
    expect(json).toContain('\n  ');
  });
});

describe('importClipConfig', () => {
  it('parses valid JSON and merges with defaults', () => {
    const json = JSON.stringify({ sceneThreshold: 0.5 });
    const result = importClipConfig(json, baseConfig);
    expect(result.sceneThreshold).toBe(0.5);
    // other fields retained from default
    expect(result.silenceThreshold).toBe(-40);
    expect(result.pacingStyle).toBe('normal');
  });

  it('returns the default config when JSON is invalid', () => {
    const result = importClipConfig('not valid json', baseConfig);
    expect(result).toEqual(baseConfig);
  });

  it('returns the default config when JSON is empty', () => {
    const result = importClipConfig('', baseConfig);
    expect(result).toEqual(baseConfig);
  });
});
