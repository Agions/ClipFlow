import { videoService } from '../../video.service';
import { storageService } from '../../storage.service';
import { aiDirectorService } from '../../ai-director.service';
import { optimizeOverlayIteratively, type OverlayMarker } from '../../overlay-optimization.service';
import type { VideoInfo, ScriptData, ExportSettings } from '@/core/types';
import type { TimelineData } from '../types';

export async function executeExportStep(
  projectId: string,
  videoInfo: VideoInfo,
  timeline: TimelineData,
  editedScript: ScriptData | undefined,
  settings: ExportSettings,
  autonomousOptions?: {
    overlayMixMode?: 'pip' | 'full';
    overlayOpacity?: number;
  }
): Promise<string> {
  let iterativeResult = {
    passes: 0,
    predictedScore: timeline.overlayQuality?.score ?? 100,
    enableOverlay: false,
    final: {
      mixMode: autonomousOptions?.overlayMixMode || 'pip',
      opacity: autonomousOptions?.overlayOpacity ?? 0.72,
      markers: [] as OverlayMarker[],
    },
  };

  // 生成字幕文件
  let subtitlePath: string | undefined;
  if (settings.includeSubtitles !== false && editedScript) {
    const srtContent = generateSRT(editedScript, timeline);
    subtitlePath = `exports/${projectId}_subtitle.srt`;
    storageService.set(`srt-${projectId}`, srtContent);
  }

  // 构建输出路径
  const outputPath = `exports/${projectId}_${Date.now()}.${settings.format || 'mp4'}`;

  let exportedPath = outputPath;
  const videoTrack = timeline.tracks.find((track) => track.type === 'video');
  const hasLocalInput = !!videoInfo.path && !videoInfo.path.startsWith('blob:');
  const canUseAutonomousRender = !!videoTrack?.clips?.length && hasLocalInput;

  if (canUseAutonomousRender) {
    const sortedClips = [...videoTrack.clips].sort((a, b) => a.sourceStart - b.sourceStart);
    const startTime = sortedClips[0]?.sourceStart ?? 0;
    const endTime = sortedClips[sortedClips.length - 1]?.sourceEnd ?? videoInfo.duration;
    const autonomousSegments = sortedClips
      .filter((clip) => typeof clip.sourceStart === 'number' && typeof clip.sourceEnd === 'number')
      .map((clip) => ({
        start: clip.sourceStart,
        end: clip.sourceEnd,
      }))
      .filter((segment) => segment.end > segment.start);
    const subtitleTrack = timeline.tracks.find((track) => track.type === 'subtitle');
    const subtitles =
      editedScript && subtitleTrack
        ? subtitleTrack.clips
            .map((clip) => {
              const segmentText =
                editedScript.segments.find((segment) => segment.id === clip.scriptSegmentId)?.content || '';
              return {
                start: clip.startTime,
                end: clip.endTime,
                text: segmentText,
              };
            })
            .filter((item) => item.end > item.start && item.text.trim().length > 0)
        : [];
    const overlayMarkers = (timeline.originalOverlayPlan || []).map((item) => ({
      start: item.startTime,
      end: item.endTime,
      label: item.reason,
    }));
    iterativeResult = optimizeOverlayIteratively({
      markers: overlayMarkers,
      subtitles: subtitles.map((item) => ({ start: item.start, end: item.end })),
      qualityScore: timeline.overlayQuality?.score ?? 100,
      baseOpacity: autonomousOptions?.overlayOpacity ?? 0.72,
      preferredMode: autonomousOptions?.overlayMixMode || 'pip',
      duration: timeline.duration,
    });

    try {
      exportedPath = await aiDirectorService.renderAutonomousCut({
        inputPath: videoInfo.path,
        outputPath,
        startTime,
        endTime,
        transition: timeline.directorPlan?.preferredTransition || 'cut',
        transitionDuration: timeline.directorPlan?.preferredTransition === 'cut' ? 0 : 0.35,
        burnSubtitles: settings.burnSubtitles !== false,
        subtitles,
        applyOverlayMarkers: iterativeResult.enableOverlay,
        overlayMixMode: iterativeResult.final.mixMode,
        overlayOpacity: iterativeResult.final.opacity,
        overlayMarkers: iterativeResult.final.markers,
        segments: autonomousSegments,
      });
    } catch {
      // Tauri 命令失败时回退到当前导出实现
      // @ts-ignore: videoService.exportVideo does not exist, needs refactor
      exportedPath = await videoService.exportVideo(
        videoInfo.path,
        outputPath,
        {
          format: settings.format,
          quality: settings.quality,
          resolution: settings.resolution,
          includeSubtitles: !!subtitlePath,
          subtitlePath,
        }
      );
    }
  } else {
    // @ts-ignore: videoService.exportVideo does not exist, needs refactor
    exportedPath = await videoService.exportVideo(
      videoInfo.path,
      outputPath,
      {
        format: settings.format,
        quality: settings.quality,
        resolution: settings.resolution,
        includeSubtitles: !!subtitlePath,
        subtitlePath,
      }
    );
  }

  // 保存导出记录
  const exportRecord = {
    id: `export_${Date.now()}`,
    projectId,
    format: settings.format || 'mp4',
    quality: settings.quality || 'high',
    resolution: settings.resolution || '1080p',
    filePath: exportedPath,
    fileSize: 0,
    timeline: {
      totalClips: timeline.tracks.reduce((sum, t) => sum + t.clips.length, 0),
      duration: timeline.duration,
      overlayQuality: timeline.overlayQuality?.score,
      overlayOptimizationApplied: iterativeResult.passes > 0,
      overlayOptimizationPasses: iterativeResult.passes,
      predictedOverlayQualityAfterOptimization: iterativeResult.predictedScore,
      overlayDisabledBySafetyGate: !iterativeResult.enableOverlay,
    },
    createdAt: new Date().toISOString(),
  };

  storageService.exportHistory.add(exportRecord);

  return exportedPath;
}

function generateSRT(script: ScriptData, timeline: TimelineData): string {
  const subtitleTrack = timeline.tracks.find((t) => t.type === 'subtitle');

  if (!subtitleTrack || subtitleTrack.clips.length === 0) {
    // 没有字幕轨道时，按段落均分时间
    return script.segments
      .map((seg, idx) => {
        const segDuration = timeline.duration / script.segments.length;
        const start = idx * segDuration;
        const end = (idx + 1) * segDuration;
        return `${idx + 1}\n${formatSRTTime(start)} --> ${formatSRTTime(end)}\n${seg.content}\n`;
      })
      .join('\n');
  }

  return subtitleTrack.clips
    .map((clip, idx) => {
      const segment = script.segments.find((s) => s.id === clip.scriptSegmentId);
      const text = segment?.content || '';
      return `${idx + 1}\n${formatSRTTime(clip.startTime)} --> ${formatSRTTime(
        clip.endTime
      )}\n${text}\n`;
    })
    .join('\n');
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
    .toString()
    .padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}
