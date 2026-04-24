/**
 * export-progress 服务测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { exportProgress } from './export-progress';

describe('exportProgress', () => {
  // Use a fresh emitter instance per test to avoid state pollution
  let emitter: typeof exportProgress;

  beforeEach(() => {
    // Access the underlying class to create a fresh instance
    // We test the singleton, so just reset it
    exportProgress.reset();
    emitter = exportProgress;
  });

  describe('reset', () => {
    it('should reset to idle stage', () => {
      emitter.reset();
      let lastProgress = { stage: '', progress: 0 };
      emitter.subscribe(p => { lastProgress = p; });
      expect(lastProgress.stage).toBe('idle');
      expect(lastProgress.progress).toBe(0);
    });
  });

  describe('start', () => {
    it('should transition to preparing stage', () => {
      emitter.start();
      let lastProgress = { stage: '', progress: 0 };
      emitter.subscribe(p => { lastProgress = p; });
      emitter.start(); // start resets and emits preparing
      expect(lastProgress.stage).toBe('preparing');
      expect(lastProgress.progress).toBe(0);
    });
  });

  describe('preparing', () => {
    it('should emit preparing stage', () => {
      let lastProgress = { stage: '', progress: 0 };
      emitter.subscribe(p => { lastProgress = p; });
      emitter.preparing('正在加载视频...');
      expect(lastProgress.stage).toBe('preparing');
      expect(lastProgress.progress).toBe(0);
      expect(lastProgress.message).toBe('正在加载视频...');
    });
  });

  describe('encoding', () => {
    it('should emit encoding with progress', () => {
      let lastProgress = { stage: '', progress: 0, elapsedTime: 0, estimatedTimeRemaining: 0 };
      emitter.subscribe(p => { lastProgress = p; });
      emitter.start();
      emitter.encoding(50, 100);
      expect(lastProgress.stage).toBe('encoding');
      expect(lastProgress.progress).toBe(50);
      expect(lastProgress.currentFrame).toBe(50);
      expect(lastProgress.totalFrames).toBe(100);
      expect(typeof lastProgress.elapsedTime).toBe('number');
    });

    it('should calculate 100% correctly', () => {
      let lastProgress = { progress: 0 };
      emitter.subscribe(p => { lastProgress = p; });
      emitter.start();
      emitter.encoding(100, 100);
      expect(lastProgress.progress).toBe(100);
    });
  });

  describe('muxing', () => {
    it('should emit muxing at 95%', () => {
      let lastProgress = { stage: '', progress: 0 };
      emitter.subscribe(p => { lastProgress = p; });
      emitter.muxing('正在合成...');
      expect(lastProgress.stage).toBe('muxing');
      expect(lastProgress.progress).toBe(95);
      expect(lastProgress.message).toBe('正在合成...');
    });
  });

  describe('complete', () => {
    it('should emit complete at 100%', () => {
      let lastProgress = { stage: '', progress: 0, outputPath: '', fileSize: 0 };
      emitter.subscribe(p => { lastProgress = p; });
      emitter.complete('/output/video.mp4', 1024000);
      expect(lastProgress.stage).toBe('complete');
      expect(lastProgress.progress).toBe(100);
      expect(lastProgress.outputPath).toBe('/output/video.mp4');
      expect(lastProgress.fileSize).toBe(1024000);
    });
  });

  describe('error', () => {
    it('should emit error stage', () => {
      let lastProgress = { stage: '', progress: 0, message: '' };
      emitter.subscribe(p => { lastProgress = p; });
      emitter.error('编码失败');
      expect(lastProgress.stage).toBe('error');
      expect(lastProgress.progress).toBe(0);
      expect(lastProgress.message).toBe('编码失败');
    });
  });

  describe('cancel', () => {
    it('should emit cancelled stage', () => {
      let lastProgress = { stage: '', progress: 0 };
      emitter.subscribe(p => { lastProgress = p; });
      emitter.cancel();
      expect(lastProgress.stage).toBe('cancelled');
      expect(lastProgress.progress).toBe(0);
      expect(lastProgress.message).toBe('导出已取消');
    });
  });

  describe('subscribe/unsubscribe', () => {
    it('should call subscriber immediately with current state', () => {
      emitter.reset();
      let callCount = 0;
      const unsub = emitter.subscribe(() => { callCount++; });
      // reset() emits idle on subscribe
      expect(callCount).toBe(1);
      unsub();
    });

    it('should not call after unsubscribe', () => {
      emitter.reset();
      let callCount = 0;
      const unsub = emitter.subscribe(() => { callCount++; });
      unsub();
      emitter.encoding(50, 100);
      expect(callCount).toBe(1); // only the initial call
    });
  });
});
