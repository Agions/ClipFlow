/**
 * clip-workflow — 单元测试
 *
 * 覆盖：
 *  - constructor / updateConfig / getConfig
 *  - exportTimeline (tracks / duration 累加)
 *  - getExportSettings 4 档画质映射 (low/medium/high/ultra) + format 'mov' 归一为 'mp4'
 *  - optimizeQuality 高/超画质加 denoise + sharpen
 *  - processVideo 轻量路径
 *  - processVideoWithPipeline 完整路径 (mock pipeline.run)
 *  - ASR 失败时返回空 segments
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VideoAnalysis, VideoInfo, Scene } from '@/types';
import type { ASRResult, ASRSegment } from '../../asr/asr-types';
import type { RepurposingOptions } from './pipeline';
import type { RepurposingClip } from './types';

vi.mock('../../ai/vision-service', () => ({
  visionService: {
    detectScenesAdvanced: vi.fn(),
    generateAnalysisReport: vi.fn(),
  },
}));

vi.mock('../../asr/asr-service', () => ({
  asrService: {
    recognizeSpeech: vi.fn(),
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

// 直接 mock 整个 pipeline 模块以避免拉起 ClipRepurposingPipeline 内部依赖
vi.mock('./pipeline', async () => {
  const actual = await vi.importActual<typeof import('./pipeline')>('./pipeline');
  return {
    ...actual,
    ClipRepurposingPipeline: class {
      async run(
        _video: VideoInfo,
        _analysis: VideoAnalysis,
        _opts: Partial<RepurposingOptions>,
        _asr?: ASRSegment[]
      ): Promise<{
        clips: RepurposingClip[];
        totalInputDuration: number;
        totalOutputDuration: number;
        platform: string;
        exportedFormats: string[];
      }> {
        return {
          clips: [
            {
              clip: {
                id: 'p1',
                startTime: 0,
                endTime: 30,
                sceneType: 'action',
                transcript: 'A'.repeat(250), // > 200 chars to verify slice
              },
              score: {
                clip: { id: 'p1', startTime: 0, endTime: 30, sceneType: 'action', transcript: '' },
                finalScore: 0.9,
                reasons: [],
                metrics: {} as never,
              } as never,
            },
            {
              clip: {
                id: 'p2',
                startTime: 30,
                endTime: 60,
                sceneType: 'intro',
                transcript: 'short',
              },
              score: {} as never,
            },
          ],
          totalInputDuration: 60,
          totalOutputDuration: 60,
          platform: 'youtube',
          exportedFormats: ['9:16'],
        };
      }
    },
  };
});

import { ClipWorkflowService, clipWorkflowService } from './clip-workflow';
import { visionService } from '../../ai/vision-service';
import { asrService } from '../../asr/asr-service';

const mockedDetect = vi.mocked(visionService.detectScenesAdvanced);
const mockedReport = vi.mocked(visionService.generateAnalysisReport);
const mockedASR = vi.mocked(asrService.recognizeSpeech);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeVideo(overrides: Partial<VideoInfo> = {}): VideoInfo {
  return {
    id: 'video-1',
    path: '/video.mp4',
    duration: 60,
    ...overrides,
  } as VideoInfo;
}

function makeAnalysis(overrides: Partial<VideoAnalysis> = {}): VideoAnalysis {
  return {
    videoId: 'video-1',
    scenes: [
      { id: 's1', startTime: 0, endTime: 30 } as Scene,
      { id: 's2', startTime: 30, endTime: 60 } as Scene,
    ],
    ...overrides,
  } as VideoAnalysis;
}

// ─── config ──────────────────────────────────────────────────────────────────

describe('ClipWorkflowService config', () => {
  it('uses default config when none provided', () => {
    const svc = new ClipWorkflowService();
    const cfg = svc.getConfig();
    expect(cfg.detectSceneChange).toBe(true);
    expect(cfg.removeSilence).toBe(true);
    expect(cfg.outputFormat).toBe('mp4');
    expect(cfg.fps).toBe(30);
    expect(cfg.resolution).toBe('1080p');
  });

  it('updateConfig merges with defaults', () => {
    const svc = new ClipWorkflowService();
    svc.updateConfig({ outputFormat: 'webm', sceneThreshold: 0.5 });
    const cfg = svc.getConfig();
    expect(cfg.outputFormat).toBe('webm');
    expect(cfg.sceneThreshold).toBe(0.5);
    expect(cfg.detectSceneChange).toBe(true); // default retained
  });

  it('getConfig returns a copy', () => {
    const svc = new ClipWorkflowService();
    const cfg = svc.getConfig();
    cfg.outputFormat = 'mov';
    expect(svc.getConfig().outputFormat).toBe('mp4');
  });
});

// ─── exportTimeline ──────────────────────────────────────────────────────────

describe('ClipWorkflowService.exportTimeline', () => {
  it('groups segments into video + subtitle tracks', () => {
    const svc = new ClipWorkflowService();
    const result = svc.exportTimeline([
      { id: 'a', type: 'video', duration: 10 } as never,
      { id: 'b', type: 'subtitle', duration: 5 } as never,
      { id: 'c', type: 'video', duration: 8 } as never,
    ]) as { tracks: Array<{ id: string; type: string; clips: unknown[] }>; duration: number };
    expect(result.tracks).toHaveLength(2);
    expect(result.tracks[0].clips).toHaveLength(2);
    expect(result.tracks[1].clips).toHaveLength(1);
    expect(result.duration).toBe(23);
  });
});

// ─── getExportSettings ───────────────────────────────────────────────────────

describe('ClipWorkflowService.getExportSettings', () => {
  it('maps low quality to 720p/24fps/low', () => {
    const svc = new ClipWorkflowService({ outputQuality: 'low' });
    expect(svc.getExportSettings()).toMatchObject({ resolution: '720p', fps: 24, quality: 'low' });
  });

  it('maps medium quality to 1080p/30fps/medium', () => {
    const svc = new ClipWorkflowService({ outputQuality: 'medium' });
    expect(svc.getExportSettings()).toMatchObject({
      resolution: '1080p',
      fps: 30,
      quality: 'medium',
    });
  });

  it('maps high quality to 1080p/30fps/high', () => {
    const svc = new ClipWorkflowService();
    expect(svc.getExportSettings()).toMatchObject({
      resolution: '1080p',
      fps: 30,
      quality: 'high',
    });
  });

  it('maps ultra quality to 4k/60fps/ultra', () => {
    const svc = new ClipWorkflowService({ outputQuality: 'ultra' });
    expect(svc.getExportSettings()).toMatchObject({ resolution: '4k', fps: 60, quality: 'ultra' });
  });

  it('normalises mov format to mp4 in export settings', () => {
    const svc = new ClipWorkflowService({ outputFormat: 'mov' });
    expect(svc.getExportSettings().format).toBe('mp4');
  });

  it('sets subtitles/watermark defaults', () => {
    const svc = new ClipWorkflowService();
    const settings = svc.getExportSettings();
    expect(settings.includeSubtitles).toBe(true);
    expect(settings.includeWatermark).toBe(false);
    expect(settings.burnSubtitles).toBe(true);
  });
});

// ─── optimizeQuality ─────────────────────────────────────────────────────────

describe('ClipWorkflowService.optimizeQuality', () => {
  it('adds denoise + sharpen when outputQuality is high', () => {
    const svc = new ClipWorkflowService({ outputQuality: 'high' });
    const result = svc.optimizeQuality([{ id: 'a', effects: ['existing'] } as never]);
    expect(result[0].effects).toEqual(['existing', 'denoise', 'sharpen']);
  });

  it('adds denoise + sharpen when outputQuality is ultra', () => {
    const svc = new ClipWorkflowService({ outputQuality: 'ultra' });
    const result = svc.optimizeQuality([{ id: 'a' } as never]);
    expect(result[0].effects).toEqual(['denoise', 'sharpen']);
  });

  it('skips denoise when outputQuality is medium', () => {
    const svc = new ClipWorkflowService({ outputQuality: 'medium' });
    const result = svc.optimizeQuality([{ id: 'a' } as never]);
    expect(result[0].effects).toEqual(['sharpen']);
  });

  it('returns new segment objects without mutating inputs', () => {
    const svc = new ClipWorkflowService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: any = [{ id: 'a', effects: [] }];
    const result = svc.optimizeQuality(input);
    expect(result[0]).not.toBe(input[0]);
    expect(input[0].effects).toEqual([]);
  });
});

// ─── processVideo (轻量路径) ────────────────────────────────────────────────

describe('ClipWorkflowService.processVideo', () => {
  it('produces segments from analysis + scene changes', async () => {
    mockedDetect.mockResolvedValue({
      scenes: [
        { id: 's1', startTime: 0, endTime: 30 } as Scene,
        { id: 's2', startTime: 30, endTime: 60 } as Scene,
      ],
      objects: [],
      emotions: [],
    });
    mockedReport.mockResolvedValue(makeAnalysis());

    const svc = new ClipWorkflowService();
    const result = await svc.processVideo(makeVideo());
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.metadata.pipelineUsed).toBe(false);
    expect(typeof result.metadata.processedAt).toBe('string');
    expect(result.totalDuration).toBeGreaterThan(0);
  });

  it('skips scene segmentation when detectSceneChange is false', async () => {
    mockedDetect.mockResolvedValue({ scenes: [], objects: [], emotions: [] });
    mockedReport.mockResolvedValue(makeAnalysis());

    const svc = new ClipWorkflowService({ detectSceneChange: false });
    const result = await svc.processVideo(makeVideo());
    expect(result.cutPoints).toBe(0);
    // duration 来自 getAnalysisDuration → max scene endTime = 60
    expect(result.totalDuration).toBe(60);
  });

  it('attaches script text when provided', async () => {
    mockedDetect.mockResolvedValue({ scenes: [], objects: [], emotions: [] });
    mockedReport.mockResolvedValue(makeAnalysis());

    const svc = new ClipWorkflowService();
    const result = await svc.processVideo(makeVideo(), [
      { id: 'sc1', content: 'first script', startTime: 0, endTime: 30 } as never,
      { id: 'sc2', content: 'second', startTime: 30, endTime: 60 } as never,
    ]);
    expect(result.segments[0].text).toBe('first script');
  });
});

// ─── processVideoWithPipeline (Pipeline 路径) ───────────────────────────────

describe('ClipWorkflowService.processVideoWithPipeline', () => {
  it('returns ClipResult from the mocked pipeline', async () => {
    mockedReport.mockResolvedValue(makeAnalysis());

    const svc = new ClipWorkflowService();
    const result = await svc.processVideoWithPipeline(makeVideo(), makeAnalysis());
    expect(result.segments.length).toBe(2);
    expect(result.metadata.pipelineUsed).toBe(true);
    expect(result.cutPoints).toBe(2);
    // first transcript is sliced to 200 chars
    expect(result.segments[0].text).toHaveLength(200);
  });

  it('uses externally provided ASR segments without calling asrService', async () => {
    mockedReport.mockResolvedValue(makeAnalysis());

    const svc = new ClipWorkflowService();
    const asrSegments: ASRSegment[] = [
      { id: 'asr1', startTime: 0, endTime: 30, text: 'x', confidence: 1 } as ASRSegment,
    ];
    await svc.processVideoWithPipeline(makeVideo(), makeAnalysis(), undefined, asrSegments);
    expect(mockedASR).not.toHaveBeenCalled();
  });

  it('falls back to asrService when ASR segments are not provided', async () => {
    mockedReport.mockResolvedValue(makeAnalysis());
    mockedASR.mockResolvedValue({
      text: '',
      segments: [{ id: 's', startTime: 0, endTime: 30, text: 'a', confidence: 0.9 } as ASRSegment],
      language: 'zh_cn',
      confidence: 0.9,
      provider: 'mock',
    } as ASRResult);

    const svc = new ClipWorkflowService();
    const result = await svc.processVideoWithPipeline(makeVideo(), makeAnalysis());
    expect(mockedASR).toHaveBeenCalledTimes(1);
    expect(result.segments).toHaveLength(2);
  });

  it('returns empty ASR segments when ASR service throws', async () => {
    mockedReport.mockResolvedValue(makeAnalysis());
    mockedASR.mockRejectedValue(new Error('asr down'));

    const svc = new ClipWorkflowService();
    const result = await svc.processVideoWithPipeline(makeVideo(), makeAnalysis());
    expect(result.segments.length).toBe(2); // pipeline still runs with empty ASR
  });

  it('applies transitions based on config', async () => {
    mockedReport.mockResolvedValue(makeAnalysis());

    const svc = new ClipWorkflowService({ autoTransition: true, transitionType: 'dissolve' });
    const result = await svc.processVideoWithPipeline(makeVideo(), makeAnalysis());
    // first segment has no transition; subsequent ones get the configured type
    expect(result.segments[0].transition).toBeUndefined();
    expect(result.segments[1].transition).toBe('dissolve');
  });
});

// ─── singleton ───────────────────────────────────────────────────────────────

it('exposes a default singleton instance', () => {
  expect(clipWorkflowService).toBeInstanceOf(ClipWorkflowService);
});
