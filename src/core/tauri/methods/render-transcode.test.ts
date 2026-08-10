/**
 * Render / Transcode Tauri Methods — 单元测试
 *
 * 测试六个 invoke 封装方法：
 *  - cancelExport / exportVideo / transcodeWithCrop / renderAutonomousCut /
 *    generatePreview / cutVideo
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../invoke', () => ({
  invoke: vi.fn(),
  TauriCommand: {
    CANCEL_EXPORT: 'cancel_export',
    EXPORT_VIDEO: 'export_video',
    TRANSCODE_WITH_CROP: 'transcode_with_crop',
    AUTONOMOUS_RENDER: 'render_autonomous_cut',
    GENERATE_PREVIEW: 'generate_preview',
    CUT_VIDEO: 'cut_video',
  },
}));

import { invoke, TauriCommand } from '../invoke';
import { renderTranscode } from './render-transcode';

const invokeMock = vi.mocked(invoke);

describe('renderTranscode tauri methods', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  describe('renderTranscode.cancelExport', () => {
    it('invokes CANCEL_EXPORT with { exportId }', async () => {
      invokeMock.mockResolvedValue(undefined as never);

      await expect(renderTranscode.cancelExport('export-42')).resolves.toBeUndefined();
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.CANCEL_EXPORT, {
        exportId: 'export-42',
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('export not found'));

      await expect(renderTranscode.cancelExport('unknown')).rejects.toThrow('export not found');
    });
  });

  describe('renderTranscode.exportVideo', () => {
    it('invokes EXPORT_VIDEO with full input object', async () => {
      const output = { outputPath: '/out/movie.mp4', duration: 60, fileSize: 1048576 };
      invokeMock.mockResolvedValue(output);

      const result = await renderTranscode.exportVideo({
        inputPath: '/in/movie.mp4',
        outputPath: '/out/movie.mp4',
        format: 'mp4',
        resolution: '1080p',
        frameRate: 60,
        videoCodec: 'h264',
        audioCodec: 'aac',
        crf: 23,
        subtitleEnabled: true,
        subtitlePath: '/s.ass',
        burnSubtitles: false,
      });

      expect(result).toEqual(output);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.EXPORT_VIDEO, {
        inputPath: '/in/movie.mp4',
        outputPath: '/out/movie.mp4',
        format: 'mp4',
        resolution: '1080p',
        frameRate: 60,
        videoCodec: 'h264',
        audioCodec: 'aac',
        crf: 23,
        subtitleEnabled: true,
        subtitlePath: '/s.ass',
        burnSubtitles: false,
      });
    });

    it('omits optional fields when not provided', async () => {
      invokeMock.mockResolvedValue({ outputPath: '/o.mp4', duration: 0, fileSize: 0 });

      await renderTranscode.exportVideo({
        inputPath: '/in.mp4',
        outputPath: '/out.mp4',
      });

      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.EXPORT_VIDEO, {
        inputPath: '/in.mp4',
        outputPath: '/out.mp4',
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('encoder crashed'));

      await expect(
        renderTranscode.exportVideo({ inputPath: '/in.mp4', outputPath: '/out.mp4' })
      ).rejects.toThrow('encoder crashed');
    });
  });

  describe('renderTranscode.transcodeWithCrop', () => {
    it('invokes TRANSCODE_WITH_CROP with full input object', async () => {
      invokeMock.mockResolvedValue('/out/cropped.mp4');

      const result = await renderTranscode.transcodeWithCrop({
        inputPath: '/in/wide.mp4',
        outputPath: '/out/9x16.mp4',
        aspect: '9:16',
        startTime: 0,
        endTime: 30,
        quality: 'high',
      });

      expect(result).toBe('/out/cropped.mp4');
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.TRANSCODE_WITH_CROP, {
        inputPath: '/in/wide.mp4',
        outputPath: '/out/9x16.mp4',
        aspect: '9:16',
        startTime: 0,
        endTime: 30,
        quality: 'high',
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('invalid aspect ratio'));

      await expect(
        renderTranscode.transcodeWithCrop({
          inputPath: '/in.mp4',
          outputPath: '/out.mp4',
          aspect: 'bad',
        })
      ).rejects.toThrow('invalid aspect ratio');
    });
  });

  describe('renderTranscode.renderAutonomousCut', () => {
    it('invokes AUTONOMOUS_RENDER with { inputPath, segments, outputPath }', async () => {
      invokeMock.mockResolvedValue('/out/cut.mp4');

      const segments = [
        { start: 0, end: 5 },
        { start: 10, end: 15 },
      ];
      const result = await renderTranscode.renderAutonomousCut('/in.mp4', segments, '/out.mp4');

      expect(result).toBe('/out/cut.mp4');
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.AUTONOMOUS_RENDER, {
        inputPath: '/in.mp4',
        segments,
        outputPath: '/out.mp4',
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('segments invalid'));

      await expect(renderTranscode.renderAutonomousCut('/in.mp4', [], '/out.mp4')).rejects.toThrow(
        'segments invalid'
      );
    });
  });

  describe('renderTranscode.generatePreview', () => {
    it('invokes GENERATE_PREVIEW with { inputPath, segment }', async () => {
      invokeMock.mockResolvedValue('/tmp/preview.mp4');

      const result = await renderTranscode.generatePreview('/in.mp4', { start: 5, end: 10 });

      expect(result).toBe('/tmp/preview.mp4');
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GENERATE_PREVIEW, {
        inputPath: '/in.mp4',
        segment: { start: 5, end: 10 },
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('segment out of range'));

      await expect(
        renderTranscode.generatePreview('/in.mp4', { start: 0, end: 5 })
      ).rejects.toThrow('segment out of range');
    });
  });

  describe('renderTranscode.cutVideo', () => {
    it('invokes CUT_VIDEO with { inputPath, outputPath, segments }', async () => {
      invokeMock.mockResolvedValue('/out/final.mp4');

      const segments = [{ start: 0, end: 5 }];
      const result = await renderTranscode.cutVideo('/in.mp4', '/out.mp4', segments);

      expect(result).toBe('/out/final.mp4');
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.CUT_VIDEO, {
        inputPath: '/in.mp4',
        outputPath: '/out.mp4',
        segments,
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('cut failed'));

      await expect(
        renderTranscode.cutVideo('/in.mp4', '/out.mp4', [{ start: 0, end: 5 }])
      ).rejects.toThrow('cut failed');
    });
  });
});
