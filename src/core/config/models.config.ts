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
export const DEFAULT_MODEL_ID = 'gpt-4o' as const;

export const MODEL_VERIFICATION: Record<string, ModelVerificationMeta> = {
  [DEFAULT_MODEL_ID]: CORE_MODEL_VERIFICATION,
  o3: CORE_MODEL_VERIFICATION,
  'claude-sonnet-4-6': CORE_MODEL_VERIFICATION,
  'gemini-3.1-pro-preview': CORE_MODEL_VERIFICATION,
  'gemini-3.1-flash-lite-preview': CORE_MODEL_VERIFICATION,
  'qwen-max-latest': CORE_MODEL_VERIFICATION,
  'deepseek-v4-flash': { checkedAt: '2026-04-25', source: 'api-docs.deepseek.com', verified: true, note: 'deepseek-chat 已废弃，替换为 deepseek-v4-flash（非思考模式）' },
  'deepseek-v4-pro': { checkedAt: '2026-04-25', source: 'api-docs.deepseek.com', verified: true, note: 'deepseek-reasoner 已废弃，替换为 deepseek-v4-pro（思考模式）' },
  'glm-5': {
    checkedAt: '2026-03-06',
    source: 'provider-portal',
    verified: true,
    note: '按当前产品要求固定使用 GLM-5。',
  },
  'kimi-k2-0905-preview': {
    checkedAt: '2026-03-06',
    source: 'moonshot-official',
    verified: true,
    note: 'Kimi K2.5 主力模型。',
  },
  'kimi-k2-turbo-preview': {
    checkedAt: '2026-03-06',
    source: 'moonshot-official',
    verified: true,
    note: 'Kimi K2.5 Turbo，偏速度/成本。',
  },
  'spark-custom': {
    checkedAt: '2026-03-05',
    source: 'provider-portal-manual-check-required',
    verified: false,
    note: '讯飞星火型号变动频繁，建议在设置里配置。',
  },
};

export const AI_MODELS: AIModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    category: ['text', 'code', 'image', 'video'],
    description: 'OpenAI 旗舰多模态模型，适合复杂镜头语义和解说对齐。',
    features: ['多模态理解', '高级推理', '视频语义分析'],
    tokenLimit: 16384,
    contextWindow: 128000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'o3',
    name: 'o3',
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
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    provider: 'google',
    category: ['text', 'code', 'image', 'video'],
    description: 'Google 最新代际高性能模型，适合复杂视频语义分析与镜头-文案对齐。',
    features: ['多模态推理', '视频理解', '长上下文'],
    tokenLimit: 8192,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite Preview',
    provider: 'google',
    category: ['text', 'image', 'video'],
    description: 'Google 轻量高速模型，适合批量分析与低时延任务。',
    features: ['高速', '低成本', '多模态'],
    tokenLimit: 8192,
    contextWindow: 1000000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'qwen-max-latest',
    name: 'Qwen-Max-Latest',
    provider: 'alibaba',
    category: ['text', 'code', 'image', 'video'],
    description: '中文场景表现稳定，适合中文解说和电商/资讯素材。',
    features: ['中文优化', '多模态', '成本可控'],
    tokenLimit: 8192,
    contextWindow: 128000,
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
    description: '智谱 GLM-5，适合中文脚本生成与多轮对话。',
    features: ['中文优化', '推理', '多场景适配'],
    tokenLimit: 8192,
    contextWindow: 128000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'kimi-k2-0905-preview',
    name: 'Kimi K2.5',
    provider: 'moonshot',
    category: ['text', 'code', 'image', 'video'],
    description: '月之暗面 Kimi K2.5，适合自主多步骤任务与复杂脚本。',
    features: ['多Agent任务', '长上下文', '多模态理解'],
    tokenLimit: 8192,
    contextWindow: 256000,
    isPro: true,
    pricing: { input: 0, output: 0, unit: 'provider pricing page' },
  },
  {
    id: 'kimi-k2-turbo-preview',
    name: 'Kimi K2.5 Turbo',
    provider: 'moonshot',
    category: ['text', 'code', 'image'],
    description: 'Kimi K2.5 Turbo，面向高吞吐低时延场景。',
    features: ['高吞吐', '低时延', '成本优化'],
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
  script: ['gpt-4o', 'claude-sonnet-4-6', 'qwen-max-latest', 'deepseek-v4-flash'],
  analysis: ['gpt-4o', 'gemini-1.5-pro', 'o3'],
  code: ['o3', 'claude-sonnet-4-6', 'deepseek-reasoner'],
  fast: ['qwen-max-latest', 'deepseek-v4-flash'],
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
