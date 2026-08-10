/**
 * storyline-service 测试
 * 覆盖 L0 编排入口：参数校验、invoke 转发、进度事件转发与监听清理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInvoke = vi.fn();
vi.mock('@/core/tauri/invoke', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  TauriCommand: { ANALYZE_PRODUCTION: 'analyze_production' },
}));

const mockListen = vi.fn();
vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

import { analyzeStoryline } from './storyline-service';
import type { UnderstandingProgress } from './types';

const mockResult = {
  storylinePath: '/data/StoryFab/productions/p1/artifacts/storyline.json',
  scenesCount: 5,
  subtitlesCount: 12,
  highlightsCount: 3,
  durationSecs: 120.5,
};

beforeEach(() => {
  mockInvoke.mockReset();
  mockListen.mockReset();
  mockInvoke.mockResolvedValue(mockResult);
});

describe('analyzeStoryline', () => {
  it('调用 analyze_production 并转发 productionId/videoPath', async () => {
    const result = await analyzeStoryline({
      productionId: 'p1',
      videoPath: '/tmp/movie.mp4',
    });

    expect(mockInvoke).toHaveBeenCalledWith('analyze_production', {
      productionId: 'p1',
      videoPath: '/tmp/movie.mp4',
      whisperModel: undefined,
      language: undefined,
    });
    expect(result).toEqual(mockResult);
  });

  it('透传可选 whisper 参数', async () => {
    await analyzeStoryline({
      productionId: 'p1',
      videoPath: '/tmp/movie.mp4',
      whisperModel: 'small',
      language: 'zh',
    });

    expect(mockInvoke).toHaveBeenCalledWith('analyze_production', {
      productionId: 'p1',
      videoPath: '/tmp/movie.mp4',
      whisperModel: 'small',
      language: 'zh',
    });
  });

  it('视频路径为空时抛错且不调用 invoke', async () => {
    await expect(analyzeStoryline({ productionId: 'p1', videoPath: '  ' })).rejects.toThrow(
      '视频路径不能为空'
    );
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('productionId 为空时抛错', async () => {
    await expect(
      analyzeStoryline({ productionId: '', videoPath: '/tmp/movie.mp4' })
    ).rejects.toThrow('productionId 不能为空');
  });

  it('注册进度监听并把事件 payload 转发给 onProgress', async () => {
    const onProgress = vi.fn();
    mockListen.mockImplementation(
      async (_event: string, handler: (e: { payload: UnderstandingProgress }) => void) => {
        handler({ payload: { stage: 'segment', percent: 40, message: '场景切分完成' } });
        return () => undefined;
      }
    );

    await analyzeStoryline({
      productionId: 'p1',
      videoPath: '/tmp/movie.mp4',
      onProgress,
    });

    expect(mockListen).toHaveBeenCalledWith('understanding-progress', expect.any(Function));
    expect(onProgress).toHaveBeenCalledWith({
      stage: 'segment',
      percent: 40,
      message: '场景切分完成',
    });
  });

  it('调用结束后注销事件监听', async () => {
    const unlisten = vi.fn();
    mockListen.mockResolvedValue(unlisten);

    await analyzeStoryline({
      productionId: 'p1',
      videoPath: '/tmp/movie.mp4',
      onProgress: vi.fn(),
    });

    expect(unlisten).toHaveBeenCalled();
  });

  it('invoke 失败时向上抛出错误', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('ffprobe 失败'));

    await expect(
      analyzeStoryline({ productionId: 'p1', videoPath: '/tmp/movie.mp4' })
    ).rejects.toThrow('ffprobe 失败');
  });
});
