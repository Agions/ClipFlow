/**
 * VideoEnhanceService 单元测试
 */

import { VideoEnhanceService } from '../src/core/services/videoEnhance.service';

describe('VideoEnhanceService', () => {
  let service: VideoEnhanceService;

  beforeEach(() => {
    service = new VideoEnhanceService();
  });

  describe('getCapabilities', () => {
    it('should return capabilities', () => {
      const caps = service.getCapabilities();
      
      expect(caps).toHaveProperty('maxScale');
      expect(caps).toHaveProperty('maxFps');
      expect(caps).toHaveProperty('supportedFormats');
      expect(caps).toHaveProperty('gpuRequired');
      
      expect(caps.maxScale).toBe(4);
      expect(caps.maxFps).toBe(120);
      expect(caps.supportedFormats).toContain('mp4');
    });
  });

  describe('superResolution', () => {
    it('should process super resolution', async () => {
      const result = await service.superResolution(
        'input.mp4',
        'output.mp4',
        2
      );
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('duration');
      expect(result.metadata).toHaveProperty('width');
      expect(result.metadata).toHaveProperty('height');
    });
  });

  describe('frameInterpolation', () => {
    it('should process frame interpolation', async () => {
      const result = await service.frameInterpolation(
        'input.mp4',
        'output.mp4',
        60
      );
      
      expect(result.success).toBe(true);
      expect(result.metadata?.fps).toBe(60);
    });
  });

  describe('denoise', () => {
    it('should process denoise', async () => {
      const result = await service.denoise(
        'input.mp4',
        'output.mp4',
        'medium'
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('enhance', () => {
    it('should dispatch to superResolution', async () => {
      const result = await service.enhance(
        'input.mp4',
        'output.mp4',
        { type: 'super-resolution', scale: 4 }
      );
      
      expect(result.success).toBe(true);
      expect(result.metadata?.width).toBeGreaterThan(1920);
    });

    it('should dispatch to frameInterpolation', async () => {
      const result = await service.enhance(
        'input.mp4',
        'output.mp4',
        { type: 'frame-interpolation', targetFps: 120 }
      );
      
      expect(result.success).toBe(true);
    });

    it('should dispatch to denoise', async () => {
      const result = await service.enhance(
        'input.mp4',
        'output.mp4',
        { type: 'denoise', denoiseLevel: 'strong' }
      );
      
      expect(result.success).toBe(true);
    });

    it('should throw on unknown type', async () => {
      await expect(
        service.enhance('input.mp4', 'output.mp4', { type: 'unknown' as any })
      ).rejects.toThrow();
    });
  });

  describe('batchEnhance', () => {
    it('should process multiple files', async () => {
      const results = await service.batchEnhance(
        ['input1.mp4', 'input2.mp4'],
        { type: 'super-resolution', scale: 2 }
      );
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });
});
