/**
 * useProjectEditState — useReducer-backed replacement for the 17
 * `useState` calls previously inline in ProjectEdit. See the
 * sibling `.reducer.ts` for the state shape.
 *
 * Consolidation: the state template is built ONCE via
 * `createInitialProjectEditState`, reused both as the `useReducer`
 * initializer and as the `createAutoSetters` initializer. The auto
 * setters are keyed by state key, so they are renamed to `setXxx` at
 * the return boundary to preserve the original public API and to avoid
 * clobbering the state values.
 *
 * Usage:
 *   const { formName, setFormName, ... } = useProjectEditState({
 *     defaultProjectName,
 *   });
 *
 * The hook owns the state and persists settings (saveBehavior /
 * autoSaveEnabled) to localStorage when the corresponding setter is
 * invoked, so the call sites don't need extra `try { localStorage... }`
 * blocks.
 */
import { useMemo, useReducer } from 'react';

import {
  PROJECT_AUTO_SAVE_KEY,
  PROJECT_SAVE_BEHAVIOR_KEY,
  type ProjectSaveBehavior,
} from '@/shared/constants/constants';
import { createAutoSetters, type Setter } from '@/shared/hooks/use-auto-setters';
import { createDefaultProjectName, type ProjectData } from '../project-edit-utils';
import type { VideoMetadata } from '@/core/video';
import type { ScriptSegment } from '@/types';
import {
  createInitialProjectEditState,
  projectEditReducer,
  type ProjectEditState,
} from './use-project-edit-state-reducer';

interface UseProjectEditStateOptions {
  /** Override the default project name (typically passed from outside so
   *  the name is stable across re-renders). */
  defaultProjectName?: string;
}

function readSaveBehavior(): ProjectSaveBehavior {
  try {
    const val = localStorage.getItem(PROJECT_SAVE_BEHAVIOR_KEY);
    if (val === 'workspace' || val === 'script' || val === 'asset' || val === 'detail' || val === 'stay') {
      return val as ProjectSaveBehavior;
    }
    return 'workspace';
  } catch {
    return 'workspace';
  }
}

function readAutoSaveEnabled(): boolean {
  try {
    return localStorage.getItem(PROJECT_AUTO_SAVE_KEY) === '1';
  } catch {
    return false;
  }
}

interface UseProjectEditStateResult extends ProjectEditState {
  setFormName: Setter<string>;
  setFormDescription: Setter<string>;
  setProject: Setter<ProjectData | null>;
  setIsNewProject: Setter<boolean>;
  setCurrentStep: Setter<number>;
  setSaving: Setter<boolean>;
  setInitialLoading: Setter<boolean>;
  setError: Setter<string | null>;
  setReloadToken: Setter<number>;
  setVideoPath: Setter<string>;
  setVideoSelected: Setter<boolean>;
  setVideoMetadata: Setter<VideoMetadata | null>;
  setKeyFrames: Setter<string[]>;
  setScriptSegments: Setter<ScriptSegment[]>;
  setSaveBehavior: Setter<ProjectSaveBehavior>;
  setAutoSaveEnabled: Setter<boolean>;
}

export function useProjectEditState(
  options: UseProjectEditStateOptions = {},
): UseProjectEditStateResult {
  const defaultProjectName = options.defaultProjectName ?? createDefaultProjectName();

  // Build ONE state template and reuse it for both the reducer and the
  // auto-setters initializer.
  const initial = createInitialProjectEditState(
    defaultProjectName,
    readSaveBehavior,
    readAutoSaveEnabled,
  );

  const [state, dispatch] = useReducer(projectEditReducer, initial);

  const setters = useMemo(() => createAutoSetters(dispatch, initial), [dispatch, initial]);

  return {
    ...state,
    setFormName: setters.formName,
    setFormDescription: setters.formDescription,
    setProject: setters.project,
    setIsNewProject: setters.isNewProject,
    setCurrentStep: setters.currentStep,
    setSaving: setters.saving,
    setInitialLoading: setters.initialLoading,
    setError: setters.error,
    setReloadToken: setters.reloadToken,
    setVideoPath: setters.videoPath,
    setVideoSelected: setters.videoSelected,
    setVideoMetadata: setters.videoMetadata,
    setKeyFrames: setters.keyFrames,
    setScriptSegments: setters.scriptSegments,
    setSaveBehavior: setters.saveBehavior,
    setAutoSaveEnabled: setters.autoSaveEnabled,
  };
}
