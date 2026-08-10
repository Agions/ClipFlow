/**
 * usePipelineJob — v3 5 阶段流水线 hook（Stage 13）
 *
 * 替代 v2 一组 use-commentary-* hooks (use-commentary-pipeline / use-commentary-script
 * / use-commentary-session / use-commentary-project-list / use-commentary-script-editor)。
 * v2 是一键黑盒 + 5 个局部 hook 拼装；v3 收敛为单一 hook：
 *
 * - startPhase(projectId, phase)  启动某阶段
 * - approvePhase(projectId, phase, modifications?)  审批并推进
 * - retryPhase(projectId, phase)   重试失败阶段
 * - skipPhase(projectId, phase)    跳过某阶段
 * - runAuto(projectId)             一键跑无 gate 阶段
 * - listenPipelineEvents(...)      订阅 backend tauri event
 *
 * 数据契约：见 `src/core/domain/job.ts` (PipelineJob) 和
 *           `src/core/tauri/methods/pipeline.ts` (pipeline.startPhase 等)。
 *
 * 副作用策略：
 * - 不内置 React state（hook 客户端按需 useState/useReducer 包装 job 即可）
 * - 事件订阅返回 unsubscribe 句柄，由调用方控制生命周期
 */

import { useCallback } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { pipeline, type PipelineJob, type JobPhase } from '@/core/tauri/methods/pipeline';

// ─── Pipeline 事件名（与 Rust commands/pipeline/types.rs 对齐） ────

export const PIPELINE_EVENTS = {
  PHASE_STARTED: 'pipeline://phase-started',
  PHASE_PROGRESS: 'pipeline://phase-progress',
  PHASE_COMPLETE: 'pipeline://phase-complete',
  PHASE_FAILED: 'pipeline://phase-failed',
  PHASE_NEEDS_REVIEW: 'pipeline://phase-needs-review',
} as const;

export type PipelineEventName = (typeof PIPELINE_EVENTS)[keyof typeof PIPELINE_EVENTS];

// ─── 事件 payload 类型 ────────────────────────────────────────────

export interface PhaseStartedPayload {
  projectId: string;
  phase: JobPhase;
  startedAt: string;
}

export interface PhaseProgressPayload {
  projectId: string;
  phase: JobPhase;
  progress: number;
  message?: string;
}

export interface PhaseCompletePayload {
  projectId: string;
  phase: JobPhase;
  artifactPath: string;
  completedAt: string;
}

export interface PhaseFailedPayload {
  projectId: string;
  phase: JobPhase;
  error: string;
}

export interface PhaseNeedsReviewPayload {
  projectId: string;
  phase: JobPhase;
  /** 'plan-approval' | 'script-review' | 'voice-review' */
  gate: 'plan-approval' | 'script-review' | 'voice-review';
}

// ─── Hook 主体 ────────────────────────────────────────────────────

export interface UsePipelineJobResult {
  startPhase: (projectId: string, phase: JobPhase) => Promise<PipelineJob>;
  approvePhase: (projectId: string, phase: JobPhase, modifications?: Record<string, unknown>) => Promise<PipelineJob>;
  retryPhase: (projectId: string, phase: JobPhase) => Promise<PipelineJob>;
  skipPhase: (projectId: string, phase: JobPhase) => Promise<PipelineJob>;
  runAuto: (projectId: string) => Promise<PipelineJob>;
  listenPhaseStarted: (handler: (payload: PhaseStartedPayload) => void) => Promise<UnlistenFn>;
  listenPhaseProgress: (handler: (payload: PhaseProgressPayload) => void) => Promise<UnlistenFn>;
  listenPhaseComplete: (handler: (payload: PhaseCompletePayload) => void) => Promise<UnlistenFn>;
  listenPhaseFailed: (handler: (payload: PhaseFailedPayload) => void) => Promise<UnlistenFn>;
  listenPhaseNeedsReview: (handler: (payload: PhaseNeedsReviewPayload) => void) => Promise<UnlistenFn>;
}

/**
 * v3 流水线 hook — 5 个 IPC 动作 + 5 个事件订阅
 *
 * @example
 * ```ts
 * const { startPhase, approvePhase, listenPhaseProgress } = usePipelineJob();
 * const job = await startPhase(projectId, 'understanding');
 * const unlisten = await listenPhaseProgress(p => console.log(p.progress));
 * // ... useEffect cleanup: unlisten();
 * ```
 */
export function usePipelineJob(): UsePipelineJobResult {
  const startPhase = useCallback((projectId: string, phase: JobPhase) => {
    return pipeline.startPhase({ projectId, phase });
  }, []);

  const approvePhase = useCallback(
    (projectId: string, phase: JobPhase, modifications?: Record<string, unknown>) => {
      return pipeline.approvePhase({ projectId, phase, modifications });
    },
    []
  );

  const retryPhase = useCallback((projectId: string, phase: JobPhase) => {
    return pipeline.retryPhase({ projectId, phase });
  }, []);

  const skipPhase = useCallback((projectId: string, phase: JobPhase) => {
    return pipeline.skipPhase({ projectId, phase });
  }, []);

  const runAuto = useCallback((projectId: string) => {
    return pipeline.runAuto(projectId);
  }, []);

  const listenPhaseStarted = useCallback((handler: (p: PhaseStartedPayload) => void) => {
    return listen<PhaseStartedPayload>(PIPELINE_EVENTS.PHASE_STARTED, e => handler(e.payload));
  }, []);

  const listenPhaseProgress = useCallback((handler: (p: PhaseProgressPayload) => void) => {
    return listen<PhaseProgressPayload>(PIPELINE_EVENTS.PHASE_PROGRESS, e => handler(e.payload));
  }, []);

  const listenPhaseComplete = useCallback((handler: (p: PhaseCompletePayload) => void) => {
    return listen<PhaseCompletePayload>(PIPELINE_EVENTS.PHASE_COMPLETE, e => handler(e.payload));
  }, []);

  const listenPhaseFailed = useCallback((handler: (p: PhaseFailedPayload) => void) => {
    return listen<PhaseFailedPayload>(PIPELINE_EVENTS.PHASE_FAILED, e => handler(e.payload));
  }, []);

  const listenPhaseNeedsReview = useCallback((handler: (p: PhaseNeedsReviewPayload) => void) => {
    return listen<PhaseNeedsReviewPayload>(PIPELINE_EVENTS.PHASE_NEEDS_REVIEW, e => handler(e.payload));
  }, []);

  return {
    startPhase,
    approvePhase,
    retryPhase,
    skipPhase,
    runAuto,
    listenPhaseStarted,
    listenPhaseProgress,
    listenPhaseComplete,
    listenPhaseFailed,
    listenPhaseNeedsReview,
  };
}
