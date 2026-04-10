/**
 * Pipeline Step 接口 — 可插拔的管道步骤
 * 
 * 设计原则：
 * - 每一步输入输出类型化
 * - 支持同步/异步执行
 * - 内置进度回调
 * - 错误标准化
 * 
 * @example
 * // 定义一个 Step
 * const analyzeStep: Step<VideoInfo, AnalysisResult> = {
 *   name: 'analyze',
 *   execute: async (input, ctx) => { ... return result; }
 * };
 * 
 * // 链式组合
 * const pipeline = new ChainPipeline(analyzeStep, scoreStep, exportStep);
 * const result = await pipeline.run(videoInfo);
 */

import { logger } from '@/utils/logger';

// ============================================================
// Step 接口定义
// ============================================================

/**
 * Step 执行上下文 — 贯穿整个 Pipeline 的共享数据
 */
export interface PipelineContext {
  /** 当前步骤索引 */
  stepIndex: number;
  /** 已完成的步骤名称列表 */
  completedSteps: string[];
  /** Pipeline 级别的元数据 */
  meta: Record<string, unknown>;
  /** 中断信号 */
  signal?: AbortSignal;
}

/**
 * Step 执行选项
 */
export interface StepOptions {
  /** 中断信号 */
  signal?: AbortSignal;
  /** 进度回调 [stage, progress 0-1, message] */
  onProgress?: (stage: string, progress: number, message?: string) => void;
  /** 是否在失败时继续下一步（跳过） */
  continueOnError?: boolean;
}

/**
 * Step 元信息
 */
export interface StepMeta {
  /** 步骤名称（唯一标识） */
  name: string;
  /** 步骤描述 */
  description?: string;
  /** 预估耗时（秒） */
  estimatedDuration?: number;
  /** 是否必选 */
  required?: boolean;
}

/**
 * Step 接口 — 所有 Pipeline 步骤必须实现此接口
 */
export interface Step<TInput, TOutput> {
  /** 元信息 */
  meta: StepMeta;

  /**
   * 执行步骤
   * @param input 上一步的输出（或 Pipeline 的初始输入）
   * @param context 共享执行上下文
   * @param options 执行选项
   * @returns 本步骤的输出（作为下一步的输入）
   */
  execute(
    input: TInput,
    context: PipelineContext,
    options?: StepOptions,
  ): Promise<TOutput> | TOutput;

  /**
   * 可选：验证输入是否满足本步骤的前置条件
   */
  validate?(input: TInput): { valid: boolean; reason?: string };

  /**
   * 可选：获取本步骤的预估进度范围（用于全局进度计算）
   * @returns [startProgress, endProgress] 0-1
   */
  getProgressRange?(): [number, number];
}

// ============================================================
// Step 错误类型
// ============================================================

export class StepExecutionError extends Error {
  constructor(
    message: string,
    public readonly stepName: string,
    public readonly stepIndex: number,
    public readonly cause?: unknown,
  ) {
    super(`[Step: ${stepName}] ${message}`);
    this.name = 'StepExecutionError';
  }
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 报告进度
 */
export function reportProgress(
  onProgress: StepOptions['onProgress'] | undefined,
  stepName: string,
  progress: number,
  message?: string,
) {
  onProgress?.(stepName, progress, message);
}

/**
 * 创建标准化的 Step 包装器
 * 支持 sync 或 async 执行函数
 */
export function createStep<TInput, TOutput>(
  meta: StepMeta,
  executor: (
    input: TInput,
    context: PipelineContext,
    options?: StepOptions,
  ) => TOutput | Promise<TOutput>,
): Step<TInput, TOutput> {
  return {
    meta: { required: true, ...meta },
    // 统一转为 async execute 以符合 Step 接口
    execute: async (input, context, options) => {
      const result = executor(input, context, options);
      return result instanceof Promise ? result : Promise.resolve(result);
    },
  };
}

// ============================================================
// Pipeline Orchestrator（组合器）
// ============================================================

/**
 * Pipeline 执行结果
 */
export interface PipelineResult<TOutput> {
  success: boolean;
  output?: TOutput;
  completedSteps: string[];
  failedStep?: { name: string; error: StepExecutionError };
  totalDurationMs: number;
}

/**
 * ChainPipeline — 顺序链式执行
 * 每一步的输出自动作为下一步的输入
 */
export class ChainPipeline<TStart, TEnd> {
  private steps: Array<Step<unknown, unknown>>;

