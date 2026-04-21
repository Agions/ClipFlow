/**
 * Pipeline 断点存储服务
 * 支持 localStorage 持久化，供断点续传使用
 */

export type PipelineStep = 'analyze' | 'segment' | 'subtitle' | 'export';

export interface PipelineCheckpoint {
  videoId: string;
  completedSteps: PipelineStep[];
  currentStep: PipelineStep;
  partialResults: Record<string, unknown>;
  failedReason?: string;
  timestamp: number;
}

const CHECKPOINT_PREFIX = 'cutdeck_checkpoint_';

export function createCheckpoint(
  videoId: string,
  currentStep: PipelineStep,
  partialResults: PipelineCheckpoint['partialResults'] = {}
): PipelineCheckpoint {
  return {
    videoId,
    completedSteps: [],
    currentStep,
    partialResults,
    timestamp: Date.now(),
  };
}

export function saveCheckpoint(cp: PipelineCheckpoint): void {
  localStorage.setItem(
    `${CHECKPOINT_PREFIX}${cp.videoId}`,
    JSON.stringify(cp)
  );
}

export function loadCheckpoint(videoId: string): PipelineCheckpoint | null {
  const raw = localStorage.getItem(`${CHECKPOINT_PREFIX}${videoId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PipelineCheckpoint;
  } catch {
    return null;
  }
}

export function clearCheckpoint(videoId: string): void {
  localStorage.removeItem(`${CHECKPOINT_PREFIX}${videoId}`);
}