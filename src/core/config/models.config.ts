/**
 * AI 模型配置中心
 * 说明：
 * - 优先使用官方文档可核验的“稳定模型 ID / alias”
 * - 避免使用未发布或无法核验的版本号
 * - 统一在此维护推荐策略，业务层禁止硬编码模型名
 */

import type { AIModel, ModelProvider, ModelCategory } from '../types';

export interface ModelVerificationMeta {
  checkedAt: string;
  source: string;
  verified: boolean;
  note?: string;
}

export const MODEL_PROVIDERS: Record<
  ModelProvider,
  {
    name: string;
    icon: string;
    website: string;
    apiDocs: string;
    keyFormat: string;
    keyPlaceholder: string;
  }
> = {
  openai: {
    name: 'OpenAI',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
    website: 'https://platform.openai.com',
    apiDocs: 'https://platform.openai.com/docs/models',
    keyFormat: 'sk-...',
    keyPlaceholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxx',
  },
  anthropic: {
    name: 'Anthropic',
    icon: 'https://www.anthropic.com/images/icons/apple-touch-icon.png',
    website: 'https://www.anthropic.com',
    apiDocs: 'https://docs.anthropic.com/en/docs/about-claude/models/all-models',
    keyFormat: 'sk-ant-...',
    keyPlaceholder: 'sk-ant-xxxxxxxxxxxxxxxx',
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
    keyPlaceholder: 'sk-xxxxxxxxxxxxxxxx',
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
    apiDocs: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing',
    keyFormat: 'sk-...',
    keyPlaceholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxx',
  },
  moonshot: {
    name: '月之暗面',
    icon: 'https://kimi.moonshot.cn/favicon.ico',
    website: 'https://platform.moonshot.cn',
    apiDocs: 'https://platform.moonshot.cn/docs',
    keyFormat: 'sk-...',
    keyPlaceholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxx',
  },
  azure: {
    name: 'Azure OpenAI',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Microsoft-Azure.svg',
    website: 'https://azure.microsoft.com/services/cognitive-services/openai',
    apiDocs: 'https://learn.microsoft.com/azure/cognitive-services/openai',
    keyFormat: 'Azure API Key',
    keyPlaceholder: 'Your Azure API Key',
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

const CORE_MODEL_VERIFICATION: ModelVerificationMeta = {
  checkedAt: '2026-03-06',
  source: 'official-api-docs',
  verified: true,
};

export const MODEL_CATALOG_VERIFIED_AT = CORE_MODEL_VERIFICATION.checkedAt;
export const DEFAULT_MODEL_ID = 'gpt-5.5' as const;

export const MODEL_VERIFICATION: Record<string, ModelVerificationMeta> = {
  'gpt-5.5': { checkedAt: '2026-04-25', source: 'openai.com/index/gpt-5-5-system-card', verified: true },
  'gpt-5.3-codex': { checkedAt: '2026-04-25', source: 'developers.openai.com/api/docs/guides/latest-model', verified: true },
  o3: { checkedAt: '2026-04-25', source: 'openai.com/index/introducing-o3-and-o4-mini', verified: true },
  'o4-mini': { checkedAt: '2026-04-25', source: 'openai.com/index/introducing-o3-and-o4-mini', verified: true },
  'claude-sonnet-4-6': { checkedAt: '2026-04-25', source: 'anthropic.com/system-cards', verified: true },
  'claude-opus-4-7': { checkedAt: '2026-04-25', source: 'anthropic.com/system-cards', verified: true },
  'gemini-3.1-pro': { checkedAt: '2026-04-25', source: 'ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview', verified: true },
  'qwen-max-latest': { checkedAt: '2026-04-25', source: 'alibabacloud.com/help/zh/model-studio/models', verified: true },
  'qwen3-max': { checkedAt: '2026-04-25', source: 'portkey.ai/models/dashscope/qwen3-max', verified: true },
  'deepseek-v4-flash': { checkedAt: '2026-04-25', source: 'platform.deepseek.com, api-docs.deepseek.com', verified: true },
  'deepseek-v4-pro': { checkedAt: '2026-04-25', source: 'platform.deepseek.com, api-docs.deepseek.com', verified: true },
  'glm-5': { checkedAt: '2026-04-25', source: 'docs.bigmodel.cn/cn/guide/models/text/glm-5', verified: true },
  'kimi-k2.6': { checkedAt: '2026-04-25', source: 'platform.kimi.com/docs/pricing/chat-k26', verified: true },
  'spark-custom': {
    checkedAt: '2026-04-25',
    source: 'provider-portal-manual-check-required',
    verified: false,
    note: '讯飞星火型号变动频繁，建议在设置里配置。',
  },
};

export const AI_MODELS: AIModel[] = [
  {
    id: 'gpt-5.5',
    name: 'GPT-5.5',
    provider: 'openai',
    category: ['text', 'code', 'image', 'video'],
    description: 'OpenAI 最新旗舰模型（2026-04-23），编程、研究、数据分析全面提升。',
    features: ['最高智能', '编程能力', '深度研究'],
    tokenLimit: 16384,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'o3',
    name: 'OpenAI o3',
    provider: 'openai',
    category: ['text', 'code', 'image'],
    description: '高推理模型，适合镜头匹配、时间轴修正等复杂推断。',
    features: ['高级推理', '复杂规划', '可靠判别'],
    tokenLimit: 8192,
    contextWindow: 200000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'o4-mini',
    name: 'OpenAI o4-mini',
    provider: 'openai',
    category: ['text', 'code', 'image'],
    description: '轻量高速推理模型，适合批量分析与低时延任务，成本更低。',
    features: ['高速', '低成本', '多模态'],
    tokenLimit: 8192,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'gpt-5.3-codex',
    name: 'GPT-5.3 Codex',
    provider: 'openai',
    category: ['text', 'code'],
    description: 'OpenAI 编程专用模型，专为 Codex 等编码环境设计。',
    features: ['编程专用', '代码生成', '代码审查'],
    tokenLimit: 8192,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    category: ['text', 'code', 'image'],
    description: '长文本组织能力强，适合脚本长稿与风格润色。',
    features: ['长文处理', '稳定风格', '逻辑清晰'],
    tokenLimit: 8192,
    contextWindow: 200000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'claude-opus-4-7',
    name: 'Claude Opus 4.7',
    provider: 'anthropic',
    category: ['text', 'code', 'image'],
    description: 'Anthropic 最新旗舰模型，最高智能水平，适合复杂视频语义分析与长文本处理。',
    features: ['最高智能', '复杂推理', '视频理解'],
    tokenLimit: 8192,
    contextWindow: 200000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'google',
    category: ['text', 'code', 'image', 'video'],
    description: 'Google 最新旗舰（2026-02），Gemini 3.1 Pro 系列，改进思维与 token 效率。API ID: gemini-3.1-pro。',
    features: ['多模态推理', '视频理解', '长上下文'],
    tokenLimit: 8192,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    category: ['text', 'image', 'video'],
    description: 'Google 轻量高速模型，适合批量分析与低时延任务，多模态能力强。',
    features: ['高速', '低成本', '多模态'],
    tokenLimit: 8192,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'qwen3-max',
    name: 'Qwen3-Max',
    provider: 'alibaba',
    category: ['text', 'code', 'image', 'video'],
    description: '阿里云最新旗舰模型，中文能力突出，适合中文解说和电商/资讯素材。',
    features: ['中文优化', '多模态', '成本可控'],
    tokenLimit: 8192,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek-V4-Flash',
    provider: 'deepseek',
    category: ['text', 'code', 'image'],
    description: 'DeepSeek 最新非思考模式（已替代 deepseek-chat），通用文本生成与改写，适合混剪旁白批量生成。',
    features: ['高性价比', '中文可用', '重写能力'],
    tokenLimit: 8192,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 1, output: 2, unit: '元/百万tokens' },
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek-V4-Pro',
    provider: 'deepseek',
    category: ['text', 'code'],
    description: 'DeepSeek 最新思考模式（已替代 deepseek-reasoner），推理型，适合镜头到文案的对齐评分。',
    features: ['推理', '判别', '重排序'],
    tokenLimit: 8192,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 12, output: 24, unit: '元/百万tokens' },
  },
  {
    id: 'glm-5',
    name: 'GLM-5',
    provider: 'zhipu',
    category: ['text', 'code', 'image'],
    description: '智谱最新旗舰模型（2026-02-11），面向 Agentic Engineering，复杂系统工程与长程 Agent 任务。',
    features: ['中文优化', '推理', 'Agentic'],
    tokenLimit: 8192,
    contextWindow: 200000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'kimi-k2.6',
    name: 'Kimi K2.6',
    provider: 'moonshot',
    category: ['text', 'code', 'image', 'video'],
    description: '月之暗面最新旗舰（2026-04-20），原生多模态，强大编程能力，Agent 性能出色。API ID 待确认。',
    features: ['原生多模态', '编程能力强', '多Agent任务'],
    tokenLimit: 8192,
    contextWindow: 256000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'spark-custom',
    name: 'Spark (自定义型号)',
    provider: 'iflytek',
    category: ['text', 'audio'],
    description: '请在模型设置中输入星火控制台可用型号。',
    features: ['可配置', '语音生态'],
    tokenLimit: 4096,
    contextWindow: 32000,
    isPro: false,
    isAvailable: false,
    pricing: { input: 0, output: 0, unit: 'manual confirm required' },
  },
];

export const MODEL_RECOMMENDATIONS: Record<string, string[]> = {
  script: ['gpt-5.5', 'claude-sonnet-4-6', 'qwen3-max', 'deepseek-v4-flash'],
  analysis: ['gpt-5.5', 'gemini-3.1-pro', 'o3', 'qwen3-max'],
  code: ['o3', 'claude-opus-4-7', 'deepseek-v4-pro'],
  fast: ['qwen3-max', 'o4-mini'],
};

export const getModelById = (id: string): AIModel | undefined => {
  return AI_MODELS.find((model) => model.id === id);
};

export const getModelsByProvider = (provider: ModelProvider): AIModel[] => {
  return AI_MODELS.filter((model) => model.provider === provider);
};

export const getModelsByCategory = (category: ModelCategory): AIModel[] => {
  return AI_MODELS.filter((model) => (model.category ?? ['general']).includes(category));
};

export const getRecommendedModels = (task: keyof typeof MODEL_RECOMMENDATIONS): AIModel[] => {
  const modelIds = MODEL_RECOMMENDATIONS[task] || [];
  return modelIds.map((id) => getModelById(id)).filter(Boolean) as AIModel[];
};
