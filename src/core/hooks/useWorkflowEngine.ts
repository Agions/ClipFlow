/**
 * useWorkflowEngine — React hook for WorkflowEngine
 *
 * 包装 createWorkflowEngine() 工厂 + WorkflowEngine 实例，
 * 连接 subscriber 模式到 React useState。
 *
 * 相比旧 useWorkflow 的改进：
 * - 基于 WorkflowEngine 状态机（而非手写状态机）
 * - 支持多并发实例（factory 每次创建新 engine）
 * - 步骤重试由引擎自动处理
 * - 进度映射由引擎统一计算
 *
 * 用法：
 *   const { state, run, pause, resume, abort } = useWorkflowEngine();
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { createWorkflowEngine } from '@/core/services/workflow/steps/adapters';
import { WorkflowEngine } from '@/core/services/workflow/WorkflowEngine';
import type { EngineState } from '@/core/services/workflow/WorkflowEngine';
import type { WorkflowMode } from '@/core/workflow/featureBlueprint';
import type { WorkflowConfig, WorkflowData } from '@/core/services/workflow/types';

// ============================================
// State shape (aligned with EngineState)
// ============================================

export interface WorkflowEngineState {
  status: EngineState['status'];
  currentStep: EngineState['currentStep'];
  completedSteps: EngineState['completedSteps'];
  failedStep: EngineState['failedStep'];
  progress: EngineState['progress'];
  error: EngineState['error'];
  /** 内部 engine.data，workflow 完成后可访问 */
  data: WorkflowData;
}

// ============================================
// Hook
// ============================================

export interface UseWorkflowEngineOptions {
  /** 单步最大重试次数（默认 1） */
  maxRetries?: number;
  /** 自动启动（默认 false） */
  autoStart?: boolean;
  /** 初始数据（run 时会合并） */
  initialData?: Partial<WorkflowData>;
}

export function useWorkflowEngine(options: UseWorkflowEngineOptions = {}) {
  const { maxRetries = 1, initialData } = options;

  const engineRef = useRef<WorkflowEngine | null>(null);

  const [state, setState] = useState<WorkflowEngineState>({
    status: 'idle',
    currentStep: null,
    completedSteps: [],
    failedStep: null,
    progress: 0,
    error: null,
    data: (initialData ?? {}) as WorkflowData,
  });

  // Lazily create engine (avoids recreating on every render)
  function getEngine(): WorkflowEngine {
    if (!engineRef.current) {
      engineRef.current = createWorkflowEngine(maxRetries);
    }
    return engineRef.current;
  }

  // Subscribe engine state → React state
  useEffect(() => {
    const engine = getEngine();

    const unsubscribe = engine.subscribe((engineState: EngineState) => {
      setState((prev) => ({
        status: engineState.status,
        currentStep: engineState.currentStep,
        completedSteps: engineState.completedSteps,
        failedStep: engineState.failedStep,
        progress: engineState.progress,
        error: engineState.error,
        // data is read from engine directly on completion
        data: prev.data,
      }));
    });

    // Sync initial state
    setState((prev) => ({ ...prev, ...engine.state }));

    return unsubscribe;
  }, [maxRetries]);

  // ============================================
  // Actions
  // ============================================

  /**
   * 启动工作流（完整流程，自动执行所有已注册步骤）
   */
  const run = useCallback(
    async (
      projectId: string,
      mode: WorkflowMode,
      config: WorkflowConfig,
      initialDataOverride?: Partial<WorkflowData>
    ): Promise<WorkflowData> => {
      const engine = getEngine();
      const mergedData = { ...initialData, ...initialDataOverride };

      setState((prev) => ({
        ...prev,
        status: 'running',
        error: null,
      }));

      try {
        const data = await engine.run(projectId, mode, config, mergedData as WorkflowData);
        setState((prev) => ({ ...prev, data, status: 'completed', progress: 100 }));
        return data;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        setState((prev) => ({ ...prev, error, status: 'error' }));
        throw err;
      }
    },
    [initialData]
  );

  /**
   * 暂停工作流
   */
  const pause = useCallback(() => {
    getEngine().pause();
  }, []);

  /**
   * 恢复已暂停的工作流
   */
  const resume = useCallback(() => {
    getEngine().resume();
  }, []);

  /**
   * 中止工作流
   */
  const abort = useCallback(() => {
    getEngine().abort();
    setState((prev) => ({ ...prev, status: 'idle', progress: 0 }));
  }, []);

  /**
   * 重置引擎状态（重新开始）
   */
  const reset = useCallback(() => {
    const engine = getEngine();
    engine.abort();
    setState({
      status: 'idle',
      currentStep: null,
      completedSteps: [],
      failedStep: null,
      progress: 0,
      error: null,
      data: (initialData ?? {}) as WorkflowData,
    });
  }, [initialData]);

  /**
   * 直接获取当前 engine data（运行时读取）
   */
  const getData = useCallback((): WorkflowData => {
    return getEngine().getData();
  }, []);

  // ============================================
  // Computed helpers
  // ============================================

  const isIdle = state.status === 'idle';
  const isRunning = state.status === 'running';
  const isPaused = state.status === 'paused';
  const isCompleted = state.status === 'completed';
  const hasError = state.status === 'error';

  return {
    // State
    state,
    isIdle,
    isRunning,
    isPaused,
    isCompleted,
    hasError,

    // Actions
    run,
    pause,
    resume,
    abort,
    reset,
    getData,
  };
}
