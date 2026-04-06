/**
 * 工作流持久化服务
 * 支持 localStorage 存储和恢复
 */

import { WorkflowData, WorkflowStep, WorkflowState, WorkflowConfig } from './types';
import { workflowCacheManager, WorkflowCache } from './cacheManager';
import { logger } from '@/utils/logger';

const STORAGE_KEY_PREFIX = 'cutdeck_workflow_';
const MAX_STORED_WORKFLOWS = 5;

/**
 * 工作流持久化服务
 */
export class WorkflowPersistenceService {
  /**
   * 保存工作流状态
   */
  static saveState(projectId: string, state: WorkflowState): void {
    try {
      const key = `${STORAGE_KEY_PREFIX}${projectId}`;
      const data = {
        state,
        savedAt: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(data));
      
      // 同时更新内存缓存
      const cache = workflowCacheManager.getCache(projectId) || workflowCacheManager.createCache(projectId);
      cache.currentStep = state.step;
      cache.status = state.status;
      cache.stepData = state.data;
      
      // 清理旧数据
      this.cleanup();
    } catch (error) {
      logger.error('Failed to save workflow state:', { error });
    }
  }

  /**
   * 加载工作流状态
   */
  static loadState(projectId: string): WorkflowState | null {
    try {
      const key = `${STORAGE_KEY_PREFIX}${projectId}`;
      const data = localStorage.getItem(key);
      
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      
      // 检查是否过期 (24小时)
      const expiry = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.savedAt > expiry) {
        this.removeState(projectId);
        return null;
      }
      
      return parsed.state;
    } catch (error) {
      logger.error('Failed to load workflow state:', { error });
      return null;
    }
  }

  /**
   * 保存配置
   */
  static saveConfig(projectId: string, config: WorkflowConfig): void {
    try {
      const key = `${STORAGE_KEY_PREFIX}${projectId}_config`;
      localStorage.setItem(key, JSON.stringify(config));
    } catch (error) {
      logger.error('Failed to save workflow config:', { error });
    }
  }

  /**
   * 加载配置
   */
  static loadConfig(projectId: string): WorkflowConfig | null {
    try {
      const key = `${STORAGE_KEY_PREFIX}${projectId}_config`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to load workflow config:', { error });
      return null;
    }
  }

  /**
   * 保存步骤数据
   */
  static saveStepData(projectId: string, step: WorkflowStep, data: Partial<WorkflowData>): void {
    try {
      workflowCacheManager.completeStep(projectId, step, data);
      
      // 同时持久化
      const key = `${STORAGE_KEY_PREFIX}${projectId}_step_${step}`;
      localStorage.setItem(key, JSON.stringify({
        data,
        savedAt: Date.now(),
      }));
    } catch (error) {
      logger.error('Failed to save step data:', { error });
    }
  }

  /**
   * 加载步骤数据
   */
  static loadStepData(projectId: string, step: WorkflowStep): Partial<WorkflowData> | null {
    try {
      const key = `${STORAGE_KEY_PREFIX}${projectId}_step_${step}`;
      const data = localStorage.getItem(key);
      
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      
      // 检查是否过期 (7天)
      const expiry = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.savedAt > expiry) {
        localStorage.removeItem(key);
        return null;
      }
      
      return parsed.data;
    } catch (error) {
      logger.error('Failed to load step data:', { error });
      return null;
    }
  }

  /**
   * 检查是否有可恢复的工作流
   */
  static hasRecoverableWorkflow(projectId: string): boolean {
    const state = this.loadState(projectId);
    return state !== null && state.status !== 'completed';
  }

  /**
   * 获取恢复信息
   */
  static getRecoveryInfo(projectId: string): {
    step: WorkflowStep;
    progress: number;
    hasError: boolean;
  } | null {
    const state = this.loadState(projectId);
    if (!state) return null;
    
    const stepProgress: Record<WorkflowStep, number> = {
      upload: 0,
      analyze: 10,
      'template-select': 20,
      'script-generate': 30,
      'script-dedup': 40,
      'script-edit': 50,
      'ai-clip': 60,
      'timeline-edit': 70,
      preview: 85,
      export: 95,
    };
    
    return {
      step: state.step,
      progress: stepProgress[state.step] || 0,
      hasError: state.status === 'error',
    };
  }

  /**
   * 恢复到指定步骤
   */
  static recoverToStep(projectId: string, targetStep: WorkflowStep): WorkflowData | null {
    const state = this.loadState(projectId);
    if (!state) return null;
    
    // 收集之前步骤的数据
    const steps: WorkflowStep[] = [
      'upload',
      'analyze',
      'template-select',
      'script-generate',
      'script-dedup',
      'script-edit',
      'ai-clip',
      'timeline-edit',
      'preview',
      'export',
    ];
    
    const targetIndex = steps.indexOf(targetStep);
    const recoveredData: WorkflowData = {};
    
    for (let i = 0; i <= targetIndex; i++) {
      const stepData = this.loadStepData(projectId, steps[i]);
      if (stepData) {
        Object.assign(recoveredData, stepData);
      }
    }
    
    return recoveredData;
  }

  /**
   * 清除工作流数据
   */
  static removeState(projectId: string): void {
    try {
      const keys = [
        `${STORAGE_KEY_PREFIX}${projectId}`,
        `${STORAGE_KEY_PREFIX}${projectId}_config`,
      ];
      
      // 清除步骤数据
      const steps: WorkflowStep[] = [
        'upload', 'analyze', 'template-select', 'script-generate',
        'script-dedup', 'script-edit', 'ai-clip', 'timeline-edit', 'preview', 'export',
      ];
      
      for (const step of steps) {
        keys.push(`${STORAGE_KEY_PREFIX}${projectId}_step_${step}`);
      }
      
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      
      // 清除内存缓存
      workflowCacheManager.clearCache(projectId);
    } catch (error) {
      logger.error('Failed to remove workflow state:', { error });
    }
  }

  /**
   * 获取所有项目ID
   */
  static getAllProjectIds(): string[] {
    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX) && !key.includes('_step_') && !key.includes('_config')) {
        const id = key.replace(STORAGE_KEY_PREFIX, '');
        ids.push(id);
      }
    }
    return ids;
  }

  /**
   * 清理旧数据
   */
  private static cleanup(): void {
    const projects = this.getAllProjectIds();
    
    if (projects.length <= MAX_STORED_WORKFLOWS) return;
    
    // 按保存时间排序，删除最老的
    const sorted = projects
      .map(id => ({
        id,
        savedAt: this.loadState(id)?.data ? Date.now() : 0,
      }))
      .sort((a, b) => a.savedAt - b.savedAt);
    
    // 删除最老的项目
    const toDelete = sorted.slice(0, projects.length - MAX_STORED_WORKFLOWS);
    for (const { id } of toDelete) {
      this.removeState(id);
    }
  }
}
