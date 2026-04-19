/**
 * useProjectAutoSave — auto-save logic hook
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { notify } from '@/shared';
import { logger } from '@/utils/logger';
import { buildDraftFingerprint, type ProjectData } from '../projectEditUtils';

interface UseProjectAutoSaveOptions {
  enabled: boolean;
  videoPath: string;
  getProjectData: () => ProjectData;
  onPersist: (options: { silent: boolean; requireVideo: boolean; requireValidName: boolean }) => Promise<ProjectData | null>;
  initialLoading: boolean;
  loading: boolean;
  saving: boolean;
}

interface UseProjectAutoSaveReturn {
  autoSaveState: 'idle' | 'saving' | 'saved' | 'error';
  lastAutoSaveAt: string;
  scheduleAutoSave: () => void;
}

export function useProjectAutoSave({
  enabled,
  videoPath,
  getProjectData,
  onPersist,
  initialLoading,
  loading,
  saving,
}: UseProjectAutoSaveOptions): UseProjectAutoSaveReturn & { setAutoSaveState: (s: 'idle' | 'saving' | 'saved' | 'error') => void } {
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState('');

  const draftTimerRef = useRef<number | null>(null);
  const requestSeqRef = useRef(0);
  const lastFingerprintRef = useRef('');
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    };
  }, []);

  const getCurrentFingerprint = useCallback(() => {
    const data = getProjectData();
    return buildDraftFingerprint({
      id: data.id,
      name: data.name,
      description: data.description,
      videoPath: data.videoPath,
      keyFrameCount: data.keyFrames?.length || 0,
      scriptCount: data.script?.length || 0,
      hasMetadata: Boolean(data.metadata),
    });
  }, [getProjectData]);

  const scheduleAutoSave = useCallback(() => {
    if (!enabled || initialLoading || loading || saving || !videoPath) return;

    const fingerprint = getCurrentFingerprint();
    if (lastFingerprintRef.current === fingerprint) return;

    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);

    const requestId = ++requestSeqRef.current;
    const isStale = () =>
      !mountedRef.current || requestId !== requestSeqRef.current;

    draftTimerRef.current = window.setTimeout(async () => {
      try {
        if (isStale()) return;
        setAutoSaveState('saving');

        const draft = await onPersist({ silent: true, requireVideo: true, requireValidName: false });
        if (isStale()) return;
        if (!draft) { setAutoSaveState('idle'); return; }

        lastFingerprintRef.current = fingerprint;
        setLastAutoSaveAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
        setAutoSaveState('saved');
      } catch (e) {
        if (isStale()) return;
        logger.error('自动保存草稿失败:', { error: e });
        setAutoSaveState('error');
      }
    }, 900);
  }, [enabled, getCurrentFingerprint, initialLoading, loading, onPersist, saving, videoPath]);

  // Sync fingerprint when project changes externally (e.g., after save)
  const syncFingerprint = useCallback((data: ProjectData) => {
    lastFingerprintRef.current = buildDraftFingerprint({
      id: data.id,
      name: data.name,
      description: data.description,
      videoPath: data.videoPath,
      keyFrameCount: data.keyFrames?.length || 0,
      scriptCount: data.script?.length || 0,
      hasMetadata: Boolean(data.metadata),
    });
  }, []);

  return {
    autoSaveState,
    lastAutoSaveAt,
    scheduleAutoSave,
    setAutoSaveState,
  };
}
