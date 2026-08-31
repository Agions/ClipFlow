/**
 * multi-export — 单元测试
 *
 * 由于 MultiExporter 类未导出，本测试基于单例 multiExporter 验证公共 API。
 */
import { describe, it, expect } from 'vitest';
import {
  multiExporter,
  EXPORT_FORMATS,
  QUALITY_PRESETS,
  type AspectRatio,
  type ClipExportRequest,
} from './multi-export';

function makeRequest(overrides: Partial<ClipExportRequest> = {}): ClipExportRequest {
  return {
    clipId: 'clip-1',
    sourceVideoPath: '/video.mp4',
    startTime: 0,
    endTime: 30,
    formats: ['9:16'],
    outputDir: '/output',
    quality: 'high',
    ...overrides,
  };
}

// ─── EXPORT_FORMATS & QUALITY_PRESETS ────────────────────────────────────────

describe('EXPORT_FORMATS', () => {
  it('defines 9:16 as 1080x1920 (smart crop)', () => {
    expect(EXPORT_FORMATS['9:16']).toEqual({
      aspectRatio: '9:16',
      width: 1080,
      height: 1920,
      cropStrategy: 'smart',
    });
  });

  it('defines 1:1 as 1080x1080 (smart crop)', () => {
    expect(EXPORT_FORMATS['1:1']).toEqual({
      aspectRatio: '1:1',
      width: 1080,
      height: 1080,
      cropStrategy: 'smart',
    });
  });

  it('defines 16:9 as 1920x1080 (center crop)', () => {
    expect(EXPORT_FORMATS['16:9']).toEqual({
      aspectRatio: '16:9',
      width: 1920,
      height: 1080,
      cropStrategy: 'center',
    });
  });
});

describe('QUALITY_PRESETS', () => {
  it('maps high to crf=18, slow, 5M', () => {
    expect(QUALITY_PRESETS.high).toEqual({ crf: 18, preset: 'slow', bitrate: '5M' });
  });

  it('maps medium to crf=23, medium, 2.5M', () => {
    expect(QUALITY_PRESETS.medium).toEqual({ crf: 23, preset: 'medium', bitrate: '2.5M' });
  });

  it('maps low to crf=28, fast, 1M', () => {
    expect(QUALITY_PRESETS.low).toEqual({ crf: 28, preset: 'fast', bitrate: '1M' });
  });
});

// ─── prepareExportTasks ────────────────────────────────────────────────────

describe('multiExporter.prepareExportTasks', () => {
  it('builds a single task for one format', () => {
    const tasks = multiExporter.prepareExportTasks(makeRequest({ formats: ['9:16'] }));
    expect(tasks).toHaveLength(1);
    expect(tasks[0].aspectRatio).toBe('9:16');
  });

  it('builds three tasks when all formats requested', () => {
    const tasks = multiExporter.prepareExportTasks(
      makeRequest({ formats: ['9:16', '1:1', '16:9'] })
    );
    expect(tasks).toHaveLength(3);
    expect(tasks.map(t => t.aspectRatio)).toEqual(['9:16', '1:1', '16:9']);
  });

  it('returns empty array when formats is empty', () => {
    const tasks = multiExporter.prepareExportTasks(makeRequest({ formats: [] }));
    expect(tasks).toEqual([]);
  });

  it('calculates duration from endTime - startTime', () => {
    const tasks = multiExporter.prepareExportTasks(
      makeRequest({ startTime: 10, endTime: 40, formats: ['16:9'] })
    );
    expect(tasks[0].duration).toBe(30);
  });

  it('carries the clipId through to each task', () => {
    const tasks = multiExporter.prepareExportTasks(
      makeRequest({ clipId: 'my-clip-42', formats: ['9:16', '1:1'] })
    );
    expect(tasks.every(t => t.clipId === 'my-clip-42')).toBe(true);
  });

  it.each<[AspectRatio, number, number]>([
    ['9:16', 1080, 1920],
    ['1:1', 1080, 1080],
    ['16:9', 1920, 1080],
  ])('sets width/height for %s format', (ratio, w, h) => {
    const tasks = multiExporter.prepareExportTasks(makeRequest({ formats: [ratio] }));
    expect(tasks[0].width).toBe(w);
    expect(tasks[0].height).toBe(h);
  });
});

