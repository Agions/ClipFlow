/**
 * use-script-editor 测试
 *
 * Stage 9 PR-12：脚本编辑器 hook 覆盖
 * - useReducerHookFactory + createAutoSetters (真实 reducer)
 * - 添加/编辑/保存/删除片段
 * - 表单校验
 * - 预览/保存/AI 优化/导出
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/core/video', () => ({
  videoProcessor: {
    preview: vi.fn(),
  },
}));

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((p: string) => `tauri://${p}`),
}));

vi.mock('@/shared', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { videoProcessor } from '@/core/video';
import { convertFileSrc } from '@tauri-apps/api/core';
import { notify } from '@/shared';
import { useScriptEditor } from './use-script-editor';
import type { ScriptSegment } from '@/types';

const makeSeg = (id: string, start: number, end: number, content = `c-${id}`): ScriptSegment => ({
  id,
  startTime: start,
  endTime: end,
  type: 'narration',
  content,
});

const initial = [makeSeg('a', 0, 5), makeSeg('b', 5, 10)];

describe('useScriptEditor', () => {
  beforeEach(() => {
    vi.mocked(videoProcessor.preview).mockResolvedValue('/tmp/preview.mp4');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exposes initial state from initialSegments', () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave: vi.fn() })
    );
    expect(result.current.segments).toEqual(initial);
    expect(result.current.editingIndex).toBeNull();
    expect(result.current.formError).toBe('');
    expect(result.current.totalDuration).toBe(10);
  });

  it('handleAddSegment sets form to a new slot after last segment', () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave: vi.fn() })
    );
    act(() => result.current.handleAddSegment());
    expect(result.current.editingIndex).toBe(2);
    expect(result.current.formValues).toMatchObject({
      start: 10,
      end: 40,
      type: 'narration',
      content: '',
    });
  });

  it('handleAddSegment on empty list uses 0 as start', () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: [], onSave: vi.fn() })
    );
    act(() => result.current.handleAddSegment());
    expect(result.current.formValues).toMatchObject({ start: 0, end: 30 });
  });

  it('handleEditSegment fills formValues from existing segment', () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave: vi.fn() })
    );
    act(() => result.current.handleEditSegment(1));
    expect(result.current.editingIndex).toBe(1);
    expect(result.current.formValues).toMatchObject({ start: 5, end: 10, content: 'c-b' });
  });

  it('handleSaveSegment: invalid (end <= start) sets formError', () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: [], onSave: vi.fn() })
    );
    act(() => result.current.handleAddSegment());
    act(() => result.current.setFormValues({ start: 10, end: 5, type: 'narration', content: 'x' }));
    act(() => result.current.handleSaveSegment());
    expect(result.current.formError).toBe('结束时间必须大于开始时间');
    expect(result.current.segments).toEqual([]);
  });

  it('handleSaveSegment: invalid (empty content) sets formError', () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: [], onSave: vi.fn() })
    );
    act(() => result.current.handleAddSegment());
    act(() =>
      result.current.setFormValues({ start: 0, end: 5, type: 'narration', content: '   ' })
    );
    act(() => result.current.handleSaveSegment());
    expect(result.current.formError).toBe('请输入内容');
  });

  it('handleSaveSegment: invalid (NaN) sets formError', () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: [], onSave: vi.fn() })
    );
    act(() => result.current.handleAddSegment());
    act(() =>
      result.current.setFormValues({
        start: 'x' as unknown as number,
        end: 5,
        type: 'narration',
        content: 'x',
      })
    );
    act(() => result.current.handleSaveSegment());
    expect(result.current.formError).toBe('请输入有效的时间值');
  });

  it('handleSaveSegment: valid path appends and clears editingIndex', () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave: vi.fn() })
    );
    act(() => result.current.handleAddSegment());
    act(() =>
      result.current.setFormValues({ start: 10, end: 15, type: 'narration', content: 'new' })
    );
    act(() => result.current.handleSaveSegment());
    expect(result.current.segments).toHaveLength(3);
    expect(result.current.segments[2]).toMatchObject({
      startTime: 10,
      endTime: 15,
      content: 'new',
    });
    expect(result.current.editingIndex).toBeNull();
  });

  it('handleSaveSegment: edits existing segment in place', () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave: vi.fn() })
    );
    act(() => result.current.handleEditSegment(0));
    act(() =>
      result.current.setFormValues({ start: 0, end: 7, type: 'narration', content: 'updated' })
    );
    act(() => result.current.handleSaveSegment());
    expect(result.current.segments).toHaveLength(2);
    expect(result.current.segments[0].content).toBe('updated');
    expect(result.current.segments[0].endTime).toBe(7);
  });

  it('handleCancelEdit clears editing index and formError', () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave: vi.fn() })
    );
    act(() => result.current.handleEditSegment(0));
    act(() => result.current.setFormError('some error'));
    act(() => result.current.handleCancelEdit());
    expect(result.current.editingIndex).toBeNull();
    expect(result.current.formError).toBe('');
  });

  it('handleDeleteSegment opens confirm dialog with target index', () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave: vi.fn() })
    );
    act(() => result.current.handleDeleteSegment(1));
    expect(result.current.deleteTargetIndex).toBe(1);
    expect(result.current.deleteConfirmOpen).toBe(true);
  });

  it('confirmDelete removes the segment and closes dialog', () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave: vi.fn() })
    );
    act(() => result.current.handleDeleteSegment(0));
    act(() => result.current.confirmDelete());
    expect(result.current.segments).toHaveLength(1);
    expect(result.current.segments[0].id).toBe('b');
    expect(result.current.deleteConfirmOpen).toBe(false);
    expect(result.current.deleteTargetIndex).toBeNull();
  });

  it('handlePreviewSegment: success populates previewSrc and opens preview', async () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave: vi.fn() })
    );
    await act(async () => {
      await result.current.handlePreviewSegment(0);
    });
    expect(videoProcessor.preview).toHaveBeenCalledWith('/tmp/v.mp4', { start: 0, end: 5 });
    expect(convertFileSrc).toHaveBeenCalledWith('/tmp/preview.mp4');
    expect(result.current.previewSrc).toBe('tauri:///tmp/preview.mp4');
    expect(result.current.previewVisible).toBe(true);
    expect(result.current.previewLoading).toBe(false);
  });

  it('handlePreviewSegment: error path notifies error', async () => {
    vi.mocked(videoProcessor.preview).mockRejectedValue(new Error('ffmpeg fail'));
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave: vi.fn() })
    );
    await act(async () => {
      await result.current.handlePreviewSegment(0);
    });
    expect(notify.error).toHaveBeenCalled();
    expect(result.current.previewLoading).toBe(false);
  });

  it('handleSave invokes onSave with current segments and notifies', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave })
    );
    act(() => result.current.handleSave());
    expect(onSave).toHaveBeenCalledWith(initial);
    expect(notify.success).toHaveBeenCalledWith('脚本已保存');
  });

  it('handleAIImprove notifies and closes modal', async () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave: vi.fn() })
    );
    act(() => result.current.setAiModalVisible(true));
    await act(async () => {
      await result.current.handleAIImprove();
    });
    expect(notify.info).toHaveBeenCalled();
    expect(result.current.aiModalVisible).toBe(false);
    // The 2s setTimeout for success notify is a UX delay — covered by
    // integration smoke; the synchronous part (info + close) is what we verify here.
  });

  it('handleAIImprove fires the 2s setTimeout success notification (L191)', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() =>
        useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave: vi.fn() })
      );
      await act(async () => {
        await result.current.handleAIImprove();
      });
      // Notify.info was already called synchronously; advance the timer to
      // fire the deferred success notification.
      vi.advanceTimersByTime(2000);
      expect(notify.success).toHaveBeenCalledWith('脚本优化完成');
    } finally {
      vi.useRealTimers();
    }
  });

  it('exportMenuItems provides 3 formats', () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave: vi.fn() })
    );
    expect(result.current.exportMenuItems.map(m => m.key)).toEqual(['txt', 'srt', 'doc']);
  });

  it('handleExportClick invokes onExport and closes menu', () => {
    const onExport = vi.fn();
    const { result } = renderHook(() =>
      useScriptEditor({
        videoPath: '/tmp/v.mp4',
        initialSegments: initial,
        onSave: vi.fn(),
        onExport,
      })
    );
    act(() => result.current.setExportMenuOpen(true));
    act(() => result.current.handleExportClick({ key: 'srt' }));
    expect(onExport).toHaveBeenCalledWith('srt');
    expect(result.current.exportMenuOpen).toBe(false);
  });

  it('setFieldValue updates a single field and clears formError', () => {
    const { result } = renderHook(() =>
      useScriptEditor({ videoPath: '/tmp/v.mp4', initialSegments: initial, onSave: vi.fn() })
    );
    act(() => result.current.setFormError('x'));
    act(() => result.current.setFieldValue('content', 'hello'));
    expect(result.current.formValues.content).toBe('hello');
    expect(result.current.formError).toBe('');
  });
});
