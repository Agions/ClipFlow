/**
 * VideoProcessingError 与 normalizeVideoError 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BaseVideoProcessor,
  VideoProcessingError,
  normalizeVideoError,
} from './base-video-processor';
import type {
  FFmpegStatus,
  VideoMetadata,
  KeyFrame,
  ExtractKeyFramesOptions,
  SimpleVideoSegment,
  CutOptions,
} from '@/types';

// 创建一个最小可用的 BaseVideoProcessor 子类，stub 所有抽象方法。
// 这样能直接驱动 BaseVideoProcessor 上的模板方法（checkStatus / ensureAvailable /
// analyze / extractKeyFrames / generateThumbnail / cut / preview）。
class FakeProcessor extends BaseVideoProcessor {
  // 由测试在用例中通过 vi.fn() 替换
  doCheckStatusImpl: () => Promise<FFmpegStatus> = async () => ({
    installed: true,
    version: '6.0',
  });
  doGetHardwareAccelerationImpl: () => Promise<string | null> = async () => null;
  doAnalyzeImpl: (videoPath: string) => Promise<VideoMetadata> = async videoPath =>
    ({
      path: videoPath,
      duration: 1,
      width: 1,
      height: 1,
      fps: 30,
      codec: 'h264',
      bitrate: 1000,
    }) as VideoMetadata;
  doExtractKeyFramesImpl: (videoPath: string) => Promise<KeyFrame[]> = async () => [];
  doGenerateThumbnailImpl: () => Promise<string> = async () => '/thumb.jpg';
  doCutImpl: () => Promise<string> = async () => '/out.mp4';
  doPreviewImpl: () => Promise<string> = async () => '/preview.mp4';

  protected async doCheckStatus(): Promise<FFmpegStatus> {
    return this.doCheckStatusImpl();
  }
  protected async doGetHardwareAcceleration(): Promise<string | null> {
    return this.doGetHardwareAccelerationImpl();
  }
  protected async doAnalyze(videoPath: string): Promise<VideoMetadata> {
    return this.doAnalyzeImpl(videoPath);
  }
  protected async doExtractKeyFrames(
    videoPath: string,
    _options: ExtractKeyFramesOptions,
    _duration?: number
  ): Promise<KeyFrame[]> {
    return this.doExtractKeyFramesImpl(videoPath);
  }
  protected async doGenerateThumbnail(_videoPath: string, _time: number): Promise<string> {
    return this.doGenerateThumbnailImpl();
  }
  protected async doCut(
    _inputPath: string,
    _outputPath: string,
    _segments: SimpleVideoSegment[],
    _options: CutOptions
  ): Promise<string> {
    return this.doCutImpl();
  }
  protected async doPreview(_inputPath: string, _segment: SimpleVideoSegment): Promise<string> {
    return this.doPreviewImpl();
  }
}

describe('VideoProcessingError', () => {
  it('should create error with operation and message', () => {
    const error = new VideoProcessingError('分析', '视频路径不能为空');
    expect(error.operation).toBe('分析');
    expect(error.message).toBe('视频路径不能为空');
    expect(error.name).toBe('VideoProcessingError');
  });

  it('should default isRetryable to false', () => {
    const error = new VideoProcessingError('剪辑', '测试');
    expect(error.isRetryable).toBe(false);
  });

  it('should accept isRetryable as third parameter', () => {
    const error = new VideoProcessingError('分析', '网络超时', true);
    expect(error.isRetryable).toBe(true);
  });

  it('should be instance of Error', () => {
    const error = new VideoProcessingError('剪辑', '测试');
    expect(error instanceof Error).toBe(true);
  });
});

describe('normalizeVideoError', () => {
  it('should recognize FFmpeg not installed', () => {
    const error = normalizeVideoError(new Error('未安装FFmpeg'), '分析');
    expect(error).toBeInstanceOf(VideoProcessingError);
    expect((error as VideoProcessingError).operation).toBe('分析');
    expect((error as VideoProcessingError).message).toContain('未检测到 FFmpeg');
  });

  it('should recognize ffmpeg in error message', () => {
    const error = normalizeVideoError(new Error('ffmpeg not found'), '分析');
    expect(error).toBeInstanceOf(VideoProcessingError);
    expect((error as VideoProcessingError).message).toContain('未检测到 FFmpeg');
  });

  it('should recognize ffprobe error', () => {
    const error = normalizeVideoError(new Error('ffprobe failed'), '分析');
    expect(error).toBeInstanceOf(VideoProcessingError);
    expect((error as VideoProcessingError).message).toContain('无法执行 ffprobe');
  });

  it('should recognize JSON parse error', () => {
    const error = normalizeVideoError(new Error('解析JSON失败'), '分析');
    expect(error).toBeInstanceOf(VideoProcessingError);
    expect((error as VideoProcessingError).message).toContain('无法解析视频元数据');
  });

  it('should recognize video stream not found', () => {
    const error = normalizeVideoError(new Error('未找到视频流'), '分析');
    expect(error).toBeInstanceOf(VideoProcessingError);
    expect((error as VideoProcessingError).message).toContain('无法识别视频流');
  });

  it('should recognize empty path error', () => {
    const error = normalizeVideoError(new Error('路径不能为空'), '剪辑');
    expect(error).toBeInstanceOf(VideoProcessingError);
    expect((error as VideoProcessingError).message).toBe('视频路径无效。');
  });

  it('should recognize permission error', () => {
    const error = normalizeVideoError(new Error('权限不足'), '导出');
    expect(error).toBeInstanceOf(VideoProcessingError);
    expect((error as VideoProcessingError).message).toContain('文件权限不足');
  });

  it('should recognize disk space error', () => {
    const error = normalizeVideoError(new Error('空间不足'), '导出');
    expect(error).toBeInstanceOf(VideoProcessingError);
    expect((error as VideoProcessingError).message).toContain('磁盘空间不足');
  });

  it('should recognize timeout as retryable', () => {
    const error = normalizeVideoError(new Error('timeout'), '上传');
    expect(error).toBeInstanceOf(VideoProcessingError);
    expect((error as VideoProcessingError).isRetryable).toBe(true);
  });

  it('should recognize ECONNREFUSED as retryable', () => {
    const error = normalizeVideoError(new Error('ECONNREFUSED'), '上传');
    expect(error).toBeInstanceOf(VideoProcessingError);
    expect((error as VideoProcessingError).isRetryable).toBe(true);
  });

  it('should wrap non-Error values as VideoProcessingError', () => {
    const error = normalizeVideoError('some string error', '分析');
    expect(error).toBeInstanceOf(VideoProcessingError);
    expect(error.message).toContain('some string error');
  });

  it('should preserve operation name in fallback', () => {
    const error = normalizeVideoError(new Error('unknown error'), '剪辑');
    expect((error as VideoProcessingError).operation).toBe('剪辑');
  });
});

// ============================================
// BaseVideoProcessor — 模板方法测试
// ============================================

// 所有 BaseVideoProcessor 用例共享的时间偏移计数器。每个 beforeEach 自增 60s，
// 保证 ffmpegCache 的上一个时间戳 < 当前时间 - 30s。
let testCounter = 0;

describe('BaseVideoProcessor — FFmpeg', () => {
  // ffmpegCache 30s TTL — 用 vi.useFakeTimers + Date.now 推进让缓存过期。
  // 每个用例的 beforeEach 都把时间设到一个绝对唯一的起点（递增 60s），
  // 确保上一个用例写入的缓存时间戳小于当前时间 - 30s。
  beforeEach(() => {
    vi.useFakeTimers();
    const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
    vi.setSystemTime(baseTime + testCounter * 60_000);
    testCounter++;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('checkStatus: invokes doCheckStatus when no cache, returns result and caches it', async () => {
    const p = new FakeProcessor();
    p.doCheckStatusImpl = vi.fn(async () => ({ installed: true, version: '6.1' }));
    const result = await p.checkStatus();
    expect(p.doCheckStatusImpl).toHaveBeenCalledTimes(1);
    expect(result.installed).toBe(true);
    expect(result.version).toBe('6.1');
  });

  it('checkStatus: reuses cache within TTL', async () => {
    // 当前 beforeEach 已把 fake time 推到 T+60000，上一次用例写入的缓存若存在
    // 时间戳必然早于此，因此 checkStatus 第一次调用会重新跑 doCheckStatus。
    // 之后的几次调用命中缓存。
    const p = new FakeProcessor();
    p.doCheckStatusImpl = vi.fn(async () => ({ installed: true, version: '6.1' }));
    await p.checkStatus(); // populates cache
    const r2 = await p.checkStatus();
    const r3 = await p.checkStatus();
    expect(p.doCheckStatusImpl).toHaveBeenCalledTimes(1);
    expect(r2.installed).toBe(true);
    expect(r3.installed).toBe(true);
  });

  it('checkStatus: caches { installed: false } when doCheckStatus throws', async () => {
    const p = new FakeProcessor();
    p.doCheckStatusImpl = vi.fn(async () => {
      throw new Error('ffprobe failed');
    });
    const result = await p.checkStatus();
    expect(result.installed).toBe(false);
  });

  it('ensureAvailable: returns false when not installed', async () => {
    const p = new FakeProcessor();
    p.doCheckStatusImpl = vi.fn(async () => ({ installed: false }));
    expect(await p.ensureAvailable()).toBe(false);
  });

  it('ensureAvailable: returns true when installed (with version)', async () => {
    const p = new FakeProcessor();
    p.doCheckStatusImpl = vi.fn(async () => ({ installed: true, version: '6.0' }));
    expect(await p.ensureAvailable()).toBe(true);
  });

  it('getHardwareAcceleration: returns null when doGetHardwareAcceleration throws', async () => {
    const p = new FakeProcessor();
    p.doGetHardwareAccelerationImpl = async () => {
      throw new Error('硬件加速不可用');
    };
    expect(await p.getHardwareAcceleration()).toBeNull();
  });

  it('getHardwareAcceleration: returns the acceleration type on success', async () => {
    const p = new FakeProcessor();
    p.doGetHardwareAccelerationImpl = async () => 'nvenc';
    expect(await p.getHardwareAcceleration()).toBe('nvenc');
  });
});

describe('BaseVideoProcessor — analyze', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
    vi.setSystemTime(baseTime + testCounter * 60_000);
    testCounter++;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws VideoProcessingError("视频路径不能为空") when videoPath is empty', async () => {
    const p = new FakeProcessor();
    await expect(p.analyze('')).rejects.toThrow(/视频路径不能为空/);
  });

  it('throws VideoProcessingError("未安装FFmpeg") when FFmpeg is missing', async () => {
    const p = new FakeProcessor();
    p.doCheckStatusImpl = async () => ({ installed: false });
    await expect(p.analyze('/v.mp4')).rejects.toThrow(/未安装FFmpeg/);
  });

  it('returns metadata on success', async () => {
    const p = new FakeProcessor();
    const meta: VideoMetadata = {
      path: '/v.mp4',
      duration: 60,
      width: 1920,
      height: 1080,
      fps: 30,
      codec: 'h264',
      bitrate: 5000,
    } as VideoMetadata;
    p.doAnalyzeImpl = vi.fn(async () => meta);
    const result = await p.analyze('/v.mp4');
    expect(result).toEqual(meta);
  });

  it('wraps doAnalyze errors via normalizeVideoError', async () => {
    const p = new FakeProcessor();
    p.doAnalyzeImpl = async () => {
      throw new Error('ffprobe failed');
    };
    await expect(p.analyze('/v.mp4')).rejects.toThrow(/无法执行 ffprobe/);
  });
});

describe('BaseVideoProcessor — extractKeyFrames', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
    vi.setSystemTime(baseTime + testCounter * 60_000);
    testCounter++;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws on empty path', async () => {
    const p = new FakeProcessor();
    await expect(p.extractKeyFrames('')).rejects.toThrow(/视频路径不能为空/);
  });

  it('throws when FFmpeg is missing', async () => {
    const p = new FakeProcessor();
    p.doCheckStatusImpl = async () => ({ installed: false });
    await expect(p.extractKeyFrames('/v.mp4')).rejects.toThrow(/未安装FFmpeg/);
  });

  it('delegates to doExtractKeyFrames and returns key frames', async () => {
    const p = new FakeProcessor();
    const kf: KeyFrame[] = [{ id: 'k1', path: '/k1.jpg', timestamp: 0 }];
    p.doExtractKeyFramesImpl = vi.fn(async () => kf);
    const result = await p.extractKeyFrames('/v.mp4', { maxFrames: 5 });
    expect(result).toBe(kf);
  });
});

describe('BaseVideoProcessor — generateThumbnail', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
    vi.setSystemTime(baseTime + testCounter * 60_000);
    testCounter++;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws on empty path', async () => {
    const p = new FakeProcessor();
    await expect(p.generateThumbnail('')).rejects.toThrow(/视频路径不能为空/);
  });

  it('throws when FFmpeg is missing', async () => {
    const p = new FakeProcessor();
    p.doCheckStatusImpl = async () => ({ installed: false });
    await expect(p.generateThumbnail('/v.mp4')).rejects.toThrow(/未安装FFmpeg/);
  });

  it('returns thumbnail path on success', async () => {
    const p = new FakeProcessor();
    const expected = '/cache/thumb.jpg';
    p.doGenerateThumbnailImpl = vi.fn(async () => expected);
    const result = await p.generateThumbnail('/v.mp4', 5);
    expect(result).toBe(expected);
  });

  it('wraps doGenerateThumbnail errors via normalizeVideoError', async () => {
    const p = new FakeProcessor();
    p.doGenerateThumbnailImpl = async () => {
      throw new Error('空间不足');
    };
    await expect(p.generateThumbnail('/v.mp4')).rejects.toThrow(/磁盘空间不足/);
  });
});

describe('BaseVideoProcessor — cut', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
    vi.setSystemTime(baseTime + testCounter * 60_000);
    testCounter++;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws on empty input or output path', async () => {
    const p = new FakeProcessor();
    const segs: SimpleVideoSegment[] = [{ start: 0, end: 1 }];
    await expect(p.cut('', '/out.mp4', segs)).rejects.toThrow(/输入或输出路径不能为空/);
    await expect(p.cut('/in.mp4', '', segs)).rejects.toThrow(/输入或输出路径不能为空/);
    await expect(p.cut('   ', '/out.mp4', segs)).rejects.toThrow(/输入或输出路径不能为空/);
  });

  it('throws when segments array is empty', async () => {
    const p = new FakeProcessor();
    await expect(p.cut('/in.mp4', '/out.mp4', [])).rejects.toThrow(/至少需要一个视频片段/);
  });

  it('throws when FFmpeg is missing', async () => {
    const p = new FakeProcessor();
    p.doCheckStatusImpl = async () => ({ installed: false });
    await expect(p.cut('/in.mp4', '/out.mp4', [{ start: 0, end: 1 }])).rejects.toThrow(
      /未安装FFmpeg/
    );
  });

  it('returns the output path on success', async () => {
    const p = new FakeProcessor();
    p.doCutImpl = vi.fn(async () => '/final.mp4');
    const segs: SimpleVideoSegment[] = [{ start: 0, end: 1 }];
    const result = await p.cut('/in.mp4', '/out.mp4', segs);
    expect(result).toBe('/final.mp4');
  });

  it('wraps doCut errors via normalizeVideoError', async () => {
    const p = new FakeProcessor();
    p.doCutImpl = async () => {
      throw new Error('权限不足');
    };
    await expect(p.cut('/in.mp4', '/out.mp4', [{ start: 0, end: 1 }])).rejects.toThrow(
      /文件权限不足/
    );
  });
});

describe('BaseVideoProcessor — preview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
    vi.setSystemTime(baseTime + testCounter * 60_000);
    testCounter++;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws on empty input path', async () => {
    const p = new FakeProcessor();
    await expect(p.preview('', { start: 0, end: 1 })).rejects.toThrow(/视频路径不能为空/);
  });

  it('throws when FFmpeg is missing', async () => {
    const p = new FakeProcessor();
    p.doCheckStatusImpl = async () => ({ installed: false });
    await expect(p.preview('/in.mp4', { start: 0, end: 1 })).rejects.toThrow(/未安装FFmpeg/);
  });

  it('returns preview path on success', async () => {
    const p = new FakeProcessor();
    p.doPreviewImpl = vi.fn(async () => '/preview.mp4');
    const result = await p.preview('/in.mp4', { start: 0, end: 1 });
    expect(result).toBe('/preview.mp4');
  });

  it('wraps doPreview errors via normalizeVideoError', async () => {
    const p = new FakeProcessor();
    p.doPreviewImpl = async () => {
      throw new Error('未知错误');
    };
    await expect(p.preview('/in.mp4', { start: 0, end: 1 })).rejects.toThrow(/生成预览失败/);
  });
});
