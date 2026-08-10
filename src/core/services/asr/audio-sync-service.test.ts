/**
 * audio-sync-service — 单元测试
 *
 * 由于 AudioVideoSyncService 未导出类，本测试仅基于单例 audioVideoSyncService
 * 验证公共 API。每次用例通过 updateConfig 重置配置以保持隔离。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../tauri', () => ({
  tauri: {
    runFFprobe: vi.fn(),
  },
}));

vi.mock('@/shared/utils/logging', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { tauri } from '../../tauri';
import { audioVideoSyncService } from './audio-sync-service';
import type { SyncConfig } from './audio-sync-service';

const mockedFFprobe = vi.mocked(tauri.runFFprobe);

const DEFAULT_TEST_CONFIG: SyncConfig = {
  silenceThreshold: -40,
  minSilenceDuration: 0.5,
  audioOffset: 0,
  videoOffset: 0,
  mode: 'auto',
  adaptiveSensitivity: 0.5,
};

beforeEach(() => {
  mockedFFprobe.mockReset();
  audioVideoSyncService.updateConfig({ ...DEFAULT_TEST_CONFIG });
});

// ─── config ───────────────────────────────────────────────────────────────────

describe('audioVideoSyncService config', () => {
  it('exposes default config via getConfig', () => {
    expect(audioVideoSyncService.getConfig()).toEqual(DEFAULT_TEST_CONFIG);
  });

  it('updateConfig merges without dropping existing fields', () => {
    audioVideoSyncService.updateConfig({ mode: 'adaptive' });
    const cfg = audioVideoSyncService.getConfig();
    expect(cfg.mode).toBe('adaptive');
    expect(cfg.silenceThreshold).toBe(-40);
  });

  it('setOffset writes through to audioOffset', () => {
    audioVideoSyncService.setOffset(123);
    expect(audioVideoSyncService.getConfig().audioOffset).toBe(123);
  });

  it('getConfig returns a copy (mutations do not leak)', () => {
    const cfg = audioVideoSyncService.getConfig();
    cfg.audioOffset = 999;
    expect(audioVideoSyncService.getConfig().audioOffset).toBe(0);
  });
});

// ─── analyzeSync ─────────────────────────────────────────────────────────────

describe('audioVideoSyncService.analyzeSync', () => {
  it('returns populated SyncResult from a keyframe-rich timeline', async () => {
    // stream index + keyframes
    mockedFFprobe
      .mockResolvedValueOnce('0\n') // video stream index
      .mockResolvedValueOnce('0\n5\n10\n'); // 3 keyframes → 2 segments

    // 2 volumedetect calls (one per segment, both loud)
    mockedFFprobe
      .mockResolvedValueOnce('mean_volume: -20 dB\nmax_volume: -5 dB')
      .mockResolvedValueOnce('mean_volume: -20 dB\nmax_volume: -5 dB');

    const result = await audioVideoSyncService.analyzeSync('/video.mp4');
    expect(result.timeline.videoSegments).toHaveLength(2);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('returns empty timeline when no video stream is detected', async () => {
    mockedFFprobe.mockResolvedValueOnce(''); // empty → -1
    const result = await audioVideoSyncService.analyzeSync('/video.mp4');
    expect(result.timeline.videoSegments).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it('falls back to fixed-length segments when no keyframes', async () => {
    mockedFFprobe
      .mockResolvedValueOnce('0\n') // video stream
      .mockResolvedValueOnce('') // empty keyframes
      .mockResolvedValueOnce('90\n'); // duration

    const result = await audioVideoSyncService.analyzeSync('/video.mp4');
    // 90s / 30s = 3 fixed segments
    expect(result.timeline.videoSegments).toHaveLength(3);
    expect(result.timeline.videoSegments[0]).toEqual({ start: 0, end: 30 });
    expect(result.timeline.videoSegments[2]).toEqual({ start: 60, end: 90 });
  });

  it('falls back to default segments when ffprobe throws', async () => {
    mockedFFprobe.mockRejectedValueOnce(new Error('ffprobe crash'));
    // fallbackSegments calls getDuration
    mockedFFprobe.mockResolvedValueOnce('60\n');

    const result = await audioVideoSyncService.analyzeSync('/video.mp4');
    expect(result.timeline.videoSegments.length).toBeGreaterThan(0);
  });

  it('flags silence as a "gap" issue (low severity)', async () => {
    mockedFFprobe
      .mockResolvedValueOnce('0\n')
      .mockResolvedValueOnce('0\n10\n')
      .mockResolvedValueOnce('mean_volume: -60 dB\nmax_volume: -50 dB');

    const result = await audioVideoSyncService.analyzeSync('/video.mp4');
    expect(result.issues.some(i => i.type === 'gap' && i.severity === 'low')).toBe(true);
  });
});

// ─── autoSync ────────────────────────────────────────────────────────────────

describe('audioVideoSyncService.autoSync', () => {
  it('returns an analysis result without throwing', async () => {
    mockedFFprobe
      .mockResolvedValueOnce('0\n')
      .mockResolvedValueOnce('0\n10\n')
      .mockResolvedValueOnce('mean_volume: -20 dB\nmax_volume: -5 dB');

    const result = await audioVideoSyncService.autoSync('/video.mp4');
    expect(result.issues).toBeInstanceOf(Array);
  });
});

// ─── exportTimeline ──────────────────────────────────────────────────────────

describe('audioVideoSyncService.exportTimeline', () => {
  it('applies audioOffset to all segments (offset=0)', () => {
    const exported = audioVideoSyncService.exportTimeline([
      { start: 0, end: 10 },
      { start: 10, end: 20 },
    ]);
    expect(exported.videoSegments[0]).toEqual({
      start: 0,
      end: 10,
      audioStart: 0,
      audioEnd: 10,
    });
    expect(exported.issues).toEqual([]);
  });

  it('shifts audioStart/audioEnd by audioOffset in seconds', () => {
    audioVideoSyncService.setOffset(500); // 0.5s
    const exported = audioVideoSyncService.exportTimeline([{ start: 0, end: 10 }]);
    expect(exported.videoSegments[0]).toEqual({
      start: 0,
      end: 10,
      audioStart: 0.5,
      audioEnd: 10.5,
    });
  });
});
