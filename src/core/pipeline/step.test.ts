/**
 * core/pipeline/step.ts — 单元测试
 *
 * 测试 ChainPipeline 编排器、createStep 工厂、reportProgress 工具以及 StepExecutionError。
 */
import { describe, it, expect, vi } from 'vitest';

import { ChainPipeline, createStep, reportProgress, type PipelineContext, type Step } from './step';

// ─── createStep ───────────────────────────────────────────────────────────────

describe('createStep', () => {
  it('wraps a synchronous executor in an async Step interface', async () => {
    const step = createStep<number, number>({ name: 'double' }, input => input * 2);
    const ctx: PipelineContext = { stepIndex: 0, completedSteps: [], meta: {} };
    const result = await step.execute(21, ctx);
    expect(result).toBe(42);
  });

  it('returns executor promise when executor is async', async () => {
    const step = createStep<string, string>({ name: 'async' }, async input => `${input}!`);
    const ctx: PipelineContext = { stepIndex: 0, completedSteps: [], meta: {} };
    await expect(step.execute('hi', ctx)).resolves.toBe('hi!');
  });

  it('meta.required 默认 true 但可被 meta.required 覆盖', async () => {
    const step = createStep<unknown, unknown>({ name: 'optional', required: false }, () => 'ok');
    expect(step.meta.required).toBe(false);
  });
});

// ─── reportProgress ───────────────────────────────────────────────────────────

describe('reportProgress', () => {
  it('invokes onProgress callback when provided', () => {
    const cb = vi.fn();
    reportProgress(cb, 'step1', 0.5, 'halfway');
    expect(cb).toHaveBeenCalledWith('step1', 0.5, 'halfway');
  });

  it('no-op when callback is undefined', () => {
    expect(() => reportProgress(undefined, 'x', 1)).not.toThrow();
  });
});

// ─── ChainPipeline ────────────────────────────────────────────────────────────

function makeAddStep(n: number): Step<number, number> {
  return createStep<number, number>({ name: `add${n}` }, input => input + n);
}

