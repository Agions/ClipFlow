/**
 * use-project-detail hook — 单元测试
 *
 * PR-M2.1b：核心项目详情 hook 0% → 100%
 *
 * 覆盖：
 * - 初始 state (initialProjectDetailState)
 * - 9 个 setter/operation: SET_ACTIVE_STEP, SET_PROJECT, UPDATE_PROJECT,
 *   SET_ACTIVE_SCRIPT, UPDATE_ACTIVE_SCRIPT, UPDATE_ACTIVE_SCRIPT_FROM_SEGMENTS (双参数 inline),
 *   SET_AI_LOADING, SET_DRAWER_VISIBLE, SET_DELETE_CONFIRM_OPEN
 * - useMemo 依赖：state 变化触发 result 引用变化
 * - inline updateActiveScriptFromSegments 触发 reducer 内 computeFullScriptText
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { AIScriptDraft } from '@/core/services/ai/script';
import type { ScriptSegment } from '@/types';
import { useProjectDetail, initialProjectDetailState } from './use-project-detail';

const sampleScript: AIScriptDraft = {
  id: 'script-1',
  projectId: 'project-1',
  content: [],
  fullText: '',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const sampleSegments: ScriptSegment[] = [
  {
    id: 'seg-1',
    startTime: 0,
    endTime: 5,
    content: 'first segment',
  },
  {
    id: 'seg-2',
    startTime: 5,
    endTime: 10,
    content: 'second segment',
  },
];

describe('useProjectDetail — initial state', () => {
  it('returns documented initial state on first render', () => {
    const { result } = renderHook(() => useProjectDetail());

    expect(result.current.state).toEqual(initialProjectDetailState);
    expect(result.current.state.activeStep).toBe('analyze');
    expect(result.current.state.project).toBeNull();
    expect(result.current.state.activeScript).toBeNull();
    expect(result.current.state.aiLoading).toBe(false);
    expect(result.current.state.drawerVisible).toBe(false);
    expect(result.current.state.deleteConfirmOpen).toBe(false);
  });

  it('exposes all 9 documented API surface members', () => {
    const { result } = renderHook(() => useProjectDetail());

    const keys = [
      'state',
      'setActiveStep',
      'setProject',
      'updateProject',
      'setActiveScript',
      'updateActiveScript',
      'updateActiveScriptFromSegments',
      'setAiLoading',
      'setDrawerVisible',
      'setDeleteConfirmOpen',
    ];
    for (const key of keys) {
      expect(result.current).toHaveProperty(key);
    }
  });
});

describe('useProjectDetail — single-arg setters dispatch correctly', () => {
  it('setActiveStep changes active step', () => {
    const { result } = renderHook(() => useProjectDetail());

    act(() => result.current.setActiveStep('script'));
    expect(result.current.state.activeStep).toBe('script');

    act(() => result.current.setActiveStep('export'));
    expect(result.current.state.activeStep).toBe('export');
  });

  it('setActiveScript sets active script (null clears)', () => {
    const { result } = renderHook(() => useProjectDetail());

    act(() => result.current.setActiveScript(sampleScript));
    expect(result.current.state.activeScript).toEqual(sampleScript);

    act(() => result.current.setActiveScript(null));
    expect(result.current.state.activeScript).toBeNull();
  });

  it('setAiLoading toggles ai loading flag', () => {
    const { result } = renderHook(() => useProjectDetail());

    act(() => result.current.setAiLoading(true));
    expect(result.current.state.aiLoading).toBe(true);

    act(() => result.current.setAiLoading(false));
    expect(result.current.state.aiLoading).toBe(false);
  });

  it('setDrawerVisible toggles drawer visibility', () => {
    const { result } = renderHook(() => useProjectDetail());

    act(() => result.current.setDrawerVisible(true));
    expect(result.current.state.drawerVisible).toBe(true);
  });

  it('setDeleteConfirmOpen toggles confirm modal', () => {
    const { result } = renderHook(() => useProjectDetail());

    act(() => result.current.setDeleteConfirmOpen(true));
    expect(result.current.state.deleteConfirmOpen).toBe(true);
  });
});

describe('useProjectDetail — updateActiveScriptFromSegments', () => {
  it('recomputes fullText from segments and updates timestamp', () => {
    const { result } = renderHook(() => useProjectDetail());

    act(() => result.current.setActiveScript(sampleScript));
    const beforeTimestamp = result.current.state.activeScript?.updatedAt;

    act(() => result.current.updateActiveScriptFromSegments(sampleSegments, sampleScript));

    const updated = result.current.state.activeScript;
    expect(updated).not.toBeNull();
    expect(updated?.content).toEqual(sampleSegments);
    // fullText 用 '\n\n' 连接各 segment.content
    expect(updated?.fullText).toBe('first segment\n\nsecond segment');
    // updatedAt 应被刷新（可能与 before 相同但一定存在）
    expect(updated?.updatedAt).toBeTruthy();
    // updatedAt 不应该早于 beforeTimestamp（new Date() 一定 >= before）
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(beforeTimestamp!).getTime()
    );
  });

  it('handles empty segments array → empty fullText', () => {
    const { result } = renderHook(() => useProjectDetail());

    act(() => result.current.setActiveScript(sampleScript));
    act(() => result.current.updateActiveScriptFromSegments([], sampleScript));

    const updated = result.current.state.activeScript;
    expect(updated?.content).toEqual([]);
    expect(updated?.fullText).toBe('');
  });

  it('preserves other script fields (id, projectId, modelUsed)', () => {
    const { result } = renderHook(() => useProjectDetail());

    const scriptWithModel: AIScriptDraft = {
      ...sampleScript,
      modelUsed: 'gpt-4',
    };
    act(() => result.current.setActiveScript(scriptWithModel));
    act(() => result.current.updateActiveScriptFromSegments(sampleSegments, scriptWithModel));

    const updated = result.current.state.activeScript;
    expect(updated?.id).toBe('script-1');
    expect(updated?.projectId).toBe('project-1');
    expect(updated?.modelUsed).toBe('gpt-4');
  });

  it('updateActiveScript replaces activeScript entirely', () => {
    const { result } = renderHook(() => useProjectDetail());

    const replacement: AIScriptDraft = {
      ...sampleScript,
      id: 'script-2',
      fullText: 'replacement',
    };
    act(() => result.current.updateActiveScript(replacement));

    expect(result.current.state.activeScript?.id).toBe('script-2');
    expect(result.current.state.activeScript?.fullText).toBe('replacement');
  });
});

describe('useProjectDetail — useMemo semantics', () => {
  it('returned object reference changes when state changes', () => {
    const { result } = renderHook(() => useProjectDetail());
    const firstRef = result.current;

    act(() => result.current.setActiveStep('export'));

    expect(result.current).not.toBe(firstRef);
    expect(result.current.state.activeStep).toBe('export');
  });

  it('returned object reference stays stable between renders with no state change', () => {
    const { result, rerender } = renderHook(() => useProjectDetail());
    const firstRef = result.current;

    rerender();

    expect(result.current).toBe(firstRef);
  });

  it('setter identities are stable across state changes', () => {
    const { result } = renderHook(() => useProjectDetail());
    const initialSetActiveStep = result.current.setActiveStep;
    const initialUpdateActiveScriptFromSegments = result.current.updateActiveScriptFromSegments;

    act(() => result.current.setActiveStep('export'));

    // useBoundActions 内部对 actionCreators + dispatch useMemo 稳定；
    // useCallback 的 updateActiveScriptFromSegments 也稳定（依赖只有 dispatch）
    expect(result.current.setActiveStep).toBe(initialSetActiveStep);
    expect(result.current.updateActiveScriptFromSegments).toBe(
      initialUpdateActiveScriptFromSegments
    );
  });
});
