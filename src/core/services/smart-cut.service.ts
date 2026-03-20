/**
 * AI 智能剪辑服务
 * 场景检测、音频峰值、精彩集锦生成
 * 
 * 实现说明：
 * - 场景切换：使用视频帧差分检测
 * - 音频峰值：使用 Web Audio API 分析
 * - 运动分析：使用帧间差异计算
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

export interface SceneChange {
  id: string;
  startTime: number;
  endTime: number;
  score: number;
  type: 'cut' | 'fade' | 'dissolve' | 'wipe';
}

export interface AudioPeak {
  id: string;
  timestamp: number;
  duration: number;
  score: number;
  type: 'applause' | 'laughter' | 'music' | 'speech';
}

export interface MotionSegment {
  id: string;
  startTime: number;
  endTime: number;
  intensity: number; // 0-100
  type: 'fast' | 'medium' | 'slow';
}

export interface HighlightSegment {
  id: string;
  startTime: number;
  endTime: number;
  score: number;
  reasons: string[];
  type: 'action' | 'emotional' | 'funny' | 'exciting';
}

export interface SmartCutConfig {
  /** 场景切换灵敏度 */
  sceneSensitivity: number; // 0-1
  /** 音频峰值阈值 */
  audioThreshold: number; // 0-1
  /** 最小片段时长(秒) */
  minDuration: number;
  /** 最大片段时长(秒) */
  maxDuration: number;
  /** 目标集锦时长(秒) */
  targetDuration: number;
  /** 是否自动生成集锦 */
  autoGenerate: boolean;
}

export interface SmartCutResult {
  sceneChanges: SceneChange[];
  audioPeaks: AudioPeak[];
  motionSegments: MotionSegment[];
  highlights: HighlightSegment[];
  highlightReel?: {
    segments: HighlightSegment[];
    totalDuration: number;
  };
}

/**
 * AI 智能剪辑服务
 */
export class SmartCutService {
  private config: SmartCutConfig;
  private videoElement?: HTMLVideoElement;
  private audioContext?: AudioContext;

  constructor(config?: Partial<SmartCutConfig>) {
    this.config = {
      sceneSensitivity: 0.5,
      audioThreshold: 0.6,
      minDuration: 3,
      maxDuration: 30,
      targetDuration: 60,
      autoGenerate: true,
      ...config,
    };
  }

  /**
   * 检测场景切换
   * 使用视频帧差分算法
   */
  async detectSceneChanges(videoBuffer: ArrayBuffer): Promise<SceneChange[]> {
    logger.info('[SmartCut] 开始检测场景切换...');
    
    try {
      // 创建视频元素
      const video = await this.createVideoFromBuffer(videoBuffer);
      const duration = video.duration;
      const scenes: SceneChange[] = [];
      
      // 采样间隔（秒）
      const sampleInterval = 1;
      const previousFrame = await this.extractFrame(video, 0);
      
      for (let time = sampleInterval; time < duration; time += sampleInterval) {
        const currentFrame = await this.extractFrame(video, time);
        
        // 计算帧差
        const diff = this.calculateFrameDiff(previousFrame, currentFrame);
        
        // 如果差异超过阈值，认为是场景切换
        if (diff > (1 - this.config.sceneSensitivity) * 255) {
          // 判断切换类型
          const type = this.detectTransitionType(previousFrame, currentFrame);
          
          scenes.push({
            id: uuidv4(),
            startTime: time - sampleInterval,
            endTime: time,
            score: Math.min(diff / 255, 1),
            type,
          });
        }
        
        // 更新上一帧
        previousFrame.data.set(currentFrame.data);
      }
      
      logger.info('[SmartCut] 场景切换检测完成', { count: scenes.length });
      return scenes;
    } catch (error) {
      logger.error('[SmartCut] 场景切换检测失败', { error });
      return [];
    }
  }

  /**
   * 检测音频峰值
   * 使用 Web Audio API 分析音频
   */
  async detectAudioPeaks(videoBuffer: ArrayBuffer): Promise<AudioPeak[]> {
    logger.info('[SmartCut] 开始检测音频峰值...');
    
    try {
      // 提取音频
      const audioBuffer = await this.extractAudio(videoBuffer);
      if (!audioBuffer) {
        logger.warn('[SmartCut] 无法提取音频');
        return [];
      }
      
      // 创建音频上下文
      const audioContext = new AudioContext();
      const peaks: AudioPeak[] = [];
      
      // 获取音频数据
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      
      // 分析窗口大小
      const windowSize = Math.floor(sampleRate * 0.5); // 0.5秒窗口
      const stepSize = Math.floor(windowSize / 2);
      
      for (let i = 0; i < channelData.length - windowSize; i += stepSize) {
        // 计算 RMS
        let sum = 0;
        for (let j = 0; j < windowSize; j++) {
          sum += channelData[i + j] ** 2;
        }
        const rms = Math.sqrt(sum / windowSize);
        
        // 检测峰值
        if (rms > this.config.audioThreshold) {
          const timestamp = i / sampleRate;
          const type = this.classifyAudioType(channelData, i, windowSize);
          
          peaks.push({
            id: uuidv4(),
            timestamp,
            duration: windowSize / sampleRate,
            score: rms,
            type,
          });
        }
      }
      
      await audioContext.close();
      
      logger.info('[SmartCut] 音频峰值检测完成', { count: peaks.length });
      return peaks;
    } catch (error) {
      logger.error('[SmartCut] 音频峰值检测失败', { error });
      return [];
    }
  }

