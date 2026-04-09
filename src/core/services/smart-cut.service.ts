/**
 * SmartCut 智能剪辑服务
 * 基于内容分析的智能剪辑，自动识别最佳剪辑点
 */

import { BaseService, ServiceError } from './base.service';
import { logger } from '@/utils/logger';
import { invoke } from '@tauri-apps/api/core';
import type { VideoInfo } from '@/core/types';
import type {
  AIClipConfig,
  ClipAnalysisResult,
  ClipSegment,
  CutPoint,
  CutPointType,
} from './aiClip/types';
import { DEFAULT_CLIP_CONFIG } from './aiClip/types';

// ============================================
// 类型定义
// ============================================

export interface SmartCutOptions {
  /** 目标时长（秒）*/
  targetDuration?: number;
  /** 剪辑风格 */
  style?: 'fast' | 'normal' | 'slow';
  /** 是否移除静音段 */
  removeSilence?: boolean;
  /** 是否自动转场 */
  autoTransition?: boolean;
}

export interface SmartCutResult {
  /** 剪辑后的片段 */
  segments: ClipSegment[];
  /** 总时长 */
  totalDuration: number;
  /** 剪辑点列表 */
  cutPoints: CutPoint[];
  /** 预估最终时长 */
  estimatedDuration: number;
  /** 移除的片段 */
  removedSegments: Array<{ start: number; end: number; reason: string }>;
}

// 剪辑风格对应配置
const STYLE_CONFIG: Record<string, Partial<AIClipConfig>> = {
  fast: {
    pacingStyle: 'fast',
    removeSilence: true,
    trimDeadTime: true,
    sceneThreshold: 0.4,
  },
  normal: {
    pacingStyle: 'normal',
    removeSilence: true,
    trimDeadTime: true,
    sceneThreshold: 0.3,
  },
  slow: {
    pacingStyle: 'slow',
    removeSilence: false,
    trimDeadTime: false,
    sceneThreshold: 0.2,
  },
};

// ============================================
// SmartCut 服务
// ============================================

export class SmartCutService extends BaseService {
  constructor() {
    super('SmartCutService', { timeout: 120000, retries: 1 });
  }

