import { visionService } from '../vision.service';
import { detectEmotionPeaks, type EmoPeak } from '../video/emotion-peak-detector';
import { invoke } from '@tauri-apps/api/core';
import type { EmotionAnalysis, Keyframe as SourceKeyframe, VideoInfo, Scene } from '../../types';
import { DEFAULT_CLIP_CONFIG } from './types';
import type {
  AIClipConfig,
  CutPoint,
  ClipSegment,
  ClipSuggestion,
  ClipAnalysisResult,
  Keyframe,
} from './types';

export async function analyzeVideo(
  videoInfo: VideoInfo,
  config: Partial<AIClipConfig> = {},
  signal?: AbortSignal
): Promise<ClipAnalysisResult> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const fullConfig = { ...DEFAULT_CLIP_CONFIG, ...config };

  // 1. 高级场景检测
  const { scenes, emotions } = await Promise.all([
    visionService.detectScenesAdvanced(
      videoInfo,
      { minSceneDuration: 2, detectObjects: false, detectEmotions: false }
    ),
    // Skip emotion detection here — ZCR peak detector handles it more reliably
    Promise.resolve({ scenes: [] as Scene[], objects: [], emotions: [] as EmotionAnalysis[] }),
  ]).then(([r]) => r).catch(() => ({ scenes: [] as Scene[], objects: [], emotions: [] as EmotionAnalysis[] }));

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  // 2. 提取关键帧
  const keyframes = fullConfig.detectKeyframes
    ? await detectKeyframes(videoInfo, fullConfig.keyframeInterval)
    : [];

  // 3. 检测静音片段
  const silenceSegments = fullConfig.detectSilence
    ? await detectSilenceSegments(videoInfo, fullConfig)
    : [];

  // 4. 检测情感峰值（ZCR 增强）— 必须在 generateCutPoints 之前
  const { peaks: rawPeaks }: { peaks: EmoPeak[] } = await detectEmotionPeaks(videoInfo.path, {
    threshold: 1.5,
    minDurationMs: 300,
  }).catch(() => ({ peaks: [] as EmoPeak[] }));
  const emotionPeaks = rawPeaks.map(p => ({
    timestamp: p.startMs / 1000,
    energy: p.energy,
    type: p.type,
  }));

  // 5. 生成剪辑点
  const cutPoints = generateCutPoints(
    videoInfo,
    scenes,
    keyframes,
    silenceSegments,
    emotions,
    emotionPeaks,
    fullConfig
  );

  // 5. 生成剪辑片段
  const segments = generateSegments(videoInfo, cutPoints, scenes);

  // 6. 生成AI剪辑建议
  const suggestions = fullConfig.aiOptimize
    ? await generateSuggestions(videoInfo, segments, scenes, fullConfig)
    : [];

  // 7. 计算预估最终时长
  const estimatedFinalDuration = estimateFinalDuration(
    videoInfo.duration,
    silenceSegments,
    segments,
    fullConfig
  );

  return {
    videoId: videoInfo.id,
    duration: videoInfo.duration,
    cutPoints,
    segments,
    suggestions,
    silenceSegments,
    keyframeTimestamps: keyframes.map((k) => k.timestamp),
    sceneBoundaries: scenes.map((s) => ({
      start: s.startTime,
      end: s.endTime,
      type: s.type || 'unknown'
    })),
    estimatedFinalDuration,
    emotionPeaks,
  };
}

async function detectKeyframes(
  videoInfo: VideoInfo,
  interval: number
): Promise<Keyframe[]> {
  const count = Math.floor(videoInfo.duration / interval);
  const keyframes = await visionService.extractKeyframes(
    videoInfo,
    { maxFrames: Math.min(count, 20) }
  );

  return keyframes.map((kf, index) => ({
    timestamp: kf.timestamp,
    thumbnail: kf.thumbnail,
    importance: calculateKeyframeImportance(kf, index, keyframes.length)
  }));
}

function calculateKeyframeImportance(
  _keyframe: SourceKeyframe,
  index: number,
  total: number
): number {
  const safeTotal = Math.max(total, 1);
  const position = index / safeTotal;
  const positionWeight = Math.sin(position * Math.PI);
  const distributionWeight = 1 - Math.abs(0.5 - position) * 0.5;
  return Math.min(1, (positionWeight + distributionWeight) / 2);
}

async function detectSilenceSegments(
  videoInfo: VideoInfo,
  config: AIClipConfig
): Promise<Array<{ start: number; end: number; duration: number }>> {
  try {
    const rustSegments = await invoke<Array<{
      start_ms: number;
      end_ms: number;
      segment_type: string;
      duration_ms: number;
      silence_ratio?: number;
    }>>('detect_smart_segments', {
      input: {
        videoPath: videoInfo.path,
        minDurationMs: 500,
        maxDurationMs: 30000,
        silenceThresholdDb: -40,
        detectDialogue: false,
        detectTransitions: false,
      },
    });

    return rustSegments
      .filter(seg => seg.segment_type === 'Silence' || (seg.silence_ratio ?? 0) > 0.3)
      .map(seg => ({
        start: seg.start_ms / 1000,
        end: seg.end_ms / 1000,
        duration: seg.duration_ms / 1000,
      }));
  } catch (error) {
    // Rust 失败时返回空，不阻断主流程
    return [];
  }
}