  constructor(...steps: Array<Step<unknown, unknown>>) {
    this.steps = steps;
  }

  /**
   * 执行 Pipeline
   */
  async run(
    input: TStart,
    options?: StepOptions,
  ): Promise<PipelineResult<TEnd>> {
    const startTime = Date.now();
    const context: PipelineContext = {
      stepIndex: 0,
      completedSteps: [],
      meta: {},
      signal: options?.signal,
    };

    let current: unknown = input;

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      context.stepIndex = i;

      // 检查中断
      if (context.signal?.aborted) {
        throw new StepExecutionError(
          'Pipeline aborted by signal',
          step.meta.name,
          i,
        );
      }

      // 前置验证
      if (step.validate) {
        const validation = step.validate(current);
        if (!validation.valid) {
          const error = new StepExecutionError(
            `Input validation failed: ${validation.reason}`,
            step.meta.name,
            i,
          );
          if (!options?.continueOnError) throw error;
          logger.warn(`[Pipeline] Step ${step.meta.name} validation failed, skipping:`, { reason: validation.reason });
          continue;
        }
      }

      // 执行
      try {
        logger.debug(`[Pipeline] Running step ${i + 1}/${this.steps.length}: ${step.meta.name}`);
        current = await step.execute(current, context, options);
        context.completedSteps.push(step.meta.name);
      } catch (err) {
        const error = new StepExecutionError(
          err instanceof Error ? err.message : String(err),
          step.meta.name,
          i,
          err,
        );

        if (!options?.continueOnError) {
          return {
            success: false,
            completedSteps: [...context.completedSteps],
            failedStep: { name: step.meta.name, error },
            totalDurationMs: Date.now() - startTime,
          };
        }

        logger.error(`[Pipeline] Step ${step.meta.name} failed, continuing:`, { error });
      }
    }

    return {
      success: true,
      output: current as TEnd,
      completedSteps: [...context.completedSteps],
      totalDurationMs: Date.now() - startTime,
    };
  }

  /**
   * 添加步骤到 Pipeline 末尾
   */
  addStep<TNewInput, TNewOutput>(step: Step<TNewInput, TNewOutput>): ChainPipeline<TStart, TNewOutput> {
    const newSteps = [...this.steps, step as Step<unknown, unknown>];
    const chain = new ChainPipeline<TStart, TNewOutput>(...newSteps);
    return chain;
  }
}

/**
 * ConcurrentPipeline — 并发执行多个独立分支，最后合并
 * 适用于多个并行的分析步骤
 */
export class ConcurrentPipeline<TInput, TBranchOutput, TFinal> {
  constructor(
    private branches: Array<Step<TInput, TBranchOutput>>,
    private merger: (results: TBranchOutput[], context: PipelineContext) => Promise<TFinal>,
  ) {}

  async run(input: TInput, options?: StepOptions): Promise<PipelineResult<TFinal>> {
    const startTime = Date.now();
    const context: PipelineContext = {
      stepIndex: 0,
      completedSteps: [],
      meta: {},
      signal: options?.signal,
    };

    try {
      // 并发执行所有分支
      const branchResults = await Promise.all(
        this.branches.map((branch, i) =>
          branch.execute(input, { ...context, stepIndex: i }, options),
        ),
      );

      this.branches.forEach(b => context.completedSteps.push(b.meta.name));

      // 合并结果
      const finalOutput = await this.merger(branchResults, context);

      return {
        success: true,
        output: finalOutput,
        completedSteps: [...context.completedSteps],
        totalDurationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        completedSteps: [...context.completedSteps],
        failedStep: {
          name: this.branches[context.stepIndex]?.meta.name ?? 'merger',
          error: err instanceof StepExecutionError
            ? err
            : new StepExecutionError(String(err), 'merger', context.stepIndex, err),
        },
        totalDurationMs: Date.now() - startTime,
      };
    }
  }
}

export default { ChainPipeline, ConcurrentPipeline };
