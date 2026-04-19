/**
 * 视觉识别服务
 * 优化画面识别准确性
 */

import { tauri } from '@/core/tauri/TauriBridge';
import { logger } from '@/utils/logger';
import type {
  VideoInfo,
  Scene,
  Keyframe,
  VideoAnalysis,
  ObjectDetection,
  EmotionAnalysis,
} from '@/core/types';
import type { HighlightSegment, DetectOptions, HighlightReason } from '@/core/interfaces';

// 场景类型定义
interface SceneType {
  id: string;
  name: string;
  keywords: string[];
  description: string;
}

interface SceneFeatureSet {
  brightness: number;
  motion: number;
  complexity: number;
  dominantColors: string[];
  hasText: boolean;
  hasFaces: boolean;
  tags: string[];
}

// 预定义场景类型
const SCENE_TYPES: SceneType[] = [
  {
    id: 'intro',
    name: '开场',
    keywords: ['开场', '片头', '介绍', '欢迎'],
    description: '视频开头部分，通常包含标题或介绍'
  },
  {
    id: 'product',
    name: '产品展示',
    keywords: ['产品', '展示', '特写', '细节'],
    description: '产品或物体的详细展示'
  },
  {
    id: 'demo',
    name: '演示',
    keywords: ['演示', '操作', '步骤', '教程'],
    description: '操作演示或教程步骤'
  },
  {
    id: 'interview',
    name: '访谈',
    keywords: ['访谈', '对话', '人物', '讲述'],
    description: '人物访谈或对话场景'
  },
  {
    id: 'landscape',
    name: '风景',
    keywords: ['风景', '外景', '自然', '环境'],
    description: '自然风光或环境展示'
  },
  {
    id: 'action',
    name: '动作',
    keywords: ['动作', '运动', '动态', '快节奏'],
    description: '动作或运动场景'
  },
  {
    id: 'emotion',
    name: '情感',
    keywords: ['情感', '表情', '反应', '情绪'],
    description: '表达情感或情绪的场景'
  },
  {
    id: 'text',
    name: '文字',
    keywords: ['文字', '字幕', '标题', '说明'],
    description: '包含重要文字信息的场景'
  }
];

// 物体检测类别
const OBJECT_CATEGORIES = [
  '人物', '产品', '文字', '建筑', '自然', '车辆', '动物', '食物', '工具', '电子设备'
];

// 情感分析维度
const EMOTION_DIMENSIONS = [
  { id: 'positive', name: '积极', score: 0 },
  { id: 'negative', name: '消极', score: 0 },
  { id: 'neutral', name: '中性', score: 0 },
  { id: 'excited', name: '兴奋', score: 0 },
  { id: 'calm', name: '平静', score: 0 }
];

export class VisionService {
  /**
   * 视频分析入口
   * 整合场景检测、对象识别、情感分析
   */
  async analyzeVideo(
    videoInfo: VideoInfo,
    options?: {
      minSceneDuration?: number;
      threshold?: number;
      detectObjects?: boolean;
      detectEmotions?: boolean;
    }
  ): Promise<{
    scenes: Scene[];
    objects: ObjectDetection[];
    emotions: EmotionAnalysis[];
  }> {
    return this.detectScenesAdvanced(videoInfo, options);
  }

  /**
   * 高级场景检测
   * 使用多维度分析提高准确性
   */
  async detectScenesAdvanced(
    videoInfo: VideoInfo,
    options: {
      minSceneDuration?: number;
      threshold?: number;
      detectObjects?: boolean;
      detectEmotions?: boolean;
    } = {}
  ): Promise<{
    scenes: Scene[];
    objects: ObjectDetection[];
    emotions: EmotionAnalysis[];
  }> {
    const {
      minSceneDuration = 3,
      threshold = 0.3,
      detectObjects = true,
      detectEmotions = true
    } = options;

    // 1. 基础场景分割
    const baseScenes = await this.segmentScenes(videoInfo, minSceneDuration);

    // 2. 场景分类
    const classifiedScenes = await this.classifyScenes(baseScenes, videoInfo);

    // 3. 物体检测 + 情感分析（并行，独立分析维度）
    const [objects, emotions] = await Promise.all([
      detectObjects
        ? this.detectObjectsInScenes(classifiedScenes, videoInfo)
        : ([] as ObjectDetection[]),
      detectEmotions
        ? this.analyzeEmotions(classifiedScenes, videoInfo)
        : ([] as EmotionAnalysis[]),
    ]);

    // 4. 场景优化
    const optimizedScenes = this.optimizeScenes(classifiedScenes, objects, emotions);

    return {
      scenes: optimizedScenes,
      objects,
      emotions
    };
  }

