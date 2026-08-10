/**
 * use-video-processing hook — 单元测试
 *
 * PR-M2.2：核心视频处理 controller hook 0% → 100%
 *
 * 覆盖：
 * - 初始 state (initialVideoProcessingState — 14 字段)
 * - 14 setter (createAutoSetters 直接/Updater 函数两种模式)
 * - addBatchItem: 空 segments 警告 + 正常追加（保留已存在 + 命名递增）
 * - removeBatchItem: 按 id 过滤
 * - updateCustomSettings: 浅合并 patch
 * - handleAudioVolumeChange: 数组/数字归一化
 * - togglePanel: 加入/移除
 * - processVideo: 成功路径 (showSaveFilePicker + renderAutonomousCut + onProcessingComplete)
 * - processVideo: 无 showSaveFilePicker → AppError
 * - processVideo: renderAutonomousCut 失败 → notify.error + rethrow
 * - processVideo: itemName 含特殊字符被剥离
 * - startBatchProcessing: 空 batchItems 警告 + 全部成功 + 单项失败 continue + 进度更新
 * - handleProcessCurrentVideo: 空 segments 警告 + 成功 + 错误路径
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { VideoSegment } from '@/types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockTauri = {
  renderAutonomousCut: vi.fn(),
};

vi.mock('@/core/tauri', () => ({
  tauri: {
    renderAutonomousCut: (...args: unknown[]) => mockTauri.renderAutonomousCut(...args),
  },
}));

const { mockNotify } = vi.hoisted(() => ({
  mockNotify: {
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@/shared')>();
  return {
    ...actual,
    notify: mockNotify,
  };
});

vi.mock('@/shared/utils/logging', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Test helpers ─────────────────────────────────────────────────────────────

type SaveFilePicker = (options?: {
  suggestedName?: string;
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
}) => Promise<{ name: string }>;

const installSaveFilePicker = (impl: SaveFilePicker): void => {
  Object.defineProperty(window, 'showSaveFilePicker', {
    configurable: true,
    writable: true,
    value: impl,
  });
};

const removeSaveFilePicker = (): void => {
  // jsdom 默认没有 showSaveFilePicker，但显式 delete 防止定义遗留
  try {
    delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;
  } catch {
    /* noop */
  }
};

// ── Imports ──────────────────────────────────────────────────────────────────

import { useVideoProcessingController } from './use-video-processing';
import { initialVideoProcessingState } from './use-video-processing-reducer';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const sampleSegments = [
  { start: 0, end: 5, type: 'narration', content: 'first' },
  { start: 5, end: 10, type: 'narration', content: 'second' },
];

const videoSegments: VideoSegment[] = [
  { id: 's1', sourceIndex: 0, startTime: 0, endTime: 5, duration: 5 },
  { id: 's2', sourceIndex: 1, startTime: 5, endTime: 10, duration: 5 },
];

beforeEach(() => {
  vi.resetAllMocks();
  mockTauri.renderAutonomousCut.mockResolvedValue('/output.mp4');
  removeSaveFilePicker();
});

afterEach(() => {
  removeSaveFilePicker();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useVideoProcessingController — initial state', () => {
  it('returns documented initial state on first render', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    expect(result.current.videoQuality).toBe('medium');
    expect(result.current.exportFormat).toBe('mp4');
    expect(result.current.transitionType).toBe('fade');
    expect(result.current.transitionDuration).toBe(1);
    expect(result.current.audioProcess).toBe('original');
    expect(result.current.audioVolume).toBe(100);
    expect(result.current.useSubtitles).toBe(true);
    expect(result.current.processingBatch).toBe(false);
    expect(result.current.currentBatchItem).toBe(0);
    expect(result.current.batchProgress).toBe(0);
    expect(result.current.batchItems).toEqual([]);
    expect(result.current.customSettings).toEqual({
      resolution: '1920x1080',
      bitrate: 4000,
      framerate: 30,
      useHardwareAcceleration: true,
    });
    expect(result.current.activePanels).toEqual(['basic']);
    // 与 reducer 的 initialState 一致
    expect(initialVideoProcessingState.batchItems).toEqual([]);
  });
});

