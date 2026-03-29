/**
 * AI 模型常量定义
 * 更新至 2026 年 3 月最新模型名称
 */

export const CORE_AI_MODELS = [
  // ─── OpenAI ───────────────────────────────────────────────
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'OpenAI 最新旗舰多模态模型，支持文本和视觉理解',
    contextWindow: 128000,
    inputCost: 2.5,      // $ / 1M tokens
    outputCost: 10.0,
    supportsVision: true,
    supportsFunctionCalling: true,
    maxOutputTokens: 16384,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'openai',
    description: '轻量级高速模型，性价比高',
    contextWindow: 128000,
    inputCost: 0.15,
    outputCost: 0.6,
    supportsVision: true,
    supportsFunctionCalling: true,
    maxOutputTokens: 16384,
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'GPT-4 高速版，支持视觉和函数调用',
    contextWindow: 128000,
    inputCost: 10.0,
    outputCost: 30.0,
    supportsVision: true,
    supportsFunctionCalling: true,
    maxOutputTokens: 4096,
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    provider: 'openai',
    description: 'OpenAI 最新推理模型，专注复杂推理任务',
    contextWindow: 128000,
    inputCost: 0.55,
    outputCost: 4.4,
    supportsVision: false,
    supportsFunctionCalling: false,
    maxOutputTokens: 65536,
  },

  // ─── Anthropic ──────────────────────────────────────────────
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude 4 Sonnet',
    provider: 'anthropic',
    description: 'Anthropic 中高端模型，速度与能力平衡',
    contextWindow: 200000,
    inputCost: 3.0,
    outputCost: 15.0,
    supportsVision: true,
    supportsFunctionCalling: false,
    maxOutputTokens: 8192,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Anthropic 旗舰级模型，长上下文处理能力强',
    contextWindow: 200000,
    inputCost: 3.0,
    outputCost: 15.0,
    supportsVision: true,
    supportsFunctionCalling: false,
    maxOutputTokens: 8192,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Anthropic 轻量快速模型',
    contextWindow: 200000,
    inputCost: 0.8,
    outputCost: 4.0,
    supportsVision: true,
    supportsFunctionCalling: false,
    maxOutputTokens: 8192,
  },

  // ─── Google Gemini ─────────────────────────────────────────
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Google 最新高速模型，多模态能力强',
    contextWindow: 1048576,
    inputCost: 0.0,     // currently free within quota
    outputCost: 0.0,
    supportsVision: true,
    supportsFunctionCalling: true,
    maxOutputTokens: 8192,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    description: 'Google 长上下文旗舰模型，1M token 上下文',
    contextWindow: 2097152,
    inputCost: 0.0,     // free tier
    outputCost: 0.0,
    supportsVision: true,
    supportsFunctionCalling: true,
    maxOutputTokens: 8192,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    description: 'Google 轻量快速模型',
    contextWindow: 1048576,
    inputCost: 0.0,
    outputCost: 0.0,
    supportsVision: true,
    supportsFunctionCalling: true,
    maxOutputTokens: 8192,
  },

  // ─── DeepSeek ──────────────────────────────────────────────
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    description: 'DeepSeek 开源对话模型，中文能力强',
    contextWindow: 64000,
    inputCost: 0.07,
    outputCost: 0.27,
    supportsVision: false,
    supportsFunctionCalling: true,
    maxOutputTokens: 8192,
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    description: 'DeepSeek 最新推理模型，复杂推理任务优秀',
    contextWindow: 64000,
    inputCost: 0.55,
    outputCost: 2.19,
    supportsVision: false,
    supportsFunctionCalling: false,
    maxOutputTokens: 8192,
  },

  // ─── 通义千问 (Alibaba Qwen) ────────────────────────────────
  {
    id: 'qwen-plus',
    name: '通义千问 Plus',
    provider: 'dashscope',
    description: '阿里 Qwen 高端模型，中文理解能力突出',
    contextWindow: 131072,
    inputCost: 0.6,
    outputCost: 2.0,
    supportsVision: true,
    supportsFunctionCalling: true,
    maxOutputTokens: 8192,
  },
  {
    id: 'qwen-turbo',
    name: '通义千问 Turbo',
    provider: 'dashscope',
    description: '阿里 Qwen 高速模型',
    contextWindow: 131072,
    inputCost: 0.3,
    outputCost: 0.6,
    supportsVision: true,
    supportsFunctionCalling: true,
    maxOutputTokens: 8192,
  },
  {
    id: 'qwen-long',
    name: '通义千问 Long',
    provider: 'dashscope',
    description: '阿里 Qwen 长文本模型，支持超长上下文',
    contextWindow: 1048576,
    inputCost: 0.5,
    outputCost: 1.0,
    supportsVision: false,
    supportsFunctionCalling: true,
    maxOutputTokens: 8192,
  },

  // ─── 智谱 GLM (Zhipu) ─────────────────────────────────────
  {
    id: 'glm-4',
    name: 'GLM-4',
    provider: 'zhipuai',
    description: '智谱 AI 旗舰模型，中文能力突出',
    contextWindow: 128000,
    inputCost: 1.0,
    outputCost: 1.0,
    supportsVision: true,
    supportsFunctionCalling: true,
    maxOutputTokens: 4096,
  },
  {
    id: 'glm-4v',
    name: 'GLM-4V',
    provider: 'zhipuai',
    description: '智谱 AI 视觉理解模型',
    contextWindow: 128000,
    inputCost: 1.0,
    outputCost: 1.0,
    supportsVision: true,
    supportsFunctionCalling: false,
    maxOutputTokens: 4096,
  },
  {
    id: 'glm-4-alloy',
    name: 'GLM-4 Alloy',
    provider: 'zhipuai',
    description: '智谱 AI 高速对话模型',
    contextWindow: 128000,
    inputCost: 0.55,
    outputCost: 0.55,
    supportsVision: false,
    supportsFunctionCalling: true,
    maxOutputTokens: 4096,
  },

  // ─── Kimi (Moonshot AI) ───────────────────────────────────
  {
    id: 'moonshot-v1-128k',
    name: 'Kimi 128K',
    provider: 'moonshot',
    description: 'Moonshot AI 超长上下文模型，128K 上下文',
    contextWindow: 131072,
    inputCost: 1.5,
    outputCost: 1.5,
    supportsVision: false,
    supportsFunctionCalling: true,
    maxOutputTokens: 8192,
  },
  {
    id: 'moonshot-v1-32k',
    name: 'Kimi 32K',
    provider: 'moonshot',
    description: 'Moonshot AI 标准上下文模型',
    contextWindow: 32768,
    inputCost: 0.6,
    outputCost: 0.6,
    supportsVision: false,
    supportsFunctionCalling: true,
    maxOutputTokens: 8192,
  },
  {
    id: 'moonshot-v1-8k',
    name: 'Kimi 8K',
    provider: 'moonshot',
    description: 'Moonshot AI 快速对话模型',
    contextWindow: 8192,
    inputCost: 0.2,
    outputCost: 0.2,
    supportsVision: false,
    supportsFunctionCalling: true,
    maxOutputTokens: 4096,
  },
];

/** 推荐的默认模型 */
export const DEFAULT_MODEL_ID = 'gpt-4o';

/** 模型推荐配置 */
export const MODEL_RECOMMENDATIONS = {
  video_analysis: 'gpt-4o',
  subtitle_generation: 'claude-3-5-sonnet-20241022',
  script_generation: 'gpt-4o',
  speech_synthesis: 'openai',
  general: 'gpt-4o',
  code_generation: 'claude-3-5-sonnet-20241022',
  long_video: 'gemini-1.5-pro',
  chinese_content: 'qwen-plus',
  low_cost: 'gpt-4o-mini',
};

/** 获取模型配置 */
export function getModelConfig(modelId: string) {
  return CORE_AI_MODELS.find(m => m.id === modelId);
}

/** 获取模型提供商 */
export function getModelProvider(modelId: string) {
  const model = getModelConfig(modelId);
  return model?.provider;
}

// ============================================================================
// 兼容性别名（供旧代码使用）
// ============================================================================

/** 兼容性别名 */
export const LLM_MODELS = CORE_AI_MODELS;

/** 兼容性别名 */
export const DEFAULT_LLM_MODEL = DEFAULT_MODEL_ID;
