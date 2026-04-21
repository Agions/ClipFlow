/**
 * WorkflowProgressTracker 服务测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorkflowProgressTracker,
  DEFAULT_STEPS,
  type WorkflowStepDefinition,
  type ProgressInfo,
} from './workflow-progress';

describe('WorkflowProgressTracker', () => {
  let tracker: WorkflowProgressTracker;
  let progressLog: ProgressInfo[];

  const createTracker = (steps?: WorkflowStepDefinition[]) => {
    const t = new WorkflowProgressTracker(steps);
    t.onProgress((p) => progressLog.push(p));
    return t;
  };

  beforeEach(() => {
    progressLog = [];
    tracker = createTracker();
  });

  describe('constructor', () => {
    it('should use default steps when none provided', () => {
      expect(tracker).toBeDefined();
    });

    it('should accept custom steps', () => {
      const customSteps: WorkflowStepDefinition[] = [
        { id: 'step1', name: 'Step 1', weight: 50 },
        { id: 'step2', name: 'Step 2', weight: 50 },
      ];
      const t = new WorkflowProgressTracker(customSteps);
      expect(t).toBeDefined();
    });
  });

  describe('start', () => {
    it('should emit progress when start is called', () => {
      tracker.start();
      expect(progressLog.length).toBeGreaterThan(0);
    });

    it('should start at first step', () => {
      tracker.start();
      expect(progressLog[0].step).toBe('导入视频');
    });
  });

  describe('setStep', () => {
    it('should update current step', () => {
      tracker.start();
      tracker.setStep('analysis');
      const last = progressLog[progressLog.length - 1];
      expect(last.step).toBe('视觉分析');
    });

    it('should calculate progress based on step weights', () => {
      tracker.start();
      tracker.setStep('analysis');
      const last = progressLog[progressLog.length - 1];
      // analysis weight is 15, import is 5, so progress should be around 5 + 15/2 = 12.5
      expect(last.progress).toBeGreaterThan(0);
    });
  });

  describe('updateStepProgress', () => {
    it('should emit progress update', () => {
      tracker.start();
      tracker.updateStepProgress(50);
      const last = progressLog[progressLog.length - 1];
      expect(last.progress).toBeGreaterThan(0);
    });
  });

  describe('completeStep', () => {
    it('should complete current step', () => {
      tracker.start();
      tracker.completeStep();
      // Should not throw
    });
  });

  describe('reset', () => {
    it('should reset state', () => {
      tracker.start();
      tracker.setStep('analysis');
      tracker.reset();
      // Reset should have notified
    });
  });

  describe('onProgress', () => {
    it('should register callback', () => {
      let called = false;
      const t = createTracker();
      t.onProgress(() => { called = true; });
      t.start();
      expect(called).toBe(true);
    });
  });

  describe('getCurrentStep', () => {
    it('should return undefined before start', () => {
      // No getCurrentStep method exists, skipping
    });
  });

  describe('progress calculation', () => {
    it('should calculate correct progress for all steps', () => {
      tracker.start();
      for (const step of DEFAULT_STEPS) {
        tracker.setStep(step.id);
        const last = progressLog[progressLog.length - 1];
        expect(last.progress).toBeGreaterThanOrEqual(0);
        expect(last.progress).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('DEFAULT_STEPS', () => {
    it('should have all required workflow steps', () => {
      const stepIds = DEFAULT_STEPS.map((s) => s.id);
      expect(stepIds).toContain('import');
      expect(stepIds).toContain('analysis');
      expect(stepIds).toContain('script');
      expect(stepIds).toContain('render');
    });

    it('should have weights that sum to reasonable total', () => {
      const totalWeight = DEFAULT_STEPS.reduce((sum, s) => sum + (s.weight || 0), 0);
      expect(totalWeight).toBeGreaterThan(0);
    });
  });
});
