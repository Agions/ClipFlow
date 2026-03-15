/**
 * 视频配置常量
 */

export const VIDEO_CONFIG = {
  // 默认帧率
  DEFAULT_FRAME_RATE: 30,
  
  // 支持的帧率
  FRAME_RATES: [24, 25, 30, 60] as const,
  
  // 分辨率定义
  RESOLUTIONS: {
    '480p': { width: 854, height: 480 },
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '1440p': { width: 2560, height: 1440 },
    '4k': { width: 3840, height: 2160 },
  } as const,
  
  // 宽高比
  ASPECT_RATIOS: {
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '1:1': 1,
    '4:3': 4 / 3,
    '21:9': 21 / 9,
  } as const,
  
  // 最小/最大片段时长(秒)
  MIN_SEGMENT_DURATION: 0.5,
  MAX_SEGMENT_DURATION: 600,
  
  // 默认比特率
  DEFAULT_VIDEO_BITRATE: '5M',
  DEFAULT_AUDIO_BITRATE: '128k',
  
  // 采样率
  SAMPLE_RATES: [44100, 48000] as const,
  
  // 音频通道
  AUDIO_CHANNELS: {
    mono: 1,
    stereo: 2,
    surround: 6,
  } as const,
} as const;

/**
 * 导出格式配置
 */
export const EXPORT_FORMATS = {
  mp4: {
    ext: '.mp4',
    mime: 'video/mp4',
    codec: 'h264',
    defaultQuality: 'high',
  },
  webm: {
    ext: '.webm',
    mime: 'video/webm',
    codec: 'vp9',
    defaultQuality: 'medium',
  },
  mov: {
    ext: '.mov',
    mime: 'video/quicktime',
    codec: 'h264',
    defaultQuality: 'high',
  },
  mkv: {
    ext: '.mkv',
    mime: 'video/x-matroska',
    codec: 'h265',
    defaultQuality: 'high',
  },
} as const;

/**
 * 导出质量预设
 */
export const QUALITY_PRESETS = {
  low: {
    resolution: '480p',
    videoBitrate: '1M',
    audioBitrate: '64k',
    crf: 28,
  },
  medium: {
    resolution: '720p',
    videoBitrate: '2.5M',
    audioBitrate: '128k',
    crf: 23,
  },
  high: {
    resolution: '1080p',
    videoBitrate: '5M',
    audioBitrate: '192k',
    crf: 20,
  },
  ultra: {
    resolution: '4k',
    videoBitrate: '15M',
    audioBitrate: '320k',
    crf: 18,
  },
} as const;

/**
 * 编码器预设
 */
export const ENCODER_PRESETS = {
  ultrafast: {
    speed: 10,
    quality: 50,
  },
  fast: {
    speed: 8,
    quality: 60,
  },
  medium: {
    speed: 5,
    quality: 70,
  },
  slow: {
    speed: 3,
    quality: 85,
  },
  veryslow: {
    speed: 1,
    quality: 100,
  },
} as const;
