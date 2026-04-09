/**
 * WorkflowEngine - 工作流状态机引擎
 *
 * 从顺序管道到图执行的升级：
 * - 基于 WORKFLOW_MODE_DEFINITIONS 构建可执行的步骤图
 * - 支持条件分支（config 驱动跳过步骤）
 * - 支持步骤级原子重试（context.retry()）
 * - 支持并行步骤（Future-like，analyze / template-select）
 * - 进度通过 observer 模式广播
 *
 * 原有 step executor 不变，只替换编排层。
 */
import { logger } from '@/utils/logger';
import { WORKFLOW_MODE_DEFINITIONS, WORKFLOW_STEP_CONFIG, type WorkflowMode } from '@/core/workflow/featureBlueprint';
import { ALIGNMENT_GATE_THRESHOLD } from '@/core/workflow/alignmentGate';
import type { WorkflowState, WorkflowData, WorkflowConfig, WorkflowCallbacks, WorkflowStep } from './types';
import type { IStepExecutor as StepExecutor, StepResult } from './IStepExecutor';

// ============================================
// Engine State
// ============================================

export type EngineStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface EngineState {
  status: EngineStatus;
  currentStep: WorkflowStep | null;
  completedSteps: WorkflowStep[];
  failedStep: WorkflowStep | null;
  progress: number;
  error: string | null;
}

// ============================================
// Step Context（传给每个 executor）
// ============================================

export interface StepContext {
  projectId: string;
  config: WorkflowConfig;
  data: WorkflowData;
  step: WorkflowStep;
  attempt: number;           // 当前尝试次数（1-based）
  maxRetries: number;       // 最大重试次数

  /**
   * 请求重试当前步骤（抛异常等效，但保留 attempt 计数）
   */
  retry: (reason?: string) => never;

  /**
   * 跳过当前步骤（及其后续依赖步骤，如已规划）
   */
  skip: (reason?: string) => void;

  /**
   * 更新 data（部分合并）
   */
  updateData: (patch: Partial<WorkflowData>) => void;

  /**
   * 发布步骤进度（0-100）
   */
  reportProgress: (p: number, message?: string) => void;
}

function createStepContext(
  projectId: string,
  config: WorkflowConfig,
  data: WorkflowData,
  step: WorkflowStep,
  attempt: number,
  maxRetries: number,
  onProgress: (p: number, msg?: string) => void,
  onUpdateData: (patch: Partial<WorkflowData>) => void,
): StepContext {
  return {
    projectId,
    config,
    data,
    step,
    attempt,
    maxRetries,

    retry(reason?: string) {
      throw new RetryRequest(reason ?? `Step ${step} requested retry`);
    },

    skip(_reason?: string) {
      throw new SkipRequest(step);
    },

    updateData: onUpdateData,

    reportProgress: onProgress,
  };
}

// ============================================
// Signal Errors
// ============================================

export class RetryRequest extends Error {
  readonly isRetry = true;
  constructor(msg: string) { super(msg); }
}

export class SkipRequest extends Error {
  readonly isSkip = true;
  constructor(public readonly step: WorkflowStep, public readonly reason?: string) { 
    super(reason ? `Skip step: ${step} (${reason})` : `Skip step: ${step}`); 
  }
}

// ============================================
// Engine
// ============================================

export type EngineSubscriber = (state: EngineState) => void;

export class WorkflowEngine {
  // ---- State ----
  private _state: EngineState = {
    status: 'idle',
    currentStep: null,
    completedSteps: [],
    failedStep: null,
    progress: 0,
    error: null,
  };

  private data: WorkflowData = {};
  private config: WorkflowConfig | null = null;
  private projectId: string = '';
  private abortController: AbortController | null = null;
  private subscribers: Set<EngineSubscriber> = new Set();
  private stepExecutorMap: Map<WorkflowStep, StepExecutor> = new Map();
  private maxRetries: number = 1;

  // ---- Derived ----
  get state(): Readonly<EngineState> { return this._state; }

  /** 获取当前工作流数据 */
  getData(): WorkflowData { return (this as any)._data; }

  // ---- Subscriber ----
  subscribe(fn: EngineSubscriber): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  private emit(): void {
    this.subscribers.forEach(fn => fn(this._state));
  }

  private setState(patch: Partial<EngineState>): void {
    this._state = { ...this._state, ...patch };
    this.emit();
  }

  private amendState(updater: (s: EngineState) => Partial<EngineState>): void {
    this._state = { ...this._state, ...updater(this._state) };
    this.emit();
  }

  // ---- Config ----
  setMaxRetries(n: number): this { this.maxRetries = n; return this; }

  registerStepExecutor(step: WorkflowStep, executor: StepExecutor): this {
    this.stepExecutorMap.set(step, executor);
    return this;
  }