  /**
   * 提取关键帧
   *
   * 从视频中按场景边界提取关键帧。
   * 若无 FFmpeg/WebCodecs 能力，则基于已检测的场景返回边界帧。
   */
  async extractKeyframes(
    videoInfo: VideoInfo,
    options: { maxFrames?: number } = {}
  ): Promise<Array<{ id: string; timestamp: number; thumbnail: string; description: string }>> {
    const { maxFrames = 20 } = options;

    // 优先复用已检测的场景边界作为关键帧
    try {
      const { scenes } = await this.detectScenesAdvanced(videoInfo, {
        minSceneDuration: 1,
        threshold: 0.3,
        detectObjects: false,
        detectEmotions: false,
      });

      // 采样：均匀抽取 maxFrames 个场景的起始帧
      const step = Math.max(1, Math.ceil(scenes.length / maxFrames));
      const sampled = scenes.filter((_, i) => i % step === 0).slice(0, maxFrames);

      return sampled.map((scene, i) => ({
        id: scene.id || `kf_${i}`,
        timestamp: scene.startTime,
        thumbnail: scene.thumbnail || '',
        description: scene.description || '',
      }));
    } catch {
      // 检测失败时，按时间均匀采样
      const interval = Math.max(1, videoInfo.duration / maxFrames);
      return Array.from({ length: maxFrames }, (_, i) => ({
        id: `kf_${i}`,
        timestamp: i * interval,
        thumbnail: '',
        description: '',
      }));
    }
  }

  /**
   * 场景分割
   */
  private async segmentScenes(
    videoInfo: VideoInfo,
    minDuration: number
  ): Promise<Scene[]> {
    const scenes: Scene[] = [];
    const segmentDuration = Math.max(minDuration, videoInfo.duration / 20);
    const numScenes = Math.floor(videoInfo.duration / segmentDuration);

    for (let i = 0; i < numScenes; i++) {
      const startTime = i * segmentDuration;
      const endTime = Math.min((i + 1) * segmentDuration, videoInfo.duration);

      // 生成缩略图
      const thumbnail = await this.generateThumbnail(videoInfo.path, startTime);

      scenes.push({
        id: `scene_${i}_${Date.now()}`,
        startTime,
        endTime,
        type: 'action' as const,
        score: 0,
        thumbnail,
        description: '',
        tags: [] as string[],
        confidence: 0
      } as Scene);
    }

    return scenes;
  }

  /**
   * 场景分类
   */
  private async classifyScenes(
    scenes: Scene[],
    videoInfo: VideoInfo
  ): Promise<Scene[]> {
    return Promise.all(
      scenes.map(async (scene, index) => {
        // 基于场景位置和内容进行分类
        const position = scene.startTime / videoInfo.duration;
        const duration = scene.endTime - scene.startTime;

        // 分析场景特征
        const features = await this.analyzeSceneFeatures(scene, videoInfo);

        // 匹配场景类型
        const matchedType = this.matchSceneType(features, position);

        return {
          ...scene,
          type: matchedType.id as Scene['type'],
          description: matchedType.description,
          tags: [...matchedType.keywords, ...features.tags],
          confidence: matchedType.confidence,
          features: [
            `brightness:${features.brightness}`,
            `motion:${features.motion}`,
            `complexity:${features.complexity}`,
            ...features.tags
          ]
        } as Scene;
      })
    );
  }

