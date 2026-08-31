import { useMemo } from 'react';
import { useReducerHookFactory } from '@/shared/hooks/use-reducer-hook';
import { useBoundActions } from '@/shared/hooks/use-bound-actions';
import type { AIScriptDraft } from '@/core/services/ai/script-service';
import type { ScriptSegment } from '@/types';
import {
  initialScriptDetailState,
  scriptDetailReducer,
  type ScriptDetailState,
} from './use-script-detail-reducer';

interface UseScriptDetailResult {
  state: ScriptDetailState;
  setLoading: (loading: boolean) => void;
  setProject: (project: ScriptDetailState['project']) => void;
  setScript: (script: AIScriptDraft | null) => void;
  setSegments: (segments: ScriptSegment[]) => void;
  setLoadError: (loadError: string) => void;
  incrementReloadToken: () => void;
  setIsSaving: (isSaving: boolean) => void;
  setIsExporting: (isExporting: boolean) => void;
  setIsDeleting: (isDeleting: boolean) => void;
  setDeleteConfirmOpen: (open: boolean) => void;
  resetForLoad: () => void;
  resetForReload: () => void;
}

// module-level action creators — 稳定引用配合 useBoundActions useMemo
const actionCreators = {
  SET_LOADING: (loading: boolean) => ({ type: 'SET_LOADING' as const, payload: loading }),
  SET_PROJECT: (project: ScriptDetailState['project']) => ({
    type: 'SET_PROJECT' as const,
    payload: project,
  }),
  SET_SCRIPT: (script: AIScriptDraft | null) => ({ type: 'SET_SCRIPT' as const, payload: script }),
  SET_SEGMENTS: (segments: ScriptSegment[]) => ({
    type: 'SET_SEGMENTS' as const,
    payload: segments,
  }),
  SET_LOAD_ERROR: (loadError: string) => ({ type: 'SET_LOAD_ERROR' as const, payload: loadError }),
  INCREMENT_RELOAD_TOKEN: () => ({ type: 'INCREMENT_RELOAD_TOKEN' as const, payload: undefined }),
  SET_IS_SAVING: (isSaving: boolean) => ({ type: 'SET_IS_SAVING' as const, payload: isSaving }),
  SET_IS_EXPORTING: (isExporting: boolean) => ({
    type: 'SET_IS_EXPORTING' as const,
    payload: isExporting,
  }),
  SET_IS_DELETING: (isDeleting: boolean) => ({ type: 'SET_IS_DELETING' as const, payload: isDeleting }),
  SET_DELETE_CONFIRM_OPEN: (open: boolean) => ({
    type: 'SET_DELETE_CONFIRM_OPEN' as const,
    payload: open,
  }),
  RESET: () => ({ type: 'RESET' as const, payload: undefined }),
};

export function useScriptDetail(): UseScriptDetailResult {
  const { state, dispatch } = useReducerHookFactory(scriptDetailReducer, initialScriptDetailState);
  const actions = useBoundActions(dispatch, actionCreators);

  return useMemo(
    () => ({
      state,
      setLoading: actions.SET_LOADING,
      setProject: actions.SET_PROJECT,
      setScript: actions.SET_SCRIPT,
      setSegments: actions.SET_SEGMENTS,
      setLoadError: actions.SET_LOAD_ERROR,
      setIsSaving: actions.SET_IS_SAVING,
      setIsExporting: actions.SET_IS_EXPORTING,
      setIsDeleting: actions.SET_IS_DELETING,
      setDeleteConfirmOpen: actions.SET_DELETE_CONFIRM_OPEN,
      incrementReloadToken: () => actions.INCREMENT_RELOAD_TOKEN(undefined),
      resetForLoad: () => actions.RESET(undefined),
      resetForReload: () => actions.RESET(undefined),
    }),
    [state, actions],
  );
}

export type { ScriptDetailState };
export { initialScriptDetailState };
