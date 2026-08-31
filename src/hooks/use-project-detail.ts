import { useCallback, useMemo } from 'react';
import { useReducerHookFactory } from '@/shared/hooks/use-reducer-hook';
import { useBoundActions } from '@/shared/hooks/use-bound-actions';
import type { AIScriptDraft } from '@/core/services/ai/script-service';
import type { ScriptSegment } from '@/types';
import {
  initialProjectDetailState,
  projectDetailReducer,
  type ProjectDetailState,
} from './use-project-detail-reducer';

interface UseProjectDetailResult {
  state: ProjectDetailState;
  setActiveStep: (step: string) => void;
  setProject: (project: ProjectDetailState['project']) => void;
  updateProject: (project: NonNullable<ProjectDetailState['project']>) => void;
  setActiveScript: (script: AIScriptDraft | null) => void;
  updateActiveScript: (script: AIScriptDraft) => void;
  updateActiveScriptFromSegments: (segments: ScriptSegment[], activeScript: AIScriptDraft) => void;
  setAiLoading: (loading: boolean) => void;
  setDrawerVisible: (visible: boolean) => void;
  setDeleteConfirmOpen: (open: boolean) => void;
}

// module-level single-arg action creators — 稳定引用配合 useBoundActions useMemo。
const singleArgCreators = {
  SET_ACTIVE_STEP: (step: string) => ({ type: 'SET_ACTIVE_STEP' as const, payload: step }),
  SET_PROJECT: (project: ProjectDetailState['project']) => ({
    type: 'SET_PROJECT' as const,
    payload: project,
  }),
  UPDATE_PROJECT: (project: NonNullable<ProjectDetailState['project']>) => ({
    type: 'UPDATE_PROJECT' as const,
    payload: project,
  }),
  SET_ACTIVE_SCRIPT: (script: AIScriptDraft | null) => ({
    type: 'SET_ACTIVE_SCRIPT' as const,
    payload: script,
  }),
  UPDATE_ACTIVE_SCRIPT: (script: AIScriptDraft) => ({
    type: 'UPDATE_ACTIVE_SCRIPT' as const,
    payload: script,
  }),
  SET_AI_LOADING: (loading: boolean) => ({ type: 'SET_AI_LOADING' as const, payload: loading }),
  SET_DRAWER_VISIBLE: (visible: boolean) => ({
    type: 'SET_DRAWER_VISIBLE' as const,
    payload: visible,
  }),
  SET_DELETE_CONFIRM_OPEN: (open: boolean) => ({
    type: 'SET_DELETE_CONFIRM_OPEN' as const,
    payload: open,
  }),
};

export function useProjectDetail(): UseProjectDetailResult {
  const { state, dispatch } = useReducerHookFactory(projectDetailReducer, initialProjectDetailState);
  const actions = useBoundActions(dispatch, singleArgCreators);

  // 多参数 action inline（useBoundActions 只支持单参数场景）
  const updateActiveScriptFromSegments = useCallback(
    (segments: ScriptSegment[], activeScript: AIScriptDraft) =>
      dispatch({
        type: 'UPDATE_ACTIVE_SCRIPT_FROM_SEGMENTS',
        payload: { segments, activeScript },
      }),
    [dispatch],
  );

  return useMemo(
    () => ({
      state,
      setActiveStep: actions.SET_ACTIVE_STEP,
      setProject: actions.SET_PROJECT,
      updateProject: actions.UPDATE_PROJECT,
      setActiveScript: actions.SET_ACTIVE_SCRIPT,
      updateActiveScript: actions.UPDATE_ACTIVE_SCRIPT,
      updateActiveScriptFromSegments,
      setAiLoading: actions.SET_AI_LOADING,
      setDrawerVisible: actions.SET_DRAWER_VISIBLE,
      setDeleteConfirmOpen: actions.SET_DELETE_CONFIRM_OPEN,
    }),
    [state, actions, updateActiveScriptFromSegments],
  );
}

// Re-export types for consumer convenience
export type { ProjectDetailState };
export { initialProjectDetailState };
