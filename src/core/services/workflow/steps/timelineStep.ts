import type { VideoInfo, VideoAnalysis, ScriptData, Scene } from '@/core/types';
import type { TimelineData } from '../types';
import { sceneCommentaryAlignmentService } from '../../scene-commentary-alignment.service';
import { aiDirectorService } from '../../ai-director.service';
import { overlayQualityService } from '../../overlay-quality.service';
import { optimizeOverlayIteratively } from '../../overlay-optimization.service';
import type { WorkflowMode } from '@/core/workflow/featureBlueprint';

interface TimelineBuildOptions {
  autoOriginalOverlay?: boolean;
  syncStrategy?: 'strict' | 'balanced';
  mode?: WorkflowMode;
  overlayMixMode?: 'pip' | 'full';
  overlayOpacity?: number;
}

export async function executeTimelineStep(
  videoInfo: VideoInfo,
  videoAnalysis: VideoAnalysis,
  editedScript: ScriptData,
  autoMatch: boolean = true,
  options: TimelineBuildOptions = {},
  updateProgress: (progress: number) => void = () => {}
): Promise<TimelineData> {
  if (autoMatch) {
    return autoMatchTimeline(videoInfo, videoAnalysis, editedScript, options, updateProgress);
  }

  // 创建空时间轴
  return {
    tracks: [
      { id: 'video-track-1', type: 'video', clips: [] },
      { id: 'audio-track-1', type: 'audio', clips: [] },
      { id: 'subtitle-track-1', type: 'subtitle', clips: [] },
    ],
    duration: videoInfo.duration,
  };
}

