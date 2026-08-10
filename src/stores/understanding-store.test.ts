/**
 * understanding-store 测试
 * 覆盖：分析全流程状态迁移、进度回调、失败处理、重复启动保护、产物加载
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAnalyzeStoryline = vi.fn();
vi.mock('@/core/services/understanding', () => ({
  analyzeStoryline: (...args: unknown[]) => mockAnalyzeStoryline(...args),
}));

const mockReadTextFile = vi.fn();
vi.mock('@/core/tauri', () => ({
  tauri: { readTextFile: (...args: unknown[]) => mockReadTextFile(...args) },
}));

import { useUnderstandingStore } from './understanding-store';
import type { UnderstandingProgress } from '@/core/services/understanding';

const result = {
  storylinePath: '/data/StoryFab/productions/p1/artifacts/storyline.json',
  scenesCount: 5,
  subtitlesCount: 12,
  highlightsCount: 3,
  durationSecs: 120,
};

beforeEach(() => {
  vi.clearAllMocks();
  useUnderstandingStore.getState().reset();
});

describe('startAnalysis', () => {
  it('成功流程：running → 进度回调 → done + 统计', async () => {
    mockAnalyzeStoryline.mockImplementation(
      async (input: { onProgress?: (p: UnderstandingProgress) => void }) => {
        input.onProgress?.({ stage: 'segment', percent: 40, message: '场景切分完成' });
        return result;
      }
    );

    await useUnderstandingStore
      .getState()
      .startAnalysis({ productionId: 'p1', videoPath: '/tmp/movie.mp4' });

    const state = useUnderstandingStore.getState();
    expect(state.status).toBe('done');
    expect(state.progress).toBe(100);
    expect(state.stage).toBe('done');
    expect(state.artifactPath).toBe(result.storylinePath);
    expect(state.stats).toEqual({
      scenesCount: 5,
      subtitlesCount: 12,
      highlightsCount: 3,
      durationSecs: 120,
    });
    expect(mockAnalyzeStoryline).toHaveBeenCalledWith(
      expect.objectContaining({ productionId: 'p1', videoPath: '/tmp/movie.mp4' })
    );
  });

  it('进度回调逐步更新 progress/stage/message', async () => {
    mockAnalyzeStoryline.mockImplementation(
      async (input: { onProgress?: (p: UnderstandingProgress) => void }) => {
        input.onProgress?.({ stage: 'transcribe', percent: 45, message: '正在转录字幕' });
        input.onProgress?.({ stage: 'highlight', percent: 75, message: '正在检测高光' });
        return result;
      }
    );

    await useUnderstandingStore
      .getState()
      .startAnalysis({ productionId: 'p1', videoPath: '/tmp/movie.mp4' });

    expect(mockAnalyzeStoryline.mock.calls[0][0].onProgress).toBeDefined();
    // 最终状态应为 done（progress 归 100）
    const state = useUnderstandingStore.getState();
    expect(state.status).toBe('done');
    expect(state.progress).toBe(100);
  });

  it('失败流程：running → failed + error 信息', async () => {
    mockAnalyzeStoryline.mockRejectedValue(new Error('ffprobe 失败'));

    await useUnderstandingStore
      .getState()
      .startAnalysis({ productionId: 'p1', videoPath: '/tmp/movie.mp4' });

    const state = useUnderstandingStore.getState();
    expect(state.status).toBe('failed');
    expect(state.error).toBe('ffprobe 失败');
    expect(state.stats).toBeNull();
  });

  it('运行中重复调用被忽略', async () => {
    let resolveFirst!: (v: unknown) => void;
    mockAnalyzeStoryline.mockReturnValue(
      new Promise(resolve => {
        resolveFirst = resolve;
      })
    );

    const store = useUnderstandingStore.getState();
    const first = store.startAnalysis({ productionId: 'p1', videoPath: '/tmp/movie.mp4' });
    // 此时 status 应为 running，再次调用应直接返回
    await store.startAnalysis({ productionId: 'p1', videoPath: '/tmp/movie.mp4' });
    expect(mockAnalyzeStoryline).toHaveBeenCalledTimes(1);

    resolveFirst(result);
    await first;
  });
});

describe('loadStoryline', () => {
  it('读取并解析 storyline.json 填充领域模型', async () => {
    const storyline = {
      version: 1,
      scenes: [{ id: 'scene-0', startTime: 0, endTime: 10, type: 'dialog', score: 0.9 }],
      subtitles: [],
      highlights: [],
      summary: '',
      keyPoints: [],
      confidence: 0.8,
      analyzeMs: 100,
      analyzedAt: '2026-01-01T00:00:00Z',
    };
    mockReadTextFile.mockResolvedValue(JSON.stringify(storyline));

    await useUnderstandingStore.getState().loadStoryline('/data/storyline.json');

    expect(mockReadTextFile).toHaveBeenCalledWith('/data/storyline.json');
    expect(useUnderstandingStore.getState().storyline).toEqual(storyline);
  });

  it('空路径直接返回', async () => {
    await useUnderstandingStore.getState().loadStoryline('  ');
    expect(mockReadTextFile).not.toHaveBeenCalled();
  });

  it('非法 JSON 字符串：不崩溃并设置 error', async () => {
    mockReadTextFile.mockResolvedValue('not a json {{{');
    await useUnderstandingStore.getState().loadStoryline('/data/storyline.json');
    expect(useUnderstandingStore.getState().storyline).toBeNull();
    expect(useUnderstandingStore.getState().error).toBeTruthy();
  });

  it('缺字段 JSON：兜底为空数组与默认值', async () => {
    mockReadTextFile.mockResolvedValue(JSON.stringify({ summary: '摘要' }));
    await useUnderstandingStore.getState().loadStoryline('/data/storyline.json');
    const s = useUnderstandingStore.getState().storyline;
    expect(s).not.toBeNull();
    expect(s?.summary).toBe('摘要');
    expect(s?.scenes).toEqual([]);
    expect(s?.version).toBe(1);
    expect(useUnderstandingStore.getState().error).toBeNull();
  });

  it('顶层非对象（数组）：视为无效并设置 error', async () => {
    mockReadTextFile.mockResolvedValue(JSON.stringify([1, 2, 3]));
    await useUnderstandingStore.getState().loadStoryline('/data/storyline.json');
    expect(useUnderstandingStore.getState().storyline).toBeNull();
    expect(useUnderstandingStore.getState().error).toBeTruthy();
  });
});

describe('reset', () => {
  it('恢复到初始状态', async () => {
    mockAnalyzeStoryline.mockResolvedValue(result);
    await useUnderstandingStore
      .getState()
      .startAnalysis({ productionId: 'p1', videoPath: '/tmp/movie.mp4' });
    expect(useUnderstandingStore.getState().status).toBe('done');

    useUnderstandingStore.getState().reset();

    const state = useUnderstandingStore.getState();
    expect(state.status).toBe('idle');
    expect(state.storyline).toBeNull();
    expect(state.artifactPath).toBeNull();
    expect(state.stats).toBeNull();
    expect(state.error).toBeNull();
  });
});
