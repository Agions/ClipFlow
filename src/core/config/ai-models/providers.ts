/**
 * AI 模型提供者元数据 + 验证信息
 *
 * 【优化思路】从 aiModels.config.ts (1069行) 中提取提供者配置和模型验证数据，
 * 便于独立维护各厂商信息，减少单文件体积。
 *
 * 来源：各大厂商官方文档 + OpenRouter 实时数据（2026-05）
 */

import type { ModelProvider } from '@/types';

// =============================================================================
// 提供者元数据
// =============================================================================

interface ModelProviderMeta {
  name: string;
  icon: string;
  website: string;
  apiDocs: string;
  keyFormat: string;
  keyPlaceholder: string;
}

export const MODEL_PROVIDERS: Record<ModelProvider, ModelProviderMeta> = {
  openai: {
    name: 'OpenAI',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
    website: 'https://platform.openai.com',
    apiDocs: 'https://platform.openai.com/docs/models',
    keyFormat: 'sk-...',
    keyPlaceholder: 'sk-xxx...xxxx',
  },
  anthropic: {
    name: 'Anthropic',
    icon: 'https://www.anthropic.com/images/icons/apple-touch-icon.png',
    website: 'https://www.anthropic.com',
    apiDocs: 'https://docs.anthropic.com/en/docs/about-claude/models',
    keyFormat: 'sk-ant-...',
    keyPlaceholder: 'sk-ant...xxxx',
  },
  google: {
    name: 'Google',
    icon: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
    website: 'https://ai.google.dev',
    apiDocs: 'https://ai.google.dev/gemini-api/docs/models',
    keyFormat: 'AIza...',
    keyPlaceholder: 'AIzaSyxxxxxxxxxxxxxxxx',
  },
  alibaba: {
    name: '阿里云',
    icon: 'https://img.alicdn.com/tfs/TB1Ly5oS3HqK1RjSZFPXXcwapXa-238-54.png',
    website: 'https://dashscope.aliyun.com',
    apiDocs: 'https://help.aliyun.com/zh/model-studio/getting-started/models',
    keyFormat: 'sk-...',
    keyPlaceholder: 'sk-xxx...xxxx',
  },
  zhipu: {
    name: '智谱AI',
    icon: 'https://www.zhipuai.cn/favicon.ico',
    website: 'https://open.bigmodel.cn',
    apiDocs: 'https://open.bigmodel.cn',
    keyFormat: '...',
    keyPlaceholder: 'xxxxxxxx.xxxxxxxx',
  },
  iflytek: {
    name: '科大讯飞',
    icon: 'https://xinghuo.xfyun.cn/favicon.ico',
    website: 'https://xinghuo.xfyun.cn',
    apiDocs: 'https://www.xfyun.cn/doc/spark/Web.html',
    keyFormat: 'APPID:API_KEY:API_SECRET',
    keyPlaceholder: '请输入 APPID、API_KEY 和 API_SECRET',
  },
  deepseek: {
    name: 'DeepSeek',
    icon: 'https://www.deepseek.com/favicon.ico',
    website: 'https://platform.deepseek.com',
    apiDocs: 'https://platform.deepseek.com/docs/guides/chat',
    keyFormat: 'sk-...',
    keyPlaceholder: 'sk-xxx...xxxx',
  },
  moonshot: {
    name: '月之暗面',
    icon: 'https://kimi.moonshot.cn/favicon.ico',
    website: 'https://platform.moonshot.cn',
    apiDocs: 'https://platform.moonshot.cn/docs',
    keyFormat: 'sk-...',
    keyPlaceholder: 'sk-xxx...xxxx',
  },
  local: {
    name: '本地模型',
    icon: 'https://localhost/favicon.ico',
    website: 'https://github.com',
    apiDocs: 'https://github.com',
    keyFormat: 'Local Endpoint',
    keyPlaceholder: 'http://localhost:11434',
  },
  custom: {
    name: '自定义',
    icon: 'https://localhost/favicon.ico',
    website: 'https://github.com',
    apiDocs: 'https://github.com',
    keyFormat: 'API Key',
    keyPlaceholder: 'Your Custom API Key',
  },
};

// =============================================================================
// 模型验证元数据（来源：各大厂商官方文档 + OpenRouter 实时数据，2026-05）
// =============================================================================

interface ModelVerificationMeta {
  checkedAt: string;
  source: string;
  verified: boolean;
  note?: string;
}

export const MODEL_CATALOG_VERIFIED_AT = '2026-08-21';
export const DEFAULT_MODEL_ID = 'qwen3.8-max' as const;