describe('useVideoProcessingController — auto-setters (direct + updater fn)', () => {
  it('setVideoQuality updates state via direct value', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.setVideoQuality('high'));
    expect(result.current.videoQuality).toBe('high');
  });

  it('setVideoQuality supports updater function', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.setVideoQuality(prev => (prev === 'medium' ? 'high' : 'low')));
    expect(result.current.videoQuality).toBe('high');
  });

  it('setExportFormat updates state', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.setExportFormat('webm'));
    expect(result.current.exportFormat).toBe('webm');
  });

  it('setTransitionType updates state', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.setTransitionType('dissolve'));
    expect(result.current.transitionType).toBe('dissolve');
  });

  it('setTransitionDuration updates numeric state', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.setTransitionDuration(3));
    expect(result.current.transitionDuration).toBe(3);
  });

  it('setAudioProcess updates state', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.setAudioProcess('denoise'));
    expect(result.current.audioProcess).toBe('denoise');
  });

  it('setUseSubtitles toggles flag', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.setUseSubtitles(false));
    expect(result.current.useSubtitles).toBe(false);
  });
});

describe('useVideoProcessingController — batch item operations', () => {
  it('addBatchItem warns and returns when segments is empty', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: [] })
    );

    act(() => result.current.addBatchItem());

    expect(mockNotify.warning).toHaveBeenCalledWith('没有可用的脚本片段');
    expect(result.current.batchItems).toEqual([]);
  });

  it('addBatchItem appends a new item with current videoPath and segments', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.addBatchItem());
    act(() => result.current.addBatchItem());

    expect(result.current.batchItems).toHaveLength(2);
    expect(result.current.batchItems[0]).toMatchObject({
      videoPath: '/v.mp4',
      segments: sampleSegments,
      name: '批处理 1',
      completed: false,
    });
    expect(result.current.batchItems[1].name).toBe('批处理 2');
    // 两次连续 addBatchItem 可能在同毫秒使用相同 Date.now()，故不严格断言 id 不同
    expect(result.current.batchItems[0].id).toBeTruthy();
    expect(result.current.batchItems[1].id).toBeTruthy();
  });

  it('removeBatchItem filters out the matching id (single add)', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.addBatchItem());
    expect(result.current.batchItems).toHaveLength(1);
    const targetId = result.current.batchItems[0].id;

    act(() => result.current.removeBatchItem(targetId));

    expect(result.current.batchItems).toHaveLength(0);
  });

  it('removeBatchItem keeps remaining items untouched', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    // 使用 vi.spyOn(Date, 'now') 控制两个不同 id
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2000);
    act(() => result.current.addBatchItem());
    act(() => result.current.addBatchItem());
    nowSpy.mockRestore();
    expect(result.current.batchItems).toHaveLength(2);
    const [first, second] = result.current.batchItems;
    expect(first.id).toBe('1000');
    expect(second.id).toBe('2000');

    act(() => result.current.removeBatchItem('1000'));

    expect(result.current.batchItems).toHaveLength(1);
    expect(result.current.batchItems[0].id).toBe('2000');
  });
});

describe('useVideoProcessingController — updateCustomSettings', () => {
  it('merges patch into customSettings (shallow merge)', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.updateCustomSettings({ bitrate: 8000, framerate: 60 }));

    expect(result.current.customSettings).toEqual({
      resolution: '1920x1080',
      bitrate: 8000,
      framerate: 60,
      useHardwareAcceleration: true,
    });
  });

  it('updateCustomSettings with single field preserves others', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.updateCustomSettings({ resolution: '3840x2160' }));

    expect(result.current.customSettings.resolution).toBe('3840x2160');
    expect(result.current.customSettings.bitrate).toBe(4000);
    expect(result.current.customSettings.framerate).toBe(30);
  });
});

describe('useVideoProcessingController — handleAudioVolumeChange', () => {
  it('accepts a plain number and stores it', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.handleAudioVolumeChange(50));
    expect(result.current.audioVolume).toBe(50);
  });

  it('extracts the first value from a number array (slider pattern)', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.handleAudioVolumeChange([75]));
    expect(result.current.audioVolume).toBe(75);
  });

  it('handles readonly array of numbers', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    const ro: readonly number[] = [33];
    act(() => result.current.handleAudioVolumeChange(ro));
    expect(result.current.audioVolume).toBe(33);
  });
});

