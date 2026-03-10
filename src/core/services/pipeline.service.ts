/**
 * 管道工作流服务
 * 简化的完整视频创作工作流
 */

import { v4 as uuidv4 } from 'uuid';

// 工作流步骤
export type WorkflowStep = 
  | 'idle'
  | 'upload'
  | 'analyzing'
  | 'clipping'
  | 'editing'
  | 'exporting'
  | 'completed'
  | 'error';

// 工作流状态
export interface PipelineState {
  step: WorkflowStep;
  progress: number;        // 0-100
  currentTask: string;
  totalDuration: number;
  estimatedTimeRemaining: number;
}

// 工作流配置
export interface PipelineConfig {
  // 视频分析
  autoAnalyze: boolean;
  
  // 智能剪辑
  enableSmartClip: boolean;
  
  // 解说生成
  enableCommentary: boolean;
  
  // 导出
  exportFormat: 'mp4' | 'webm' | 'mov' | 'mkv';
  exportQuality: 'low' | 'medium' | 'high';
  
  // 高级
  enablePreview: boolean;
  autoSave: boolean;
}

// 默认配置
const DEFAULT_CONFIG: PipelineConfig = {
  autoAnalyze: true,
  enableSmartClip: true,
  enableCommentary: true,
  exportFormat: 'mp4',
  exportQuality: 'high',
  enablePreview: true,
  autoSave: true,
};

// 工作流事件
export type WorkflowEventType = 
  | 'step_changed'
  | 'progress_updated'
  | 'task_completed'
  | 'error_occurred'
  | 'workflow_completed';

export interface WorkflowEvent {
  type: WorkflowEventType;
  step?: WorkflowStep;
  progress?: number;
  message?: string;
  error?: Error;
}

// 工作流监听器
type WorkflowListener = (event: WorkflowEvent) => void;

// 工作流结果
export interface WorkflowResult {
  success: boolean;
  timeline?: Record<string, unknown>;
  outputPath?: string;
  duration: number;
  metadata: {
    stepsCompleted: number;
    totalSteps: number;
    errors: string[];
  };
}

export class PipelineService {
  private config: PipelineConfig;
  private state: PipelineState;
  private listeners: Set<WorkflowListener> = new Set();
  private abortController: AbortController | null = null;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      step: 'idle',
      progress: 0,
      currentTask: '',
      totalDuration: 0,
      estimatedTimeRemaining: 0,
    };
  }

  /**
   * 执行完整工作流
   */
  async execute(
    videoFile: File,
    onProgress?: (state: PipelineState) => void
  ): Promise<WorkflowResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let stepsCompleted = 0;
    const totalSteps = this.calculateTotalSteps();

    // 创建取消控制器
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      // Step 1: 上传 (5%)
      this.updateState('upload', 5, '正在上传视频...');
      await this.uploadVideo(videoFile, signal);
      stepsCompleted++;
      
      if (signal.aborted) throw new Error('工作流已取消');

      // Step 2: 分析 (25%)
      if (this.config.autoAnalyze) {
        this.updateState('analyzing', 30, '正在分析视频...');
        await this.analyzeVideo(signal);
        stepsCompleted++;
      }
      
      if (signal.aborted) throw new Error('工作流已取消');

      // Step 3: 智能剪辑 (35%)
      if (this.config.enableSmartClip) {
        this.updateState('clipping', 65, '正在进行智能剪辑...');
        await this.smartClip(signal);
        stepsCompleted++;
      }
      
      if (signal.aborted) throw new Error('工作流已取消');

      // Step 4: 编辑 (15%)
      this.updateState('editing', 80, '正在处理编辑...');
      await this.processEditing(signal);
      stepsCompleted++;

      // Step 5: 导出 (20%)
      this.updateState('exporting', 100, '正在导出视频...');
      const outputPath = await this.exportVideo(signal);
      stepsCompleted++;

      // 完成
      this.updateState('completed', 100, '工作流完成!');

      const duration = (Date.now() - startTime) / 1000;

      return {
        success: true,
        outputPath,
        duration,
        metadata: {
          stepsCompleted,
          totalSteps,
          errors,
        },
      };

    } catch (error) {
      this.updateState('error', this.state.progress, error instanceof Error ? error.message : '未知错误');
      errors.push(error instanceof Error ? error.message : '未知错误');
      
      return {
        success: false,
        duration: (Date.now() - startTime) / 1000,
        metadata: {
          stepsCompleted,
          totalSteps,
          errors,
        },
      };
    }
  }

  /**
   * 取消工作流
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.state.step = 'idle';
    this.emit({ type: 'error_occurred', message: '工作流已取消' });
  }

  /**
   * 暂停工作流
   */
  pause(): void {
    // 实现暂停逻辑
    this.emit({ type: 'step_changed', step: 'idle', message: '工作流已暂停' });
  }

  /**
   * 恢复工作流
   */
  resume(): void {
    // 实现恢复逻辑
  }

  /**
   * 获取当前状态
   */
  getState(): PipelineState {
    return { ...this.state };
  }

  /**
   * 获取配置
   */
  getConfig(): PipelineConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 订阅工作流事件
   */
  subscribe(listener: WorkflowListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 计算总步骤数
   */
  private calculateTotalSteps(): number {
    let steps = 1; // 上传
    if (this.config.autoAnalyze) steps++;
    if (this.config.enableSmartClip) steps++;
    steps++; // 编辑
    steps++; // 导出
    return steps;
  }

  /**
   * 更新状态
   */
  private updateState(step: WorkflowStep, progress: number, task: string): void {
    this.state = {
      ...this.state,
      step,
      progress,
      currentTask: task,
      estimatedTimeRemaining: this.estimateTime(progress),
    };
    
    this.emit({
      type: 'progress_updated',
      step,
      progress,
      message: task,
    });
  }

  /**
   * 估算剩余时间
   */
  private estimateTime(progress: number): number {
    const elapsed = progress > 0 ? (Date.now() - Date.now()) / progress : 0;
    return Math.max(0, (100 - progress) * elapsed);
  }

  /**
   * 发送事件
   */
  private emit(event: WorkflowEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  // ===== 工作流步骤 =====

  private async uploadVideo(file: File, signal: AbortSignal): Promise<void> {
    // 模拟上传
    await this.delay(500);
    
    if (signal.aborted) throw new Error('已取消');
    
    // 实际实现需要上传到服务器
    console.log('视频上传完成:', file.name);
  }

  private async analyzeVideo(signal: AbortSignal): Promise<void> {
    // 模拟视频分析
    await this.delay(1000);
    
    if (signal.aborted) throw new Error('已取消');
    
    // 调用 visionService
    console.log('视频分析完成');
  }

  private async smartClip(signal: AbortSignal): Promise<void> {
    // 模拟智能剪辑
    await this.delay(1500);
    
    if (signal.aborted) throw new Error('已取消');
    
    // 调用 clipWorkflowService
    console.log('智能剪辑完成');
  }

  private async processEditing(signal: AbortSignal): Promise<void> {
    // 模拟编辑处理
    await this.delay(800);
    
    if (signal.aborted) throw new Error('已取消');
    
    console.log('编辑处理完成');
  }

  private async exportVideo(signal: AbortSignal): Promise<string> {
    // 模拟导出
    await this.delay(2000);
    
    if (signal.aborted) throw new Error('已取消');
    
    // 调用 exportService
    const outputPath = `export/${Date.now()}.${this.config.exportFormat}`;
    console.log('视频导出完成:', outputPath);
    
    return outputPath;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例
export const pipelineService = new PipelineService();
export default pipelineService;
