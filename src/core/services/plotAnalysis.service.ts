/**
 * 剧情分析服务 - PlotAnalysis Service
 *
 * 基于视频内容理解的智能剪辑模块
 * 核心功能：场景检测、对话转写、情感识别、剧情结构分析
 */
import { logger } from '@/utils/logger';
import { aiService } from './ai.service';
import { visionService } from './vision.service';
import { asrService } from './asr.service';
import type { VideoInfo, Scene, Emotion, KeyMoment, AIModel } from '@/core/types';

// ============================================
// 类型定义
// ============================================

/** 剧情节点类型 */
export type PlotNodeType =
  | 'setup'           // 背景铺垫
  | 'rising_action'   // 上升情节
  | 'climax'          // 高潮
  | 'falling_action'  // 下降情节
  | 'resolution'      // 结局
  | 'turning_point'   // 转折点
  | 'emotional_beat'  // 情感节点
  | 'dialogue'        // 对话场景
  | 'action'          // 动作场景
  | 'transition';     // 转场

/** 剧情节点 */
export interface PlotNode {
  id: string;
  type: PlotNodeType;
  timestamp: number;
  duration: number;
  title: string;
  description: string;
  importance: number;        // 1-10
  emotionalTone?: string;    // 兴奋/平静/紧张/悲伤等
  characters?: string[];     // 出现的角色
  location?: string;         // 场景地点
  tags: string[];
  confidence: number;
}

/** 剧情图谱 */
export interface PlotTimeline {
  id: string;
  videoId: string;
  nodes: PlotNode[];
  summary: string;
  narrativeArc: string;       // 叙事弧线描述
  themes: string[];          // 主题标签
  characters: string[];      // 检测到的角色
  totalDuration: number;
  createdAt: string;
}

/** 剪辑版本类型 */
export type EditVersion =
  | 'full'        // 剧情完整版
  | 'highlights'  // 精华版
  | 'intense';    // 高能混剪版

/** 剪辑建议 */
export interface PlotClipSuggestion {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  type: PlotNodeType;
  title: string;
  reason: string;
  tags: string[];
  importance: number;
  version: EditVersion[];  // 适合哪些版本
}

/** 剧情分析配置 */
export interface PlotAnalysisConfig {
  detectCharacters: boolean;
  detectLocation: boolean;
  analyzeNarrativeArc: boolean;
  identifyThemes: boolean;
  minNodeDuration: number;   // 最小节点时长(秒)
  maxNodes: number;         // 最大节点数
}

/** 默认配置 */
export const DEFAULT_PLOT_ANALYSIS_CONFIG: PlotAnalysisConfig = {
  detectCharacters: true,
  detectLocation: true,
  analyzeNarrativeArc: true,
  identifyThemes: true,
  minNodeDuration: 3,
  maxNodes: 50,
};

// ============================================
// 剧情分析服务类
// ============================================

class PlotAnalysisService {
  /**
   * 分析视频剧情结构
   */
  async analyzePlot(
    videoInfo: VideoInfo,
    config: Partial<PlotAnalysisConfig> = {}
  ): Promise<PlotTimeline> {
    const cfg = { ...DEFAULT_PLOT_ANALYSIS_CONFIG, ...config };
    logger.info('开始剧情分析:', { videoId: videoInfo.id, config: cfg });

    try {
      // 1. 并行执行基础分析
      const [scenesResult, keyframesResult, asrResult] = await Promise.allSettled([
        this.detectScenes(videoInfo),
        this.extractKeyframes(videoInfo),
        this.transcribeAudio(videoInfo),
      ]);

      const scenes = scenesResult.status === 'fulfilled' ? scenesResult.value : [];
      const keyframes = keyframesResult.status === 'fulfilled' ? keyframesResult.value : [];
      const transcript = asrResult.status === 'fulfilled' ? asrResult.value : '';

      // 2. 情感分析（独立，不阻塞主流程）
      const emotions = await this.analyzeEmotions(videoInfo, scenes);

      // 3. 构建剧情节点
      const nodes = await this.buildPlotNodes(
        videoInfo,
        scenes,
        keyframes,
        transcript,
        emotions,
        cfg
      );

      // 4. LLM 剧情理解
      const { summary, narrativeArc, themes, characters } = await this.llmPlotUnderstanding(
        nodes,
        transcript,
        videoInfo
      );

      const timeline: PlotTimeline = {
        id: crypto.randomUUID(),
        videoId: videoInfo.id,
        nodes,
        summary,
        narrativeArc,
        themes,
        characters,
        totalDuration: videoInfo.duration,
        createdAt: new Date().toISOString(),
      };

      logger.info('剧情分析完成:', {
        videoId: videoInfo.id,
        nodeCount: nodes.length,
        themes
      });

      return timeline;
    } catch (error) {
      logger.error('剧情分析失败:', { error });
      throw error;
    }
  }

