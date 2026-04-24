/**
 * 优化配置
 * 代码瘦身、成本压缩、质量提升
 */

// 成本优化配置
export const COST_OPTIMIZATION = {
  // LLM 模型分级策略
  llm: {
    // 简单任务 (< 100 tokens 输入)
    simple: {
      primary: 'deepseek-v4-flash',
      fallback: 'qwen3-max',
      maxTokens: 500,
      temperature: 0.3,
    },
    // 标准任务 (100-1000 tokens)
    standard: {
      primary: 'qwen3-max',
      fallback: 'deepseek-v4-flash',
      maxTokens: 2000,
      temperature: 0.5,
    },
    // 复杂任务 (> 1000 tokens)
    complex: {
      primary: 'gpt-5.5',
      fallback: 'o3',
      maxTokens: 4000,
      temperature: 0.7,
    },
    // 创意任务
    creative: {
      primary: 'claude-sonnet-4-6',
      fallback: 'gpt-5.5',
      maxTokens: 3000,
      temperature: 0.8,
    },
  },

  // 缓存配置
  cache: {
    // 提示词缓存
    prompt: {
      enabled: true,
      ttl: 24 * 60 * 60 * 1000, // 24小时
      maxSize: 1000,
    },
    // 响应缓存
    response: {
      enabled: true,
      ttl: 7 * 24 * 60 * 60 * 1000, // 7天
      maxSize: 500,
    },
    // 视频缓存
    video: {
      enabled: true,
      ttl: 30 * 24 * 60 * 60 * 1000, // 30天
      maxSize: 100,
    },
  },

  // 批处理配置
  batch: {
    enabled: true,
    maxSize: 10,
    maxWait: 100, // ms
    retryCount: 3,
    retryDelay: 1000, // ms
  },
};

// 代码优化配置
export const CODE_OPTIMIZATION = {
  // 组件优化
  components: {
    // 懒加载阈值
    lazyThreshold: 50, // KB
    // 预加载距离
    preloadDistance: 2, // 路由距离
    // 虚拟列表阈值
    virtualListThreshold: 50, // 项目数
  },

  // 图片优化
  images: {
    // 懒加载偏移
    lazyOffset: 200, // px
    // 占位符颜色
    placeholderColor: '#f0f0f0',
    // 质量等级
    quality: {
      low: 60,
      medium: 75,
      high: 85,
    },
  },

  // 代码分割
  codeSplitting: {
    // 路由级分割
    routes: true,
    // 组件级分割
    components: true,
    // 库级分割
    vendors: ['antd', 'lodash-es'],
  },
};

// 质量优化配置
export const QUALITY_OPTIMIZATION = {
  // 提示词增强
  promptEnhancement: {
    enabled: true,
    // 自动添加上下文
    addContext: true,
    // 自动优化长度
    optimizeLength: true,
    // 自动添加约束
    addConstraints: true,
    // 最大长度限制
    maxLength: 2000,
  },

  // 多模型投票
  ensemble: {
    enabled: false, // 默认关闭（成本高）
    models: ['gpt-5.5', 'claude-opus-4-7', 'qwen3-max'],
    // 投票策略
    strategy: 'quality', // 'quality' | 'speed' | 'cost'
    // 超时时间
    timeout: 30000,
  },

  // 后处理
  postProcessing: {
    enabled: true,
    // 自动增强
    autoEnhance: true,
    // 降噪
    denoise: true,
    // 稳定化
    stabilize: false, // 性能开销大
    // 调色
    colorGrade: true,
  },
};

// 性能优化配置
export const PERFORMANCE_OPTIMIZATION = {
  // 并发控制
  concurrency: {
    // 最大并发请求
    maxRequests: 5,
    // 最大并发生成
    maxGenerations: 2,
    // 队列超时
    queueTimeout: 60000,
  },

  // 防抖节流
  debounce: {
    // 输入防抖
    input: 300,
    // 搜索防抖
    search: 500,
    // 调整节流
    resize: 200,
  },

  // 预加载
  prefetch: {
    // 路由预加载
    routes: true,
    // 数据预加载
    data: true,
    // 资源预加载
    assets: ['fonts', 'icons'],
  },
};

// 视频生成优化
export const VIDEO_OPTIMIZATION = {
  // 智能参数选择
  smartParams: {
    enabled: true,
    // 根据内容类型选择参数
    presets: {
      tutorial: {
        resolution: '1080p',
        fps: 30,
        quality: 'medium',
        estimatedCost: 1.0,
      },
      promotional: {
        resolution: '2k',
        fps: 30,
        quality: 'high',
        estimatedCost: 2.5,
      },
      cinematic: {
        resolution: '4k',
        fps: 24,
        quality: 'ultra',
        estimatedCost: 5.0,
      },
      social: {
        resolution: '1080p',
        fps: 30,
        quality: 'low',
        estimatedCost: 0.5,
      },
    },
  },

  // 本地生成优先
  localFirst: {
    enabled: true,
    // 本地模型
    localModels: ['sdxl', 'animatediff'],
    // 云端备用
    cloudFallback: true,
    // 切换阈值
    switchThreshold: {
      queueLength: 5,
      waitTime: 30000,
    },
  },
};

// 导出统一配置
export const OPTIMIZATION_CONFIG = {
  cost: COST_OPTIMIZATION,
  code: CODE_OPTIMIZATION,
  quality: QUALITY_OPTIMIZATION,
  performance: PERFORMANCE_OPTIMIZATION,
  video: VIDEO_OPTIMIZATION,
};

export default OPTIMIZATION_CONFIG;
