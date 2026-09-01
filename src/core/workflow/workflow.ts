/**
 * Fablr Workflow — unified types, constants, initial state, helpers
 * Self-contained workflow machine with strict type safety.
 */
import type { VideoInfo, VideoAnalysis, ScriptData, ProjectData, ExportSettings } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkflowFeatureType = 'smartClip' | 'voiceover' | 'subtitle' | 'effect' | 'none';

export type WorkflowStep =
  | 'project-create'
  | 'video-upload'
  | 'ai-analyze'
  | 'clip-repurpose'
  | 'semantic-segment'
  | 'director-review'
  | 'script-generate'
  | 'video-synth'
  | 'voice-synth'
  | 'video-export';

export type WorkflowMode = 'clip' | 'commentary';

export interface SemanticSegment {
  id: string;
  startTime: number;
  endTime: number;
  label: string;
  description?: string;
}

export interface WorkflowState {
  mode: WorkflowMode;
  currentStep: WorkflowStep;
  stepStatus: {
    'project-create': boolean;
    'video-upload': boolean;
    'ai-analyze': boolean;
    'clip-repurpose': boolean;
    'semantic-segment': boolean;
    'director-review': boolean;
    'script-generate': boolean;
    'video-synth': boolean;
    'voice-synth': boolean;
    'video-export': boolean;
  };
  selectedFeature: WorkflowFeatureType;
  project: ProjectData | null;
  currentVideo: VideoInfo | null;
  analysis: VideoAnalysis | null;
  isAnalyzing: boolean;
  analysisProgress: number;
  subtitleData: {
    ocr: Array<{ startTime: number; endTime: number; text: string }> | null;
    asr: Array<{ startTime: number; endTime: number; text: string; speaker?: string }> | null;
  };
  isGeneratingSubtitle: boolean;
  subtitleProgress: number;
  scriptData: { narration: ScriptData | null; remix: ScriptData | null };
  isGeneratingScript: boolean;
  scriptProgress: number;
  voiceData: { audioUrl: string | null; voiceSettings: { voiceId: string; speed: number; volume: number } };
  isSynthesizingVoice: boolean;
  voiceProgress: number;
  synthesisData: { finalVideoUrl: string | null; settings: { syncAudioVideo: boolean; addSubtitles: boolean; addWatermark: boolean } };
  isSynthesizing: boolean;
  synthesisProgress: number;
  exportSettings: ExportSettings | null;
  isExporting: boolean;
  exportProgress: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  // Commentary mode specific
  commentaryPlan: {
    segments: SemanticSegment[];
    totalDuration: number;
  } | null;
  directorPhase: 'pending' | 'reviewing' | 'approved';
  semanticSegments: SemanticSegment[];
}

// WorkflowAction discriminated union
export type WorkflowAction =
  | { type: 'SET_MODE'; payload: WorkflowMode }
  | { type: 'SET_STEP'; payload: WorkflowStep }
  | { type: 'SET_STEP_COMPLETE'; payload: { step: WorkflowStep; complete: boolean } }
  | { type: 'SET_FEATURE'; payload: WorkflowFeatureType }
  | { type: 'SET_PROJECT'; payload: ProjectData | null }
  | { type: 'SET_VIDEO'; payload: VideoInfo | null }
  | { type: 'SET_ANALYSIS'; payload: VideoAnalysis | null }
  | { type: 'SET_ANALYZING'; payload: { isAnalyzing: boolean; progress?: number } }
  | { type: 'SET_OCR_SUBTITLE'; payload: Array<{ startTime: number; endTime: number; text: string }> | null }
  | { type: 'SET_ASR_SUBTITLE'; payload: Array<{ startTime: number; endTime: number; text: string; speaker?: string }> | null }
  | { type: 'SET_SUBTITLE_PROGRESS'; payload: { isGenerating: boolean; progress?: number } }
  | { type: 'SET_NARRATION_SCRIPT'; payload: ScriptData | null }
  | { type: 'SET_REMIX_SCRIPT'; payload: ScriptData | null }
  | { type: 'SET_SCRIPT_PROGRESS'; payload: { isGenerating: boolean; progress?: number } }
  | { type: 'SET_VOICE'; payload: { audioUrl: string | null; settings?: { voiceId?: string; speed?: number; volume?: number } } }
  | { type: 'SET_VOICE_PROGRESS'; payload: { isSynthesizing: boolean; progress?: number } }
  | { type: 'SET_SYNTHESIS'; payload: { finalVideoUrl: string | null; settings?: { syncAudioVideo?: boolean; addSubtitles?: boolean; addWatermark?: boolean } } }
  | { type: 'SET_SYNTHESIS_PROGRESS'; payload: { isSynthesizing: boolean; progress?: number } }
  | { type: 'SET_EXPORT_SETTINGS'; payload: ExportSettings | null }
  | { type: 'SET_EXPORT_PROGRESS'; payload: { isExporting: boolean; progress?: number } }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' }
  | { type: 'RESET_STEP'; payload: WorkflowStep };

