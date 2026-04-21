/**
 * 情感峰值检测
 * 基于 Rust highlight_detector 的音频能量分析
 * 笑声/掌声/情绪高潮片段得额外加分
 */

import { invoke } from '@tauri-apps/api/core';

export interface EmoPeak {
  startMs: number;
  endMs: number;
  energy: number; // 0-100
  type: 'laughter' | 'applause' | 'excited' | 'generic';
}

export interface EmoPeakResult {
  peaks: EmoPeak[];
}

/** Rust HighlightSegment 的 TypeScript 映射 */
interface RustHighlightSegment {
  startMs: number;
  endMs: number;
  score: number; // 0-1
  reason: string;
  audioScore?: number;
  sceneScore?: number;
  motionScore?: number;
}

/**
 * 计算情感峰值评分（0-100）
 * 覆盖度 * 平均能量，取最大值 cap 在 100
 */
export function calculateEmotionScore(peaks: EmoPeak[], totalDurationMs: number): number {
  if (peaks.length === 0 || totalDurationMs === 0) return 0;

  const totalCoverage = peaks.reduce((sum, p) => sum + (p.endMs - p.startMs), 0);
  const peakCoverage = totalCoverage / totalDurationMs;
  const avgEnergy = peaks.reduce((sum, p) => sum + p.energy, 0) / peaks.length;

  const rawScore = peakCoverage * avgEnergy;
  return Math.min(100, Math.round(rawScore * 100) / 100);
}

/**
 * 检测情感峰值
 * 调用 Rust backend detect_highlights 命令，筛选 audio_energy 类型高光片段
 */
export async function detectEmotionPeaks(
  videoPath: string,
  options: { threshold?: number; minDurationMs?: number } = {}
): Promise<EmoPeakResult> {
  try {
    const highlights = await invoke<RustHighlightSegment[]>('detect_highlights', {
      input: {
        video_path: videoPath,
        threshold: options.threshold ?? 1.5,
        min_duration_ms: options.minDurationMs ?? 500,
        top_n: 20,
        detect_scene: false,
      },
    });

    const peaks: EmoPeak[] = highlights
      .filter((h) => h.reason === 'audio_energy' && h.audioScore != null)
      .map((h) => ({
        startMs: h.startMs,
        endMs: h.endMs,
        energy: Math.round((h.audioScore ?? 0) * 100),
        type: 'generic' as const,
      }));

    return { peaks };
  } catch (err) {
    console.error('[emotion-peak-detector] detect_highlights failed:', err);
    return { peaks: [] };
  }
}
