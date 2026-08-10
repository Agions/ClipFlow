/**
 * BuildCandidatesStep — 从视频分析结果构建候选片段
 *
 * 输入：VideoInfo + VideoAnalysis
 * 输出：CandidateClip[]
 *
 * 策略：
 * 1. Rust highlight_detector 识别高光片段（音频能量峰值 + 场景切换）
 * 2. 场景边界补充候选（跳过与高光重叠的片段）
 * 3. 过长的场景自动拆分
 */

import type { HighlightSegment, VideoInfo, VideoAnalysis } from '@/types';
import type { CandidateClip } from '../../services/pipeline/clip-pipeline/clip-scorer';
import type { ASRSegment } from '../../services/asr/asr-types';
import { createStep, type Step, reportProgress } from '../step';
import { logger } from '@/shared/utils/logging';
import { tauri } from '../../../core/tauri';
import { highlightDetector } from '../../services/video/highlight-detector';

// ============================================================
// Step Metadata
// ============================================================

const STEP_META = {
  name: 'build-candidates',
  description: '从高光检测和场景分析构建候选片段',
  estimatedDuration: 5,
};

// ============================================================
// Input / Output Types
// ============================================================

export interface BuildCandidatesInput {
  videoInfo: VideoInfo;
  analysis: VideoAnalysis;
  /** ASR 分段结果（含时间戳），用于精确提取片段字幕 */
  asrSegments?: ASRSegment[];
  maxHighlights?: number; // 最多高光候选，默认 15
  minDuration?: number; // 最短片段秒数，默认 10
  maxDuration?: number; // 最长片段秒数，默认 120
}

export type BuildCandidatesOutput = CandidateClip[];

// ============================================================
// Step Implementation
// ============================================================

export const buildCandidatesStep: Step<BuildCandidatesInput, BuildCandidatesOutput> = createStep(
  STEP_META,
  async (input, _ctx, options) => {
    const {
      videoInfo,
      analysis,
      asrSegments,
      maxHighlights = 15,
      minDuration = 10,
      maxDuration = 120,
    } = input;
    const candidates: CandidateClip[] = [];
    const scenes = analysis?.scenes ?? [];

    reportProgress(options?.onProgress, STEP_META.name, 0.1, '调用 Rust 高光检测...');

    // ── Stage 0: 获取静音段（用于精确评分） ───────────────────
    const allSilenceSegments = await fetchSilenceSegments(videoInfo.path);
    const inRange = (s: number, e: number, seg: { start: number; end: number }) =>
      seg.start < e && seg.end > s;

    // ── Stage 1: Rust 高光检测（PR-1.3a：迁移到 highlightDetector） ──
    const highlights: HighlightSegment[] = await highlightDetector.detectHighlights(
      videoInfo.path,
      {
        topN: maxHighlights,
        minDurationMs: 500,
        threshold: 1.5,
      }
    );

    logger.debug(`[BuildCandidatesStep] Rust 高光检测返回 ${highlights.length} 个片段`);

    for (const h of highlights) {
      const clipSilence = allSilenceSegments.filter(s => inRange(h.startTime, h.endTime, s));
      candidates.push({
        startTime: h.startTime,
        endTime: h.endTime,
        sceneType: 'highlight',
        transcript: getCachedTranscript(asrSegments, h.startTime, h.endTime),
        audioEnergy: h.audioScore,
        silenceSegments: clipSilence.map(s => ({ startMs: s.start * 1000, endMs: s.end * 1000 })),
      });
    }

    reportProgress(
      options?.onProgress,
      STEP_META.name,
      0.6,
      `高光候选 ${highlights.length} 个，补充场景边界...`
    );

    // ── Stage 2: 场景边界补充候选 ──────────────────────────
    if (scenes.length > 0) {
      for (const scene of scenes) {
        const duration = (scene.endTime ?? 0) - (scene.startTime ?? 0);
        if (duration < minDuration) continue;

        // 跳过与高光高度重叠的场景
        const overlaps = highlights.some(
          h => h.startTime < scene.endTime && h.endTime > scene.startTime
        );
        if (overlaps) continue;

        // 时长超限 → 拆分
        if (duration > maxDuration) {
          const subClips = splitLongScene(
            scene.startTime,
            scene.endTime,
            maxDuration * 0.6,
            maxDuration
          );
          candidates.push(
            ...subClips.map(sc => ({
              ...sc,
              transcript: getCachedTranscript(asrSegments, sc.startTime, sc.endTime),
            }))
          );
          continue;
        }

        candidates.push({
          startTime: scene.startTime ?? 0,
          endTime: scene.endTime ?? 0,
          sceneType: 'scene',
          transcript: getCachedTranscript(asrSegments, scene.startTime ?? 0, scene.endTime ?? 0),
        });
      }
    }

    reportProgress(options?.onProgress, STEP_META.name, 0.8, `共 ${candidates.length} 个候选片段`);

    return candidates;
  }
);

// ============================================================
// Helpers
// ============================================================

/** 调用 Rust detect_smart_segments 获取静音区间（秒） */
async function fetchSilenceSegments(
  videoPath: string
): Promise<Array<{ start: number; end: number }>> {
  try {
    const result = (await tauri.detectSmartSegments(videoPath, {
      min_silence_duration_ms: 500,
      threshold_db: -40,
    })) as { silence_segments?: Array<{ start: number; end: number }> };
    return result.silence_segments ?? [];
  } catch {
    logger.debug('[BuildCandidatesStep] detect_smart_segments 不可用，返回空静音段');
    return [];
  }
}
/** 固定大小的 LRU 缓存实现（基于 Map 插入有序性） */
class LRUCache<K, V> {
  private readonly maxSize: number;
  private readonly map: Map<K, V>;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.map = new Map();
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    // 提升到最末（最新使用）
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // 删除最旧的（Map 按插入顺序迭代，第一个即最旧）
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }

  get size(): number {
    return this.map.size;
  }
}

/** LRU 缓存：最多缓存 200 个 transcript 片段，避免内存无限增长 */
const transcriptCache = new LRUCache<string, string>(200);

function getCachedTranscript(
  asrSegments: ASRSegment[] | undefined,
  startTime: number,
  endTime: number
): string {
  const key = `${startTime.toFixed(2)}_${endTime.toFixed(2)}`;
  const cached = transcriptCache.get(key);
  if (cached !== undefined) return cached;
  const result = extractSceneTranscript(asrSegments, startTime, endTime);
  transcriptCache.set(key, result);
  return result;
}

function splitLongScene(
  start: number,
  end: number,
  _minPart: number,
  maxPart: number
): CandidateClip[] {
  const clips: CandidateClip[] = [];
  let cursor = start;

  while (cursor < end) {
    const partEnd = Math.min(cursor + maxPart, end);
    clips.push({
      startTime: cursor,
      endTime: partEnd,
      sceneType: 'scene',
      transcript: '',
    });
    cursor = partEnd;
  }

  return clips;
}

function extractSceneTranscript(
  asrSegments: ASRSegment[] | undefined,
  startTime: number,
  endTime: number
): string {
  if (!asrSegments || asrSegments.length === 0) return '';
  const texts: string[] = [];
  for (const seg of asrSegments) {
    // 重叠即为命中（允许少量边界重叠）
    if (seg.endTime > startTime && seg.startTime < endTime) {
      texts.push(seg.text);
    }
  }
  return texts.join(' ').slice(0, 500);
}