export const MODEL_VERIFICATION: Record<string, ModelVerificationMeta> = {
  // OpenAI
  'gpt-5.5':      { checkedAt: '2026-05-03', source: 'openrouter/openai/gpt-5.5 (API confirmed)', verified: true },
  'gpt-5.5-pro':  { checkedAt: '2026-05-03', source: 'openrouter/openai/gpt-5.5-pro (API confirmed)', verified: true },
  'gpt-5.4':       { checkedAt: '2026-05-03', source: 'openrouter/openai/gpt-5.4 (API confirmed)', verified: true },
  'gpt-5.4-mini': { checkedAt: '2026-05-03', source: 'openrouter/openai/gpt-5.4-mini (API confirmed)', verified: true },
  'gpt-5.4-nano': { checkedAt: '2026-05-03', source: 'openrouter/openai/gpt-5.4-nano (API confirmed)', verified: true },
  'gpt-5.4-pro':  { checkedAt: '2026-05-03', source: 'openrouter/openai/gpt-5.4-pro (API confirmed)', verified: true },
  'gpt-5.3-codex':{ checkedAt: '2026-05-03', source: 'openrouter/openai/gpt-5.3-codex (API confirmed)', verified: true },
  'gpt-5.2':       { checkedAt: '2026-05-03', source: 'openrouter/openai/gpt-5.2 (API confirmed)', verified: true },
  'gpt-5.1':       { checkedAt: '2026-05-03', source: 'openrouter/openai/gpt-5.1 (API confirmed)', verified: true },
  'gpt-5':         { checkedAt: '2026-05-03', source: 'openrouter/openai/gpt-5 (API confirmed)', verified: true },
  'gpt-5-mini':   { checkedAt: '2026-05-03', source: 'openrouter/openai/gpt-5-mini (API confirmed)', verified: true },
  'gpt-5-nano':   { checkedAt: '2026-05-03', source: 'openrouter/openai/gpt-5-nano (API confirmed)', verified: true },
  'gpt-5-pro':    { checkedAt: '2026-05-03', source: 'openrouter/openai/gpt-5-pro (API confirmed)', verified: true },
  'o3':            { checkedAt: '2026-05-03', source: 'platform.openai.com/docs/models', verified: true },
  'o3-mini':      { checkedAt: '2026-05-03', source: 'platform.openai.com/docs/models', verified: true },
  'o3-pro':       { checkedAt: '2026-05-03', source: 'openrouter/openai/o3-pro (API confirmed)', verified: true },
  'gpt-4o':       { checkedAt: '2026-05-03', source: 'platform.openai.com/docs/models', verified: true },
  'gpt-4o-mini':  { checkedAt: '2026-05-03', source: 'platform.openai.com/docs/models', verified: true },
  'gpt-4.1':       { checkedAt: '2026-05-03', source: 'platform.openai.com/docs/models', verified: true },
  // Anthropic
  'claude-sonnet-4.6': { checkedAt: '2026-05-03', source: 'openrouter/anthropic/claude-sonnet-4.6 (API confirmed)', verified: true },
  'claude-sonnet-4.5': { checkedAt: '2026-05-03', source: 'openrouter/anthropic/claude-sonnet-4.5 (API confirmed)', verified: true },
  'claude-sonnet-4':   { checkedAt: '2026-05-03', source: 'openrouter/anthropic/claude-sonnet-4 (API confirmed)', verified: true },
  'claude-opus-4.7':   { checkedAt: '2026-05-03', source: 'openrouter/anthropic/claude-opus-4.7 (API confirmed)', verified: true },
  'claude-opus-4.6':   { checkedAt: '2026-05-03', source: 'openrouter/anthropic/claude-opus-4.6 (API confirmed)', verified: true },
  'claude-opus-4.5':   { checkedAt: '2026-05-03', source: 'openrouter/anthropic/claude-opus-4.5 (API confirmed)', verified: true },
  'claude-opus-4.1':   { checkedAt: '2026-05-03', source: 'openrouter/anthropic/claude-opus-4.1 (API confirmed)', verified: true },
  'claude-opus-4':     { checkedAt: '2026-05-03', source: 'openrouter/anthropic/claude-opus-4 (API confirmed)', verified: true },
  'claude-haiku-4.5':  { checkedAt: '2026-05-03', source: 'openrouter/anthropic/claude-haiku-4.5 (API confirmed)', verified: true },
  'claude-3.5-sonnet': { checkedAt: '2026-05-03', source: 'docs.anthropic.com', verified: true },
  'claude-3.5-sonnet-20241022': { checkedAt: '2026-05-03', source: 'docs.anthropic.com', verified: true },
  'claude-3-opus':     { checkedAt: '2026-05-03', source: 'docs.anthropic.com', verified: true },
  'claude-3.7-sonnet': { checkedAt: '2026-05-03', source: 'openrouter/anthropic/claude-3.7-sonnet (API confirmed)', verified: true },
  // Google
  'gemini-3.1-pro-preview':{ checkedAt: '2026-05-13', source: 'ai.google.dev/gemini-api/docs/models', verified: true },
  'gemini-3.1-flash-lite': { checkedAt: '2026-05-13', source: 'ai.google.dev/gemini-api/docs/models', verified: true },
  'gemini-3-flash-preview':{ checkedAt: '2026-05-03', source: 'ai.google.dev/gemini-api/docs/models', verified: true },
  'gemini-2.5-pro':        { checkedAt: '2026-05-03', source: 'ai.google.dev/gemini-api/docs/models', verified: true },
  'gemini-2.5-flash':      { checkedAt: '2026-05-03', source: 'ai.google.dev/gemini-api/docs/models', verified: true },
  'gemini-2.5-flash-lite': { checkedAt: '2026-05-03', source: 'ai.google.dev/gemini-api/docs/models', verified: true },
  'gemini-2.0-flash':      { checkedAt: '2026-05-03', source: 'ai.google.dev/gemini-api/docs/models', verified: true },
  'gemini-2.0-flash-lite': { checkedAt: '2026-05-03', source: 'ai.google.dev/gemini-api/docs/models', verified: true },
  // DeepSeek
  'deepseek-v4-pro':       { checkedAt: '2026-05-03', source: 'platform.deepseek.com 官方定价页', verified: true },
  'deepseek-v4-flash':     { checkedAt: '2026-05-03', source: 'platform.deepseek.com 官方定价页', verified: true },
  'deepseek-r1':           { checkedAt: '2026-05-03', source: 'platform.deepseek.com', verified: true },
  'deepseek-r1-0528':      { checkedAt: '2026-05-03', source: 'platform.deepseek.com', verified: true },
  'deepseek-chat-v3-0324': { checkedAt: '2026-05-03', source: 'platform.deepseek.com', verified: true },
  // Qwen / 阿里云
  'qwen3.6-max-preview':  { checkedAt: '2026-05-03', source: 'openrouter/qwen/qwen3.6-max-preview (API confirmed)', verified: true },
  'qwen3.6-plus':          { checkedAt: '2026-05-03', source: 'openrouter/qwen/qwen3.6-plus (API confirmed)', verified: true },
  'qwen3.6-flash':         { checkedAt: '2026-05-03', source: 'openrouter/qwen/qwen3.6-flash (API confirmed)', verified: true },
  'qwen3.6-27b':           { checkedAt: '2026-05-03', source: 'openrouter/qwen/qwen3.6-27b (API confirmed)', verified: true },
  'qwen3.6-35b-a3b':       { checkedAt: '2026-05-03', source: 'openrouter/qwen/qwen3.6-35b-a3b (API confirmed)', verified: true },
  // Moonshot / Kimi
  'kimi-k2.6':        { checkedAt: '2026-05-03', source: 'openrouter/moonshotai/kimi-k2.6 (API confirmed)', verified: true },
  'kimi-k2.5':        { checkedAt: '2026-05-03', source: 'openrouter/moonshotai/kimi-k2.5 (API confirmed)', verified: true },
  'kimi-k2':          { checkedAt: '2026-05-03', source: 'openrouter/moonshotai/kimi-k2 (API confirmed)', verified: true },
  'kimi-k2-thinking': { checkedAt: '2026-05-03', source: 'openrouter/moonshotai/kimi-k2-thinking (API confirmed)', verified: true },
  'kimi-k2-0905':     { checkedAt: '2026-05-03', source: 'openrouter/moonshotai/kimi-k2-0905 (API confirmed)', verified: true },
  // GLM / 智谱
  'glm-5':       { checkedAt: '2026-05-03', source: 'openrouter/z-ai/glm-5 (API confirmed)', verified: true },
  'glm-5-turbo': { checkedAt: '2026-05-03', source: 'openrouter/z-ai/glm-5-turbo (API confirmed)', verified: true },
  'glm-5.1':     { checkedAt: '2026-05-03', source: 'openrouter/z-ai/glm-5.1 (API confirmed)', verified: true },
  'glm-4.7':     { checkedAt: '2026-05-03', source: 'openrouter/z-ai/glm-4.7 (API confirmed)', verified: true },
  'glm-4.7-flash':{ checkedAt: '2026-05-03', source: 'openrouter/z-ai/glm-4.7-flash (API confirmed)', verified: true },
  'glm-4.6':     { checkedAt: '2026-05-03', source: 'openrouter/z-ai/glm-4.6 (API confirmed)', verified: true },
  'glm-4.5':     { checkedAt: '2026-05-03', source: 'openrouter/z-ai/glm-4.5 (API confirmed)', verified: true },
  'glm-4':       { checkedAt: '2026-05-03', source: 'open.bigmodel.cn', verified: true },
  // 讯飞
  'spark-4.0': { checkedAt: '2026-05-03', source: 'xfyun.cn/doc/spark/Web.html', verified: true },
  'spark-3.5': { checkedAt: '2026-05-03', source: 'xfyun.cn/doc/spark/Web.html', verified: true },
};