  /**
   * 分析运动强度
   * 使用帧间差异计算
   */
  async analyzeMotion(videoBuffer: ArrayBuffer): Promise<MotionSegment[]> {
    logger.info('[SmartCut] 开始分析运动强度...');
    
    try {
      const video = await this.createVideoFromBuffer(videoBuffer);
      const duration = video.duration;
      const segments: MotionSegment[] = [];
      
      // 采样间隔
      const sampleInterval = 2;
      const previousFrame = await this.extractFrame(video, 0);
      let segmentStart = 0;
      let totalIntensity = 0;
      let sampleCount = 0;
      
      for (let time = sampleInterval; time < duration; time += sampleInterval) {
        const currentFrame = await this.extractFrame(video, time);
        
        // 计算运动差异
        const motion = this.calculateMotionIntensity(previousFrame, currentFrame);
        totalIntensity += motion;
        sampleCount++;
        
        // 如果时间间隔超过最大片段时长，保存段落
        if (time - segmentStart >= this.config.maxDuration) {
          const avgIntensity = totalIntensity / sampleCount;
          
          segments.push({
            id: uuidv4(),
            startTime: segmentStart,
            endTime: time,
            intensity: avgIntensity,
            type: this.classifyMotionType(avgIntensity),
          });
          
          segmentStart = time;
          totalIntensity = 0;
          sampleCount = 0;
        }
        
        previousFrame.data.set(currentFrame.data);
      }
      
      logger.info('[SmartCut] 运动分析完成', { count: segments.length });
      return segments;
    } catch (error) {
      logger.error('[SmartCut] 运动分析失败', { error });
      return [];
    }
  }

  /**
   * 生成精彩片段
   */
  async generateHighlights(
    sceneChanges: SceneChange[],
    audioPeaks: AudioPeak[],
    motionSegments: MotionSegment[]
  ): Promise<HighlightSegment[]> {
    // 合并所有信号
    const allSignals: Array<{ time: number; score: number; type: string }> = [
      ...sceneChanges.map(s => ({ time: s.startTime, score: s.score * 0.8, type: 'scene' })),
      ...audioPeaks.map(a => ({ time: a.timestamp, score: a.score, type: a.type })),
      ...motionSegments.map(m => ({ time: m.startTime, score: m.intensity / 100, type: 'motion' })),
    ];

    // 按时间排序
    allSignals.sort((a, b) => a.time - b.time);

    // 聚合成片段
    const highlights: HighlightSegment[] = [];
    let currentStart = 0;
    let currentScore = 0;
    let currentReasons: string[] = [];

    for (const signal of allSignals) {
      if (signal.time - currentStart > this.config.minDuration) {
        if (currentScore > 0.3 && signal.time - currentStart >= this.config.minDuration) {
          highlights.push({
            id: uuidv4(),
            startTime: currentStart,
            endTime: signal.time,
            score: currentScore,
            reasons: [...new Set(currentReasons)],
            type: this.determineHighlightType(currentReasons),
          });
        }
        currentStart = signal.time;
        currentScore = 0;
        currentReasons = [];
      }
      
      currentScore = Math.max(currentScore, signal.score);
      currentReasons.push(signal.type);
    }

    return highlights;
  }

  /**
   * 生成精彩集锦
   */
  async generateHighlightReel(highlights: HighlightSegment[]): Promise<{
    segments: HighlightSegment[];
    totalDuration: number;
  }> {
    // 按分数排序
    const sorted = [...highlights].sort((a, b) => b.score - a.score);
    
    const selected: HighlightSegment[] = [];
    let totalDuration = 0;

    for (const hl of sorted) {
      const duration = hl.endTime - hl.startTime;
      if (totalDuration + duration <= this.config.targetDuration) {
        selected.push(hl);
        totalDuration += duration;
      }
      
      if (totalDuration >= this.config.targetDuration) break;
    }

    // 按时间排序
    selected.sort((a, b) => a.startTime - b.startTime);

    return { segments: selected, totalDuration };
  }