async function autoMatchTimeline(
  videoInfo: VideoInfo,
  analysis: VideoAnalysis,
  script: ScriptData,
  options: TimelineBuildOptions,
  updateProgress: (progress: number) => void = () => {}
): Promise<TimelineData> {
  updateProgress(10);
  
  if (!script.segments.length) {
    return {
      tracks: [
        { id: 'video-track-1', type: 'video', clips: [] },
        { id: 'audio-track-1', type: 'audio', clips: [] },
        { id: 'subtitle-track-1', type: 'subtitle', clips: [] },
      ],
      duration: videoInfo.duration,
    };
  }

  updateProgress(20);
  const directorPlan = await aiDirectorService.buildPlan({
    mode: (options.mode || 'ai-commentary') as 'ai-commentary' | 'ai-mixclip' | 'ai-first-person',
    targetDuration: videoInfo.duration,
    autoOriginalOverlay: options.autoOriginalOverlay !== false,
    scenes: (analysis.scenes ?? []).map((scene) => ({
      id: scene.id,
      startTime: scene.startTime,
      endTime: scene.endTime,
      type: scene.type,
    })),
    segments: script.segments.map((segment) => ({
      id: segment.id,
      content: segment.content,
    })),
  });

  updateProgress(40);
  const videoClips: TimelineData['tracks'][0]['clips'] = [];
  const subtitleClips: TimelineData['tracks'][0]['clips'] = [];
  const effectClips: TimelineData['tracks'][0]['clips'] = [];
  const matchedScenes = script.segments.map((segment, index) =>
    findBestMatchingScene(segment, analysis.scenes ?? [], index / script.segments.length)
  );
  updateProgress(50);
  const averageDuration = Math.max(videoInfo.duration / script.segments.length, 0.001);
  const rawDurations = matchedScenes.map((scene) => {
    const duration = scene ? scene.endTime - scene.startTime : averageDuration;
    return Math.max(duration, 0.2);
  });
  const durationSum = rawDurations.reduce((sum, duration) => sum + duration, 0) || 1;
  const normalizeFactor = videoInfo.duration / durationSum;
  const timelineDurations = rawDurations.map((duration) => duration * normalizeFactor);

  let currentTime = 0;
  const baseSyncFactor = options.syncStrategy === 'strict' ? 1 : 0.92;
  const syncFactor = baseSyncFactor * directorPlan.pacingFactor;
  const preferredTransition = directorPlan.preferredTransition;

  script.segments.forEach((segment, index) => {
    const matchedScene = matchedScenes[index];

    const startTime = currentTime;
    const endTime = currentTime + timelineDurations[index] * syncFactor;

    videoClips.push({
      id: `video-clip-${index}`,
      startTime,
      endTime,
      sourceStart: matchedScene?.startTime || 0,
      sourceEnd: matchedScene?.endTime || videoInfo.duration,
      sourceId: videoInfo.id,
      scriptSegmentId: segment.id,
      transition: index > 0 ? preferredTransition : undefined,
    });

    subtitleClips.push({
      id: `subtitle-clip-${index}`,
      startTime,
      endTime,
      sourceStart: 0,
      sourceEnd: (segment.content ?? '').length,
      sourceId: segment.id,
      scriptSegmentId: segment.id,
    });

    currentTime = endTime;
  });

  updateProgress(60);
  const alignmentItems = sceneCommentaryAlignmentService.align(
    videoClips.map((clip, index) => ({
      id: `scene-aligned-${index}`,
      startTime: clip.startTime,
      endTime: clip.endTime,
      thumbnail: '',
      tags: [] as string[],
      type: 'action' as const,
      score: 0,
    })) as Scene[],
    script.segments.map((segment, index) => ({
      ...segment,
      startTime: subtitleClips[index]?.startTime ?? 0,
      endTime: subtitleClips[index]?.endTime ?? 0,
    }))
  );

  updateProgress(70);
  const averageConfidence =
    alignmentItems.reduce((sum, item) => sum + item.confidence, 0) / Math.max(alignmentItems.length, 1);
  const maxDriftSeconds = alignmentItems.reduce((max, item) => Math.max(max, item.driftSeconds), 0);

  const timelineScenesForOverlay: Scene[] = videoClips.map((clip, index) => ({
    id: `overlay-scene-${index}`,
    startTime: clip.startTime,
    endTime: clip.endTime,
    thumbnail: '',
    tags: [] as string[],
    type: (matchedScenes[index]?.type as Scene['type']) || 'action',
    dominantEmotion: matchedScenes[index]?.dominantEmotion || 'neutral',
    features: matchedScenes[index]?.features || [],
    score: 0,
  }));
  const originalOverlayPlan =
    options.autoOriginalOverlay === false
      ? []
      : sceneCommentaryAlignmentService.buildOriginalOverlayPlan(timelineScenesForOverlay);

  updateProgress(80);
  if (originalOverlayPlan.length) {
    effectClips.push(
      ...originalOverlayPlan.map((item, index) => ({
        id: `original-overlay-${index}`,
        startTime: item.startTime,
        endTime: item.endTime,
        sourceStart: item.startTime,
        sourceEnd: item.endTime,
        sourceId: item.sceneId,
        scriptSegmentId: item.reason,
        transition: 'cut',
      }))
    );
  }

  updateProgress(90);
  const qualityScore = 0.8; // Default quality score
  const overlayOptimizationPreview = optimizeOverlayIteratively({
    markers: originalOverlayPlan.map((item) => ({
      start: item.startTime,
      end: item.endTime,
      label: item.reason,
    })),
    subtitles: subtitleClips.map((clip) => ({ start: clip.startTime, end: clip.endTime })),
    qualityScore,
    baseOpacity: options.overlayOpacity ?? 0.72,
    preferredMode: options.overlayMixMode ?? 'pip',
    duration: Math.max(currentTime, videoInfo.duration),
  });

  updateProgress(100);
  return {
    tracks: [
      { id: 'video-track-1', type: 'video', clips: videoClips },
      { id: 'audio-track-1', type: 'audio', clips: [] },
      { id: 'subtitle-track-1', type: 'subtitle', clips: subtitleClips },
      { id: 'effect-track-1', type: 'effect', clips: effectClips },
    ],
    duration: currentTime,
    alignment: {
      averageConfidence: Math.min(1, averageConfidence * directorPlan.confidence),
      maxDriftSeconds,
      items: alignmentItems.map((item) => ({
        sceneId: item.sceneId,
        segmentId: item.segmentId,
        driftSeconds: item.driftSeconds,
        confidence: item.confidence,
      })),
    },
    originalOverlayPlan,
    directorPlan,
    overlayOptimizationPreview: {
      predictedScore: overlayOptimizationPreview.predictedScore,
      passes: overlayOptimizationPreview.passes,
      enableOverlay: overlayOptimizationPreview.enableOverlay,
    },
  };
}

function findBestMatchingScene(
  _segment: ScriptData['segments'][number],
  scenes: Scene[],
  position: number
): Scene | null {
  const targetTime = position * Math.max(...scenes.map((s) => s.endTime));

  return scenes.reduce((best, scene) => {
    const sceneTime = (scene.startTime + scene.endTime) / 2;
    const bestTime = best ? (best.startTime + best.endTime) / 2 : 0;
    return Math.abs(sceneTime - targetTime) < Math.abs(bestTime - targetTime)
      ? scene
      : best;
  }, null as Scene | null);
}
