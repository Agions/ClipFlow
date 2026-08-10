/**
 * workflow-machine — 流水线工作流状态机（纯 TS）
 *
 * 职责：
 * - 在 PipelineJob 领域状态机（core/domain/job）之上，推导「人工介入点」：
 *   脚本生成前需审批导演计划（plan-approval）、配音前需审阅脚本（script-review）、
 *   渲染前需试听配音（voice-review）。
 * - 与 job.ts 的分工：job.ts 负责阶段状态的合法流转（done/failed/skipped），
 *   本文件负责「何时可以流转」的业务决策（gate 推导）与高层动作。
 * - 零框架依赖，可测试、可序列化。
 */

import {
  startPhase,
  JOB_PHASE_ORDER,
  type PipelineJob,
  type JobPhase,
} from '@/core/domain/job';

// ─── 人工介入点（gate） ────────────────────────────────────────

/** 当前阻塞的人工确认点；'none' 表示无需人工介入 */
export type MachineGate = 'none' | 'plan-approval' | 'script-review' | 'voice-review';

/** 机器推导出的可执行动作 */
export type MachineAction = 'run-phase' | 'approve-gate' | 'retry-phase' | 'wait' | 'complete';

export interface WorkflowMachineState {
  /** 当前任务快照 */
  job: PipelineJob;
  /** 需要的人工确认点（action = approve-gate 时非 none） */
  gate: MachineGate;
  /** 建议执行的动作 */
  action: MachineAction;
  /** 动作作用的目标阶段（complete / wait 时为 null） */
  targetPhase: JobPhase | null;
}

// ─── 阶段 → gate 映射 ──────────────────────────────────────────

/**
 * 各阶段启动前所需的人工确认点。
 * 首阶段（understanding）与规划阶段（planning）无需人工确认；
 * 脚本生成前审批计划、配音前审阅脚本、渲染前试听配音。
 */
const GATE_BY_PHASE: Record<Exclude<JobPhase, 'understanding' | 'planning'>, MachineGate> = {
  scripting: 'plan-approval',
  voicing: 'script-review',
  rendering: 'voice-review',
};

// ─── 核心推导 ──────────────────────────────────────────────────

/**
 * 推导工作流机器的当前状态
 *
 * 规则：
 * 1. 全部阶段 done/skipped → complete
 * 2. 当前阶段 failed → retry-phase（可重试，不重跑前置阶段）
 * 3. 当前阶段 running → wait（等待后端事件推进）
 * 4. 当前阶段 pending：
 *    - understanding / planning → run-phase（自动启动）
 *    - scripting / voicing / rendering → approve-gate（先人工确认）
 */
export function resolveMachine(job: PipelineJob): WorkflowMachineState {
  const current = firstActivePhase(job);

  if (current === null) {
    return { job, gate: 'none', action: 'complete', targetPhase: null };
  }

  const status = job.phaseStatus[current];

  if (status === 'failed') {
    return { job, gate: 'none', action: 'retry-phase', targetPhase: current };
  }

  if (status === 'running') {
    return { job, gate: 'none', action: 'wait', targetPhase: null };
  }

  // status === 'pending'
  if (current === 'understanding' || current === 'planning') {
    return { job, gate: 'none', action: 'run-phase', targetPhase: current };
  }

  return {
    job,
    gate: GATE_BY_PHASE[current],
    action: 'approve-gate',
    targetPhase: current,
  };
}

// ─── 高层动作 ──────────────────────────────────────────────────

/**
 * 人工确认 gate 并启动对应阶段
 *
 * @param job 当前任务
 * @returns 已启动阶段的新任务；无待确认 gate 时返回原任务不变
 */
export function approveGate(job: PipelineJob): PipelineJob {
  const machine = resolveMachine(job);
  if (machine.action !== 'approve-gate' || machine.targetPhase === null) return job;
  return startPhase(job, machine.targetPhase);
}

/**
 * 启动无需人工确认的阶段（understanding / planning）
 *
 * @param job 当前任务
 * @returns 已启动阶段的新任务；当前无 run 动作时返回原任务不变
 */
export function startAutoPhase(job: PipelineJob): PipelineJob {
  const machine = resolveMachine(job);
  if (machine.action !== 'run-phase' || machine.targetPhase === null) return job;
  return startPhase(job, machine.targetPhase);
}

// ─── 辅助函数 ──────────────────────────────────────────────────

/** 查找第一个未完成（非 done/skipped）的阶段；全部完成返回 null */
export function firstActivePhase(job: PipelineJob): JobPhase | null {
  return JOB_PHASE_ORDER.find(
    (phase) => job.phaseStatus[phase] !== 'done' && job.phaseStatus[phase] !== 'skipped',
  ) ?? null;
}

/** 人工介入点的可读标签（供 UI 展示） */
export function gateLabel(gate: MachineGate): string {
  switch (gate) {
    case 'plan-approval':
      return '请审批 AI 导演计划';
    case 'script-review':
      return '请审阅并确认解说脚本';
    case 'voice-review':
      return '请试听配音并确认';
    case 'none':
      return '';
  }
}