function generateCutPoints(
  videoInfo: VideoInfo,
  scenes: Scene[],
  keyframes: Keyframe[],
  silenceSegments: Array<{ start: number; end: number; duration: number }>,
  emotions: EmotionAnalysis[],
  emotionPeaks: Array<{ timestamp: number; energy: number; type: string }>,
  config: AIClipConfig
): CutPoint[] {
  const cutPoints: CutPoint[] = [];

  // 场景边界
  if (config.detectSceneChange) {
    scenes.forEach((scene, index) => {
      if (index > 0) {
        cutPoints.push({
          id: `scene_${scene.id}`,
          timestamp: scene.startTime,
          type: 'scene',
          confidence: scene.confidence || 0.8,
          description: `场景切换: ${scene.description || '场景 ' + (index + 1)}`,
          suggestedAction: 'transition',
          metadata: { sceneChange: scene.confidence }
        });
      }
    });
  }

  // 关键帧
  if (config.detectKeyframes) {
    keyframes.forEach((kf) => {
      if (kf.importance > 0.5) {
        cutPoints.push({
          id: `kf_${kf.timestamp}`,
          timestamp: kf.timestamp,
          type: 'keyframe',
          confidence: kf.importance,
          description: `关键帧 @ ${formatTime(kf.timestamp)}`,
          suggestedAction: 'keep',
          metadata: { motionScore: kf.importance }
        });
      }
    });
  }

  // 静音片段
  if (config.detectSilence && config.removeSilence) {
    silenceSegments.forEach((silence, index) => {
      cutPoints.push({
        id: `silence_${index}`,
        timestamp: silence.start,
        type: 'silence',
        confidence: 0.9,
        description: `静音片段 (${silence.duration.toFixed(1)}秒)`,
        suggestedAction: 'remove',
        metadata: { audioLevel: -50 }
      });
    });
  }

  // Add emotion peak cutPoints
  if (config.detectEmotion && config.aiOptimize && emotionPeaks.length > 0) {
    for (const peak of emotionPeaks) {
      if (peak.energy > 60) {
        cutPoints.push({
          id: `emo_${peak.timestamp.toFixed(2)}`,
          timestamp: peak.timestamp,
          type: 'emotion',
          confidence: peak.energy / 100,
          description: `情感峰值: ${peak.type} (能量 ${peak.energy})`,
          suggestedAction: 'keep',
          metadata: { emotionScore: peak.energy / 100 }
        });
      }
    }
  }

  return deduplicateCutPoints(cutPoints.sort((a, b) => a.timestamp - b.timestamp));
}

function deduplicateCutPoints(cutPoints: CutPoint[]): CutPoint[] {
  const result: CutPoint[] = [];
  const minGap = 0.5;

  for (const point of cutPoints) {
    const lastPoint = result[result.length - 1];
    if (!lastPoint || Math.abs(point.timestamp - lastPoint.timestamp) >= minGap) {
      result.push(point);
    } else if (point.confidence > lastPoint.confidence) {
      result[result.length - 1] = point;
    }
  }

  return result;
}

function generateSegments(
  videoInfo: VideoInfo,
  cutPoints: CutPoint[],
  scenes: Scene[]
): ClipSegment[] {
  if (cutPoints.length === 0) {
    return [{
      id: crypto.randomUUID(),
      startTime: 0,
      endTime: videoInfo.duration,
      duration: videoInfo.duration,
      type: 'video',
      content: '完整视频',
      confidence: 1,
      cutPoints: [],
      suggestions: []
    }];
  }

  const segments: ClipSegment[] = [];
  let currentStart = 0;

  for (let i = 0; i <= cutPoints.length; i++) {
    const endTime = i < cutPoints.length ? cutPoints[i].timestamp : videoInfo.duration;

    if (endTime > currentStart) {
      const segmentCutPoints = cutPoints.filter(
        (cp) => cp.timestamp >= currentStart && cp.timestamp <= endTime
      );
      const scene = scenes.find((s) =>
        s.startTime <= currentStart && s.endTime >= endTime
      );

      segments.push({
        id: crypto.randomUUID(),
        startTime: currentStart,
        endTime,
        duration: endTime - currentStart,
        type: determineSegmentType(segmentCutPoints),
        content: scene?.description || `片段 ${segments.length + 1}`,
        thumbnail: scene?.thumbnail,
        confidence: calculateSegmentConfidence(segmentCutPoints),
        cutPoints: segmentCutPoints,
        suggestions: []
      });
    }
    currentStart = endTime;
  }

  return segments;
}