  /**
   * 完整智能剪辑流程
   */
  async process(videoBuffer: ArrayBuffer): Promise<SmartCutResult> {
    logger.info('[SmartCut] 开始智能剪辑处理...');
    
    const startTime = Date.now();

    // 并行执行检测
    const [sceneChanges, audioPeaks, motionSegments] = await Promise.all([
      this.detectSceneChanges(videoBuffer),
      this.detectAudioPeaks(videoBuffer),
      this.analyzeMotion(videoBuffer),
    ]);

    // 生成精彩片段
    const highlights = await this.generateHighlights(
      sceneChanges,
      audioPeaks,
      motionSegments
    );

    // 生成集锦
    let highlightReel;
    if (this.config.autoGenerate) {
      highlightReel = await this.generateHighlightReel(highlights);
    }

    logger.info('[SmartCut] 智能剪辑完成', {
      sceneCount: sceneChanges.length,
      audioPeakCount: audioPeaks.length,
      motionSegmentCount: motionSegments.length,
      highlightCount: highlights.length,
      duration: Date.now() - startTime,
    });

    return {
      sceneChanges,
      audioPeaks,
      motionSegments,
      highlights,
      highlightReel,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 从 ArrayBuffer 创建视频元素
   */
  private async createVideoFromBuffer(buffer: ArrayBuffer): Promise<HTMLVideoElement> {
    const blob = new Blob([buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = url;
      video.muted = true;
      video.crossOrigin = 'anonymous';
      
      video.onloadedmetadata = () => {
        video.currentTime = 0;
        resolve(video);
      };
      
      video.onerror = () => reject(new Error('视频加载失败'));
    });
  }

  /**
   * 提取视频帧
   */
  private async extractFrame(video: HTMLVideoElement, time: number): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      video.currentTime = time;
      
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 160; // 缩放以提高性能
          canvas.height = 90;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建 canvas 上下文'));
            return;
          }
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          resolve(imageData);
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  /**
   * 计算帧差
   */
  private calculateFrameDiff(frame1: ImageData, frame2: ImageData): number {
    const data1 = frame1.data;
    const data2 = frame2.data;
    let diff = 0;
    
    // 每隔4个像素采样
    for (let i = 0; i < data1.length; i += 16) {
      diff += Math.abs(data1[i] - data2[i]);     // R
      diff += Math.abs(data1[i + 1] - data2[i + 1]); // G
      diff += Math.abs(data1[i + 2] - data2[i + 2]); // B
    }
    
    return diff / (data1.length / 4);
  }

  /**
   * 检测转场类型
   */
  private detectTransitionType(frame1: ImageData, frame2: ImageData): SceneChange['type'] {
    // 简化实现：检查是否有明显的淡入淡出特征
    const avg1 = this.getAverageBrightness(frame1);
    const avg2 = this.getAverageBrightness(frame2);
    
    if (Math.abs(avg1 - avg2) > 50) return 'cut';
    if (avg2 > avg1) return 'fade';
    return 'dissolve';
  }

  /**
   * 获取平均亮度
   */
  private getAverageBrightness(frame: ImageData): number {
    const data = frame.data;
    let sum = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    
    return sum / (data.length / 4);
  }

  /**
   * 提取音频
   */
  private async extractAudio(buffer: ArrayBuffer): Promise<AudioBuffer | null> {
    try {
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(buffer.slice(0));
      await audioContext.close();
      return audioBuffer;
    } catch (error) {
      logger.warn('[SmartCut] 音频解码失败', error);
      return null;
    }
  }

  /**
   * 分类音频类型
   */
  private classifyAudioType(data: Float32Array, start: number, length: number): AudioPeak['type'] {
    // 简化的音频分类
    let zeroCrossings = 0;
    let energy = 0;
    
    for (let i = start; i < start + length; i++) {
      if (i > 0) {
        if ((data[i] >= 0 && data[i - 1] < 0) || (data[i] < 0 && data[i - 1] >= 0)) {
          zeroCrossings++;
        }
      }
      energy += data[i] ** 2;
    }
    
    energy = Math.sqrt(energy / length);
    
    if (zeroCrossings / length > 0.1) return 'speech';
    if (energy > 0.5) return 'applause';
    return 'music';
  }

  /**
   * 计算运动强度
   */
  private calculateMotionIntensity(frame1: ImageData, frame2: ImageData): number {
    const diff = this.calculateFrameDiff(frame1, frame2);
    return Math.min(diff * 4, 100); // 归一化到 0-100
  }

  /**
   * 分类运动类型
   */
  private classifyMotionType(intensity: number): MotionSegment['type'] {
    if (intensity > 60) return 'fast';
    if (intensity > 30) return 'medium';
    return 'slow';
  }

  /**
   * 确定精彩片段类型
   */
  private determineHighlightType(reasons: string[]): HighlightSegment['type'] {
    if (reasons.includes('applause') || reasons.includes('laughter')) return 'exciting';
    if (reasons.includes('speech')) return 'emotional';
    if (reasons.includes('motion')) return 'action';
    return 'funny';
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SmartCutConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): SmartCutConfig {
    return { ...this.config };
  }
}

export const smartCutService = new SmartCutService();
export default SmartCutService;
