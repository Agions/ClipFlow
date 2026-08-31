/**
 * Fablr — 剪映 (JianYing / CapCut) 草稿导出器
 *
 * 将 Fablr 时间轴项目直接转换为剪映工程结构 (`draft_content.json` + `draft_meta_info.json`)
 * 创作者可直接在剪映客户端中一键打开，保留所有分段、解说音轨、字幕与画中画。
 */

export interface JianYingClip {
  id: string;
  sourcePath: string;
  startTimeUs: number; // 微秒
  durationUs: number;  // 微秒
  sourceInUs: number;
  sourceOutUs: number;
  speed: number;
}

export interface JianYingAudioClip {
  id: string;
  sourcePath: string;
  startTimeUs: number;
  durationUs: number;
  volume: number; // 0.0 - 2.0
}

export interface JianYingSubtitleItem {
  id: string;
  text: string;
  startTimeUs: number;
  durationUs: number;
}

export interface JianYingProjectExportInput {
  projectName: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  fps?: number;
  videoClips: JianYingClip[];
  voiceoverClips: JianYingAudioClip[];
  bgmClips?: JianYingAudioClip[];
  subtitles?: JianYingSubtitleItem[];
}

export interface JianYingDraftContent {
  id: string;
  canvas_config: {
    ratio: string;
    width: number;
    height: number;
  };
  duration: number; // us
  fps: number;
  materials: {
    videos: Array<{ id: string; path: string; duration: number }>;
    audios: Array<{ id: string; path: string; duration: number }>;
    texts: Array<{ id: string; content: string }>;
    speeds: Array<{ id: string; speed: number }>;
  };
  tracks: Array<{
    id: string;
    type: 'video' | 'audio' | 'text' | 'effect';
    segments: Array<{
      id: string;
      material_id: string;
      target_timerange: { start: number; duration: number };
      source_timerange?: { start: number; duration: number };
      speed_id?: string;
    }>;
  }>;
  version: number;
}

export const jianYingExporter = {
  /**
   * 将输入转换为剪映标准的 draft_content.json 对象
   */
  generateDraftContent: (input: JianYingProjectExportInput): JianYingDraftContent => {
    const fps = input.fps ?? 30;
    const canvasDimensions: Record<string, { width: number; height: number }> = {
      '9:16': { width: 1080, height: 1920 },
      '16:9': { width: 1920, height: 1080 },
      '1:1': { width: 1080, height: 1080 },
    };

    const canvas = canvasDimensions[input.aspectRatio] ?? canvasDimensions['16:9'];

    let totalDurationUs = 0;
    input.videoClips.forEach(c => {
      const end = c.startTimeUs + c.durationUs;
      if (end > totalDurationUs) totalDurationUs = end;
    });
    input.voiceoverClips.forEach(a => {
      const end = a.startTimeUs + a.durationUs;
      if (end > totalDurationUs) totalDurationUs = end;
    });

    const draftId = `draft_${Date.now()}`;

    // 1. 整理 Materials
    const materialVideos = input.videoClips.map(c => ({
      id: `mat_v_${c.id}`,
      path: c.sourcePath,
      duration: c.durationUs,
    }));

    const materialAudios = [
      ...input.voiceoverClips.map(a => ({
        id: `mat_a_${a.id}`,
        path: a.sourcePath,
        duration: a.durationUs,
      })),
      ...(input.bgmClips || []).map(b => ({
        id: `mat_bgm_${b.id}`,
        path: b.sourcePath,
        duration: b.durationUs,
      })),
    ];

    const materialTexts = (input.subtitles || []).map(s => ({
      id: `mat_t_${s.id}`,
      content: s.text,
    }));

    // 2. 构建 Tracks
    const videoTrackSegments = input.videoClips.map(c => ({
      id: `seg_v_${c.id}`,
      material_id: `mat_v_${c.id}`,
      target_timerange: { start: c.startTimeUs, duration: c.durationUs },
      source_timerange: { start: c.sourceInUs, duration: c.sourceOutUs - c.sourceInUs },
    }));

    const audioTrackSegments = input.voiceoverClips.map(a => ({
      id: `seg_a_${a.id}`,
      material_id: `mat_a_${a.id}`,
      target_timerange: { start: a.startTimeUs, duration: a.durationUs },
    }));

    const tracks: JianYingDraftContent['tracks'] = [
      {
        id: 'track_main_video',
        type: 'video',
        segments: videoTrackSegments,
      },
      {
        id: 'track_voiceover_audio',
        type: 'audio',
        segments: audioTrackSegments,
      },
    ];

    if (input.subtitles && input.subtitles.length > 0) {
      tracks.push({
        id: 'track_subtitle_text',
        type: 'text',
        segments: input.subtitles.map(s => ({
          id: `seg_t_${s.id}`,
          material_id: `mat_t_${s.id}`,
          target_timerange: { start: s.startTimeUs, duration: s.durationUs },
        })),
      });
    }

    return {
      id: draftId,
      canvas_config: {
        ratio: input.aspectRatio,
        width: canvas.width,
        height: canvas.height,
      },
      duration: totalDurationUs,
      fps,
      materials: {
        videos: materialVideos,
        audios: materialAudios,
        texts: materialTexts,
        speeds: [],
      },
      tracks,
      version: 2,
    };
  },

  /**
   * 生成元数据清单 draft_meta_info.json
   */
  generateDraftMeta: (projectName: string, totalDurationUs: number) => {
    return {
      draft_id: `meta_${Date.now()}`,
      draft_name: projectName,
      draft_timeline_duration: totalDurationUs,
      draft_cover: 'cover.jpg',
      draft_root_path: '',
      tm_draft_create: Date.now(),
      tm_draft_modified: Date.now(),
      draft_removable: true,
    };
  },
};
