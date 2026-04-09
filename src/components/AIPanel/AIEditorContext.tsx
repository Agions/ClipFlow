/**
 * AI 编辑器上下文
 * 管理 AI 剪辑编辑器全局状态
 * 支持完整流程：创建项目 -> 上传视频 -> AI分析 -> 生成文案 -> 合成视频 -> 导出
 */
import React, { createContext, useContext, useReducer, ReactNode, useMemo } from 'react';
import type { VideoInfo, VideoAnalysis, ScriptData, ProjectData, ExportSettings } from '@/core/types';

// AI 功能类型
export type AIFeatureType = 'smartClip' | 'voiceover' | 'subtitle' | 'effect' | 'none';

// AI 剪辑流程步骤
export type CutDeckStep = 
  | 'project-create'    // 1. 创建项目
  | 'video-upload'      // 2. 上传视频
  | 'ai-analyze'        // 3. AI视频分析
  | 'clip-repurpose'    // 4. AI智能拆条（新增）
  | 'script-generate'   // 5. 生成文案
  | 'video-synthesize' // 6. 视频合成
  | 'export';          // 7. 导出

// 流程状态
export interface CutDeckState {
  // 当前流程步骤
  currentStep: CutDeckStep;
  
  // 步骤完成状态
  stepStatus: {
    'project-create': boolean;
    'video-upload': boolean;
    'ai-analyze': boolean;
    'clip-repurpose': boolean;
    'script-generate': boolean;
    'video-synthesize': boolean;
    'export': boolean;
  };
  
  // 当前选中的 AI 功能
  selectedFeature: AIFeatureType;
  
  // 项目信息
  project: ProjectData | null;
  
  // 当前视频
  currentVideo: VideoInfo | null;
  
  // AI 分析结果
  analysis: VideoAnalysis | null;
  isAnalyzing: boolean;
  analysisProgress: number;
  
  // 字幕数据 (OCR字幕/语音字幕)
  subtitleData: {
    ocr: Array<{ startTime: number; endTime: number; text: string }> | null;
    asr: Array<{ startTime: number; endTime: number; text: string; speaker?: string }> | null;
  };
  isGeneratingSubtitle: boolean;
  subtitleProgress: number;
  
  // 文案数据 (解说文案/混剪文案)
  scriptData: {
    narration: ScriptData | null;  // 解说文案
    remix: ScriptData | null;       // 混剪文案
  };
  isGeneratingScript: boolean;
  scriptProgress: number;
  
  // 配音数据
  voiceData: {
    audioUrl: string | null;
    voiceSettings: {
      voiceId: string;
      speed: number;
      volume: number;
    };
  };
  isSynthesizingVoice: boolean;
  voiceProgress: number;
  
  // 合成视频数据
  synthesisData: {
    finalVideoUrl: string | null;
    settings: {
      syncAudioVideo: boolean;
      addSubtitles: boolean;
      addWatermark: boolean;
    };
  };
  isSynthesizing: boolean;
  synthesisProgress: number;
  
  // 导出设置
  exportSettings: ExportSettings | null;
  isExporting: boolean;
  exportProgress: number;
  
  // 播放状态
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  
  // 错误信息
  error: string | null;
}

// 动作类型
type CutDeckAction =
  | { type: 'SET_STEP'; payload: CutDeckStep }
  | { type: 'SET_STEP_COMPLETE'; payload: { step: CutDeckStep; complete: boolean } }
  | { type: 'SET_FEATURE'; payload: AIFeatureType }
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
  | { type: 'RESET_STEP'; payload: CutDeckStep };