// ─── Constants ────────────────────────────────────────────────────────────────

export const CLIP_STEPS = [
  'project-create',
  'video-upload',
  'ai-analyze',
  'clip-repurpose',
  'video-export',
] as const;

export const COMMENTARY_STEPS = [
  'project-create',
  'video-upload',
  'ai-analyze',
  'semantic-segment',
  'director-review',
  'script-generate',
  'video-synth',
  'voice-synth',
  'video-export',
] as const;

export const WORKFLOW_STEPS = CLIP_STEPS;

export const INITIAL_STEP_STATUS = {
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
} as const;

export const DEFAULT_VOICE_SETTINGS = {
  voiceId: 'female_zh',
  speed: 1.0,
  volume: 0.8,
} as const;

export const DEFAULT_SYNTHESIS_SETTINGS = {
  syncAudioVideo: true,
  addSubtitles: true,
  addWatermark: false,
} as const;

// ─── Initial State ────────────────────────────────────────────────────────────

export const initialState: WorkflowState = {
  mode: 'clip',
  currentStep: 'project-create',
  stepStatus: { ...INITIAL_STEP_STATUS },
  selectedFeature: 'none',
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
  voiceData: { audioUrl: null, voiceSettings: { ...DEFAULT_VOICE_SETTINGS } },
  isSynthesizingVoice: false,
  voiceProgress: 0,
  synthesisData: { finalVideoUrl: null, settings: { ...DEFAULT_SYNTHESIS_SETTINGS } },
  isSynthesizing: false,
  synthesisProgress: 0,
  exportSettings: null,
  isExporting: false,
  exportProgress: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  error: null,
  commentaryPlan: null,
  directorPhase: 'pending',
  semanticSegments: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getStepsForMode(mode: WorkflowMode): readonly WorkflowStep[] {
  return mode === 'clip' ? CLIP_STEPS : COMMENTARY_STEPS;
}

export function getNextStep(currentStep: WorkflowStep, mode: WorkflowMode = 'clip'): WorkflowStep {
  const steps = getStepsForMode(mode);
  const currentIndex = steps.indexOf(currentStep);
  return currentIndex < steps.length - 1 ? steps[currentIndex + 1] : currentStep;
}

export function getPrevStep(currentStep: WorkflowStep, mode: WorkflowMode = 'clip'): WorkflowStep {
  const steps = getStepsForMode(mode);
  const currentIndex = steps.indexOf(currentStep);
  return currentIndex > 0 ? steps[currentIndex - 1] : currentStep;
}

export function getTotalSteps(mode: WorkflowMode): number {
  return getStepsForMode(mode).length;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        currentStep: 'project-create',
        stepStatus: { ...initialState.stepStatus },
        semanticSegments: [],
        directorPhase: 'pending',
        commentaryPlan: null,
      };

    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    case 'SET_STEP_COMPLETE':
      return {
        ...state,
        stepStatus: {
          ...state.stepStatus,
          [action.payload.step]: action.payload.complete,
        },
      };

    case 'SET_FEATURE':
      return { ...state, selectedFeature: action.payload };

    case 'SET_PROJECT':
      return {
        ...state,
        project: action.payload ? structuredClone(action.payload) : null,
        stepStatus: action.payload ? { ...state.stepStatus, 'project-create': true } : state.stepStatus,
        currentStep: action.payload ? 'video-upload' : state.currentStep,
      };

    case 'SET_VIDEO':
      return {
        ...state,
        currentVideo: action.payload ? structuredClone(action.payload) : null,
        duration: action.payload?.duration || 0,
        stepStatus: action.payload ? { ...state.stepStatus, 'video-upload': true } : state.stepStatus,
      };

    case 'SET_ANALYSIS':
      return {
        ...state,
        analysis: action.payload ? structuredClone(action.payload) : null,
        stepStatus: action.payload ? { ...state.stepStatus, 'ai-analyze': true } : state.stepStatus,
      };

    case 'SET_ANALYZING':
      return {
        ...state,
        isAnalyzing: action.payload.isAnalyzing,
        analysisProgress: action.payload.progress ?? state.analysisProgress,
      };

    case 'SET_OCR_SUBTITLE':
      return { ...state, subtitleData: { ...state.subtitleData, ocr: action.payload } };

    case 'SET_ASR_SUBTITLE':
      return { ...state, subtitleData: { ...state.subtitleData, asr: action.payload } };

    case 'SET_SUBTITLE_PROGRESS':
      return {
        ...state,
        isGeneratingSubtitle: action.payload.isGenerating,
        subtitleProgress: action.payload.progress ?? state.subtitleProgress,
      };

    case 'SET_NARRATION_SCRIPT':
      return { ...state, scriptData: { ...state.scriptData, narration: action.payload } };

    case 'SET_REMIX_SCRIPT':
      return { ...state, scriptData: { ...state.scriptData, remix: action.payload } };

    case 'SET_SCRIPT_PROGRESS':
      return {
        ...state,
        isGeneratingScript: action.payload.isGenerating,
        scriptProgress: action.payload.progress ?? state.scriptProgress,
      };

    case 'SET_VOICE':
      return {
        ...state,
        voiceData: {
          audioUrl: action.payload.audioUrl,
          voiceSettings: action.payload.settings
            ? { ...state.voiceData.voiceSettings, ...action.payload.settings }
            : state.voiceData.voiceSettings,
        },
      };

    case 'SET_VOICE_PROGRESS':
      return {
        ...state,
        isSynthesizingVoice: action.payload.isSynthesizing,
        voiceProgress: action.payload.progress ?? state.voiceProgress,
      };

    case 'SET_SYNTHESIS':
      return {
        ...state,
        synthesisData: {
          finalVideoUrl: action.payload.finalVideoUrl,
          settings: action.payload.settings
            ? { ...state.synthesisData.settings, ...action.payload.settings }
            : state.synthesisData.settings,
        },
      };

    case 'SET_SYNTHESIS_PROGRESS':
      return {
        ...state,
        isSynthesizing: action.payload.isSynthesizing,
        synthesisProgress: action.payload.progress ?? state.synthesisProgress,
      };

    case 'SET_EXPORT_SETTINGS':
      return { ...state, exportSettings: action.payload };

    case 'SET_EXPORT_PROGRESS':
      return {
        ...state,
        isExporting: action.payload.isExporting,
        exportProgress: action.payload.progress ?? state.exportProgress,
        stepStatus:
          action.payload.isExporting === false && state.exportSettings
            ? { ...state.stepStatus, 'video-export': true }
            : state.stepStatus,
      };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };

    case 'SET_DURATION':
      return { ...state, duration: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'RESET':
      return { ...initialState };

    case 'RESET_STEP': {
      const steps = getStepsForMode(state.mode);
      const resetIndex = steps.indexOf(action.payload);
      const newStepStatus = { ...initialState.stepStatus };
      for (let i = resetIndex; i < steps.length; i++) {
        newStepStatus[steps[i]] = false;
      }
      return {
        ...state,
        currentStep: action.payload,
        stepStatus: newStepStatus,
        currentVideo: null,
        analysis: null,
        subtitleData: { ocr: null, asr: null },
        scriptData: { narration: null, remix: null },
        voiceData: { audioUrl: null, voiceSettings: state.voiceData.voiceSettings },
        synthesisData: { finalVideoUrl: null, settings: state.synthesisData.settings },
        exportSettings: null,
        error: null,
      };
    }

    default:
      return state;
  }
}
