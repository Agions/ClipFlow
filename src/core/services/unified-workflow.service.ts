/**
 * 统一解说混剪工作流服务
 * 整合解说、混剪、AI剪辑为统一流程
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { visionService } from './vision.service';
import { aiService } from './ai.service';
import { smartCutService } from './smart-cut.service';
import { subtitleService } from './subtitle.service';

/**
 * 工作流模式
 */
export type WorkflowMode = 'commentary' | 'mixclip' | 'first-person';

/**
 * 工作流状态
 */
export interface WorkflowState {
  id: string;
  mode: WorkflowMode;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  currentStep: string;
  steps: WorkflowStep[];
  result?: WorkflowResult;
  error?: string;
}

/**
 * 工作流步骤
 */
export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  duration?: number;
}

/**
 * 工作流结果
 */
export interface WorkflowResult {
  videoId: string;
  videoPath: string;
  duration: number;
  clips: VideoClip[];
  script?: ScriptData;
  subtitles?: SubtitleData;
}

/**
 * 视频片段
 */
export interface VideoClip {
  id: string;
  sourceIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  scenes: SceneInfo[];
  audioPeaks: AudioPeak[];
}

/**
 * 场景信息
 */
export interface SceneInfo {
  startTime: number;
  endTime: number;
  type: 'action' | 'dialog' | 'landscape' | 'closeup';
  score: number;
}

/**
 * 音频峰值
 */
export interface AudioPeak {
  timestamp: number;
  type: 'applause' | 'laughter' | 'music' | 'speech';
  score: number;
}

/**
 * 脚本数据
 */
export interface ScriptData {
  segments: ScriptSegment[];
  totalDuration: number;
  language: string;
}

/**
 * 脚本片段
 */
export interface ScriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  voice?: string;
}

/**
 * 字幕数据
 */
export interface SubtitleData {
  entries: SubtitleEntry[];
  language: string;
}

/**
 * 字幕条目
 */
export interface SubtitleEntry {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * 统一工作流服务
 */
export class UnifiedWorkflowService {
  private workflows: Map<string, WorkflowState> = new Map();

  /**
   * 创建工作流
   */
  async createWorkflow(mode: WorkflowMode): Promise<WorkflowState> {
    const id = uuidv4();
    
    const steps: WorkflowStep[] = [
      { id: '1', name: '上传视频', status: 'pending', progress: 0 },
      { id: '2', name: '视频分析', status: 'pending', progress: 0 },
      { id: '3', name: 'AI 智能剪辑', status: 'pending', progress: 0 },
      { id: '4', name: '生成解说', status: 'pending', progress: 0 },
      { id: '5', name: '字幕处理', status: 'pending', progress: 0 },
      { id: '6', name: '导出成片', status: 'pending', progress: 0 },
    ];

    const workflow: WorkflowState = {
      id,
      mode,
      status: 'idle',
      progress: 0,
      currentStep: '上传视频',
      steps,
    };

    this.workflows.set(id, workflow);
    logger.info('[UnifiedWorkflow] 创建工作流', { id, mode });
    
    return workflow;
  }

  /**
   * 执行工作流
   */
  async executeWorkflow(
    workflowId: string,
    videos: ArrayBuffer[],
    options?: Record<string, unknown>
  ): Promise<WorkflowResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('工作流不存在');
    }

    workflow.status = 'running';
    logger.info('[UnifiedWorkflow] 开始执行工作流', { workflowId, mode: workflow.mode });