// ─── buildOutputFilename ───────────────────────────────────────────────────

describe('multiExporter.buildOutputFilename', () => {
  it('produces expected pattern with zero-padded index', () => {
    expect(multiExporter.buildOutputFilename('c1', '9:16', 0)).toBe('clip_c1_9x16_00.mp4');
  });

  it('replaces : with x in aspect ratio', () => {
    expect(multiExporter.buildOutputFilename('clip', '1:1', 1)).toBe('clip_clip_1x1_01.mp4');
  });

  it('pads index to 2 digits', () => {
    expect(multiExporter.buildOutputFilename('c', '16:9', 12)).toBe('clip_c_16x9_12.mp4');
  });
});

// ─── ExportTask structure ──────────────────────────────────────────────────

describe('ExportTask structure', () => {
  it('includes ffmpegArgs with the expected shape', () => {
    const tasks = multiExporter.prepareExportTasks(makeRequest({ formats: ['9:16'] }));
    const args = tasks[0].ffmpegArgs;
    expect(args).toContain('-ss');
    expect(args).toContain('0');
    expect(args).toContain('-i');
    expect(args).toContain('/video.mp4');
    expect(args).toContain('-c:v');
    expect(args).toContain('libx264');
    expect(args).toContain('-c:a');
    expect(args).toContain('aac');
    expect(args).toContain('/output/clip_clip-1_9x16_00.mp4');
  });

  it('uses quality preset values in ffmpegArgs', () => {
    const tasks = multiExporter.prepareExportTasks(
      makeRequest({ formats: ['1:1'], quality: 'high' })
    );
    const args = tasks[0].ffmpegArgs;
    // high: crf=18, preset=slow
    expect(args).toContain('18');
    expect(args).toContain('slow');
  });

  it('uses low-quality settings when quality=low', () => {
    const tasks = multiExporter.prepareExportTasks(
      makeRequest({ formats: ['16:9'], quality: 'low' })
    );
    const args = tasks[0].ffmpegArgs;
    // low: crf=28, preset=fast
    expect(args).toContain('28');
    expect(args).toContain('fast');
  });

  it('includes a scale/crop filter in ffmpegArgs (-vf)', () => {
    const tasks = multiExporter.prepareExportTasks(makeRequest({ formats: ['9:16'] }));
    const args = tasks[0].ffmpegArgs;
    expect(args).toContain('-vf');
    const vfIndex = args.indexOf('-vf');
    const filter = args[vfIndex + 1];
    expect(filter).toContain('scale=');
    expect(filter).toContain('1080');
    expect(filter).toContain('1920');
    // 9:16 is narrower than source 16:9 → uses crop, smart strategy uses setsar
    expect(filter).toContain('setsar=1:1');
  });

  it('builds pad-based filter when target is wider (16:9 vs 16:9 source)', () => {
    // 9:16 (portrait) for 16:9 source uses crop
    // 1:1 (square) for 16:9 source uses crop too (1 < 16/9)
    // 16:9 (landscape) for 16:9 source uses pad (16/9 == 16/9, not strictly <)
    const tasks = multiExporter.prepareExportTasks(makeRequest({ formats: ['16:9'] }));
    const ffmpegArgs = tasks[0].ffmpegArgs;
    const filter = ffmpegArgs[ffmpegArgs.indexOf('-vf') + 1];
    expect(filter).toContain('pad=');
    expect(filter).toContain('1920:1080');
  });
});

// ─── quality propagation across formats ────────────────────────────────────

describe('quality propagation', () => {
  it('all tasks share the same quality preset when formats vary', () => {
    const tasks = multiExporter.prepareExportTasks(
      makeRequest({ formats: ['9:16', '1:1', '16:9'], quality: 'medium' })
    );
    for (const t of tasks) {
      expect(t.ffmpegArgs).toContain('23');
      expect(t.ffmpegArgs).toContain('medium');
    }
  });
});

// ─── singleton ─────────────────────────────────────────────────────────────

it('exposes a default singleton instance', () => {
  expect(multiExporter).toBeDefined();
  expect(typeof multiExporter.prepareExportTasks).toBe('function');
});