  /**
   * 检测场景
   */
  private async detectScenes(videoInfo: VideoInfo): Promise<Scene[]> {
    try {
      const result = await visionService.detectScenesAdvanced(videoInfo, {
        minSceneDuration: 3,
        threshold: 0.3,
      });
      return result.scenes || [];
    } catch (error) {
      logger.warn('场景检测失败，使用默认值:', { error });
      return [];
    }
  }

  /**
   * 提取关键帧
   */
  private async extractKeyframes(videoInfo: VideoInfo): Promise<string[]> {
    try {
      const frames = await visionService.extractKeyframes(videoInfo, { maxFrames: 30 });
      return frames.map(f => f.thumbnail || '').filter(Boolean);
    } catch (error) {
      logger.warn('关键帧提取失败:', { error });
      return [];
    }
  }

  /**
   * 音频转写
   */
  private async transcribeAudio(videoInfo: VideoInfo): Promise<string> {
    try {
      const result = await asrService.recognizeSpeech(videoInfo);
      return result.text || '';
    } catch (error) {
      logger.warn('音频转写失败:', { error });
      return '';
    }
  }

  /**
   * 情感分析
   */
  private async analyzeEmotions(videoInfo: VideoInfo, scenes: Scene[]): Promise<Emotion[]> {
    try {
      const result = await visionService.detectEmotions(videoInfo);
      return result || [];
    } catch (error) {
      logger.warn('情感分析失败:', { error });
      return [];
    }
  }

  /**
   * 构建剧情节点
   */
  private buildPlotNodes(
    videoInfo: VideoInfo,
    scenes: Scene[],
    keyframes: string[],
    transcript: string,
    emotions: Emotion[],
    config: PlotAnalysisConfig
  ): PlotNode[] {
    const nodes: PlotNode[] = [];

    for (const scene of scenes.slice(0, config.maxNodes)) {
      const nodeType = this.inferPlotNodeType(scene, emotions);
      const emotionalTone = this.getSceneEmotionalTone(scene.timestamp, emotions);

      nodes.push({
        id: crypto.randomUUID(),
        type: nodeType,
        timestamp: scene.startTime,
        duration: scene.endTime - scene.startTime,
        title: this.generateNodeTitle(scene, nodeType),
        description: scene.description || `场景 ${scene.startTime.toFixed(0)}s - ${scene.endTime.toFixed(0)}s`,
        importance: this.calculateImportance(scene, emotionalTone),
        emotionalTone,
        tags: this.generateNodeTags(scene, nodeType),
        confidence: scene.confidence || 0.7,
      });
    }

    // 按时间排序
    nodes.sort((a, b) => a.timestamp - b.timestamp);

    return nodes;
  }

  /**
   * 推断剧情节点类型
   */
  private inferPlotNodeType(scene: Scene, emotions: Emotion[]): PlotNodeType {
    const sceneEmotions = emotions.filter(
      e => e.timestamp >= scene.startTime && e.timestamp <= scene.endTime
    );

    const dominantEmotion = sceneEmotions[0]?.emotion || 'neutral';

    if (scene.type === 'action' || (scene.motionScore && scene.motionScore > 0.7)) {
      return 'action';
    }

    if (scene.type === 'dialog' || (sceneEmotions.length > 0 && ['happy', 'sad', 'angry'].includes(dominantEmotion))) {
      return 'dialogue';
    }

    if (scene.score && scene.score > 8) {
      return 'climax';
    }

    if (scene.score && scene.score > 6) {
      return 'rising_action';
    }

    return 'transition';
  }

