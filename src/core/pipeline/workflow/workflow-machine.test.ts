/**
 * core/pipeline/workflow-machine 测试
 * 覆盖人工介入点推导（gate）、动作建议与高层动作执行
 */
import { describe, it, expect } from 'vitest';
import {
  resolveMachine,
  approveGate,
  startAutoPhase,
  firstActivePhase,
  gateLabel,
} from './workflow-machine';
import {
  createPipelineJob,
  startPhase,
  completePhase,
  failPhase,
  skipPhase,
  JOB_PHASE_ORDER,
} from '@/core/models/job';
import type { PipelineJob } from '@/core/models/job';

/** 将 job 推进到「前 n 个阶段全部完成」的状态 */
function advanceDone(job: PipelineJob, count: number): PipelineJob {
  let next = job;
  for (const phase of JOB_PHASE_ORDER.slice(0, count)) {
    next = startPhase(next, phase);
    next = completePhase(next, phase, `/tmp/${phase}.json`);
  }
  return next;
}

describe('resolveMachine', () => {
  it('全新任务：自动运行理解阶段，无 gate', () => {
    const machine = resolveMachine(createPipelineJob());
    expect(machine.action).toBe('run-phase');
    expect(machine.targetPhase).toBe('understanding');
    expect(machine.gate).toBe('none');
  });

  it('理解完成后：自动运行规划阶段', () => {
    const job = advanceDone(createPipelineJob(), 1);
    const machine = resolveMachine(job);
    expect(machine.action).toBe('run-phase');
    expect(machine.targetPhase).toBe('planning');
  });

  it('规划完成后：等待审批导演计划（plan-approval）', () => {
    const job = advanceDone(createPipelineJob(), 2);
    const machine = resolveMachine(job);
    expect(machine.action).toBe('approve-gate');
    expect(machine.gate).toBe('plan-approval');
    expect(machine.targetPhase).toBe('scripting');
  });

  it('脚本完成后：等待审阅脚本（script-review）', () => {
    const job = advanceDone(createPipelineJob(), 3);
    const machine = resolveMachine(job);
    expect(machine.action).toBe('approve-gate');
    expect(machine.gate).toBe('script-review');
    expect(machine.targetPhase).toBe('voicing');
  });

  it('配音完成后：等待试听确认（voice-review）', () => {
    const job = advanceDone(createPipelineJob(), 4);
    const machine = resolveMachine(job);
    expect(machine.action).toBe('approve-gate');
    expect(machine.gate).toBe('voice-review');
    expect(machine.targetPhase).toBe('rendering');
  });

  it('全部完成后：complete，无动作目标', () => {
    const job = advanceDone(createPipelineJob(), JOB_PHASE_ORDER.length);
    const machine = resolveMachine(job);
    expect(machine.action).toBe('complete');
    expect(machine.targetPhase).toBeNull();
  });

  it('当前阶段 failed：建议重试该阶段', () => {
    let job = createPipelineJob();
    job = startPhase(job, 'understanding');
    job = failPhase(job, 'understanding', '分析失败');
    const machine = resolveMachine(job);
    expect(machine.action).toBe('retry-phase');
    expect(machine.targetPhase).toBe('understanding');
  });

  it('当前阶段 running：等待事件推进', () => {
    const job = startPhase(createPipelineJob(), 'understanding');
    const machine = resolveMachine(job);
    expect(machine.action).toBe('wait');
    expect(machine.targetPhase).toBeNull();
  });

  it('理解阶段被跳过时：规划阶段自动可运行', () => {
    let job = createPipelineJob();
    job = startPhase(job, 'understanding');
    job = skipPhase(job, 'understanding');
    const machine = resolveMachine(job);
    expect(machine.action).toBe('run-phase');
    expect(machine.targetPhase).toBe('planning');
  });
});

describe('approveGate', () => {
  it('确认 gate 后启动对应阶段', () => {
    const job = advanceDone(createPipelineJob(), 2); // understanding + planning done
    const next = approveGate(job);
    expect(next.phaseStatus.scripting).toBe('running');
    expect(next.phase).toBe('scripting');
  });

  it('无待确认 gate 时返回原任务', () => {
    const job = createPipelineJob();
    expect(approveGate(job)).toBe(job);
  });
});

describe('startAutoPhase', () => {
  it('启动无需确认的自动阶段', () => {
    const job = createPipelineJob();
    const next = startAutoPhase(job);
    expect(next.phaseStatus.understanding).toBe('running');
  });

  it('当前为 gate 阶段时不做任何事', () => {
    const job = advanceDone(createPipelineJob(), 2);
    expect(startAutoPhase(job)).toBe(job);
  });
});

describe('firstActivePhase', () => {
  it('返回第一个未完成阶段', () => {
    const job = advanceDone(createPipelineJob(), 1);
    expect(firstActivePhase(job)).toBe('planning');
  });

  it('全部完成时返回 null', () => {
    const job = advanceDone(createPipelineJob(), JOB_PHASE_ORDER.length);
    expect(firstActivePhase(job)).toBeNull();
  });
});

describe('gateLabel', () => {
  it('返回 gate 的可读中文标签', () => {
    expect(gateLabel('plan-approval')).toContain('导演计划');
    expect(gateLabel('script-review')).toContain('解说脚本');
    expect(gateLabel('voice-review')).toContain('配音');
    expect(gateLabel('none')).toBe('');
  });
});