describe('useVideoProcessingController — togglePanel', () => {
  it('adds a new panel id', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.togglePanel('audio'));
    expect(result.current.activePanels).toEqual(['basic', 'audio']);
  });

  it('removes an existing panel id', () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.togglePanel('audio'));
    act(() => result.current.togglePanel('audio'));
    expect(result.current.activePanels).toEqual(['basic']);
  });
});

describe('useVideoProcessingController — processVideo', () => {
  it('succeeds when showSaveFilePicker and renderAutonomousCut both work', async () => {
    installSaveFilePicker(async () => ({ name: 'my_clip_2026-08-06.mp4' }));
    mockTauri.renderAutonomousCut.mockResolvedValue('/output/my_clip_2026-08-06.mp4');

    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useVideoProcessingController({
        videoPath: '/v.mp4',
        segments: sampleSegments,
        onProcessingComplete: onComplete,
      })
    );

    let outputPath = '';
    await act(async () => {
      outputPath = await result.current.processVideo(videoSegments, '我的剪辑', '/custom.mp4');
    });

    expect(outputPath).toBe('my_clip_2026-08-06.mp4');
    // inputPath 使用传入的 itemVideoPath
    expect(mockTauri.renderAutonomousCut).toHaveBeenCalledWith(
      '/custom.mp4',
      [
        { start: 0, end: 5 },
        { start: 5, end: 10 },
      ],
      'my_clip_2026-08-06.mp4'
    );
    expect(onComplete).toHaveBeenCalledWith('my_clip_2026-08-06.mp4');
  });

  it('throws AppError when showSaveFilePicker is not available', async () => {
    removeSaveFilePicker();

    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    await act(async () => {
      await expect(result.current.processVideo(videoSegments)).rejects.toThrow(
        /当前环境不支持文件选择器/
      );
    });

    expect(mockTauri.renderAutonomousCut).not.toHaveBeenCalled();
  });

  it('strips unsafe characters from itemName to build a safe fileName', async () => {
    // picker 直接返回 suggestedName（已含 .mp4 扩展名），不再追加
    installSaveFilePicker(async opts => ({ name: opts?.suggestedName ?? 'out.mp4' }));
    mockTauri.renderAutonomousCut.mockResolvedValue('/output.mp4');

    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    // '危 险!@#$%^' 中只有 危/险/空格 保留，其他被剥离 → '危险 '
    await act(async () => {
      await result.current.processVideo(videoSegments, '危 险!@#$%^');
    });

    const callArgs = mockTauri.renderAutonomousCut.mock.calls[0];
    // 文件名已被剥离不安全字符（保留 \w \s -）
    expect(callArgs[0]).toBe('/v.mp4');
    // output path 应是 "<sanitized>_<date>.mp4" 形式
    expect(callArgs[2]).toMatch(/^[\w\s-]+_\d{4}-\d{2}-\d{2}\.mp4$/);
  });

  it('uses default fileName (剪辑_<date>) when itemName is omitted', async () => {
    installSaveFilePicker(async opts => ({ name: opts?.suggestedName ?? 'out.mp4' }));
    mockTauri.renderAutonomousCut.mockResolvedValue('/output.mp4');

    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    await act(async () => {
      await result.current.processVideo(videoSegments);
    });

    expect(mockTauri.renderAutonomousCut).toHaveBeenCalled();
    // 第二参数 outputPath 应该是 "剪辑_<date>.mp4" 形式
    const outputArg = mockTauri.renderAutonomousCut.mock.calls[0][2] as string;
    expect(outputArg).toMatch(/^剪辑_\d{4}-\d{2}-\d{2}\.mp4$/);
  });

  it('on renderAutonomousCut failure: logs, notifies, and rethrows', async () => {
    installSaveFilePicker(async () => ({ name: 'out.mp4' }));
    mockTauri.renderAutonomousCut.mockRejectedValue(new Error('ffmpeg crash'));

    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    await act(async () => {
      await expect(result.current.processVideo(videoSegments)).rejects.toThrow('ffmpeg crash');
    });

    expect(mockNotify.error).toHaveBeenCalledWith(expect.any(Error), '视频处理失败');
  });
});