describe('ChainPipeline', () => {
  it('runs steps sequentially, passing output as next input', async () => {
    const pipeline = new ChainPipeline<number, number>(
      makeAddStep(1),
      makeAddStep(2),
      makeAddStep(3)
    );
    const result = await pipeline.run(10);
    expect(result.success).toBe(true);
    expect(result.output).toBe(16); // 10+1+2+3
    expect(result.completedSteps).toEqual(['add1', 'add2', 'add3']);
  });

  it('returns failedStep on error when continueOnError=false', async () => {
    const failingStep: Step<number, number> = createStep<number, number>({ name: 'fail' }, () => {
      throw new Error('boom');
    });
    const pipeline = new ChainPipeline<number, number>(makeAddStep(1), failingStep, makeAddStep(2));
    const result = await pipeline.run(0);
    expect(result.success).toBe(false);
    expect(result.completedSteps).toEqual(['add1']);
    expect(result.failedStep?.name).toBe('fail');
    expect(result.failedStep?.error.message).toContain('boom');
    expect(result.failedStep?.error.name).toBe('StepExecutionError');
  });

  it('skips failed step and continues when continueOnError=true', async () => {
    const failingStep: Step<number, number> = createStep<number, number>({ name: 'fail' }, () => {
      throw new Error('skip-me');
    });
    const pipeline = new ChainPipeline<number, number>(makeAddStep(1), failingStep, makeAddStep(2));
    const result = await pipeline.run(0, { continueOnError: true });
    // first step completed; failing step errored but pipeline continued
    // output of failing step was the input 1; then add2 turns it to 3
    expect(result.success).toBe(true);
    expect(result.output).toBe(3);
    expect(result.completedSteps).toEqual(['add1', 'add2']);
  });

  it('throws when validate() returns invalid and continueOnError=false', async () => {
    const validateStep: Step<number, number> = {
      meta: { name: 'validate-fail' },
      execute: async n => n,
      validate: () => ({ valid: false, reason: 'negative' }),
    };
    const pipeline = new ChainPipeline<number, number>(validateStep);
    let caught: unknown;
    try {
      await pipeline.run(-5);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain('Input validation failed');
    expect((caught as Error).message).toContain('negative');
  });

  it('skips invalid step but continues when continueOnError=true', async () => {
    const validateStep: Step<number, number> = {
      meta: { name: 'validate-fail' },
      execute: async n => n + 100,
      validate: () => ({ valid: false, reason: 'skip' }),
    };
    const pipeline = new ChainPipeline<number, number>(validateStep, makeAddStep(1));
    const result = await pipeline.run(0, { continueOnError: true });
    expect(result.success).toBe(true);
    expect(result.completedSteps).toEqual(['add1']);
  });

  it('throws StepExecutionError when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const pipeline = new ChainPipeline<number, number>(makeAddStep(1));
    await expect(pipeline.run(0, { signal: controller.signal })).rejects.toThrow(/aborted/);
  });

  it('propagates options.onProgress to each step', async () => {
    const onProgress = vi.fn();
    const progressStep: Step<number, number> = createStep<number, number>(
      { name: 'progress' },
      async (input, _ctx, options) => {
        options?.onProgress?.('progress', 0.5, 'halfway');
        return input + 1;
      }
    );
    const pipeline = new ChainPipeline<number, number>(progressStep);
    await pipeline.run(0, { onProgress });
    expect(onProgress).toHaveBeenCalledWith('progress', 0.5, 'halfway');
  });

  it('addStep appends a step and returns a new pipeline', async () => {
    const p1 = new ChainPipeline<number, number>(makeAddStep(1));
    const p2 = p1.addStep(makeAddStep(2));
    // p1 has 1 step, p2 has 2 steps
    const r1 = await p1.run(10);
    const r2 = await p2.run(10);
    expect(r1.output).toBe(11);
    expect(r2.output).toBe(13);
  });

  it('records totalDurationMs as a positive number', async () => {
    const pipeline = new ChainPipeline<number, number>(makeAddStep(1));
    const result = await pipeline.run(0);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.totalDurationMs).toBe('number');
  });

  it('handles empty pipeline: passes input through as output', async () => {
    const pipeline = new ChainPipeline<string, string>();
    const result = await pipeline.run('hello');
    expect(result.success).toBe(true);
    expect(result.output).toBe('hello');
    expect(result.completedSteps).toEqual([]);
  });

  it('initializes PipelineContext with stepIndex=0, completedSteps=[], meta={}', async () => {
    let captured: PipelineContext | undefined;
    const inspectStep: Step<number, number> = createStep<number, number>(
      { name: 'inspect' },
      (_, ctx) => {
        // snapshot completedSteps 元组以避免后续 push 产生变更
        captured = {
          stepIndex: ctx.stepIndex,
          completedSteps: [...ctx.completedSteps],
          meta: { ...ctx.meta },
          signal: ctx.signal,
        };
        return 0;
      }
    );
    await new ChainPipeline<number, number>(inspectStep).run(0);
    expect(captured).toBeDefined();
    expect(captured!.stepIndex).toBe(0);
    expect(captured!.completedSteps).toEqual([]);
    expect(captured!.meta).toEqual({});
  });

  it('context.stepIndex updates each iteration', async () => {
    const indices: number[] = [];
    const recorder: Step<number, number> = createStep<number, number>({ name: 'rec' }, (_, ctx) => {
      indices.push(ctx.stepIndex);
      return 0;
    });
    await new ChainPipeline<number, number>(recorder, recorder, recorder).run(0);
    expect(indices).toEqual([0, 1, 2]);
  });

  it('non-Error thrown values are stringified into message', async () => {
    const throwingStep: Step<number, number> = createStep<number, number>(
      { name: 'throw-string' },
      () => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'string-error';
      }
    );
    const result = await new ChainPipeline<number, number>(throwingStep).run(0);
    expect(result.success).toBe(false);
    expect(result.failedStep?.error.message).toContain('string-error');
  });

  it('uses options.signal to populate context.signal', async () => {
    let captured: AbortSignal | undefined;
    const step: Step<number, number> = createStep<number, number>({ name: 'cap' }, (_, ctx) => {
      captured = ctx.signal;
      return 1;
    });
    const controller = new AbortController();
    await new ChainPipeline<number, number>(step).run(0, {
      signal: controller.signal,
    });
    expect(captured).toBe(controller.signal);
  });
});

// ─── default export ───────────────────────────────────────────────────────────

describe('default export', () => {
  it('exposes ChainPipeline as named default', async () => {
    const mod = await import('./step');
    expect(mod.default.ChainPipeline).toBe(ChainPipeline);
  });
});
