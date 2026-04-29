import { analyzeVideo } from './analyzer';
import type { VideoInfo } from '../../types';
import type { AIClipConfig, BatchClipTask, ClipAnalysisResult, ClipSegment, ClipSuggestion } from './types';

/** In-flight tasks registry */
const tasks = new Map<string, BatchClipTask>();
/** AbortController per task */
const abortControllers = new Map<string, AbortController>();

// ─── Config ──────────────────────────────────────────────────────────────────

/** Maximum concurrent video analyses */
const MAX_CONCURRENCY = 3;

// ─── Public API ───────────────────────────────────────────────────────────────

export async function batchProcess(
  projectId: string,
  videos: VideoInfo[],
  config: AIClipConfig,
  onProgress?: (task: BatchClipTask) => void
): Promise<BatchClipTask> {
  const taskId = crypto.randomUUID();
  const controller = new AbortController();
  abortControllers.set(taskId, controller);

  const task: BatchClipTask = {
    id: taskId,
    projectId,
    videos,
    config,
    status: 'processing',
    progress: 0,
    results: new Array(videos.length).fill(undefined),
    errors: [],
    createdAt: new Date().toISOString(),
  };
  tasks.set(taskId, task);

  let nextIndex = 0;

  // Promise settlement tracker — avoids complex Promise.race bookkeeping
  const pending: Promise<void>[] = [];

  const scheduleNext = (): Promise<void> | null => {
    if (controller.signal.aborted) return null;
    if (nextIndex >= videos.length) return null;
    const i = nextIndex++;
    return processVideo(i, videos[i]);
  };

  const processVideo = async (i: number, video: VideoInfo): Promise<void> => {
    try {
      const result = await analyzeVideo(video, config, controller.signal);
      if (!controller.signal.aborted) {
        task.results[i] = result.segments;
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      task.errors.push(`[${video.name}] ${err instanceof Error ? err.message : String(err)}`);
      task.results[i] = [];
    }
    if (!controller.signal.aborted) {
      const done = task.results.filter(Boolean).length + task.errors.length;
      task.progress = Math.min(99, (done / videos.length) * 100);
      onProgress?.(task);
    }
    // Schedule next when this slot frees
    const next = scheduleNext();
    if (next) pending.push(next);
  };

  // Fill initial concurrency window
  for (let i = 0; i < Math.min(MAX_CONCURRENCY, videos.length); i++) {
    pending.push(processVideo(i, videos[i]));
    nextIndex = i + 1;
  }

  // Wait for all to complete
  await Promise.all(pending);

  task.status = controller.signal.aborted ? 'failed' : 'completed';
  task.errors = controller.signal.aborted
    ? [...task.errors, '用户取消']
    : task.errors;
  task.completedAt = new Date().toISOString();
  task.progress = 100;
  onProgress?.(task);

  return task;
}

export function getBatchTask(taskId: string): BatchClipTask | undefined {
  return tasks.get(taskId);
}

export function cancelTask(taskId: string): void {
  const controller = abortControllers.get(taskId);
  if (controller) {
    controller.abort();
    abortControllers.delete(taskId);
  }
  const task = tasks.get(taskId);
  if (task) {
    task.status = 'failed';
    task.errors.push('用户取消');
    task.completedAt = new Date().toISOString();
  }
}

export async function applySuggestions(
  videoInfo: VideoInfo,
  suggestions: ClipSuggestion[],
  selectedIds: string[]
): Promise<ClipSegment[]> {
  const selectedSuggestions = suggestions.filter((s) => selectedIds.includes(s.id));
  const segments: ClipSegment[] = [];

  selectedSuggestions.sort((a, b) => a.startTime - b.startTime);
  let currentTime = 0;

  for (const suggestion of selectedSuggestions) {
    if (suggestion.startTime > currentTime) {
      segments.push({
        id: crypto.randomUUID(),
        startTime: currentTime,
        endTime: suggestion.startTime,
        duration: suggestion.startTime - currentTime,
        type: 'video',
        content: '保留片段',
        confidence: 1,
        cutPoints: [],
        suggestions: []
      });
    }

    switch (suggestion.type) {
      case 'trim':
      case 'cut':
        currentTime = suggestion.endTime;
        break;
      case 'effect':
        segments.push({
          id: crypto.randomUUID(),
          startTime: suggestion.startTime,
          endTime: suggestion.endTime,
          duration: suggestion.endTime - suggestion.startTime,
          type: 'video',
          content: `转场效果: ${suggestion.description}`,
          confidence: 0.9,
          cutPoints: [],
          suggestions: []
        });
        currentTime = suggestion.endTime;
        break;
    }
  }

  if (currentTime < videoInfo.duration) {
    segments.push({
      id: crypto.randomUUID(),
      startTime: currentTime,
      endTime: videoInfo.duration,
      duration: videoInfo.duration - currentTime,
      type: 'video',
      content: '保留片段',
      confidence: 1,
      cutPoints: [],
      suggestions: []
    });
  }

  return segments;
}

export async function smartClip(
  videoInfo: VideoInfo,
  targetDuration?: number,
  style: 'fast' | 'normal' | 'slow' = 'normal'
): Promise<ClipAnalysisResult> {
  const config: AIClipConfig = {
    detectSceneChange: true,
    detectSilence: true,
    detectKeyframes: true,
    detectEmotion: true,
    sceneThreshold: 0.3,
    silenceThreshold: -40,
    minSilenceDuration: 0.5,
    keyframeInterval: 5,
    removeSilence: true,
    trimDeadTime: true,
    autoTransition: true,
    transitionType: 'fade',
    aiOptimize: true,
    targetDuration,
    pacingStyle: style
  };

  const analysis = await analyzeVideo(videoInfo, config);
  const autoSuggestions = analysis.suggestions.filter((s) => s.autoApplicable);
  if (autoSuggestions.length > 0) {
    analysis.segments = await applySuggestions(
      videoInfo,
      autoSuggestions,
      autoSuggestions.map((s) => s.id)
    );
  }

  return analysis;
}