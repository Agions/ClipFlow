/**
 * AI 模型配置
 * 职责：统一管理各 AI 模型的 API 配置
 *
 * 重构说明：
 * - 从原 scriptService.ts (548行) 中提取配置
 * - 集中管理所有 AI 模型的 URL、headers、请求/响应转换
 */

import { AppError } from '@/core/errors';

// ============================================
// 类型定义
// ============================================

export type AIModelType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'qianwen'
  | 'spark'
  | 'chatglm'
  | 'deepseek'
  | 'moonshot';

export interface ModelConfig {
  url: string;
  model: string;
  headers: (apiKey: string) => Record<string, string>;
  transformRequest: (prompt: string, options?: Record<string, unknown>) => unknown;
  transformResponse: (data: unknown) => string;
}

// ============================================
// AI 模型配置
// ============================================

export const AI_MODEL_CONFIGS: Record<AIModelType, ModelConfig> = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    transformRequest: (prompt) => ({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
    transformResponse: (data) =>
      (data as { choices: Array<{ message: { content: string } }> }).choices[0].message.content,
  },

  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-sonnet-latest',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    transformRequest: (prompt) => ({
      model: 'claude-3-5-sonnet-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
    transformResponse: (data) =>
      (data as { content?: Array<{ type?: string; text?: string }> }).content?.find(
        (item) => item.type === 'text'
      )?.text || '',
  },

  google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent',
    model: 'gemini-3.1-pro',
    headers: () => ({ 'Content-Type': 'application/json' }),
    transformRequest: (prompt) => ({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
    }),
    transformResponse: (data) =>
      (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
        .candidates?.[0]?.content?.parts?.[0]?.text || '',
  },

  qianwen: {
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen2.5-max',
    headers: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    transformRequest: (prompt) => ({
      model: 'qwen2.5-max',
      messages: [{ role: 'user', content: prompt }],
    }),
    transformResponse: (data) =>
      (data as { choices: Array<{ message: { content: string } }> }).choices[0].message.content,
  },

  spark: {
    url: 'https://spark-api.xf-yun.com/v3.5/chat',
    model: 'generalv3.5',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    transformRequest: (prompt, options) => ({
      header: { app_id: options?.appId || '', uid: 'Fablr_user' },
      parameter: { chat: { domain: 'generalv3.5', temperature: 0.7, max_tokens: 4096 } },
      payload: { message: { text: [{ role: 'user', content: prompt }] } },
    }),
    transformResponse: (data) => {
      const typed = data as {
        header?: { code?: number; message?: string };
        payload?: { choices?: Array<{ text: string }> };
      };
      if (typed.header?.code !== 0) {
        throw new AppError('APP_AI_XUNFEI_ERROR', `讯飞星火API错误: ${typed.header?.message || '未知错误'}`, {
          statusCode: typed.header?.code,
          userMessage: `讯飞星火 API 错误: ${typed.header?.message || '未知错误'}`,
        });
      }
      return typed.payload?.choices?.[0]?.text || '';
    },
  },

  chatglm: {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    transformRequest: (prompt) => ({
      model: 'glm-4-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    }),
    transformResponse: (data) =>
      (data as { choices: Array<{ message: { content: string } }> }).choices[0].message.content,
  },

  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-v4-flash',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    transformRequest: (prompt) => ({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
    transformResponse: (data) =>
      (data as { choices: Array<{ message: { content: string } }> }).choices[0].message.content,
  },

  moonshot: {
    url: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    transformRequest: (prompt) => ({
      model: 'moonshot-v1-8k',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
    transformResponse: (data) =>
      (data as { choices: Array<{ message: { content: string } }> }).choices[0].message.content,
  },
};

// ============================================
// 风格和语气配置
// ============================================

export const STYLE_GUIDANCE_MAP: Record<string, string> = {
  informative: '请生成一个客观、教育性、详细的信息型解说脚本',
  entertaining: '请生成一个活泼、风趣、吸引人的娱乐型解说脚本',
  dramatic: '请生成一个情感丰富、紧张、引人入胜的戏剧型解说脚本',
  casual: '请生成一个轻松、对话式、自然的随意型解说脚本',
};

export const TONE_GUIDANCE_MAP: Record<string, string> = {
  neutral: '使用中立、专业的语气',
  enthusiastic: '使用热情、充满活力的语气',
  serious: '使用严肃、庄重的语气',
  humorous: '使用幽默、诙谐的语气',
  inspirational: '使用励志、鼓舞人心的语气',
};
