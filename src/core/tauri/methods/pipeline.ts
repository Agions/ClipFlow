/**
 * pipeline — Tauri IPC 方法（v3 5 阶段流水线 · Stage 13）
 *
 * 替代 v2 `runCommentaryPipeline` 一键黑盒：
 * - pipeline.startPhase     启动某个阶段（状态机 → running）
 * - pipeline.approvePhase   审批阶段产物（推进到下一阶段）
 * - pipeline.retryPhase     重试失败阶段
 * - pipeline.skipPhase      跳过阶段（如用户已有脚本）
 * - pipeline.runAuto        自动跑完无 gate 阶段（understanding + planning）
 *
 * 数据模型：见 `src/core/domain/job.ts` (PipelineJob / JobPhase / PhaseRunState)
 * 后端实现：见 `src-tauri/src/commands/pipeline/`
 */

import { invoke, TauriCommand } from '../invoke';
import type { PipelineJobDto } from '../command-types';

// ─── 公共类型 ──────────────────────────────────────────────

/** PipelineJob = PipelineJobDto（与 Rust PipelineJob 对齐的 IPC 数据契约） */
export type PipelineJob = PipelineJobDto;

/** 阶段枚举（与 domain/job.ts 对齐） */
export type JobPhase = PipelineJobDto['phase'];

/** 阶段执行状态 */
export type PhaseRunState = PipelineJobDto['phaseStatus'][JobPhase];

// ─── Input DTO ──────────────────────────────────────────────

/** pipeline_start_phase 入参 */
export interface StartPhaseInput {
  projectId: string;
  phase: JobPhase;
  params?: Record<string, unknown> | null;
}

/** pipeline_approve_phase 入参 */
export interface ApprovePhaseInput {
  projectId: string;
  phase: JobPhase;
  modifications?: Record<string, unknown> | null;
}

/** pipeline_retry_phase 入参 */
export interface RetryPhaseInput {
  projectId: string;
  phase: JobPhase;
}

/** pipeline_skip_phase 入参 */
export interface SkipPhaseInput {
  projectId: string;
  phase: JobPhase;
}

// ─── 统一导出 ──────────────────────────────────────────────

export const pipeline = {
  /**
   * 启动指定阶段（状态机 → running + 触发阶段执行）
   * 真实业务逻辑在 steps/ 落地后由后端自动执行；当前 Stage 13 仅做状态推进。
   */
  async startPhase(input: StartPhaseInput): Promise<PipelineJob> {
    return invoke(TauriCommand.PIPELINE_START_PHASE, {
      projectId: input.projectId,
      phase: input.phase,
      params: input.params ?? null,
    });
  },

  /**
   * 审批阶段产物（推进到下一阶段）
   * - 标记当前阶段 done
   * - 下一阶段（如有）发 needs-review 事件
   */
  async approvePhase(input: ApprovePhaseInput): Promise<PipelineJob> {
    return invoke(TauriCommand.PIPELINE_APPROVE_PHASE, {
      projectId: input.projectId,
      phase: input.phase,
      modifications: input.modifications ?? null,
    });
  },

  /**
   * 重试失败阶段（failed → pending）
   * - 幂等：非 failed 阶段调用返回原 job
   */
  async retryPhase(input: RetryPhaseInput): Promise<PipelineJob> {
    return invoke(TauriCommand.PIPELINE_RETRY_PHASE, {
      projectId: input.projectId,
      phase: input.phase,
    });
  },

  /**
   * 跳过阶段（标记为 skipped，推进到下一阶段）
   * - 适用：用户已有脚本想跳过 scripting
   */
  async skipPhase(input: SkipPhaseInput): Promise<PipelineJob> {
    return invoke(TauriCommand.PIPELINE_SKIP_PHASE, {
      projectId: input.projectId,
      phase: input.phase,
    });
  },

  /**
   * 一键自动跑完无 gate 阶段（understanding + planning）
   * - 有 gate 的阶段（scripting/voicing/rendering）仍需用户审批
   */
  async runAuto(projectId: string): Promise<PipelineJob> {
    return invoke(TauriCommand.PIPELINE_RUN_AUTO, { projectId });
  },
};
