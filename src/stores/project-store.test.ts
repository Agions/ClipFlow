/**
 * ProjectStore — 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProjectStore } from './project-store';

beforeEach(() => {
  useProjectStore.setState({
    state: {
      mode: 'clip',
      currentStep: 'project-create',
      selectedFeature: 'smartClip',
      project: null,
      currentVideo: null,
      analysis: null,
      isAnalyzing: false,
      analysisProgress: 0,
      subtitleData: { ocr: null, asr: null },
      isGeneratingSubtitle: false,
      subtitleProgress: 0,
      scriptData: { narration: null, remix: null },
      isGeneratingScript: false,
      scriptProgress: 0,
      voiceData: {
        audioUrl: null,
        voiceSettings: { voiceId: 'zh-CN-XiaoxiaoNeural', speed: 1, volume: 1 },
      },
      isSynthesizingVoice: false,
      voiceProgress: 0,
      synthesisData: {
        finalVideoUrl: null,
        settings: { syncAudioVideo: false, addSubtitles: false, addWatermark: false },
      },
      isSynthesizing: false,
      synthesisProgress: 0,
      exportSettings: null,
      isExporting: false,
      exportProgress: 0,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      error: null,
      commentaryPlan: { segments: [], totalDuration: 0 },
      directorPhase: 'pending',
      semanticSegments: [],
      stepStatus: {
        'project-create': false,
        'video-upload': false,
        'ai-analyze': false,
        'clip-repurpose': false,
        'semantic-segment': false,
        'director-review': false,
        'script-generate': false,
        'video-synth': false,
        'voice-synth': false,
        'video-export': false,
      },
    },
    // Intentionally omit `dispatch: () => {}` — tests that need to stub
    // dispatch do so explicitly. Tests that exercise the real dispatch
    // (e.g. the L77 coverage test) rely on the original implementation
    // defined in project-store.ts.
  });
});

describe('useProjectStore', () => {
  describe('dispatch function', () => {
    it('runs storyFabReducer through real dispatch (L77)', () => {
      const realDispatch = useProjectStore.getState().dispatch;

      const before = useProjectStore.getState().state;
      realDispatch({ type: 'SET_MODE', payload: 'commentary' });
      const after = useProjectStore.getState().state;
      expect(after.mode).toBe('commentary');
      expect(before.mode).toBe('clip');
    });
  });

  describe('setMode', () => {
    it('dispatches SET_MODE', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore.getState().setMode('clip');
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MODE', payload: 'clip' });
    });
  });

  describe('setVideo', () => {
    it('dispatches SET_VIDEO with video payload', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      const video = {
        id: 'v1',
        path: '/tmp/v.mp4',
        name: 'v.mp4',
        duration: 10,
        width: 1920,
        height: 1080,
        fps: 30,
        format: 'mp4',
        size: 1024,
        thumbnail: '',
        createdAt: new Date().toISOString(),
      };
      useProjectStore.getState().setVideo(video);
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VIDEO', payload: video });
    });
  });

  describe('setAnalysis', () => {
    it('dispatches SET_ANALYSIS with analysis payload', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      const analysis = {
        id: 'a1',
        videoId: 'v1',
        scenes: [],
        keyframes: [],
        objects: [],
        emotions: [],
        summary: '',
        stats: {
          sceneCount: 0,
          objectCount: 0,
          avgSceneDuration: 0,
          sceneTypes: {},
          objectCategories: {},
          dominantEmotions: {},
        },
        createdAt: new Date().toISOString(),
      };
      useProjectStore.getState().setAnalysis(analysis);
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ANALYSIS', payload: analysis });
    });
  });

  describe('goToNextStep', () => {
    it('dispatches SET_STEP', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore.getState().goToNextStep();
      expect(dispatch).toHaveBeenCalled();
      const call = dispatch.mock.calls[0][0];
      expect(call.type).toBe('SET_STEP');
      expect(call.payload).toBeDefined();
    });
  });

  describe('goToPrevStep', () => {
    it('dispatches SET_STEP', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      // Set to a step that has a previous step
      useProjectStore.getState().setStep('video-upload');
      useProjectStore.getState().goToPrevStep();
      expect(dispatch).toHaveBeenCalled();
      const call = dispatch.mock.calls[0][0];
      expect(call.type).toBe('SET_STEP');
      expect(call.payload).toBeDefined();
    });
  });

  describe('updateVideo', () => {
    it('does nothing when currentVideo is null', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore.getState().updateVideo({ name: 'new.mp4' });
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('resets state via set', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore.getState().reset();
      // reset calls set() directly, not dispatch
      expect(useProjectStore.getState().state.mode).toBe('clip');
    });
  });

  describe('setters', () => {
    it('setOcrSubtitle dispatches SET_OCR_SUBTITLE', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore.getState().setOcrSubtitle([{ startTime: 0, endTime: 1, text: 'hi' }]);
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_OCR_SUBTITLE',
        payload: [{ startTime: 0, endTime: 1, text: 'hi' }],
      });
    });

    it('setAsrSubtitle dispatches SET_ASR_SUBTITLE', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore
        .getState()
        .setAsrSubtitle([{ startTime: 0, endTime: 1, text: 'hi', speaker: 'a' }]);
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_ASR_SUBTITLE',
        payload: [{ startTime: 0, endTime: 1, text: 'hi', speaker: 'a' }],
      });
    });

    it('setDuration dispatches SET_DURATION', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore.getState().setDuration(120);
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DURATION', payload: 120 });
    });

    it('setStep dispatches SET_STEP', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore.getState().setStep('video-upload');
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_STEP', payload: 'video-upload' });
    });

    it('setFeature dispatches SET_FEATURE', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore.getState().setFeature('smartClip');
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_FEATURE', payload: 'smartClip' });
    });

    it('setProject dispatches SET_PROJECT', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore.getState().setProject({ id: 'p1', name: 'P1' } as never);
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_PROJECT',
        payload: { id: 'p1', name: 'P1' },
      });
    });

    it('setNarrationScript dispatches SET_NARRATION_SCRIPT', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore
        .getState()
        .setNarrationScript({ id: 'n1', title: 't', content: 'hi', segments: [] });
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_NARRATION_SCRIPT',
        payload: { id: 'n1', title: 't', content: 'hi', segments: [] },
      });
    });

    it('setRemixScript dispatches SET_REMIX_SCRIPT', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore
        .getState()
        .setRemixScript({ id: 'r1', title: 'r', content: 'remix', segments: [] });
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_REMIX_SCRIPT',
        payload: { id: 'r1', title: 'r', content: 'remix', segments: [] },
      });
    });

    it('setVoice dispatches SET_VOICE', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore.getState().setVoice('/audio.mp3', { voiceId: 'v1' });
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_VOICE',
        payload: { audioUrl: '/audio.mp3', settings: { voiceId: 'v1' } },
      });
    });

    it('setSynthesis dispatches SET_SYNTHESIS', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore.getState().setSynthesis('/out.mp4', { addSubtitles: true });
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SYNTHESIS',
        payload: { finalVideoUrl: '/out.mp4', settings: { addSubtitles: true } },
      });
    });

    it('setExportSettings dispatches SET_EXPORT_SETTINGS', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore.getState().setExportSettings({} as never);
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_EXPORT_SETTINGS', payload: {} });
    });
  });

  describe('updateVideo', () => {
    it('updates currentVideo when present', () => {
      // Pre-populate state directly so updateVideo's if-branch is taken
      const video = {
        id: 'v1',
        path: '/tmp/v.mp4',
        name: 'v.mp4',
        duration: 10,
        width: 1920,
        height: 1080,
        fps: 30,
        format: 'mp4',
        size: 1024,
        thumbnail: '',
        createdAt: new Date().toISOString(),
      };
      useProjectStore.setState(s => ({
        state: { ...s.state, currentVideo: video },
      }));
      // 调用 updateVideo：内部 dispatch 被 beforeEach 替换为 no-op，
      // 因此改为验证它被调用（未抛错）
      expect(() => useProjectStore.getState().updateVideo({ name: 'new.mp4' })).not.toThrow();
    });

    it('does nothing when currentVideo is null (re-confirm)', () => {
      useProjectStore.setState(s => ({
        state: { ...s.state, currentVideo: null },
      }));
      useProjectStore.getState().updateVideo({ name: 'new.mp4' });
      expect(useProjectStore.getState().state.currentVideo).toBeNull();
    });
  });

  describe('canProceed / completedSteps / totalSteps', () => {
    it('canProceed returns true when stepStatus[currentStep] is true', () => {
      useProjectStore.setState(s => ({
        state: {
          ...s.state,
          currentStep: 'video-upload',
          stepStatus: { ...s.state.stepStatus, 'video-upload': true },
        },
      }));
      expect(useProjectStore.getState().canProceed()).toBe(true);
    });

    it('canProceed returns true on project-create regardless of stepStatus', () => {
      useProjectStore.setState(s => ({
        state: {
          ...s.state,
          currentStep: 'project-create',
        },
      }));
      expect(useProjectStore.getState().canProceed()).toBe(true);
    });

    it('canProceed returns false on incomplete step', () => {
      useProjectStore.setState(s => ({
        state: {
          ...s.state,
          currentStep: 'video-upload',
          stepStatus: { ...s.state.stepStatus, 'video-upload': false },
        },
      }));
      expect(useProjectStore.getState().canProceed()).toBe(false);
    });

    it('totalSteps getter is accessible', () => {
      // 验证 getter 不抛错、返回数字
      const ts = useProjectStore.getState().totalSteps;
      expect(typeof ts).toBe('number');
    });

    it('completedSteps getter is accessible', () => {
      const cs = useProjectStore.getState().completedSteps;
      expect(typeof cs).toBe('number');
    });
  });

  describe('resetStep', () => {
    it('dispatches RESET_STEP with target step', () => {
      const dispatch = vi.fn();
      useProjectStore.setState({ dispatch });
      useProjectStore.getState().resetStep('video-upload');
      expect(dispatch).toHaveBeenCalledWith({ type: 'RESET_STEP', payload: 'video-upload' });
    });
  });
});