function determineSegmentType(cutPoints: CutPoint[]): ClipSegment['type'] {
  if (cutPoints.some((cp) => cp.type === 'silence')) return 'silence';
  if (cutPoints.some((cp) => cp.type === 'keyframe')) return 'keyframe';
  return 'video';
}

function calculateSegmentConfidence(cutPoints: CutPoint[]): number {
  if (cutPoints.length === 0) return 0.5;
  // Weighted confidence: audio_energy + scene_change each get 0.4, emotion 0.2
  let audioSum = 0, audioCount = 0;
  let sceneSum = 0, sceneCount = 0;
  let emotionSum = 0, emotionCount = 0;
  for (const cp of cutPoints) {
    if (cp.type === 'scene') { sceneSum += cp.confidence; sceneCount++; }
    else if (cp.type === 'emotion') { emotionSum += cp.confidence; emotionCount++; }
    else { audioSum += cp.confidence; audioCount++; }
  }
  const audioConf = audioCount ? audioSum / audioCount * 0.4 : 0;
  const sceneConf = sceneCount ? sceneSum / sceneCount * 0.4 : 0;
  const emotionConf = emotionCount ? emotionSum / emotionCount * 0.2 : 0;
  return Math.min(1, audioConf + sceneConf + emotionConf);
}

async function generateSuggestions(
  videoInfo: VideoInfo,
  segments: ClipSegment[],
  scenes: Scene[],
  config: AIClipConfig
): Promise<ClipSuggestion[]> {
  const suggestions: ClipSuggestion[] = [];

  // 建议移除静音
  const silenceSegments = segments.filter((s) => s.type === 'silence');
  silenceSegments.forEach((segment) => {
    suggestions.push({
      id: crypto.randomUUID(),
      type: 'trim',
      startTime: segment.startTime,
      endTime: segment.endTime,
      description: `移除静音片段 (${segment.duration.toFixed(1)}秒)`,
      reason: '这段音频几乎没有声音，移除后可以提升视频节奏',
      confidence: 0.9,
      autoApplicable: true
    });
  });

  // 建议合并短片段
  const shortSegments = segments.filter((s) => s.duration < 1.5 && s.type !== 'silence');
  for (let i = 0; i < shortSegments.length - 1; i++) {
    const current = shortSegments[i];
    const next = shortSegments[i + 1];
    if (next.startTime - current.endTime < 1) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'merge',
        startTime: current.startTime,
        endTime: next.endTime,
        description: `合并短片段 (${current.duration.toFixed(1)}s + ${next.duration.toFixed(1)}s)`,
        reason: '两个片段都很短且相邻，合并后观看体验更好',
        confidence: 0.75,
        autoApplicable: true
      });
    }
  }

  // 建议添加转场
  const sceneChanges = segments.filter((s) =>
    s.cutPoints.some((cp) => cp.type === 'scene')
  );
  sceneChanges.forEach((segment, index) => {
    if (index < sceneChanges.length - 1) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'effect',
        startTime: segment.endTime,
        endTime: segment.endTime + 0.5,
        description: `添加${config.transitionType}转场`,
        reason: '场景切换处添加转场效果可以使过渡更自然',
        confidence: 0.8,
        autoApplicable: config.autoTransition
      });
    }
  });

  // 基于目标时长的建议
  if (config.targetDuration) {
    const currentDuration = segments
      .filter((s) => s.type !== 'silence')
      .reduce((sum, s) => sum + s.duration, 0);
    if (currentDuration > config.targetDuration * 1.2) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'trim',
        startTime: 0,
        endTime: videoInfo.duration,
        description: `压缩视频至目标时长 (${config.targetDuration}秒)`,
        reason: `当前预估时长 ${Math.round(currentDuration)}秒，建议精简内容`,
        confidence: 0.7,
        autoApplicable: false
      });
    }
  }

  // 节奏优化建议
  if (config.pacingStyle === 'fast') {
    const slowSegments = segments.filter((s) => s.duration > 10);
    slowSegments.forEach((segment) => {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'trim',
        startTime: segment.startTime,
        endTime: segment.endTime,
        description: `加速长片段 (${segment.duration.toFixed(1)}秒)`,
        reason: '选择快速节奏模式，建议缩短长片段',
        confidence: 0.65,
        autoApplicable: false
      });
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

function estimateFinalDuration(
  originalDuration: number,
  silenceSegments: Array<{ duration: number }>,
  segments: ClipSegment[],
  config: AIClipConfig
): number {
  let estimated = originalDuration;

  if (config.removeSilence) {
    const totalSilence = silenceSegments.reduce((sum, s) => sum + s.duration, 0);
    estimated -= totalSilence;
  }

  if (config.trimDeadTime) {
    const deadTime = segments
      .filter((s) => s.duration < 0.5)
      .reduce((sum, s) => sum + s.duration, 0);
    estimated -= deadTime;
  }

  if (config.autoTransition) {
    const transitionCount = segments.length - 1;
    estimated += transitionCount * 0.3;
  }

  return Math.max(0, estimated);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
