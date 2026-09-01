/**
 * workflowReducer 测试
 * 覆盖核心 action 的状态转换逻辑
 */
import { describe, it, expect } from 'vitest';
import { workflowReducer } from './workflow';
import { initialState } from './workflow';
import type { WorkflowState } from './workflow';

// Helper: create a minimal valid state
const makeState = (overrides?: Partial<WorkflowState>): WorkflowState => ({
  ...initialState,
  ...overrides,
});

describe('workflowReducer', () => {
  // ─── SET_MODE ───────────────────────────────────────────────
  describe('SET_MODE', () => {
    it('resets step/status when switching mode', () => {
      const prev = makeState({ currentStep: 'video-export', stepStatus: { ...initialState.stepStatus, 'video-upload': true } });
      const next = workflowReducer(prev, { type: 'SET_MODE', payload: 'commentary' });
      expect(next.mode).toBe('commentary');
      expect(next.currentStep).toBe('project-create');
      expect(next.stepStatus['video-upload']).toBe(false);
      expect(next.semanticSegments).toEqual([]);
    });
  });

  // ─── SET_STEP ───────────────────────────────────────────────
  describe('SET_STEP', () => {
    it('sets currentStep', () => {
      const next = workflowReducer(makeState(), { type: 'SET_STEP', payload: 'ai-analyze' });
      expect(next.currentStep).toBe('ai-analyze');
    });
  });

  // ─── SET_STEP_COMPLETE ─────────────────────────────────────
  describe('SET_STEP_COMPLETE', () => {
    it('marks a step as complete', () => {
      const next = workflowReducer(makeState(), { type: 'SET_STEP_COMPLETE', payload: { step: 'video-upload', complete: true } });
      expect(next.stepStatus['video-upload']).toBe(true);
    });

    it('marks a step as incomplete', () => {
      const prev = makeState({ stepStatus: { ...initialState.stepStatus, 'video-upload': true } });
      const next = workflowReducer(prev, { type: 'SET_STEP_COMPLETE', payload: { step: 'video-upload', complete: false } });
      expect(next.stepStatus['video-upload']).toBe(false);
    });
  });

  // ─── SET_PROJECT ───────────────────────────────────────────
  describe('SET_PROJECT', () => {
    it('sets project, marks step complete, advances to video-upload', () => {
      const project = { name: 'Test', id: '1' } as unknown as WorkflowState['project'];
      const next = workflowReducer(makeState(), { type: 'SET_PROJECT', payload: project });
      expect(next.project).toEqual(project);
      expect(next.stepStatus['project-create']).toBe(true);
      expect(next.currentStep).toBe('video-upload');
    });

    it('null payload resets project and preserves step', () => {
      const prev = makeState({ project: { name: 'Old' } as unknown as WorkflowState['project'], currentStep: 'video-upload' });
      const next = workflowReducer(prev, { type: 'SET_PROJECT', payload: null });
      expect(next.project).toBeNull();
      expect(next.currentStep).toBe('video-upload');
    });

    it('deep clones project to prevent external mutation', () => {
      type ProjectWithNested = { name: string; nested: { val: number } };
      const project: ProjectWithNested = { name: 'Test', nested: { val: 1 } };
      const next = workflowReducer(
        makeState(),
        { type: 'SET_PROJECT', payload: project as unknown as WorkflowState['project'] },
      );
      project.nested.val = 999;
      expect(((next.project ?? {}) as unknown as ProjectWithNested).nested.val).toBe(1);
    });
  });

  // ─── SET_VIDEO ─────────────────────────────────────────────
  describe('SET_VIDEO', () => {
    it('sets video and marks step complete', () => {
      const video = { duration: 120, path: '/v.mp4' } as unknown as WorkflowState['currentVideo'];
      const next = workflowReducer(makeState(), { type: 'SET_VIDEO', payload: video });
      expect(next.currentVideo).toEqual(video);
      expect(next.duration).toBe(120);
      expect(next.stepStatus['video-upload']).toBe(true);
    });

    it('null payload clears video', () => {
      const prev = makeState({ currentVideo: { duration: 60 } as unknown as WorkflowState['currentVideo'], duration: 60 });
      const next = workflowReducer(prev, { type: 'SET_VIDEO', payload: null });
      expect(next.currentVideo).toBeNull();
      expect(next.duration).toBe(0);
    });
  });

  // ─── SET_ANALYSIS ──────────────────────────────────────────
  describe('SET_ANALYSIS', () => {
    it('sets analysis and marks step complete', () => {
      const analysis = { scenes: [] } as unknown as WorkflowState['analysis'];
      const next = workflowReducer(makeState(), { type: 'SET_ANALYSIS', payload: analysis });
      expect(next.analysis).toEqual(analysis);
      expect(next.stepStatus['ai-analyze']).toBe(true);
    });
  });

  // ─── SET_ANALYZING ─────────────────────────────────────────
  describe('SET_ANALYZING', () => {
    it('sets analyzing flag and progress', () => {
      const next = workflowReducer(makeState(), { type: 'SET_ANALYZING', payload: { isAnalyzing: true, progress: 50 } });
      expect(next.isAnalyzing).toBe(true);
      expect(next.analysisProgress).toBe(50);
    });

    it('preserves progress when not provided', () => {
      const prev = makeState({ analysisProgress: 75 });
      const next = workflowReducer(prev, { type: 'SET_ANALYZING', payload: { isAnalyzing: false } });
      expect(next.analysisProgress).toBe(75);
    });
  });

  // ─── Subtitle actions ──────────────────────────────────────
  describe('subtitle actions', () => {
    it('SET_OCR_SUBTITLE sets OCR data', () => {
      const ocr = [{ startTime: 0, endTime: 1, text: 'hi' }];
      const next = workflowReducer(makeState(), { type: 'SET_OCR_SUBTITLE', payload: ocr as unknown as never });
      expect(next.subtitleData.ocr).toEqual(ocr);
    });

    it('SET_ASR_SUBTITLE sets ASR data', () => {
      const asr = [{ startTime: 0, endTime: 1, text: 'hello', speaker: 'A' }];
      const next = workflowReducer(makeState(), { type: 'SET_ASR_SUBTITLE', payload: asr as unknown as never });
      expect(next.subtitleData.asr).toEqual(asr);
    });

    it('SET_SUBTITLE_PROGRESS updates flags', () => {
      const next = workflowReducer(makeState(), { type: 'SET_SUBTITLE_PROGRESS', payload: { isGenerating: true, progress: 30 } });
      expect(next.isGeneratingSubtitle).toBe(true);
      expect(next.subtitleProgress).toBe(30);
    });
  });

  // ─── Script actions ────────────────────────────────────────
  describe('script actions', () => {
    it('SET_NARRATION_SCRIPT sets narration', () => {
      const script = { segments: [] } as unknown as WorkflowState['scriptData']['narration'];
      const next = workflowReducer(makeState(), { type: 'SET_NARRATION_SCRIPT', payload: script });
      expect(next.scriptData.narration).toEqual(script);
    });

    it('SET_REMIX_SCRIPT sets remix', () => {
      const script = { segments: [] } as unknown as WorkflowState['scriptData']['remix'];
      const next = workflowReducer(makeState(), { type: 'SET_REMIX_SCRIPT', payload: script });
      expect(next.scriptData.remix).toEqual(script);
    });
  });

  // ─── Voice actions ─────────────────────────────────────────
  describe('SET_VOICE', () => {
    it('sets audio URL', () => {
      const next = workflowReducer(makeState(), { type: 'SET_VOICE', payload: { audioUrl: '/audio.mp3' } });
      expect(next.voiceData.audioUrl).toBe('/audio.mp3');
    });

    it('merges voice settings', () => {
      const prev = makeState({ voiceData: { audioUrl: null, voiceSettings: { voiceId: 'a', speed: 1, volume: 1 } } });
      const next = workflowReducer(prev, { type: 'SET_VOICE', payload: { audioUrl: null, settings: { speed: 1.5 } } });
      expect(next.voiceData.voiceSettings.speed).toBe(1.5);
      expect(next.voiceData.voiceSettings.voiceId).toBe('a');
    });
  });

  // ─── Synthesis actions ─────────────────────────────────────
  describe('SET_SYNTHESIS', () => {
    it('sets final video URL', () => {
      const next = workflowReducer(makeState(), { type: 'SET_SYNTHESIS', payload: { finalVideoUrl: '/final.mp4' } });
      expect(next.synthesisData.finalVideoUrl).toBe('/final.mp4');
    });
  });

  describe('SET_SYNTHESIS_PROGRESS', () => {
    it('updates synthesis flags', () => {
      const next = workflowReducer(makeState(), { type: 'SET_SYNTHESIS_PROGRESS', payload: { isSynthesizing: true, progress: 60 } });
      expect(next.isSynthesizing).toBe(true);
      expect(next.synthesisProgress).toBe(60);
    });
  });

  // ─── Export actions ────────────────────────────────────────
  describe('SET_EXPORT_PROGRESS', () => {
    it('marks export step complete when exporting finishes', () => {
      const prev = makeState({ exportSettings: { format: 'mp4' } as unknown as WorkflowState['exportSettings'] });
      const next = workflowReducer(prev, { type: 'SET_EXPORT_PROGRESS', payload: { isExporting: false, progress: 100 } });
      expect(next.stepStatus['video-export']).toBe(true);
    });

    it('does not mark export complete when still exporting', () => {
      const next = workflowReducer(makeState(), { type: 'SET_EXPORT_PROGRESS', payload: { isExporting: true, progress: 50 } });
      expect(next.stepStatus['video-export']).toBe(false);
    });
  });

  // ─── Simple setters ────────────────────────────────────────
  describe('simple setters', () => {
    it('SET_PLAYING', () => {
      expect(workflowReducer(makeState(), { type: 'SET_PLAYING', payload: true }).isPlaying).toBe(true);
    });

    it('SET_CURRENT_TIME', () => {
      expect(workflowReducer(makeState(), { type: 'SET_CURRENT_TIME', payload: 42 }).currentTime).toBe(42);
    });

    it('SET_DURATION', () => {
      expect(workflowReducer(makeState(), { type: 'SET_DURATION', payload: 300 }).duration).toBe(300);
    });

    it('SET_ERROR', () => {
      expect(workflowReducer(makeState(), { type: 'SET_ERROR', payload: 'oops' }).error).toBe('oops');
    });

    it('SET_FEATURE', () => {
      expect(workflowReducer(makeState(), { type: 'SET_FEATURE', payload: 'voiceover' }).selectedFeature).toBe('voiceover');
    });
  });

  // ─── RESET ─────────────────────────────────────────────────
  describe('RESET', () => {
    it('returns to initial state', () => {
      const dirty = makeState({ currentStep: 'video-export', error: 'bad', isPlaying: true });
      const next = workflowReducer(dirty, { type: 'RESET' });
      expect(next).toEqual(initialState);
    });
  });

  // ─── RESET_STEP ────────────────────────────────────────────
  describe('RESET_STEP', () => {
    it('resets from specified step onward', () => {
      const prev = makeState({
        currentStep: 'video-export',
        currentVideo: { duration: 60 } as unknown as WorkflowState['currentVideo'],
        analysis: { scenes: [] } as unknown as WorkflowState['analysis'],
        stepStatus: { ...initialState.stepStatus, 'video-upload': true, 'ai-analyze': true },
      });
      const next = workflowReducer(prev, { type: 'RESET_STEP', payload: 'ai-analyze' });
      expect(next.currentStep).toBe('ai-analyze');
      expect(next.currentVideo).toBeNull();
      expect(next.analysis).toBeNull();
      expect(next.error).toBeNull();
    });

    it('preserves voiceSettings on reset', () => {
      const prev = makeState({
        voiceData: { audioUrl: '/a.mp3', voiceSettings: { voiceId: 'x', speed: 2, volume: 0.5 } },
      });
      const next = workflowReducer(prev, { type: 'RESET_STEP', payload: 'video-upload' });
      expect(next.voiceData.voiceSettings).toEqual({ voiceId: 'x', speed: 2, volume: 0.5 });
      expect(next.voiceData.audioUrl).toBeNull();
    });
  });

  // ─── unknown action ────────────────────────────────────────
  describe('default', () => {
    it('returns same state for unknown action', () => {
      const state = makeState();
      const next = workflowReducer(state, { type: 'UNKNOWN' } as unknown as Parameters<typeof workflowReducer>[1]);
      expect(next).toBe(state);
    });
  });
});