  /**
   * 获取场景情感色调
   */
  private getSceneEmotionalTone(timestamp: number, emotions: Emotion[]): string {
    const nearbyEmotions = emotions.filter(
      e => Math.abs(e.timestamp - timestamp) < 5
    );

    if (nearbyEmotions.length === 0) return 'neutral';

    const emotionCounts: Record<string, number> = {};
    for (const e of nearbyEmotions) {
      const type = e.emotion || 'neutral';
      emotionCounts[type] = (emotionCounts[type] || 0) + 1;
    }

    return Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * 生成节点标题
   */
  private generateNodeTitle(scene: Scene, type: PlotNodeType): string {
    const typeLabels: Record<PlotNodeType, string> = {
      setup: '开场铺垫',
      rising_action: '情节推进',
      climax: '高潮时刻',
      falling_action: '情节回落',
      resolution: '结局呈现',
      turning_point: '剧情转折',
      emotional_beat: '情感节点',
      dialogue: '对话场景',
      action: '动作场景',
      transition: '场景转换',
    };

    const mins = Math.floor(scene.startTime / 60);
    const secs = Math.floor(scene.startTime % 60);
    return `${typeLabels[type] || '场景'} [${mins}:${secs.toString().padStart(2, '0')}]`;
  }

  /**
   * 计算重要性分数
   */
  private calculateImportance(scene: Scene, emotionalTone: string): number {
    let score = 5; // 基础分

    if (scene.score) {
      score += scene.score * 0.3;
    }

    const emotionIntensity = scene.dominantEmotion ? 1 : 0;
    score += emotionIntensity * 2;

    const duration = scene.endTime - scene.startTime;
    if (duration >= 10 && duration <= 60) {
      score += 1;
    }

    return Math.min(10, Math.max(1, Math.round(score)));
  }

  /**
   * 生成节点标签
   */
  private generateNodeTags(scene: Scene, type: PlotNodeType): string[] {
    const tags = [type];

    if (scene.features) {
      tags.push(...scene.features.slice(0, 2));
    }

    return tags;
  }

  /**
   * LLM 剧情理解
   */
  private async llmPlotUnderstanding(
    nodes: PlotNode[],
    transcript: string,
    videoInfo: VideoInfo
  ): Promise<{ summary: string; narrativeArc: string; themes: string[]; characters: string[] }> {
    const nodesSummary = nodes
      .map(n => `[${n.timestamp.toFixed(0)}s] ${n.type}: ${n.title}`)
      .join('\n');

    const prompt = `请分析以下视频的剧情结构：

时间轴节点：
${nodesSummary}

视频时长：${videoInfo.duration}秒
${transcript ? `语音内容：\n${transcript.slice(0, 2000)}` : ''}

请提取：
1. 一句话剧情摘要
2. 叙事弧线类型（如：起承转合、线性叙事、非线性叙事等）
3. 主要主题标签（3-5个）
4. 出现的角色列表（基于对话内容推断）

请用JSON格式返回：
{
  "summary": "...",
  "narrativeArc": "...",
  "themes": ["...", "..."],
  "characters": ["...", "..."]
}`;

    try {
      const result = await aiService.generateText(
        {
          id: 'llm-understanding',
          name: 'GPT-4 LLM Understanding',
          provider: 'openai' as const,
          model: 'gpt-4',
        } satisfies AIModel,
        { enabled: true, apiKey: '', temperature: 0.3, maxTokens: 800 },
        prompt
      );

      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || '视频内容',
          narrativeArc: parsed.narrativeArc || '线性叙事',
          themes: Array.isArray(parsed.themes) ? parsed.themes : [],
          characters: Array.isArray(parsed.characters) ? parsed.characters : [],
        };
      }
    } catch (error) {
      logger.warn('LLM剧情理解失败，使用默认:', { error });
    }

    return {
      summary: `视频内容（${nodes.length}个场景）`,
      narrativeArc: '线性叙事',
      themes: [],
      characters: [],
    };
  }

  /**
   * 生成剪辑建议
   */
  private generateClipSuggestions(
    nodes: PlotNode[],
    config: PlotAnalysisConfig
  ): PlotClipSuggestion[] {
    const suggestions: PlotClipSuggestion[] = [];

    for (const node of nodes) {
      if (node.duration < config.minNodeDuration) continue;

      const versions: EditVersion[] = ['full'];
      if (node.importance >= 7) {
        versions.push('highlights');
      }
      if (node.type === 'climax' || node.type === 'action') {
        versions.push('intense');
      }

      suggestions.push({
        id: crypto.randomUUID(),
        startTime: node.timestamp,
        endTime: node.timestamp + node.duration,
        duration: node.duration,
        type: node.type,
        title: node.title,
        reason: this.generateClipReason(node),
        tags: node.tags,
        importance: node.importance,
        version: versions,
      });
    }

    return suggestions;
  }

  /**
   * 生成剪辑原因
   */
  private generateClipReason(node: PlotNode): string {
    const reasons: Record<PlotNodeType, string> = {
      setup: '开场铺垫，建立世界观',
      rising_action: '情节推进，增强张力',
      climax: '高能时刻，不容错过',
      falling_action: '情节缓冲',
      resolution: '结局呈现，收尾完整',
      turning_point: '剧情转折，出人意料',
      emotional_beat: '情感高潮，触动人心',
      dialogue: '精彩对话，角色魅力',
      action: '激烈动作，视觉冲击',
      transition: '场景衔接',
    };

    return reasons[node.type] || '重要场景';
  }

  /**
   * 根据版本类型剪辑
   */
  generateEditTimeline(
    timeline: PlotTimeline,
    version: EditVersion
  ): PlotClipSuggestion[] {
    const suggestions = this.generateClipSuggestions(timeline.nodes, DEFAULT_PLOT_ANALYSIS_CONFIG);

    switch (version) {
      case 'full':
        return suggestions.filter(s => s.version.includes('full'));

      case 'highlights':
        return suggestions.filter(s => s.importance >= 7 && s.version.includes('highlights'));

      case 'intense':
        return suggestions.filter(s =>
          (s.type === 'climax' || s.type === 'action' || s.type === 'turning_point')
          && s.version.includes('intense')
        );

      default:
        return suggestions;
    }
  }
}

// 导出单例
export const plotAnalysisService = new PlotAnalysisService();
export default plotAnalysisService;