    try {
      // 步骤1: 视频分析
      await this.runStep(workflow, '上传视频', async () => {
        // 上传视频
        logger.info('步骤1: 视频上传完成');
      });

      // 步骤2: AI 分析
      await this.runStep(workflow, '视频分析', async () => {
        const analysisResults = await Promise.all(
          videos.map(video => visionService.analyzeVideo(video))
        );
        logger.info('步骤2: 视频分析完成', { count: analysisResults.length });
        return analysisResults;
      });

      // 步骤3: AI 智能剪辑
      await this.runStep(workflow, 'AI 智能剪辑', async () => {
        const clips = await this.processSmartCut(videos[0]);
        logger.info('步骤3: AI 智能剪辑完成', { clipCount: clips.length });
        return clips;
      });

      // 步骤4: 生成解说
      await this.runStep(workflow, '生成解说', async () => {
        const script = await this.generateScript(workflow.mode, videos);
        logger.info('步骤4: 解说生成完成');
        return script;
      });

      // 步骤5: 字幕处理
      await this.runStep(workflow, '字幕处理', async () => {
        const subtitles = await this.processSubtitles();
        logger.info('步骤5: 字幕处理完成');
        return subtitles;
      });

      // 步骤6: 导出
      await this.runStep(workflow, '导出成片', async () => {
        const result = await this.exportResult();
        logger.info('步骤6: 导出完成');
        return result;
      });

      workflow.status = 'completed';
      workflow.progress = 100;

      return workflow.result!;
    } catch (error) {
      workflow.status = 'error';
      workflow.error = error instanceof Error ? error.message : '未知错误';
      logger.error('[UnifiedWorkflow] 工作流执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 运行单个步骤
   */
  private async runStep(
    workflow: WorkflowState,
    stepName: string,
    action: () => Promise<unknown>
  ): Promise<void> {
    const step = workflow.steps.find(s => s.name === stepName);
    if (!step) return;

    step.status = 'running';
    workflow.currentStep = stepName;
    
    const startTime = Date.now();
    
    try {
      await action();
      step.status = 'completed';
      step.progress = 100;
      step.duration = Date.now() - startTime;
      
      // 更新总进度
      const completedSteps = workflow.steps.filter(s => s.status === 'completed').length;
      workflow.progress = Math.round((completedSteps / workflow.steps.length) * 100);
    } catch (error) {
      step.status = 'failed';
      throw error;
    }
  }

  /**
   * 处理智能剪辑
   */
  private async processSmartCut(video: ArrayBuffer): Promise<VideoClip[]> {
    const result = await smartCutService.process(video);
    
    return result.highlights.map((hl, index) => ({
      id: uuidv4(),
      sourceIndex: 0,
      startTime: hl.startTime,
      endTime: hl.endTime,
      duration: hl.endTime - hl.startTime,
      scenes: [],
      audioPeaks: [],
    }));
  }

  /**
   * 生成解说
   */
  private async generateScript(
    mode: WorkflowMode,
    videos: ArrayBuffer[]
  ): Promise<ScriptData> {
    const prompts = {
      commentary: '生成专业解说文案',
      mixclip: '生成混剪解说文案',
      'first-person': '生成第一人称解说文案',
    };

    // 调用 AI 服务生成文案
    const result = await aiService.generateScript(
      videos[0],
      { prompt: prompts[mode] }
    );

    return {
      segments: result.segments || [],
      totalDuration: result.duration || 0,
      language: 'zh-CN',
    };
  }

  /**
   * 处理字幕
   */
  private async processSubtitles(): Promise<SubtitleData> {
    return {
      entries: [],
      language: 'zh-CN',
    };
  }

  /**
   * 导出结果
   */
  private async exportResult(): Promise<WorkflowResult> {
    return {
      videoId: uuidv4(),
      videoPath: '',
      duration: 0,
      clips: [],
    };
  }

  /**
   * 获取工作流状态
   */
  getWorkflow(workflowId: string): WorkflowState | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * 取消工作流
   */
  cancelWorkflow(workflowId: string): void {
    const workflow = this.workflows.get(workflowId);
    if (workflow && workflow.status === 'running') {
      workflow.status = 'idle';
      logger.info('[UnifiedWorkflow] 工作流已取消', { workflowId });
    }
  }

  /**
   * 删除工作流
   */
  deleteWorkflow(workflowId: string): void {
    this.workflows.delete(workflowId);
  }
}

export const unifiedWorkflowService = new UnifiedWorkflowService();
export default UnifiedWorkflowService;
