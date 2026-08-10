/**
 * use-script-detail hook — 单元测试
 *
 * PR-M2.1b：核心脚本详情 hook 0% → 100%
 *
 * 覆盖：
 * - 初始 state (initialScriptDetailState — loading=true, reloadToken=0)
 * - 11 个 setter/operation: SET_LOADING, SET_PROJECT, SET_SCRIPT, SET_SEGMENTS,
 *   SET_LOAD_ERROR, INCREMENT_RELOAD_TOKEN (无参 wrapper), SET_IS_SAVING,
 *   SET_IS_EXPORTING, SET_IS_DELETING, SET_DELETE_CONFIRM_OPEN,
 *   resetForLoad (RESET wrapper) + resetForReload (RESET wrapper)
 * - useMemo 依赖：state 变化触发 result 引用变化
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { AIScriptDraft } from '@/core/services/ai/script';
import type { DetailProjectWithAIScripts, ScriptSegment } from '@/types';
import { useScriptDetail, initialScriptDetailState } from './use-script-detail';

const sampleProject: DetailProjectWithAIScripts = {
  id: 'project-1',
  name: '测试项目',
  updatedAt: '2026-01-01T00:00:00Z',
};

const sampleScript: AIScriptDraft = {
  id: 'script-1',
  projectId: 'project-1',
  content: [],
  fullText: '',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const sampleSegments: ScriptSegment[] = [
  { id: 'seg-1', startTime: 0, endTime: 5, content: 'first' },
  { id: 'seg-2', startTime: 5, endTime: 10, content: 'second' },
];

describe('useScriptDetail — initial state', () => {
  it('returns documented initial state on first render', () => {
    const { result } = renderHook(() => useScriptDetail());

    expect(result.current.state).toEqual(initialScriptDetailState);
    expect(result.current.state.loading).toBe(true);
    expect(result.current.state.project).toBeNull();
    expect(result.current.state.script).toBeNull();
    expect(result.current.state.segments).toEqual([]);
    expect(result.current.state.loadError).toBe('');
    expect(result.current.state.reloadToken).toBe(0);
    expect(result.current.state.isSaving).toBe(false);
    expect(result.current.state.isExporting).toBe(false);
    expect(result.current.state.isDeleting).toBe(false);
    expect(result.current.state.deleteConfirmOpen).toBe(false);
  });

  it('exposes all 11 documented API surface members', () => {
    const { result } = renderHook(() => useScriptDetail());

    const keys = [
      'state',
      'setLoading',
      'setProject',
      'setScript',
      'setSegments',
      'setLoadError',
      'incrementReloadToken',
      'setIsSaving',
      'setIsExporting',
      'setIsDeleting',
      'setDeleteConfirmOpen',
      'resetForLoad',
      'resetForReload',
    ];
    for (const key of keys) {
      expect(result.current).toHaveProperty(key);
    }
  });
});

describe('useScriptDetail — single-arg setters dispatch correctly', () => {
  it('setLoading toggles loading flag', () => {
    const { result } = renderHook(() => useScriptDetail());

    act(() => result.current.setLoading(false));
    expect(result.current.state.loading).toBe(false);

    act(() => result.current.setLoading(true));
    expect(result.current.state.loading).toBe(true);
  });

  it('setProject sets project (null clears)', () => {
    const { result } = renderHook(() => useScriptDetail());

    act(() => result.current.setProject(sampleProject));
    expect(result.current.state.project).toEqual(sampleProject);

    act(() => result.current.setProject(null));
    expect(result.current.state.project).toBeNull();
  });

  it('setScript sets active script (null clears)', () => {
    const { result } = renderHook(() => useScriptDetail());

    act(() => result.current.setScript(sampleScript));
    expect(result.current.state.script).toEqual(sampleScript);

    act(() => result.current.setScript(null));
    expect(result.current.state.script).toBeNull();
  });

  it('setSegments replaces segments array', () => {
    const { result } = renderHook(() => useScriptDetail());

    act(() => result.current.setSegments(sampleSegments));
    expect(result.current.state.segments).toEqual(sampleSegments);
    expect(result.current.state.segments).toHaveLength(2);
  });

  it('setLoadError stores error string', () => {
    const { result } = renderHook(() => useScriptDetail());

    act(() => result.current.setLoadError('加载失败'));
    expect(result.current.state.loadError).toBe('加载失败');
  });

  it('setIsSaving toggles saving flag', () => {
    const { result } = renderHook(() => useScriptDetail());

    act(() => result.current.setIsSaving(true));
    expect(result.current.state.isSaving).toBe(true);
  });

  it('setIsExporting toggles exporting flag', () => {
    const { result } = renderHook(() => useScriptDetail());

    act(() => result.current.setIsExporting(true));
    expect(result.current.state.isExporting).toBe(true);
  });

  it('setIsDeleting toggles deleting flag', () => {
    const { result } = renderHook(() => useScriptDetail());

    act(() => result.current.setIsDeleting(true));
    expect(result.current.state.isDeleting).toBe(true);
  });

  it('setDeleteConfirmOpen toggles confirm modal', () => {
    const { result } = renderHook(() => useScriptDetail());

    act(() => result.current.setDeleteConfirmOpen(true));
    expect(result.current.state.deleteConfirmOpen).toBe(true);
  });
});

describe('useScriptDetail — void-action wrappers', () => {
  it('incrementReloadToken increments reloadToken by 1', () => {
    const { result } = renderHook(() => useScriptDetail());

    expect(result.current.state.reloadToken).toBe(0);

    act(() => result.current.incrementReloadToken());
    expect(result.current.state.reloadToken).toBe(1);

    act(() => result.current.incrementReloadToken());
    expect(result.current.state.reloadToken).toBe(2);

    act(() => result.current.incrementReloadToken());
    expect(result.current.state.reloadToken).toBe(3);
  });

  it('resetForLoad resets script/project/segments/loadError + loading=true', () => {
    const { result } = renderHook(() => useScriptDetail());

    // 先污染 state
    act(() => result.current.setProject(sampleProject));
    act(() => result.current.setScript(sampleScript));
    act(() => result.current.setSegments(sampleSegments));
    act(() => result.current.setLoadError('stale error'));
    act(() => result.current.setLoading(false));
    act(() => result.current.setIsSaving(true));
    act(() => result.current.setDeleteConfirmOpen(true));
    act(() => result.current.incrementReloadToken());
    expect(result.current.state.reloadToken).toBe(1);

    act(() => result.current.resetForLoad());

    const state = result.current.state;
    // RESET 重置：project=null, script=null, segments=[], loadError='', loading=true
    expect(state.project).toBeNull();
    expect(state.script).toBeNull();
    expect(state.segments).toEqual([]);
    expect(state.loadError).toBe('');
    expect(state.loading).toBe(true);
    // 不重置：isSaving / isExporting / isDeleting / deleteConfirmOpen / reloadToken
    expect(state.isSaving).toBe(true);
    expect(state.deleteConfirmOpen).toBe(true);
    expect(state.reloadToken).toBe(1);
  });

  it('resetForReload triggers the same RESET path (alias semantics)', () => {
    const { result } = renderHook(() => useScriptDetail());

    act(() => result.current.setProject(sampleProject));
    act(() => result.current.setScript(sampleScript));
    act(() => result.current.setSegments(sampleSegments));

    act(() => result.current.resetForReload());

    const state = result.current.state;
    expect(state.project).toBeNull();
    expect(state.script).toBeNull();
    expect(state.segments).toEqual([]);
    expect(state.loading).toBe(true);
  });
});

describe('useScriptDetail — useMemo semantics', () => {
  it('returned object reference changes when state changes', () => {
    const { result } = renderHook(() => useScriptDetail());
    const firstRef = result.current;

    act(() => result.current.setLoading(false));

    expect(result.current).not.toBe(firstRef);
    expect(result.current.state.loading).toBe(false);
  });

  it('returned object reference stays stable between renders with no state change', () => {
    const { result, rerender } = renderHook(() => useScriptDetail());
    const firstRef = result.current;

    rerender();

    expect(result.current).toBe(firstRef);
  });

  it('single-arg setters (bound via useBoundActions) are stable across state changes', () => {
    const { result } = renderHook(() => useScriptDetail());
    const initialSetLoading = result.current.setLoading;
    const initialSetScript = result.current.setScript;
    const initialSetSegments = result.current.setSegments;

    act(() => result.current.setLoading(false));

    // useBoundActions 内部对 actionCreators + dispatch useMemo 稳定；
    // 因此单参数 setters 引用不变（即使 result 对象整体因 state 变化重建）。
    expect(result.current.setLoading).toBe(initialSetLoading);
    expect(result.current.setScript).toBe(initialSetScript);
    expect(result.current.setSegments).toBe(initialSetSegments);
  });

  it('void-action wrappers (inline arrows) change with state — but stay callable', () => {
    const { result } = renderHook(() => useScriptDetail());

    act(() => result.current.setLoading(false));
    const wrapperBeforeStateChange = result.current.incrementReloadToken;

    // state 变化触发 useMemo 重建 → inline wrappers 是新引用。
    act(() => result.current.setLoading(true));
    expect(result.current.incrementReloadToken).not.toBe(wrapperBeforeStateChange);

    // 但新 wrapper 仍可调用，且产生正确副作用
    act(() => result.current.incrementReloadToken());
    expect(result.current.state.reloadToken).toBe(1);
  });
});
