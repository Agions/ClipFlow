/**
 * AI 服务
 * 统一的 AI 模型调用服务
 */

import { BaseService, ServiceError } from './base.service';
import type { AIModel, AIModelSettings, ScriptData, ScriptSegment, VideoAnalysis, VideoInfo } from '@/core/types';
import { LLM_MODELS, DEFAULT_LLM_MODEL, MODEL_RECOMMENDATIONS } from '@/core/constants';
import { visionService } from './vision.service';

// API 响应类型
interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

// 请求配置
interface RequestConfig {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

// 模型提供商配置
interface ModelProvider {
  name: string;
  baseUrl: string;
  requiresApiSecret?: boolean;
}

type SupportedProvider = NonNullable<Exclude<AIModel['provider'], 'iflytek' | 'deepseek'>>;

const MODEL_PROVIDERS: Record<SupportedProvider, ModelProvider> = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1'
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1'
  },
  google: {
    name: 'Google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
  },
  azure: {
    name: 'Azure OpenAI',
    baseUrl: ''
  },
  local: {
    name: 'Local Model',
    baseUrl: ''
  },
  custom: {
    name: 'Custom Provider',
    baseUrl: ''
  },
  alibaba: {
    name: '阿里通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com'
  },
  zhipu: {
    name: '智谱GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4'
  },
  moonshot: {
    name: '月之暗面 Kimi',
    baseUrl: 'https://api.moonshot.cn/v1'
  }
};

interface OpenAILikeResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: AIResponse['usage'];
  model?: string;
}

interface AnthropicResponse {
  content?: Array<{ text?: string }>;
  usage?: AIResponse['usage'];
  model?: string;
}

interface GoogleResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

interface BaiduTokenResponse {
  access_token?: string;
}

interface BaiduChatResponse {
  result?: string;
}

const isSupportedProvider = (provider: AIModel['provider']): provider is SupportedProvider =>
  provider in MODEL_PROVIDERS;

export class AIService extends BaseService {
  private abortControllers: Map<string, AbortController> = new Map();

  constructor() {
    super('AIService', { timeout: 60000, retries: 2 });
  }

  /**
   * 生成纯文本（用于分段脚本、说明文案等）
   */
  async generateText(
    model: AIModel,
    prompt: string,
    settings: AIModelSettings = { enabled: true, apiKey: '', temperature: 0.7, maxTokens: 1200 }
  ): Promise<string> {
    // 参数校验
    if (settings.temperature !== undefined && (settings.temperature < 0 || settings.temperature > 2)) {
      throw new ServiceError('temperature must be between 0 and 2', 'INVALID_PARAM');
    }
    if (settings.maxTokens !== undefined && settings.maxTokens <= 0) {
      throw new ServiceError('maxTokens must be a positive integer', 'INVALID_PARAM');
    }
    if (typeof prompt !== 'string' || !prompt.trim()) {
      throw new ServiceError('prompt must be a non-empty string', 'INVALID_PARAM');
    }

    const response = await this.callAPI(model, settings, prompt);
    return response.content;
  }

