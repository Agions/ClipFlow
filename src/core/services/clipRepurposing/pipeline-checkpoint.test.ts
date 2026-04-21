import { describe, it, expect, beforeEach } from 'vitest';
import { createCheckpoint, saveCheckpoint, loadCheckpoint, clearCheckpoint } from './pipeline-checkpoint';

describe('PipelineCheckpoint', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should create checkpoint with videoId and step', () => {
    const cp = createCheckpoint('video-123', 'analyze');
    expect(cp.videoId).toBe('video-123');
    expect(cp.currentStep).toBe('analyze');
    expect(cp.completedSteps).toEqual([]);
  });

  it('should save and load from localStorage', () => {
    const cp = createCheckpoint('video-123', 'segment');
    saveCheckpoint(cp);
    const loaded = loadCheckpoint('video-123');
    expect(loaded?.videoId).toBe('video-123');
    expect(loaded?.currentStep).toBe('segment');
  });

  it('should return null for non-existent checkpoint', () => {
    expect(loadCheckpoint('nonexistent')).toBeNull();
  });

  it('should clear checkpoint', () => {
    saveCheckpoint(createCheckpoint('video-123', 'analyze'));
    clearCheckpoint('video-123');
    expect(loadCheckpoint('video-123')).toBeNull();
  });
});