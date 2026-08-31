/**
 * JianYing Exporter & Anti-Dedup Service 单元测试
 */
import { describe, it, expect } from 'vitest';
import { jianYingExporter, type JianYingProjectExportInput } from './jianying-exporter';
import { antiDedupService, DEFAULT_ANTI_DEDUP_OPTIONS } from '../services/export/anti-dedup-service';

describe('JianYing Exporter', () => {
  const sampleInput: JianYingProjectExportInput = {
    projectName: '测试短剧解说',
    aspectRatio: '9:16',
    videoClips: [
      {
        id: 'clip_1',
        sourcePath: '/videos/ep1.mp4',
        startTimeUs: 0,
        durationUs: 5_000_000,
        sourceInUs: 0,
        sourceOutUs: 5_000_000,
        speed: 1.0,
      },
    ],
    voiceoverClips: [
      {
        id: 'vo_1',
        sourcePath: '/audio/vo1.mp3',
        startTimeUs: 0,
        durationUs: 5_000_000,
        volume: 1.0,
      },
    ],
    subtitles: [
      {
        id: 'sub_1',
        text: '谁能料到，这一秒风云突变！',
        startTimeUs: 0,
        durationUs: 5_000_000,
      },
    ],
  };

  it('generates compliant draft_content.json structure', () => {
    const draft = jianYingExporter.generateDraftContent(sampleInput);

    expect(draft.canvas_config.ratio).toBe('9:16');
    expect(draft.canvas_config.width).toBe(1080);
    expect(draft.canvas_config.height).toBe(1920);
    expect(draft.materials.videos.length).toBe(1);
    expect(draft.materials.audios.length).toBe(1);
    expect(draft.materials.texts.length).toBe(1);
    expect(draft.tracks.length).toBe(3); // video, audio, text
    expect(draft.duration).toBe(5_000_000);
  });

  it('generates meta info', () => {
    const meta = jianYingExporter.generateDraftMeta('测试项目', 5_000_000);
    expect(meta.draft_name).toBe('测试项目');
    expect(meta.draft_timeline_duration).toBe(5_000_000);
    expect(meta.draft_removable).toBe(true);
  });
});

describe('Anti-Dedup Service', () => {
  it('generates default de-dup filter args when enabled', () => {
    const res = antiDedupService.buildFfmpegDedupConfig(DEFAULT_ANTI_DEDUP_OPTIONS);
    expect(res.videoFilters.length).toBeGreaterThan(0);
    expect(res.audioFilters.length).toBeGreaterThan(0);
    expect(res.ffmpegExtraArgs).toContain('-map_metadata');
    expect(res.summaryDesc.length).toBeGreaterThanOrEqual(4);
  });

  it('returns empty filters when disabled', () => {
    const res = antiDedupService.buildFfmpegDedupConfig({ enabled: false });
    expect(res.videoFilters.length).toBe(0);
    expect(res.audioFilters.length).toBe(0);
  });
});