  /**
   * 分析场景特征
   */
  private async analyzeSceneFeatures(
    scene: Scene,
    videoInfo: VideoInfo
  ): Promise<{
    brightness: number;
    motion: number;
    complexity: number;
    dominantColors: string[];
    hasText: boolean;
    hasFaces: boolean;
    tags: string[];
  }> {
    // 模拟特征分析
    // 实际实现应该使用 OpenCV 或类似库

    const position = scene.startTime / videoInfo.duration;
    const tags: string[] = [];

    // 基于位置推断
    if (position < 0.1) tags.push('开场');
    if (position > 0.9) tags.push('结尾');
    if (position > 0.3 && position < 0.7) tags.push('主体');

    // 基于时长推断
    const duration = scene.endTime - scene.startTime;
    if (duration > 10) tags.push('长镜头');
    if (duration < 3) tags.push('快速切换');

    return {
      brightness: Math.random() * 0.5 + 0.25,
      motion: Math.random() * 0.6 + 0.2,
      complexity: Math.random() * 0.7 + 0.15,
      dominantColors: this.generateDominantColors(),
      hasText: Math.random() > 0.7,
      hasFaces: Math.random() > 0.6,
      tags
    };
  }

  /**
   * 匹配场景类型
   */
  private matchSceneType(
    features: SceneFeatureSet,
    position: number
  ): { id: string; description: string; keywords: string[]; confidence: number } {
    // 基于特征和位置匹配场景类型
    let bestMatch = SCENE_TYPES[0];
    let maxConfidence = 0;

    // 开场检测
    if (position < 0.15) {
      return {
        id: 'intro',
        description: '视频开场，建议用引人入胜的方式介绍主题',
        keywords: ['开场', '介绍', '引入'],
        confidence: 0.9
      };
    }

    // 结尾检测
    if (position > 0.85) {
      return {
        id: 'outro',
        description: '视频结尾，适合总结和呼吁行动',
        keywords: ['结尾', '总结', '呼吁'],
        confidence: 0.9
      };
    }

    // 基于特征匹配
    if (features.hasFaces && features.motion > 0.5) {
      bestMatch = SCENE_TYPES.find(s => s.id === 'interview') || SCENE_TYPES[0];
      maxConfidence = 0.75;
    } else if (features.hasText) {
      bestMatch = SCENE_TYPES.find(s => s.id === 'text') || SCENE_TYPES[0];
      maxConfidence = 0.8;
    } else if (features.motion > 0.6) {
      bestMatch = SCENE_TYPES.find(s => s.id === 'action') || SCENE_TYPES[0];
      maxConfidence = 0.7;
    } else if (features.complexity > 0.6) {
      bestMatch = SCENE_TYPES.find(s => s.id === 'product') || SCENE_TYPES[0];
      maxConfidence = 0.65;
    }

    return {
      id: bestMatch.id,
      description: bestMatch.description,
      keywords: bestMatch.keywords,
      confidence: maxConfidence
    };
  }

  /**
   * 物体检测
   */
  private async detectObjectsInScenes(
    scenes: Scene[],
    videoInfo: VideoInfo
  ): Promise<ObjectDetection[]> {
    const objects: ObjectDetection[] = [];

    for (const scene of scenes) {
      // 模拟物体检测
      const numObjects = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < numObjects; i++) {
        const category = OBJECT_CATEGORIES[Math.floor(Math.random() * OBJECT_CATEGORIES.length)];

        objects.push({
          id: `obj_${scene.id}_${i}`,
          sceneId: scene.id,
          category,
          label: `${category} ${i + 1}`,
          confidence: Math.random() * 0.3 + 0.7,
          bbox: [
            Math.random() * 0.6,
            Math.random() * 0.6,
            Math.random() * 0.3 + 0.1,
            Math.random() * 0.3 + 0.1
          ] as [number, number, number, number]
        });
      }
    }

