/**
 * transcodeWithCrop — 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/core/tauri', () => ({
  tauri: { transcodeWithCrop: vi.fn() },
}));

import { tauri } from '@/core/tauri';
import { transcodeWithCrop, type AspectRatio, type ExportQuality } from './transcode-crop-service';

const transcodeMock = vi.mocked(tauri.transcodeWithCrop);

describe('transcodeWithCrop', () => {
  beforeEach(() => {
    transcodeMock.mockReset();
  });

  it('forwards options to tauri.transcodeWithCrop and returns output path', async () => {
    transcodeMock.mockResolvedValue('/out/cropped.mp4');
    const options = {
      inputPath: '/in.mp4',
      outputPath: '/out.mp4',
      aspect: '16:9' as AspectRatio,
    };
    const result = await transcodeWithCrop(options);
    expect(result).toBe('/out/cropped.mp4');
    expect(transcodeMock).toHaveBeenCalledWith(options);
  });

  it('passes through optional startTime / endTime / quality', async () => {
    transcodeMock.mockResolvedValue('/out.mp4');
    await transcodeWithCrop({
      inputPath: '/in.mp4',
      outputPath: '/out.mp4',
      aspect: '9:16',
      startTime: 10,
      endTime: 30,
      quality: 'high' as ExportQuality,
    });
    expect(transcodeMock).toHaveBeenCalledWith({
      inputPath: '/in.mp4',
      outputPath: '/out.mp4',
      aspect: '9:16',
      startTime: 10,
      endTime: 30,
      quality: 'high',
    });
  });

  it('supports all aspect ratios (16:9, 9:16, 1:1)', async () => {
    transcodeMock.mockResolvedValue('/out.mp4');
    for (const aspect of ['16:9', '9:16', '1:1'] as AspectRatio[]) {
      await transcodeWithCrop({ inputPath: '/i', outputPath: '/o', aspect });
      expect(transcodeMock).toHaveBeenLastCalledWith({
        inputPath: '/i',
        outputPath: '/o',
        aspect,
      });
    }
    expect(transcodeMock).toHaveBeenCalledTimes(3);
  });

  it('re-throws errors from tauri.transcodeWithCrop', async () => {
    const err = new Error('ffmpeg crop failed');
    transcodeMock.mockRejectedValue(err);
    await expect(
      transcodeWithCrop({ inputPath: '/i', outputPath: '/o', aspect: '1:1' })
    ).rejects.toThrow('ffmpeg crop failed');
  });

  it('does not swallow errors (reraises after logging)', async () => {
    transcodeMock.mockRejectedValue(new Error('boom'));
    await expect(
      transcodeWithCrop({ inputPath: '/i', outputPath: '/o', aspect: '16:9' })
    ).rejects.toBeInstanceOf(Error);
  });
});