// 初始状态
const initialState: CutDeckState = {
  currentStep: 'project-create',
  stepStatus: {
    'project-create': false,
    'video-upload': false,
    'ai-analyze': false,
    'clip-repurpose': false,
    'script-generate': false,
    'video-synthesize': false,
    'export': false,
  },
  selectedFeature: 'none',
  project: null,
  currentVideo: null,
  analysis: null,
  isAnalyzing: false,
  analysisProgress: 0,
  subtitleData: {
    ocr: null,
    asr: null,
  },
  isGeneratingSubtitle: false,
  subtitleProgress: 0,
  scriptData: {
    narration: null,
    remix: null,
  },
  isGeneratingScript: false,
  scriptProgress: 0,
  voiceData: {
    audioUrl: null,
    voiceSettings: {
      voiceId: 'female_zh',
      speed: 1.0,
      volume: 0.8,
    },
  },
  isSynthesizingVoice: false,
  voiceProgress: 0,
  synthesisData: {
    finalVideoUrl: null,
    settings: {
      syncAudioVideo: true,
      addSubtitles: true,
      addWatermark: false,
    },
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
};

// 获取下一步骤
const getNextStep = (currentStep: CutDeckStep): CutDeckStep => {
  const steps: CutDeckStep[] = [
    'project-create',
    'video-upload',
    'ai-analyze',
    'clip-repurpose',
    'script-generate',
    'video-synthesize',
    'export',
  ];
  const currentIndex = steps.indexOf(currentStep);
  return currentIndex < steps.length - 1 ? steps[currentIndex + 1] : currentStep;
};

// reducer
function clipFlowReducer(state: CutDeckState, action: CutDeckAction): CutDeckState {
  switch (action.type) {
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
        project: action.payload,
        stepStatus: action.payload ? { ...state.stepStatus, 'project-create': true } : state.stepStatus,
        currentStep: action.payload ? 'video-upload' : state.currentStep,
      };
    
    case 'SET_VIDEO':
      return { 
        ...state, 
        currentVideo: action.payload,
        duration: action.payload?.duration || 0,
        stepStatus: action.payload ? { ...state.stepStatus, 'video-upload': true } : state.stepStatus,
      };
    
    case 'SET_ANALYSIS':
      return { 
        ...state, 
        analysis: action.payload,
        stepStatus: action.payload ? { ...state.stepStatus, 'ai-analyze': true } : state.stepStatus,
      };
    
    case 'SET_ANALYZING':
      return { 
        ...state, 
        isAnalyzing: action.payload.isAnalyzing,
        analysisProgress: action.payload.progress ?? state.analysisProgress,
      };
    
    case 'SET_OCR_SUBTITLE':
      return {
        ...state,
        subtitleData: { ...state.subtitleData, ocr: action.payload },
      };
    
    case 'SET_ASR_SUBTITLE':
      return {
        ...state,
        subtitleData: { ...state.subtitleData, asr: action.payload },
      };
    
    case 'SET_SUBTITLE_PROGRESS':
      return { 
        ...state, 
        isGeneratingSubtitle: action.payload.isGenerating,
        subtitleProgress: action.payload.progress ?? state.subtitleProgress,
      };
    
    case 'SET_NARRATION_SCRIPT':
      return {
        ...state,
        scriptData: { ...state.scriptData, narration: action.payload },
      };
    
    case 'SET_REMIX_SCRIPT':
      return {
        ...state,
        scriptData: { ...state.scriptData, remix: action.payload },
      };
    
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
        stepStatus: action.payload.isExporting === false && state.exportSettings
          ? { ...state.stepStatus, 'export': true }
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
      return initialState;
    
    case 'RESET_STEP': {
      // 重置指定步骤及其后续步骤
      const steps: CutDeckStep[] = [
        'project-create',
        'video-upload',
        'ai-analyze',
        'clip-repurpose',
        'script-generate',
        'video-synthesize',
        'export',
      ];
      const resetIndex = steps.indexOf(action.payload);
      const newStepStatus = { ...initialState.stepStatus };
      for (let i = resetIndex; i < steps.length; i++) {
        newStepStatus[steps[i]] = false;
      }
      return {
        ...state,
        currentStep: action.payload,
        stepStatus: newStepStatus,
        // 重置相关数据
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

// 上下文类型
interface CutDeckContextType {
  state: CutDeckState;
  dispatch: React.Dispatch<CutDeckAction>;
  // 便捷方法
  setStep: (step: CutDeckStep) => void;
  setFeature: (feature: AIFeatureType) => void;
  setProject: (project: ProjectData | null) => void;
  setVideo: (video: VideoInfo | null) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setAnalysis: (analysis: VideoAnalysis | null) => void;
  setOcrSubtitle: (data: Array<{ startTime: number; endTime: number; text: string }> | null) => void;
  setAsrSubtitle: (data: Array<{ startTime: number; endTime: number; text: string; speaker?: string }> | null) => void;
  setNarrationScript: (script: ScriptData | null) => void;
  setRemixScript: (script: ScriptData | null) => void;
  setVoice: (audioUrl: string | null, settings?: { voiceId?: string; speed?: number; volume?: number }) => void;
  setSynthesis: (videoUrl: string | null, settings?: { syncAudioVideo?: boolean; addSubtitles?: boolean; addWatermark?: boolean }) => void;
  setExportSettings: (settings: ExportSettings | null) => void;
  // 流程控制
  goToNextStep: () => void;
  goToPrevStep: () => void;
  reset: () => void;
  resetStep: (step: CutDeckStep) => void;
  // 计算属性
  canProceed: () => boolean;
  completedSteps: number;
  totalSteps: number;
}

// 创建上下文
const CutDeckContext = createContext<CutDeckContextType | undefined>(undefined);

// Provider 组件
interface CutDeckProviderProps {
  children: ReactNode;
}

export const CutDeckProvider: React.FC<CutDeckProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(clipFlowReducer, initialState);
  
  // 便捷方法
  const setStep = (step: CutDeckStep) => {
    dispatch({ type: 'SET_STEP', payload: step });
  };
  
  const setFeature = (feature: AIFeatureType) => {
    dispatch({ type: 'SET_FEATURE', payload: feature });
  };
  
  const setProject = (project: ProjectData | null) => {
    dispatch({ type: 'SET_PROJECT', payload: project });
  };
  
  const setVideo = (video: VideoInfo | null) => {
    dispatch({ type: 'SET_VIDEO', payload: video });
  };
  
  const setPlaying = (playing: boolean) => {
    dispatch({ type: 'SET_PLAYING', payload: playing });
  };
  
  const setCurrentTime = (time: number) => {
    dispatch({ type: 'SET_CURRENT_TIME', payload: time });
  };
  
  const setAnalysis = (analysis: VideoAnalysis | null) => {
    dispatch({ type: 'SET_ANALYSIS', payload: analysis });
  };
  
  const setOcrSubtitle = (data: Array<{ startTime: number; endTime: number; text: string }> | null) => {
    dispatch({ type: 'SET_OCR_SUBTITLE', payload: data });
  };
  
  const setAsrSubtitle = (data: Array<{ startTime: number; endTime: number; text: string; speaker?: string }> | null) => {
    dispatch({ type: 'SET_ASR_SUBTITLE', payload: data });
  };
  
  const setNarrationScript = (script: ScriptData | null) => {
    dispatch({ type: 'SET_NARRATION_SCRIPT', payload: script });
    if (script) {
      dispatch({ type: 'SET_STEP_COMPLETE', payload: { step: 'script-generate', complete: true } });
    }
  };
  
  const setRemixScript = (script: ScriptData | null) => {
    dispatch({ type: 'SET_REMIX_SCRIPT', payload: script });
    if (script) {
      dispatch({ type: 'SET_STEP_COMPLETE', payload: { step: 'script-generate', complete: true } });
    }
  };
  
  const setVoice = (audioUrl: string | null, settings?: { voiceId?: string; speed?: number; volume?: number }) => {
    dispatch({ type: 'SET_VOICE', payload: { audioUrl, settings } });
  };
  
  const setSynthesis = (videoUrl: string | null, settings?: { syncAudioVideo?: boolean; addSubtitles?: boolean; addWatermark?: boolean }) => {
    dispatch({ type: 'SET_SYNTHESIS', payload: { finalVideoUrl: videoUrl, settings } });
    if (videoUrl) {
      dispatch({ type: 'SET_STEP_COMPLETE', payload: { step: 'video-synthesize', complete: true } });
    }
  };
  
  const setExportSettings = (settings: ExportSettings | null) => {
    dispatch({ type: 'SET_EXPORT_SETTINGS', payload: settings });
  };
  
  // 流程控制
  const goToNextStep = () => {
    const nextStep = getNextStep(state.currentStep);
    dispatch({ type: 'SET_STEP', payload: nextStep });
  };
  
  const goToPrevStep = () => {
    const steps: CutDeckStep[] = [
      'project-create',
      'video-upload',
      'ai-analyze',
      'clip-repurpose',
      'script-generate',
      'video-synthesize',
      'export',
    ];
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex > 0) {
      dispatch({ type: 'SET_STEP', payload: steps[currentIndex - 1] });
    }
  };
  
  const reset = () => {
    dispatch({ type: 'RESET' });
  };
  
  const resetStep = (step: CutDeckStep) => {
    dispatch({ type: 'RESET_STEP', payload: step });
  };
  
  // 计算属性
  const canProceed = (): boolean => {
    const { currentStep, stepStatus } = state;
    return stepStatus[currentStep] || currentStep === 'project-create';
  };
  
  const completedSteps = useMemo(() => {
    return Object.values(state.stepStatus).filter(Boolean).length;
  }, [state.stepStatus]);
  
  const totalSteps = 6;
  
  const value: CutDeckContextType = {
    state,
    dispatch,
    setStep,
    setFeature,
    setProject,
    setVideo,
    setPlaying,
    setCurrentTime,
    setAnalysis,
    setOcrSubtitle,
    setAsrSubtitle,
    setNarrationScript,
    setRemixScript,
    setVoice,
    setSynthesis,
    setExportSettings,
    goToNextStep,
    goToPrevStep,
    reset,
    resetStep,
    canProceed,
    completedSteps,
    totalSteps,
  };
  
  return (
    <CutDeckContext.Provider value={value}>
      {children}
    </CutDeckContext.Provider>
  );
};

// 使用上下文的 Hook
export const useCutDeck = (): CutDeckContextType => {
  const context = useContext(CutDeckContext);
  if (!context) {
    throw new Error('useCutDeck must be used within CutDeckProvider');
  }
  return context;
};

// 导出旧版兼容 Hook（别名）
export const useAIEditor = useCutDeck;

// 导出类型
export { CutDeckContext };
export type { CutDeckAction };
