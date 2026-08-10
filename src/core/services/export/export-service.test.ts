/**
 * export-service 测试
 *
 * Stage 9 PR-4：导出服务核心覆盖（mergeExportConfig + ExportService）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock tauri module
vi.mock('@/core/tauri', () => ({
  tauri: {
    exportVideo: vi
      .fn()
      .mockResolvedValue({ outputPath: '/output.mp4', duration: 120, fileSize: 1024 * 1024 * 10 }),
    cancelExport: vi.fn().mockResolvedValue(undefined),
  },
}));

import { tauri } from '@/core/tauri';
import {
  ExportService,
  exportService,
  mergeExportConfig,
  FORMAT_MIME_TYPES,
} from './export-service';
import type { ExportConfig } from '@/types';

describe('mergeExportConfig', () => {
  it('returns defaults when no overrides or instance provided', () => {
    const config = mergeExportConfig({}, null);
    expect(config.format).toBe('mp4');
    expect(config.quality).toBe('medium');
    expect(config.resolution).toBe('1080p');
    expect(config.frameRate).toBe(30);
    expect(config.audioCodec).toBe('aac');
  });

  it('overrides take precedence over defaults', () => {
    const config = mergeExportConfig({ format: 'webm', quality: 'high' }, null);
    expect(config.format).toBe('webm');
    expect(config.quality).toBe('high');
  });

  it('instance config fills in when override is not provided', () => {
    const instance: ExportConfig = mergeExportConfig({ format: 'mov' }, null);
    const merged = mergeExportConfig({ quality: 'high' }, instance);
    expect(merged.format).toBe('mov'); // from instance
    expect(merged.quality).toBe('high'); // from override
  });

  it('overrides take precedence over instance config', () => {
    const instance: ExportConfig = mergeExportConfig({ format: 'mov' }, null);
    const merged = mergeExportConfig({ format: 'webm' }, instance);
    expect(merged.format).toBe('webm'); // override wins
  });

  it('quality preset influences resolution and frameRate when not overridden', () => {
    const config = mergeExportConfig({ quality: 'high' }, null);
    expect(config.quality).toBe('high');
    expect(config.resolution).toBeDefined();
    expect(config.frameRate).toBeDefined();
  });
});

describe('ExportService config', () => {
  it('getConfig returns null initially', () => {
    const svc = new ExportService();
    expect(svc.getConfig()).toBeNull();
  });

  it('setConfig stores merged config', () => {
    const svc = new ExportService();
    svc.setConfig({ format: 'webm', quality: 'high' });
    const config = svc.getConfig();
    expect(config).not.toBeNull();
    expect(config?.format).toBe('webm');
    expect(config?.quality).toBe('high');
  });

  it('returns a fresh object on setConfig (not a shared reference)', () => {
    const svc = new ExportService();
    svc.setConfig({ format: 'mp4' });
    const config = svc.getConfig();
    expect(config?.format).toBe('mp4');
  });
});

describe('ExportService.exportVideo', () => {
  beforeEach(() => {
    vi.mocked(tauri.exportVideo).mockResolvedValue({
      outputPath: '/output.mp4',
      duration: 120,
      fileSize: 10 * 1024 * 1024,
    });
  });

  it('calls tauri.exportVideo with input and output paths', async () => {
    const svc = new ExportService();
    const result = await svc.exportVideo('/input.mp4', '/output.mp4', { format: 'mp4' });

    expect(tauri.exportVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        inputPath: '/input.mp4',
        outputPath: '/output.mp4',
        format: 'mp4',
      })
    );
    expect(result.outputPath).toBe('/output.mp4');
    expect(result.duration).toBe(120);
    expect(result.fileSize).toBe(10 * 1024 * 1024);
  });

  it('uses instance exportConfig as base for new export', async () => {
    const svc = new ExportService();
    svc.setConfig({ resolution: '720p' });
    await svc.exportVideo('/input.mp4', '/output.mp4', { format: 'mp4' });
    expect(tauri.exportVideo).toHaveBeenCalledWith(expect.objectContaining({ resolution: '720p' }));
  });

  it('rejects on tauri failure', async () => {
    vi.mocked(tauri.exportVideo).mockRejectedValueOnce(new Error('export failed'));
    const svc = new ExportService();
    await expect(svc.exportVideo('/in.mp4', '/out.mp4', { format: 'mp4' })).rejects.toThrow(
      'export failed'
    );
  });
});

describe('ExportService.cancelExport', () => {
  it('does nothing when no current export', async () => {
    const svc = new ExportService();
    await svc.cancelExport();
    expect(tauri.cancelExport).not.toHaveBeenCalled();
  });

  it('exportService singleton is an instance of ExportService', () => {
    expect(exportService).toBeInstanceOf(ExportService);
  });
});

describe('FORMAT_MIME_TYPES', () => {
  it('maps mp4 to video/mp4', () => {
    expect(FORMAT_MIME_TYPES.mp4).toBe('video/mp4');
  });

  it('maps webm to video/webm', () => {
    expect(FORMAT_MIME_TYPES.webm).toBe('video/webm');
  });

  it('maps mov to video/quicktime', () => {
    expect(FORMAT_MIME_TYPES.mov).toBe('video/quicktime');
  });

  it('maps gif to image/gif', () => {
    expect(FORMAT_MIME_TYPES.gif).toBe('image/gif');
  });

  it('maps mkv to video/x-matroska', () => {
    expect(FORMAT_MIME_TYPES.mkv).toBe('video/x-matroska');
  });
});

describe('ExportService.cancelExport with active export', () => {
  beforeEach(() => {
    vi.mocked(tauri.exportVideo).mockReset();
    vi.mocked(tauri.cancelExport).mockReset();
    vi.mocked(tauri.cancelExport).mockResolvedValue(undefined);
  });

  it('calls tauri.cancelExport with the current export id while export is in flight', async () => {
    // Hold the export open so currentExportId remains set
    let resolveExport!: (v: { outputPath: string; duration: number; fileSize: number }) => void;
    vi.mocked(tauri.exportVideo).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveExport = resolve;
        })
    );

    const svc = new ExportService();
    const exportPromise = svc.exportVideo('/in.mp4', '/out.mp4', { format: 'mp4' });

    // While the export is still in flight, currentExportId is set
    await svc.cancelExport();
    expect(tauri.cancelExport).toHaveBeenCalledTimes(1);

    // Resolve and clean up the dangling export promise
    resolveExport({ outputPath: '/out.mp4', duration: 60, fileSize: 1024 });
    await exportPromise.catch(() => undefined);
  });

  it('swallows tauri.cancelExport errors via warn log', async () => {
    let resolveExport!: (v: { outputPath: string; duration: number; fileSize: number }) => void;
    vi.mocked(tauri.exportVideo).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveExport = resolve;
        })
    );
    vi.mocked(tauri.cancelExport).mockRejectedValueOnce(new Error('cancel crashed'));

    const svc = new ExportService();
    const exportPromise = svc.exportVideo('/in.mp4', '/out.mp4', { format: 'mp4' });

    // Should not throw despite tauri.cancelExport failing
    await expect(svc.cancelExport()).resolves.toBeUndefined();

    // Clean up dangling export
    resolveExport({ outputPath: '/out.mp4', duration: 60, fileSize: 1024 });
    await exportPromise.catch(() => undefined);
  });
});

describe('ExportService.getExportPresets + getFormatInfo', () => {
  it('getExportPresets returns EXPORT_PRESETS reference', () => {
    const svc = new ExportService();
    const presets = svc.getExportPresets();
    expect(typeof presets).toBe('object');
    expect(presets).not.toBeNull();
    expect(Object.keys(presets).length).toBeGreaterThan(0);
  });

  it('getFormatInfo returns the format descriptor for known formats', () => {
    const svc = new ExportService();
    const info = svc.getFormatInfo('mp4');
    expect(info).toBeDefined();
    expect(info?.name).toBeDefined();
    expect(info?.container).toBeDefined();
  });
});