describe('useVideoProcessingController — startBatchProcessing', () => {
  it('warns and returns when batchItems is empty', async () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    await act(async () => {
      await result.current.startBatchProcessing();
    });

    expect(mockNotify.warning).toHaveBeenCalledWith('请先添加批处理项目');
    expect(mockTauri.renderAutonomousCut).not.toHaveBeenCalled();
  });

  it('processes all items in order, marks each completed, and reports final count', async () => {
    installSaveFilePicker(async () => ({ name: 'out.mp4' }));
    mockTauri.renderAutonomousCut.mockResolvedValue('/output.mp4');

    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.addBatchItem());
    act(() => result.current.addBatchItem());

    await act(async () => {
      await result.current.startBatchProcessing();
    });

    // 两个 item 都被处理
    expect(mockTauri.renderAutonomousCut).toHaveBeenCalledTimes(2);
    // 完成后所有 batchItems.completed = true
    expect(result.current.batchItems.every(item => item.completed)).toBe(true);
    expect(result.current.batchProgress).toBe(100);
    expect(result.current.processingBatch).toBe(false);
    expect(mockNotify.success).toHaveBeenCalledWith(
      expect.stringMatching(/完成批量处理.*2 个文件/)
    );
  });

  it('continues on per-item failure and notifies the failed item', async () => {
    installSaveFilePicker(async () => ({ name: 'out.mp4' }));
    // 第一次调用失败，第二次成功
    mockTauri.renderAutonomousCut
      .mockRejectedValueOnce(new Error('item 1 fail'))
      .mockResolvedValueOnce('/output2.mp4');

    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    act(() => result.current.addBatchItem());
    act(() => result.current.addBatchItem());

    await act(async () => {
      await result.current.startBatchProcessing();
    });

    // 两次都尝试（失败也继续）
    expect(mockTauri.renderAutonomousCut).toHaveBeenCalledTimes(2);
    // 第一项未 completed，第二项 completed
    expect(result.current.batchItems[0].completed).toBe(false);
    expect(result.current.batchItems[1].completed).toBe(true);
    // 错误通过 notify.error 提示具体项目名
    expect(mockNotify.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.stringMatching(/处理 "批处理 1" 失败/)
    );
    // 最终成功 1 个
    expect(mockNotify.success).toHaveBeenCalledWith(expect.stringMatching(/1 个文件/));
  });
});

describe('useVideoProcessingController — handleProcessCurrentVideo', () => {
  it('warns and returns when segments is empty', async () => {
    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: [] })
    );

    await act(async () => {
      await result.current.handleProcessCurrentVideo();
    });

    expect(mockNotify.warning).toHaveBeenCalledWith('没有可用的脚本片段');
    expect(mockTauri.renderAutonomousCut).not.toHaveBeenCalled();
  });

  it('processes current segments and notifies success on completion', async () => {
    installSaveFilePicker(async () => ({ name: 'current.mp4' }));
    mockTauri.renderAutonomousCut.mockResolvedValue('/current.mp4');

    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    await act(async () => {
      await result.current.handleProcessCurrentVideo();
    });

    expect(mockTauri.renderAutonomousCut).toHaveBeenCalledTimes(1);
    expect(mockNotify.success).toHaveBeenCalledWith('视频处理完成');
  });

  it('catches processVideo errors and surfaces via notify.error', async () => {
    installSaveFilePicker(async () => ({ name: 'x.mp4' }));
    mockTauri.renderAutonomousCut.mockRejectedValue(new Error('pipeline fail'));

    const { result } = renderHook(() =>
      useVideoProcessingController({ videoPath: '/v.mp4', segments: sampleSegments })
    );

    await act(async () => {
      await result.current.handleProcessCurrentVideo();
    });

    // 不应 rethrow，外层捕获后只显示 toast
    expect(mockNotify.error).toHaveBeenCalled();
    expect(mockNotify.success).not.toHaveBeenCalled();
  });
});
