/**
 * ai-clip/index — 单元测试
 *
 * AIClipService 是一个面向所有 ai-clip 子模块的纯委托器。
 * 这里通过 mock 各底层函数来验证委托是否正确。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./analyzer', () => ({
  analyzeVideo: vi.fn(),
}));

vi.mock('./batch-processor', () => ({
  batchProcess: vi.fn(),
  getBatchTask: vi.fn(),
  cancelTask: vi.fn(),
  applySuggestions: vi.fn(),
  smartClip: vi.fn(),
}));

vi.mock('./config', () => ({
  exportClipConfig: vi.fn(),
  importClipConfig: vi.fn(),
}));

import { analyzeVideo } from './analyzer';
import {
  batchProcess,
  getBatchTask,
  cancelTask,
  applySuggestions,
  smartClip,
} from './batch-processor';
import { exportClipConfig, importClipConfig } from './config';
import { aiClipService, AIClipService } from './index';
import { DEFAULT_CLIP_CONFIG } from './types';
import type { VideoInfo } from '@/types';

const mockAnalyze = vi.mocked(analyzeVideo);
const mockBatchProcess = vi.mocked(batchProcess);
const mockGetBatchTask = vi.mocked(getBatchTask);
const mockCancelTask = vi.mocked(cancelTask);
const mockApplySuggestions = vi.mocked(applySuggestions);
const mockSmartClip = vi.mocked(smartClip);
const mockExportConfig = vi.mocked(exportClipConfig);
const mockImportConfig = vi.mocked(importClipConfig);

const fakeVideo: VideoInfo = { id: 'v1', path: '/v.mp4', duration: 60 } as VideoInfo;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AIClipService', () => {
  it('analyzeVideo delegates to analyzer.analyzeVideo', async () => {
    const expected = { clips: [] } as never;
    mockAnalyze.mockResolvedValue(expected);
    const result = await aiClipService.analyzeVideo(fakeVideo);
    expect(mockAnalyze).toHaveBeenCalledWith(fakeVideo, undefined, undefined, undefined);
    expect(result).toBe(expected);
  });

  it('analyzeVideo forwards all parameters', async () => {
    mockAnalyze.mockResolvedValue({} as never);
    const cfg = { ...DEFAULT_CLIP_CONFIG };
    const onProgress = vi.fn();
    const controller = new AbortController();
    await aiClipService.analyzeVideo(fakeVideo, cfg, controller.signal, onProgress);
    expect(mockAnalyze).toHaveBeenCalledWith(fakeVideo, cfg, controller.signal, onProgress);
  });

  it('batchProcess delegates to batch-processor.batchProcess', async () => {
    const expected = { taskId: 't1' } as never;
    mockBatchProcess.mockResolvedValue(expected);
    const onProgress = vi.fn();
    const result = await aiClipService.batchProcess(
      'proj-1',
      [fakeVideo],
      DEFAULT_CLIP_CONFIG,
      onProgress
    );
    expect(mockBatchProcess).toHaveBeenCalledWith(
      'proj-1',
      [fakeVideo],
      DEFAULT_CLIP_CONFIG,
      onProgress
    );
    expect(result).toBe(expected);
  });

  it('getBatchTask delegates to getBatchTask', () => {
    mockGetBatchTask.mockReturnValue({ taskId: 't1' } as never);
    aiClipService.getBatchTask('t1');
    expect(mockGetBatchTask).toHaveBeenCalledWith('t1');
  });

  it('cancelTask delegates to cancelTask', () => {
    mockCancelTask.mockReturnValue(undefined as never);
    aiClipService.cancelTask('t1');
    expect(mockCancelTask).toHaveBeenCalledWith('t1');
  });

  it('applySuggestions delegates to applySuggestions', async () => {
    const expected = [] as never;
    mockApplySuggestions.mockResolvedValue(expected);
    const result = await aiClipService.applySuggestions(fakeVideo, [], []);
    expect(mockApplySuggestions).toHaveBeenCalledWith(fakeVideo, [], []);
    expect(result).toBe(expected);
  });

  it('smartClip delegates to smartClip', async () => {
    const expected = { clips: [] } as never;
    mockSmartClip.mockResolvedValue(expected);
    const result = await aiClipService.smartClip(fakeVideo, 30, 'fast');
    expect(mockSmartClip).toHaveBeenCalledWith(fakeVideo, 30, 'fast');
    expect(result).toBe(expected);
  });

  it('exportClipConfig delegates to config.exportClipConfig', () => {
    mockExportConfig.mockReturnValue('json-string');
    const result = aiClipService.exportClipConfig(DEFAULT_CLIP_CONFIG);
    expect(mockExportConfig).toHaveBeenCalledWith(DEFAULT_CLIP_CONFIG);
    expect(result).toBe('json-string');
  });

  it('importClipConfig delegates to config.importClipConfig with DEFAULT_CLIP_CONFIG', () => {
    mockImportConfig.mockReturnValue(DEFAULT_CLIP_CONFIG);
    const result = aiClipService.importClipConfig('{"a":1}');
    expect(mockImportConfig).toHaveBeenCalledWith('{"a":1}', DEFAULT_CLIP_CONFIG);
    expect(result).toBe(DEFAULT_CLIP_CONFIG);
  });

  it('exposes a default singleton instance of AIClipService', () => {
    expect(aiClipService).toBeInstanceOf(AIClipService);
  });
});