  // ---- Run ----
  async run(
    projectId: string,
    mode: WorkflowMode,
    config: WorkflowConfig,
    initialData?: Partial<WorkflowData>,
  ): Promise<WorkflowData> {
    this.projectId = projectId;
    this.config = config;
    this.data = { ...initialData };
    this.abortController = new AbortController();
    this.setState({ status: 'running', currentStep: null, completedSteps: [], failedStep: null, progress: 0, error: null });

    const definition = WORKFLOW_MODE_DEFINITIONS[mode];
    const steps = this.buildExecutionPlan(definition.steps);

    try {
      for (const step of steps) {
        if (this.abortController.signal.aborted) break;
        await this.executeStep(step);
      }
      this.setState({ status: 'completed', currentStep: null, progress: 100 });
      return this.data;
    } catch (err) {
      if (err instanceof SkipRequest) {
        // skip 被视为完成
        this.setState({ status: 'completed', currentStep: null, progress: this._state.progress });
        return this.data;
      }
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('[WorkflowEngine] fatal error', { error: msg, step: this._state.currentStep });
      this.setState({ status: 'error', error: msg });
      throw err;
    }
  }

  abort(): void {
    this.abortController?.abort();
  }

  pause(): void {
    if (this._state.status !== 'running') return;
    this.setState({ status: 'paused' });
    logger.info('[WorkflowEngine] paused at step:', this._state.currentStep);
  }

  resume(): void {
    if (this._state.status !== 'paused') return;
    this.setState({ status: 'running' });
    logger.info('[WorkflowEngine] resumed');
  }

  // ============================================
  // Execution Plan Builder
  // ============================================

  /**
   * 根据模式步骤定义 + config 条件，构建实际执行序列。
   * 处理：
   * - 条件跳过（autoAnalyze=false → skip analyze）
   * - 并行候选（analyze / template-select 声明 parallelable，实际串行但独立规划）
   */
  private buildExecutionPlan(modeSteps: Array<WorkflowStep | 'ai-clip'>): WorkflowStep[] {
    const cfg = this.config!;
    const result: WorkflowStep[] = [];

    for (const raw of modeSteps) {
      const step = raw === 'ai-clip' ? 'ai-clip' : raw;
      if (!this.shouldExecute(step as WorkflowStep, cfg)) {
        logger.info(`[WorkflowEngine] skipping step (condition): ${step}`);
        continue;
      }
      result.push(step as WorkflowStep);
    }

    return result;
  }

  private shouldExecute(step: WorkflowStep, cfg: WorkflowConfig): boolean {
    switch (step) {
      case 'analyze':           return cfg.autoAnalyze !== false;
      case 'script-generate':   return cfg.autoGenerateScript !== false;
      case 'script-dedup':      return cfg.autoDedup !== false;
      case 'ai-clip':           return cfg.aiClipConfig?.enabled ?? false;
      default:                  return true;
    }
  }

  // ============================================
  // Step Executor with Retry
  // ============================================

  private async executeStep(step: WorkflowStep): Promise<void> {
    const executor = this.stepExecutorMap.get(step);
    if (!executor) {
      logger.warn(`[WorkflowEngine] no executor registered for step: ${step}, skipping`);
      return;
    }

    this.setState({ currentStep: step });

    let attempt = 1;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      const ctx = createStepContext(
        this.projectId,
        this.config!,
        this.data,
        step,
        attempt,
        this.maxRetries,
        (p, msg) => this.emitStepProgress(step, p, msg),
        (patch) => { this.data = { ...this.data, ...patch }; },
      );

      try {
        const result = await executor.execute(ctx);
        this.amendState((s) => ({ completedSteps: [...s.completedSteps, step] }));
        logger.info(`[WorkflowEngine] step completed: ${step} (attempt ${attempt})`);
        return;
      } catch (err) {
        if (err instanceof RetryRequest) {
          attempt++;
          lastError = err;
          logger.info(`[WorkflowEngine] retry step ${step}: attempt ${attempt}/${this.maxRetries} — ${err.message}`);
          continue;
        }
        if (err instanceof SkipRequest) {
          logger.info(`[WorkflowEngine] step skipped: ${step}`);
          return;
        }
        // 其他错误 → 立即失败
        lastError = err instanceof Error ? err : new Error(String(err));
        break;
      }
    }

    // 所有重试耗尽
    throw lastError ?? new Error(`Step ${step} failed after ${this.maxRetries} attempts`);
  }

  // ============================================
  // Progress Mapping
  // ============================================

  private emitStepProgress(step: WorkflowStep, stepProgress: number, message?: string): void {
    const STEP_WEIGHTS: Record<WorkflowStep, number> = {
      upload:           10,
      analyze:          15,
      'template-select': 5,
      'script-generate': 15,
      'script-dedup':    5,
      'script-edit':     5,
      subtitle:          5,
      'ai-clip':        20,
      repurposing:       5,
      music:             5,
      'timeline-edit':  15,
      preview:           5,
      export:           10,
    };
    const total = Object.values(STEP_WEIGHTS).reduce((a, b) => a + b, 0);
    const stepWeight = STEP_WEIGHTS[step] ?? 5;

    const completedWeight = this._state.completedSteps.reduce(
      (sum, s) => sum + (STEP_WEIGHTS[s] ?? 5), 0
    );
    const overall = Math.round(((completedWeight + (stepProgress / 100) * stepWeight) / total) * 100);
    this.setState({ progress: Math.min(overall, 99) });
  }
}
