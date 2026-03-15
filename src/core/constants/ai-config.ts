/**
 * AI 服务配置常量
 */

export const AI_CONFIG = {
  // 视觉分析
  VISION: {
    // 场景检测灵敏度
    SCENE_SENSITIVITY: 0.3,
    // 关键帧间隔(秒)
    KEYFRAME_INTERVAL: 5,
    // 最大检测场景数
    MAX_SCENES: 100,
    // 人脸检测阈值
    FACE_THRESHOLD: 0.7,
    // 物体识别阈值
    OBJECT_THRESHOLD: 0.5,
  },
  
  // 智能剪辑
  SMART_CUT: {
    // 场景切换灵敏度
    SCENE_SENSITIVITY: 0.25,
    // 音频峰值阈值
    AUDIO_THRESHOLD: 0.6,
    // 最小片段时长
    MIN_DURATION: 1,
    // 最大片段时长
    MAX_DURATION: 60,
    // 目标集锦时长
    TARGET_DURATION: 30,
  },
  
  // 字幕生成
  SUBTITLE: {
    // 最大字符数/行
    MAX_CHARS_PER_LINE: 50,
    // 最小显示时长(秒)
    MIN_DISPLAY_DURATION: 1,
    // 最大显示时长(秒)
    MAX_DISPLAY_DURATION: 10,
    // 词间间隔(秒)
    WORD_INTERVAL: 0.3,
  },
  
  // 语音合成
  VOICE: {
    // 默认语速
    DEFAULT_SPEED: 1.0,
    // 默认音调
    DEFAULT_PITCH: 1.0,
    // 默认音量
    DEFAULT_VOLUME: 1.0,
    // 支持的语言
    LANGUAGES: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'] as const,
  },
  
  // 自动配乐
  MUSIC: {
    // 最小音乐时长(秒)
    MIN_DURATION: 10,
    // 最大音乐时长(秒)
    MAX_DURATION: 300,
    // 音量阈值
    VOLUME_THRESHOLD: 0.3,
    // 淡入淡出时长(秒)
    FADE_DURATION: 2,
  },
  
  // AI 脚本
  SCRIPT: {
    // 最大生成长度
    MAX_TOKENS: 2000,
    // 温度参数
    TEMPERATURE: 0.7,
    // 最多片段数
    MAX_SEGMENTS: 50,
  },
} as const;

/**
 * AI 服务提供商
 */
export const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini'],
    vision: true,
    tts: true,
    stt: true,
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-5-sonnet', 'claude-3-haiku'],
    vision: true,
    tts: false,
    stt: false,
  },
  minimax: {
    name: 'Minimax',
    models: ['abab6.5s-chat', 'abab6.5g-chat'],
    vision: true,
    tts: true,
    stt: true,
  },
} as const;

/**
 * 工作流模式配置
 */
export const WORKFLOW_MODES = {
  commentary: {
    name: 'AI 解说',
    description: '自动生成解说词并配音',
    steps: ['analysis', 'script', 'audio', 'subtitle', 'music', 'timeline', 'render'],
  },
  mixclip: {
    name: '智能混剪',
    description: '自动识别精彩片段并剪辑',
    steps: ['analysis', 'smart-cut', 'subtitle', 'music', 'timeline', 'render'],
  },
  'first-person': {
    name: '第一人称',
    description: '第一人称视角视频剪辑',
    steps: ['analysis', 'script', 'audio', 'subtitle', 'timeline', 'render'],
  },
} as const;
