/**
 * 情感峰值检测
 * 基于音频能量分析 + 视觉笑点检测
 * 笑声/掌声/情绪高潮片段得额外加分
 */

export interface EmoPeak {
  startMs: number;
  endMs: number;
  energy: number; // 0-100
  type: 'laughter' | 'applause' | 'excited' | 'generic';
}

export interface EmoPeakResult {
  peaks: EmoPeak[];
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
 * 检测情感峰值（placeholder — 待接 Rust 层音频能量分析）
 */
export async function detectEmotionPeaks(
  audioPath: string,
  options: { threshold?: number; minDurationMs?: number } = {}
): Promise<EmoPeakResult> {
  const { threshold = 70, minDurationMs = 500 } = options;
  // TODO: 调用 Rust 层的音频能量分析器
  // const result = await invoke<AudioEnergyResult>('detect_emotion_peaks', { audioPath, threshold, minDurationMs });
  void audioPath;
  void threshold;
  void minDurationMs;
  return { peaks: [] };
}