  /**
   * 智能剪辑入口
   * @param videoInfo 视频信息
   * @param options 剪辑选项
   */
  async smartCut(
    videoInfo: VideoInfo,
    options: SmartCutOptions = {}
  ): Promise<SmartCutResult> {
    return this.executeRequest(async () => {
      const {
        targetDuration,
        style = 'normal',
        removeSilence = true,
        autoTransition = true,
      } = options;

      logger.info('[SmartCutService] 开始智能剪辑:', {
        videoId: videoInfo.id,
        targetDuration,
        style,
      });

      // 获取风格配置
      const styleConfig = STYLE_CONFIG[style] || STYLE_CONFIG.normal;
      const config: AIClipConfig = {
        ...DEFAULT_CLIP_CONFIG,
        ...styleConfig,
        removeSilence,
        autoTransition,
        targetDuration,
      };

      // 1. 检测剪辑点
      const cutPoints = await this.detectCutPoints(videoInfo, config);

      // 2. 生成剪辑片段
      const segments = await this.generateSegments(videoInfo, cutPoints, config);

      // 3. 计算最终时长
      const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);
      const estimatedDuration = targetDuration
        ? Math.min(totalDuration, targetDuration)
        : totalDuration;

      // 4. 收集被移除的片段
      const removedSegments = this.findRemovedSegments(cutPoints);

      logger.info('[SmartCutService] 智能剪辑完成:', {
        videoId: videoInfo.id,
        totalDuration,
        estimatedDuration,
        cutPoints: cutPoints.length,
        segments: segments.length,
      });

      return {
        segments,
        totalDuration,
        cutPoints,
        estimatedDuration,
        removedSegments,
      };
    }, '智能剪辑失败');
  }

  /**
   * 检测剪辑点
   */
  private async detectCutPoints(
    videoInfo: VideoInfo,
    config: AIClipConfig
  ): Promise<CutPoint[]> {
    const cutPoints: CutPoint[] = [];

    // 场景切换点检测
    if (config.detectSceneChange) {
      const sceneCuts = await this.detectSceneChanges(videoInfo, config.sceneThreshold);
      cutPoints.push(...sceneCuts);
    }

    // 静音检测
    if (config.detectSilence) {
      const silenceCuts = await this.detectSilence(videoInfo, config);
      cutPoints.push(...silenceCuts);
    }

    // 关键帧检测
    if (config.detectKeyframes) {
      const keyframeCuts = await this.detectKeyframes(videoInfo, config.keyframeInterval);
      cutPoints.push(...keyframeCuts);
    }

    // 按时间排序
    cutPoints.sort((a, b) => a.timestamp - b.timestamp);

    // 合并相邻剪辑点（间隔太小）
    return this.mergeAdjacentCutPoints(cutPoints, 0.5);
  }

  /**
   * 场景切换检测 — 调用 Rust smart_segmenter（真实音频/视觉分析）
   */
  private async detectSceneChanges(
    videoInfo: VideoInfo,
    threshold: number
  ): Promise<CutPoint[]> {
    try {
      const segments = await invoke<Array<{
        start_ms: number;
        end_ms: number;
        segment_type: string;
        duration_ms: number;
        confidence: number;
        is_scene_change?: boolean;
        peak_energy?: number;
        silence_ratio?: number;
      }>>('detect_smart_segments', {
        input: {
          videoPath: videoInfo.path,
          minDurationMs: 1000,
          maxDurationMs: 30000,
          sceneThreshold: threshold,
          silenceThresholdDb: -40,
          detectDialogue: true,
          detectTransitions: true,
        },
      });

      return segments
        .filter(seg => seg.is_scene_change)
        .map(seg => ({
          id: crypto.randomUUID(),
          timestamp: seg.start_ms / 1000, // ms → s
          type: 'scene' as CutPointType,
          confidence: seg.confidence,
          description: `场景切换 (置信度: ${(seg.confidence * 100).toFixed(0)}%)`,
          suggestedAction: 'keep' as const,
          metadata: {
            sceneChange: seg.confidence,
            segmentType: seg.segment_type,
            peakEnergy: seg.peak_energy,
            silenceRatio: seg.silence_ratio,
          },
        }));
    } catch (error) {
      logger.warn('[SmartCut] Rust 场景检测失败，降级到规则检测:', error);
      // 降级：返回空，后续用静音检测兜底
      return [];
    }
  }

  /**
   * 静音检测
   */
  /**
   * 静音检测 — 调用 Rust smart_segmenter（真实音频能量分析）
   */
  private async detectSilence(
    videoInfo: VideoInfo,
    config: AIClipConfig
  ): Promise<CutPoint[]> {
    try {
      const segments = await invoke<Array<{
        start_ms: number;
        end_ms: number;
        segment_type: string;
        duration_ms: number;
        confidence: number;
        is_scene_change?: boolean;
        peak_energy?: number;
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

      const cutPoints: CutPoint[] = [];
      for (const seg of segments) {
        // 只处理静音类型或高静音比的片段
        if (seg.segment_type !== 'Silence') continue;
        if ((seg.silence_ratio ?? 0) < 0.3) continue;

        const startSec = seg.start_ms / 1000;
        const endSec = seg.end_ms / 1000;
        const durationSec = seg.duration_ms / 1000;

        if (durationSec >= config.minSilenceDuration) {
          cutPoints.push({
            id: crypto.randomUUID(),
            timestamp: startSec,
            type: 'silence',
            confidence: seg.confidence,
            description: `静音段: ${startSec.toFixed(1)}s - ${endSec.toFixed(1)}s (${durationSec.toFixed(1)}s)`,
            suggestedAction: config.removeSilence ? 'remove' : 'trim',
            metadata: {
              audioLevel: 1 - (seg.silence_ratio ?? 0),
              peakEnergy: seg.peak_energy,
              silenceRatio: seg.silence_ratio,
            },
          });
        }
      }

      return cutPoints;
    } catch (error) {
      logger.warn('[SmartCut] Rust 静音检测失败，降级:', error);
      return [];
    }
  }

  /**
   * 关键帧检测
   */
  private async detectKeyframes(
    videoInfo: VideoInfo,
    interval: number
  ): Promise<CutPoint[]> {
    const cutPoints: CutPoint[] = [];
    const numKeyframes = Math.floor(videoInfo.duration / interval);

    for (let i = 1; i < numKeyframes; i++) {
      const timestamp = i * interval;

      cutPoints.push({
        id: crypto.randomUUID(),
        timestamp,
        type: 'keyframe',
        confidence: 0.7,
        description: `关键帧: ${timestamp.toFixed(0)}s`,
        suggestedAction: 'keep',
      });
    }

    return cutPoints;
  }

  /**
   * 生成剪辑片段
   */
  private async generateSegments(
    videoInfo: VideoInfo,
    cutPoints: CutPoint[],
    config: AIClipConfig
  ): Promise<ClipSegment[]> {
    const segments: ClipSegment[] = [];
    const removedTypes = config.removeSilence ? ['silence'] : [];

    // 根据剪辑点分割视频
    let currentTime = 0;
    const sortedCutPoints = [...cutPoints].sort((a, b) => a.timestamp - b.timestamp);

    for (const cutPoint of sortedCutPoints) {
      if (cutPoint.timestamp <= currentTime) continue;

      const endTime = cutPoint.timestamp;
      const duration = endTime - currentTime;
      const cutPointType = cutPoint.type as CutPointType;
      const shouldRemove = cutPoint.suggestedAction === 'remove' && removedTypes.includes(cutPointType);

      segments.push({
        id: crypto.randomUUID(),
        startTime: currentTime,
        endTime,
        duration,
        type: shouldRemove ? 'silence' : 'video',
        content: `片段 ${segments.length + 1}: ${currentTime.toFixed(1)}s - ${endTime.toFixed(1)}s`,
        confidence: cutPoint.confidence,
        cutPoints: [cutPoint],
        suggestions: [],
      });

      currentTime = endTime;
    }

    // 处理尾部
    if (currentTime < videoInfo.duration) {
      segments.push({
        id: crypto.randomUUID(),
        startTime: currentTime,
        endTime: videoInfo.duration,
        duration: videoInfo.duration - currentTime,
        type: 'video',
        content: `片段 ${segments.length + 1}: ${currentTime.toFixed(1)}s - ${videoInfo.duration.toFixed(1)}s`,
        confidence: 0.8,
        cutPoints: [],
        suggestions: [],
      });
    }

    return segments;
  }

  /**
   * 合并相邻剪辑点
   */
  private mergeAdjacentCutPoints(
    cutPoints: CutPoint[],
    minInterval: number
  ): CutPoint[] {
    if (cutPoints.length === 0) return [];

    const merged: CutPoint[] = [cutPoints[0]];

    for (let i = 1; i < cutPoints.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = cutPoints[i];

      if (curr.timestamp - prev.timestamp < minInterval) {
        // 保留置信度更高的
        if (curr.confidence > prev.confidence) {
          merged[merged.length - 1] = curr;
        }
      } else {
        merged.push(curr);
      }
    }

    return merged;
  }

  /**
   * 查找被移除的片段
   */
  private findRemovedSegments(
    cutPoints: CutPoint[]
  ): Array<{ start: number; end: number; reason: string }> {
    const removed: Array<{ start: number; end: number; reason: string }> = [];

    for (const cp of cutPoints) {
      if (cp.suggestedAction === 'remove' && cp.type === 'silence') {
        removed.push({
          start: cp.timestamp,
          end: cp.timestamp + 2, // 假设平均静音2秒
          reason: '静音移除',
        });
      }
    }

    return removed;
  }

  /**
   * 获取剪辑点类型统计
   */
  getCutPointStats(cutPoints: CutPoint[]): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const cp of cutPoints) {
      stats[cp.type] = (stats[cp.type] || 0) + 1;
    }

    return stats;
  }
}

// 导出单例
export const smartCutService = new SmartCutService();
export default smartCutService;
