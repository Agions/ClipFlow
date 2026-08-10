/**
 * use-subtitle-extraction hook — 单元测试
 *
 * PR-M2.1b：核心字幕提取 hook 0% → 100%
 *
 * 覆盖：
 * - 初始 state (initialSubtitleExtractorState)
 * - 15 个 setter/operation: SET_FORMAT, SET_TRANSLATE, SET_IS_EXTRACTING,
 *   SET_PROGRESS, SET_EXTRACTED_SUBTITLES, UPDATE_SUBTITLE_TEXT (双参数 inline),
 *   SET_EDITING_ID, SET_EDITING_TEXT, SET_ACTIVE_SUB_ID, SET_VIDEO_DURATION,
 *   START_EDIT, CANCEL_EDIT (无参 wrapper), RESET_FOR_EXTRACT (无参 wrapper),
 *   INCREMENT_PROGRESS (双参数 inline)
 * - useMemo 依赖：state 变化触发 result 引用变化
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSubtitleExtraction,
  initialSubtitleExtractorState,
  type SubtitleSegment,
} from './use-subtitle-extraction';

const sampleSub: SubtitleSegment = {
  id: 'sub-1',
  startTime: 0,
  endTime: 2,
  start: '00:00:00,000',
  end: '00:00:02,000',
  text: 'hello world',
};

const sampleSubtitles: SubtitleSegment[] = [
  sampleSub,
  {
    id: 'sub-2',
    startTime: 2,
    endTime: 4,
    start: '00:00:02,000',
    end: '00:00:04,000',
    text: 'second line',
  },
];

describe('useSubtitleExtraction — initial state', () => {
  it('returns documented initial state on first render', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    expect(result.current.state).toEqual(initialSubtitleExtractorState);
    expect(result.current.state.format).toBe('srt');
    expect(result.current.state.translate).toBe(false);
    expect(result.current.state.isExtracting).toBe(false);
    expect(result.current.state.progress).toBe(0);
    expect(result.current.state.extractedSubtitles).toEqual([]);
    expect(result.current.state.editingId).toBeNull();
    expect(result.current.state.editingText).toBe('');
    expect(result.current.state.activeSubId).toBeNull();
    expect(result.current.state.videoDuration).toBe(0);
  });

  it('exposes all 15 documented API surface members', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    const keys = [
      'state',
      'setFormat',
      'setTranslate',
      'setIsExtracting',
      'setProgress',
      'incrementProgress',
      'setExtractedSubtitles',
      'updateSubtitleText',
      'setEditingId',
      'setEditingText',
      'setActiveSubId',
      'setVideoDuration',
      'startEdit',
      'cancelEdit',
      'resetForExtract',
    ];
    for (const key of keys) {
      expect(result.current).toHaveProperty(key);
    }
  });
});

describe('useSubtitleExtraction — single-arg setters dispatch correctly', () => {
  it('setFormat updates state.format', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.setFormat('vtt'));
    expect(result.current.state.format).toBe('vtt');

    act(() => result.current.setFormat('txt'));
    expect(result.current.state.format).toBe('txt');
  });

  it('setTranslate toggles translate flag', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.setTranslate(true));
    expect(result.current.state.translate).toBe(true);

    act(() => result.current.setTranslate(false));
    expect(result.current.state.translate).toBe(false);
  });

  it('setIsExtracting toggles extraction flag', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.setIsExtracting(true));
    expect(result.current.state.isExtracting).toBe(true);
  });

  it('setProgress updates progress value', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.setProgress(42));
    expect(result.current.state.progress).toBe(42);
  });

  it('setExtractedSubtitles replaces the subtitles array', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.setExtractedSubtitles(sampleSubtitles));
    expect(result.current.state.extractedSubtitles).toEqual(sampleSubtitles);
    expect(result.current.state.extractedSubtitles).toHaveLength(2);
  });

  it('setEditingId sets editing id', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.setEditingId('sub-1'));
    expect(result.current.state.editingId).toBe('sub-1');

    act(() => result.current.setEditingId(null));
    expect(result.current.state.editingId).toBeNull();
  });

  it('setEditingText updates editing text', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.setEditingText('new draft'));
    expect(result.current.state.editingText).toBe('new draft');
  });

  it('setActiveSubId sets active subtitle id', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.setActiveSubId('sub-2'));
    expect(result.current.state.activeSubId).toBe('sub-2');
  });

  it('setVideoDuration stores video duration', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.setVideoDuration(180.5));
    expect(result.current.state.videoDuration).toBe(180.5);
  });
});

describe('useSubtitleExtraction — inline multi-arg actions', () => {
  it('updateSubtitleText finds and updates target subtitle', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.setExtractedSubtitles(sampleSubtitles));
    act(() => result.current.updateSubtitleText('sub-1', 'updated text'));

    const updated = result.current.state.extractedSubtitles;
    expect(updated).toHaveLength(2);
    expect(updated[0].text).toBe('updated text');
    expect(updated[1].text).toBe('second line'); // 其它不变
    expect(updated[0].id).toBe('sub-1'); // 其它字段不变
  });

  it('updateSubtitleText is a no-op when id is unknown', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.setExtractedSubtitles(sampleSubtitles));
    act(() => result.current.updateSubtitleText('unknown-id', 'whatever'));

    expect(result.current.state.extractedSubtitles).toEqual(sampleSubtitles);
  });

  it('incrementProgress accumulates and caps at upper bound', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.setProgress(30));
    act(() => result.current.incrementProgress(20, 100));
    expect(result.current.state.progress).toBe(50);

    // 超出 cap → 截断
    act(() => result.current.incrementProgress(80, 100));
    expect(result.current.state.progress).toBe(100);
  });

  it('incrementProgress caps when delta alone exceeds cap', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.incrementProgress(500, 50));
    expect(result.current.state.progress).toBe(50);
  });

  it('startEdit copies id and text into editing fields', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.startEdit(sampleSub));
    expect(result.current.state.editingId).toBe('sub-1');
    expect(result.current.state.editingText).toBe('hello world');
  });
});

describe('useSubtitleExtraction — void-action wrappers', () => {
  it('cancelEdit clears editing state', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    act(() => result.current.startEdit(sampleSub));
    expect(result.current.state.editingId).toBe('sub-1');

    act(() => result.current.cancelEdit());
    expect(result.current.state.editingId).toBeNull();
    expect(result.current.state.editingText).toBe('');
  });

  it('resetForExtract resets extraction-relevant fields only', () => {
    const { result } = renderHook(() => useSubtitleExtraction());

    // 先制造一些非默认状态
    act(() => result.current.setProgress(75));
    act(() => result.current.setExtractedSubtitles(sampleSubtitles));
    act(() => result.current.setEditingText('dirty'));
    act(() => result.current.setVideoDuration(120));

    act(() => result.current.resetForExtract());

    const state = result.current.state;
    // RESET_FOR_EXTRACT 重置：isExtracting=true, progress=0, extractedSubtitles=[], activeSubId=null
    expect(state.isExtracting).toBe(true);
    expect(state.progress).toBe(0);
    expect(state.extractedSubtitles).toEqual([]);
    expect(state.activeSubId).toBeNull();
    // 不重置：format / translate / editingId / editingText / videoDuration
    expect(state.format).toBe('srt');
    expect(state.translate).toBe(false);
    expect(state.editingText).toBe('dirty');
    expect(state.videoDuration).toBe(120);
  });
});

describe('useSubtitleExtraction — useMemo semantics', () => {
  it('returned object reference changes when state changes', () => {
    const { result } = renderHook(() => useSubtitleExtraction());
    const firstRef = result.current;

    act(() => result.current.setProgress(50));

    expect(result.current).not.toBe(firstRef);
    expect(result.current.state.progress).toBe(50);
  });

  it('returned object reference stays stable between renders with no state change', () => {
    const { result, rerender } = renderHook(() => useSubtitleExtraction());
    const firstRef = result.current;

    rerender();

    // 没有 state 变化 → useMemo 依赖不变 → 引用稳定
    expect(result.current).toBe(firstRef);
  });

  it('setter identities are stable across state changes', () => {
    const { result } = renderHook(() => useSubtitleExtraction());
    const initialSetFormat = result.current.setFormat;
    const initialSetProgress = result.current.setProgress;

    act(() => result.current.setProgress(10));

    // useBoundActions 内部对 actionCreators + dispatch useMemo 稳定；
    // state 变化不影响 actions 引用。
    expect(result.current.setFormat).toBe(initialSetFormat);
    expect(result.current.setProgress).toBe(initialSetProgress);
  });
});