  /**
   * 生成脚本
   */
  async generateScript(
    model: AIModel,
    settings: AIModelSettings,
    params: {
      topic: string;
      style: string;
      tone: string;
      length: string;
      audience: string;
      language: string;
      keywords?: string[];
      requirements?: string;
      videoDuration?: number;
    }
  ): Promise<ScriptData> {
    return this.executeRequest(
      async () => {
        const prompt = this.buildScriptPrompt(params);
        const response = await this.callAPI(model, settings, prompt);
        
        return {
          id: `script_${Date.now()}`,
          title: params.topic,
          content: response.content,
          segments: this.parseScriptSegments(response.content),
          metadata: {
            style: params.style,
            tone: params.tone,
            length: params.length as 'short' | 'medium' | 'long',
            targetAudience: params.audience,
            language: params.language,
            wordCount: response.content.length,
            estimatedDuration: this.estimateDuration(response.content.length),
            generatedBy: model.id,
            generatedAt: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      },
      '生成脚本',
      { loadingMessage: '正在生成脚本...' }
    );
  }

  /**
   * 分析视频
   */
  async analyzeVideo(
    model: AIModel,
    settings: AIModelSettings,
    videoInfo: {
      duration: number;
      width: number;
      height: number;
      format: string;
    }
  ): Promise<Partial<VideoAnalysis>> {
    return this.executeRequest(
      async () => {
        const prompt = this.buildAnalysisPrompt(videoInfo);
        const response = await this.callAPI(model, settings, prompt);
        
        // 并行调用视觉分析服务获取真实数据
        const [scenesResult, keyframesResult] = await Promise.allSettled([
          visionService.detectScenesAdvanced(videoInfo as any, { minSceneDuration: 3, threshold: 0.3 }),
          visionService.extractKeyframes(videoInfo as any, { maxFrames: 20 }),
        ]);

        const scenes = scenesResult.status === 'fulfilled' && (scenesResult.value as any).scenes
          ? (scenesResult.value as any).scenes.map((s: any) => ({
              id: s.id || crypto.randomUUID(),
              startTime: s.startTime,
              endTime: s.endTime,
              thumbnail: s.thumbnail || '',
              description: s.description || '',
              tags: s.tags || [],
            }))
          : [];
        const keyframes = keyframesResult.status === 'fulfilled' && Array.isArray(keyframesResult.value)
          ? (keyframesResult.value as any[]).map((k: any, idx: number) => ({
              id: k.id || `kf_${idx}`,
              timestamp: k.timestamp || 0,
              thumbnail: k.thumbnail || '',
              description: k.description || '',
            }))
          : [];

        return {
          summary: response.content,
          scenes,
          keyframes,
          createdAt: new Date().toISOString()
        };
      },
      '分析视频',
      { loadingMessage: '正在分析视频...' }
    );
  }

  /**
   * 优化脚本
   */
  async optimizeScript(
    model: AIModel,
    settings: AIModelSettings,
    script: string,
    optimization: 'shorten' | 'lengthen' | 'simplify' | 'professional'
  ): Promise<string> {
    return this.executeRequest(
      async () => {
        const prompt = this.buildOptimizationPrompt(script, optimization);
        const response = await this.callAPI(model, settings, prompt);
        return response.content;
      },
      '优化脚本',
      { loadingMessage: '正在优化脚本...' }
    );
  }

  /**
   * 翻译脚本
   */
  async translateScript(
    model: AIModel,
    settings: AIModelSettings,
    script: string,
    targetLanguage: string
  ): Promise<string> {
    const prompt = `请将以下脚本翻译成${targetLanguage}，保持原有的语气和风格：

${script}

请直接返回翻译后的内容，不要添加解释。`;

    return this.executeRequest(
      async () => {
        const response = await this.callAPI(model, settings, prompt);
        return response.content;
      },
      '翻译脚本',
      { loadingMessage: '正在翻译脚本...' }
    );
  }

  /**
   * 调用 AI API
   */
  private async callAPI(
    model: AIModel,
    settings: AIModelSettings,
    prompt: string
  ): Promise<AIResponse> {
    const provider = isSupportedProvider(model.provider) ? MODEL_PROVIDERS[model.provider] : null;
    
    if (!provider) {
      throw new ServiceError(`不支持的提供商: ${model.provider}`, 'UNSUPPORTED_PROVIDER');
    }

    // 构建请求配置
    const config: RequestConfig = {
      model: settings.model || model.id,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的视频内容创作助手，擅长生成高质量的解说脚本。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: settings.temperature ?? 0.7,
      max_tokens: settings.maxTokens ?? 2000
    };

    const apiKey = settings.apiKey;
    if (!apiKey) {
      throw new ServiceError('缺少 API Key', 'MISSING_API_KEY');
    }

    // 根据提供商调用不同的 API
    switch (model.provider) {
      case 'openai':
        return this.retryRequest(() => this.callOpenAI(apiKey, config));
      case 'anthropic':
        return this.retryRequest(() => this.callAnthropic(apiKey, config));
      case 'google':
        return this.retryRequest(() => this.callGoogle(apiKey, config));
      case 'alibaba':
        return this.retryRequest(() => this.callAlibaba(apiKey, config));
      case 'zhipu':
        return this.retryRequest(() => this.callZhipu(apiKey, config));
      case 'moonshot':
        return this.retryRequest(() => this.callMoonshot(apiKey, config));
      default:
        // 模拟调用
        return this.mockCall(config);
    }
  }

  /**
   * OpenAI API
   */
  private async callOpenAI(apiKey: string, config: RequestConfig): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      throw new ServiceError(
        `OpenAI API 错误: ${response.status}`,
        'API_ERROR',
        response.status
      );
    }

    const data = (await response.json()) as OpenAILikeResponse;
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      usage: data.usage,
      model: data.model ?? config.model
    };
  }

  /**
   * Anthropic API
   */
  private async callAnthropic(apiKey: string, config: RequestConfig): Promise<AIResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        messages: config.messages.map((message) => ({
          role: message.role,
          content: message.content
        })),
        max_tokens: config.max_tokens,
        temperature: config.temperature
      })
    });

    if (!response.ok) {
      throw new ServiceError(
        `Anthropic API 错误: ${response.status}`,
        'API_ERROR',
        response.status
      );
    }

    const data = (await response.json()) as AnthropicResponse;
    return {
      content: data.content?.[0]?.text ?? '',
      usage: data.usage,
      model: data.model ?? config.model
    };
  }

  /**
   * Google Gemini API
   */
  private async callGoogle(apiKey: string, config: RequestConfig): Promise<AIResponse> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: config.messages.map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }]
          })),
          generationConfig: {
            temperature: config.temperature,
            maxOutputTokens: config.max_tokens
          }
        })
      }
    );

    if (!response.ok) {
      throw new ServiceError(
        `Google API 错误: ${response.status}`,
        'API_ERROR',
        response.status
      );
    }

    const data = (await response.json()) as GoogleResponse;
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
      model: config.model
    };
  }

  /**
   * 百度文心 API
   */
  private async callBaidu(apiKey: string, apiSecret: string, config: RequestConfig): Promise<AIResponse> {
    // 获取 access token
    const tokenResponse = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${apiSecret}`,
      { method: 'POST' }
    );
    
    const tokenData = (await tokenResponse.json()) as BaiduTokenResponse;
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new ServiceError('百度 access token 获取失败', 'API_ERROR', tokenResponse.status);
    }

    const response = await fetch(
      `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${config.model}?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: config.messages,
          temperature: config.temperature,
          max_output_tokens: config.max_tokens
        })
      }
    );

    if (!response.ok) {
      throw new ServiceError(
        `百度 API 错误: ${response.status}`,
        'API_ERROR',
        response.status
      );
    }

    const data = (await response.json()) as BaiduChatResponse;
    return {
      content: data.result ?? '',
      model: config.model
    };
  }

  /**
   * 阿里通义千问 API
   */
  private async callAlibaba(apiKey: string, config: RequestConfig): Promise<AIResponse> {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      throw new ServiceError(
        `阿里云 API 错误: ${response.status}`,
        'API_ERROR',
        response.status
      );
    }

    const data = (await response.json()) as OpenAILikeResponse;
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      usage: data.usage,
      model: data.model ?? config.model
    };
  }

  /**
   * 智谱 GLM API
   */
  private async callZhipu(apiKey: string, config: RequestConfig): Promise<AIResponse> {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      throw new ServiceError(
        `智谱 API 错误: ${response.status}`,
        'API_ERROR',
        response.status
      );
    }

    const data = (await response.json()) as OpenAILikeResponse;
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      usage: data.usage,
      model: data.model ?? config.model
    };
  }

  /**
   * Moonshot(Kimi) API - OpenAI 兼容
   */
  private async callMoonshot(apiKey: string, config: RequestConfig): Promise<AIResponse> {
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      throw new ServiceError(
        `Moonshot API 错误: ${response.status}`,
        'API_ERROR',
        response.status
      );
    }

    const data = (await response.json()) as OpenAILikeResponse;
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      usage: data.usage,
      model: data.model ?? config.model
    };
  }

  /**
   * 模拟调用（用于测试）
   */
  private async mockCall(config: RequestConfig): Promise<AIResponse> {
    await this.delay(2000);
    
    return {
      content: `这是一个模拟生成的脚本内容。

【开场】
大家好！今天我们要聊的是一个非常有趣的话题。

【主体内容】
首先，让我们了解一下基本概念。这个话题涉及很多方面，包括：
1. 核心原理
2. 实际应用
3. 注意事项

【总结】
希望通过这个视频，能够帮助大家更好地理解这个话题。如果你有任何问题，欢迎在评论区留言！

感谢观看，我们下期再见！`,
      usage: {
        prompt_tokens: 500,
        completion_tokens: 300,
        total_tokens: 800
      },
      model: config.model
    };
  }

  /**
   * 获取推荐的模型
   */
  getRecommendedModels(task: keyof typeof MODEL_RECOMMENDATIONS): typeof LLM_MODELS[keyof typeof LLM_MODELS][] {
    const modelId = MODEL_RECOMMENDATIONS[task] ?? DEFAULT_LLM_MODEL;
    const model = LLM_MODELS.find(m => m.id === modelId);
    return model ? [model] : [];
  }

  /**
   * 获取模型信息
   */
  getModelInfo(modelId: string): typeof LLM_MODELS[keyof typeof LLM_MODELS] | null {
    return LLM_MODELS.find(m => m.id === modelId) || null;
  }

  /**
   * 获取所有可用模型
   */
  getAllModels(): typeof LLM_MODELS[keyof typeof LLM_MODELS][] {
    return Object.values(LLM_MODELS);
  }

  /**
   * 获取国内推荐模型
   */
  getDomesticModels(): typeof LLM_MODELS[keyof typeof LLM_MODELS][] {
    return Object.values(LLM_MODELS).filter(m =>
      ['alibaba', 'moonshot', 'zhipu', 'deepseek', 'iflytek'].includes(m.provider)
    );
  }

  /**
   * 构建脚本生成提示词
   */
  private buildScriptPrompt(params: {
    topic: string;
    style: string;
    tone: string;
    length: string;
    audience: string;
    language: string;
    keywords?: string[];
    requirements?: string;
    videoDuration?: number;
  }): string {
    const styleMap: Record<string, string> = {
      professional: '专业正式',
      casual: '轻松随意',
      humorous: '幽默风趣',
      emotional: '情感共鸣',
      technical: '技术讲解',
      promotional: '营销推广'
    };

    const lengthMap: Record<string, { time: string; words: string }> = {
      short: { time: '1-3分钟', words: '300-500字' },
      medium: { time: '3-5分钟', words: '500-800字' },
      long: { time: '5-10分钟', words: '800-1500字' }
    };

    const length = lengthMap[params.length] ?? lengthMap.medium;

    return `请为以下主题生成一个视频解说脚本：

主题：${params.topic}
风格：${styleMap[params.style] || params.style}
语气：${params.tone}
长度：${length.time}（约${length.words}）
目标受众：${params.audience}
语言：中文
${params.keywords?.length ? `关键词：${params.keywords.join('、')}` : ''}
${params.requirements ? `特殊要求：${params.requirements}` : ''}
${params.videoDuration ? `视频时长：${Math.round(params.videoDuration / 60)}分钟` : ''}

请生成一个结构完整的脚本，包含：
1. 开场白（吸引观众注意）
2. 主体内容（分段阐述）
3. 结尾（总结和互动）

要求：
- 语言自然流畅，适合口语表达
- 段落清晰，便于分段录制
- 适当使用过渡语句
- 包含互动引导（提问、引导评论等）

请直接返回脚本内容，不需要额外的解释。`;
  }

  /**
   * 构建视频分析提示词
   */
  private buildAnalysisPrompt(videoInfo: {
    duration: number;
    width: number;
    height: number;
    format: string;
  }): string {
    return `请分析以下视频的基本信息：

时长：${Math.round(videoInfo.duration / 60)}分钟
分辨率：${videoInfo.width}x${videoInfo.height}
格式：${videoInfo.format}

请提供：
1. 视频内容摘要（100字以内）
2. 建议的脚本风格
3. 目标受众分析
4. 内容亮点建议

请直接返回分析结果。`;
  }

  /**
   * 构建优化提示词
   */
  private buildOptimizationPrompt(script: string, optimization: string): string {
    const optimizationMap: Record<string, string> = {
      shorten: '缩短内容，保持核心信息',
      lengthen: '扩展内容，增加细节描述',
      simplify: '简化语言，让内容更通俗易懂',
      professional: '提升专业性，增加行业术语'
    };

    return `请对以下脚本进行优化：

优化目标：${optimizationMap[optimization]}

原脚本：
${script}

请直接返回优化后的脚本内容。`;
  }

  /**
   * 解析脚本片段
   */
  private parseScriptSegments(content: string): ScriptSegment[] {
    // 简单的段落分割
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map((p, index) => ({
      id: `seg_${index + 1}`,
      startTime: index * 30,
      endTime: (index + 1) * 30,
      content: p.trim(),
      type: index === 0 ? 'narration' : index === paragraphs.length - 1 ? 'narration' : 'dialogue'
    }));
  }

  /**
   * 估算时长
   */
  private estimateDuration(wordCount: number): number {
    // 按每分钟 150 字计算
    return Math.ceil(wordCount / 150);
  }

  // ⚠️ 以下 mock 方法已废弃，场景和关键帧现由 visionService 实时分析生成
  // (已移除 deprecated 方法，真实实现在 useVideo.ts)

  /**
   * 取消进行中的请求
   */
  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }
}

export const aiService = new AIService();
export default aiService;

// 导出类型
export type { AIResponse, RequestConfig };