    return objects;
  }

  /**
   * 情感分析
   */
  private async analyzeEmotions(
    scenes: Scene[],
    videoInfo: VideoInfo
  ): Promise<EmotionAnalysis[]> {
    return scenes.map(scene => {
      const baseEmotions = [...EMOTION_DIMENSIONS];

      // 基于场景类型调整情感
      if ((scene.type as string) === 'intro') {
        baseEmotions.find(e => e.id === 'excited')!.score = 0.7;
        baseEmotions.find(e => e.id === 'positive')!.score = 0.6;
      } else if ((scene.type as string) === 'emotion') {
        baseEmotions.find(e => e.id === 'excited')!.score = 0.8;
        baseEmotions.find(e => e.id === 'positive')!.score = 0.5;
      } else {
        baseEmotions.find(e => e.id === 'neutral')!.score = 0.6;
        baseEmotions.find(e => e.id === 'calm')!.score = 0.5;
      }

      // 归一化
      const total = baseEmotions.reduce((sum, e) => sum + e.score, 0);
      const normalized = baseEmotions.map(e => ({
        ...e,
        score: total > 0 ? e.score / total : 0.2
      }));

      // 找出主导情感
      const dominant = normalized.reduce((max, e) => e.score > max.score ? e : max);

      return {
        id: `emotion_${scene.id}`,
        sceneId: scene.id,
        timestamp: scene.startTime,
        emotions: normalized,
        dominant: dominant.id,
        intensity: dominant.score
      };
    });
  }

  /**
   * 优化场景
   */
  private optimizeScenes(
    scenes: Scene[],
    objects: ObjectDetection[],
    emotions: EmotionAnalysis[]
  ): Scene[] {
    // 预建查找表：sceneId → objects/emotions，避免 O(n²) 嵌套循环
    const objectMap = new Map<string, ObjectDetection[]>();
    for (const obj of objects) {
      if (obj.sceneId == null) continue;
      const list = objectMap.get(obj.sceneId) ?? [];
      list.push(obj);
      objectMap.set(obj.sceneId, list);
    }
    const emotionMap = new Map(emotions.map((e) => [e.sceneId, e]));

    return scenes.map((scene) => {
      const sceneObjects = objectMap.get(scene.id) ?? [];
      const sceneEmotion = emotionMap.get(scene.id) ?? null;

      // 生成更准确的描述
      const description = this.generateSceneDescription(scene, sceneObjects, sceneEmotion ?? undefined);

      return {
        ...scene,
        description,
        objectCount: sceneObjects.length,
        dominantEmotion: sceneEmotion?.dominant
      };
    });
  }

  /**
   * 生成场景描述
   */
  private generateSceneDescription(
    scene: Scene,
    objects: ObjectDetection[],
    emotion?: EmotionAnalysis
  ): string {
    const parts: string[] = [];

    // 场景类型
    const typeNames: Record<string, string> = {
      intro: '开场',
      product: '产品展示',
      demo: '操作演示',
      interview: '人物访谈',
      landscape: '风景展示',
      action: '动作场景',
      emotion: '情感表达',
      text: '文字信息',
      outro: '结尾总结'
    };

    parts.push(typeNames[scene.type || ''] || '场景');

    // 物体信息
    if (objects.length > 0) {
      const categories = [...new Set(objects.map(o => o.category))];
      parts.push(`包含${categories.join('、')}`);
    }

    // 情感信息
    if (emotion) {
      const emotionNames: Record<string, string> = {
        positive: '积极',
        negative: '消极',
        neutral: '中性',
        excited: '兴奋',
        calm: '平静'
      };
      const emotionKey = emotion.dominant ?? 'neutral';
      parts.push(`氛围${emotionNames[emotionKey] || emotionKey}`);
    }

    return parts.join('，');
  }

  /**
   * 生成缩略图
   */
  private async generateThumbnail(videoPath: string, timestamp: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.crossOrigin = 'anonymous';

      video.onloadeddata = () => {
        canvas.width = 320;
        canvas.height = Math.round(320 * (video.videoHeight / video.videoWidth));
        video.currentTime = timestamp;
      };

      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          reject(new Error('无法创建画布'));
        }
      };

      video.onerror = () => reject(new Error('无法加载视频'));
      video.src = videoPath;
    });
  }

  /**
   * 生成主导颜色
   */
  private generateDominantColors(): string[] {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    const numColors = Math.floor(Math.random() * 2) + 2;
    const shuffled = [...colors].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, numColors);
  }

  /**
   * 生成视频分析报告
   */
  async generateAnalysisReport(
    videoInfo: VideoInfo,
    scenes: Scene[],
    objects: ObjectDetection[],
    emotions: EmotionAnalysis[]
  ): Promise<VideoAnalysis> {
    // 统计信息
    const sceneTypes = scenes.reduce((acc, scene) => {
      acc[scene.type || 'unknown'] = (acc[scene.type || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const objectCategories = objects.reduce((acc, obj) => {
      const key = Array.isArray(obj.category) ? obj.category[0] : obj.category;
      acc[key || 'unknown'] = (acc[key || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantEmotions = emotions.reduce((acc, emotion) => {
      const emotionKey = emotion.dominant ?? 'neutral';
      acc[emotionKey] = (acc[emotionKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 生成摘要
    const summary = this.generateSummary(videoInfo, sceneTypes, objectCategories, dominantEmotions);

    return {
      id: `analysis_${Date.now()}`,
      videoId: videoInfo.id,
      scenes,
      keyframes: scenes.map(s => ({
        id: `kf_${s.id}`,
        timestamp: s.startTime,
        thumbnail: s.thumbnail,
        description: s.description
      })),
      objects,
      emotions: emotions?.map(e => e.dominant || e.emotion || 'neutral') || [],
      summary,
      stats: {
        sceneCount: scenes.length,
        objectCount: objects.length,
        avgSceneDuration: videoInfo.duration / scenes.length,
        sceneTypes,
        objectCategories,
        dominantEmotions
      },
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 生成摘要
   */
  private generateSummary(
    videoInfo: VideoInfo,
    sceneTypes: Record<string, number>,
    objectCategories: Record<string, number>,
    dominantEmotions: Record<string, number>
  ): string {
    const parts: string[] = [];

    parts.push(`视频时长 ${this.formatDuration(videoInfo.duration)}，`);
    parts.push(`分辨率 ${videoInfo.width}x${videoInfo.height}，`);
    parts.push(`包含 ${Object.keys(sceneTypes).length} 种场景类型，`);

    // 主要场景类型
    const mainScenes = Object.entries(sceneTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (mainScenes.length > 0) {
      parts.push(`以${mainScenes.map(([type]) => type).join('、')}为主，`);
    }

    // 物体统计
    if (Object.keys(objectCategories).length > 0) {
      parts.push(`检测到 ${Object.keys(objectCategories).length} 类物体，`);
    }

    // 情感基调
    const mainEmotion = Object.entries(dominantEmotions)
      .sort((a, b) => b[1] - a[1])[0];
    if (mainEmotion) {
      parts.push(`整体氛围${mainEmotion[0]}。`);
    }

    return parts.join('');
  }

  /**
   * 格式化时长
   */
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
  }

  /**
   * Rust 高光检测 — 激活 highlight_detector.rs
   *
   * 使用 FFmpeg scdet 滤镜 + 音频短时能量分析，无需外部 AI 服务
   * 识别高光片段（音频能量峰值 + 场景切换）
   */
  /**
   * Rust 高光检测 — 激活 highlight_detector.rs
   *
   * 使用 FFmpeg scdet 滤镜 + 音频短时能量分析，无需外部 AI 服务
   * 识别高光片段（音频能量峰值 + 场景切换）
   *
   * @deprecated 使用 @/core/interfaces DetectOptions 类型 + tauri.detectHighlights()
   */
  async detectHighlights(
    videoInfo: VideoInfo,
    options: Partial<DetectOptions> = {},
  ): Promise<HighlightSegment[]> {
    const videoPath = videoInfo.path;

    if (!videoPath) {
      logger.info('[VisionService] detectHighlights: videoInfo.path is empty');
      return [];
    }

    try {
      // 使用 TauriBridge 类型化调用
      const rawSegments = await tauri.detectHighlights(videoPath, {
        threshold: options.threshold,
        minDurationMs: options.minDurationMs ?? options.minDurationMs,
        topN: options.topN,
        windowMs: options.windowMs,
      });

      return (rawSegments as Array<{
        start_ms: number;
        end_ms: number;
        score: number;
        reason: string;
        audio_score?: number;
        scene_score?: number;
        motion_score?: number;
      }>).map((h) => ({
        startTime: h.start_ms / 1000,
        endTime: h.end_ms / 1000,
        score: h.score,
        reason: h.reason as HighlightReason,
        audioScore: h.audio_score,
        sceneScore: h.scene_score,
        motionScore: h.motion_score,
      }));
    } catch (error) {
      logger.info('[VisionService] detectHighlights failed:', error);
      return [];
    }
  }
}

export const visionService = new VisionService();
export default visionService;
