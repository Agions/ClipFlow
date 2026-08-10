/**
 * File Info Service — 单元测试
 *
 * 覆盖：
 *  - getFileSizeBytes：空路径、非有限字节、tauri 抛错
 *  - checkFFmpeg：成功路径、抛错回退
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/core/tauri', () => ({
  tauri: {
    getFileSize: vi.fn(),
    checkFFmpeg: vi.fn(),
  },
}));

vi.mock('@/shared/utils/logging', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { tauri } from '@/core/tauri';
import { logger } from '@/shared/utils/logging';
import { getFileSizeBytes, checkFFmpeg } from './file-info-service';

const getFileSizeMock = vi.mocked(tauri.getFileSize);
const checkFFmpegMock = vi.mocked(tauri.checkFFmpeg);
const warnSpy = vi.mocked(logger.warn);
const errorSpy = vi.mocked(logger.error);

describe('getFileSizeBytes', () => {
  beforeEach(() => {
    getFileSizeMock.mockReset();
    warnSpy.mockClear();
  });

  it('returns 0 immediately when path is empty string', async () => {
    const result = await getFileSizeBytes('');
    expect(result).toBe(0);
    expect(getFileSizeMock).not.toHaveBeenCalled();
  });

  it('returns 0 immediately when path is whitespace-only', async () => {
    const result = await getFileSizeBytes('   ');
    expect(result).toBe(0);
    expect(getFileSizeMock).not.toHaveBeenCalled();
  });

  it('returns 0 immediately when path is undefined', async () => {
    const result = await getFileSizeBytes(undefined as unknown as string);
    expect(result).toBe(0);
    expect(getFileSizeMock).not.toHaveBeenCalled();
  });

  it('returns the bytes reported by tauri.getFileSize', async () => {
    getFileSizeMock.mockResolvedValue(2048);

    const result = await getFileSizeBytes('/files/data.bin');

    expect(result).toBe(2048);
    expect(getFileSizeMock).toHaveBeenCalledWith('/files/data.bin');
  });

  it('returns 0 when tauri returns a non-finite value (NaN)', async () => {
    getFileSizeMock.mockResolvedValue(Number.NaN);

    const result = await getFileSizeBytes('/files/data.bin');

    expect(result).toBe(0);
  });

  it('returns 0 when tauri returns a non-finite value (Infinity)', async () => {
    getFileSizeMock.mockResolvedValue(Number.POSITIVE_INFINITY);

    const result = await getFileSizeBytes('/files/data.bin');

    expect(result).toBe(0);
  });

  it('logs a warning and returns 0 when tauri.getFileSize throws', async () => {
    const err = new Error('permission denied');
    getFileSizeMock.mockRejectedValue(err);

    const result = await getFileSizeBytes('/protected/file.bin');

    expect(result).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith('获取文件大小失败', {
      path: '/protected/file.bin',
      error: err,
    });
  });
});

describe('checkFFmpeg', () => {
  beforeEach(() => {
    checkFFmpegMock.mockReset();
    errorSpy.mockClear();
  });

  it('returns the tauri result when ffmpeg is installed', async () => {
    checkFFmpegMock.mockResolvedValue({ installed: true, version: '6.0' });

    const result = await checkFFmpeg();

    expect(result).toEqual({ installed: true, version: '6.0' });
    expect(checkFFmpegMock).toHaveBeenCalledOnce();
  });

  it('returns installed=false when tauri reports ffmpeg missing', async () => {
    checkFFmpegMock.mockResolvedValue({ installed: false });

    const result = await checkFFmpeg();

    expect(result).toEqual({ installed: false });
  });

  it('logs an error and returns installed=false when tauri.checkFFmpeg throws', async () => {
    const err = new Error('command not found');
    checkFFmpegMock.mockRejectedValue(err);

    const result = await checkFFmpeg();

    expect(result).toEqual({ installed: false });
    expect(errorSpy).toHaveBeenCalledWith('检查FFmpeg失败:', err);
  });
});
