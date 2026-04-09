/**
 * VideoProcessingController Constants
 * Shared constants for the VideoProcessingController module
 */

export type QualityValue = 'low' | 'medium' | 'high' | 'ultra' | 'custom';
export type FormatValue = 'mp4' | 'webm' | 'mov' | 'mkv';
export type TransitionValue = 'none' | 'fade' | 'dissolve' | 'wipe' | 'wiperight' | 'wipeleft' | 'wipeup' | 'wipedown';
export type AudioProcessValue = 'none' | 'normalize' | 'denoise' | 'enhance';

export const QUALITY_OPTIONS: Array<{ value: QualityValue; label: string; description?: string }> = [
  { value: 'low', label: '低', description: '720p' },
  { value: 'medium', label: '中', description: '1080p' },
  { value: 'high', label: '高', description: '1080p+' },
  { value: 'ultra', label: '超清', description: '4K' },
  { value: 'custom', label: '自定义' },
];

export const FORMAT_OPTIONS: Array<{ value: FormatValue; label: string; description?: string }> = [
  { value: 'mp4', label: 'MP4', description: '通用格式' },
  { value: 'webm', label: 'WebM', description: 'Web优化' },
  { value: 'mov', label: 'MOV', description: 'Apple格式' },
  { value: 'mkv', label: 'MKV', description: '多音轨支持' },
];

export const TRANSITION_OPTIONS: Array<{ value: TransitionValue; label: string }> = [
  { value: 'none', label: '无转场' },
  { value: 'fade', label: '淡入淡出' },
  { value: 'dissolve', label: '交叉溶解' },
  { value: 'wipe', label: '擦除效果' },
  { value: 'wiperight', label: '右擦除' },
  { value: 'wipeleft', label: '左擦除' },
  { value: 'wipeup', label: '上擦除' },
  { value: 'wipedown', label: '下擦除' },
];

export const AUDIO_PROCESS_OPTIONS: Array<{ value: AudioProcessValue; label: string }> = [
  { value: 'none', label: '无处理' },
  { value: 'normalize', label: '音量标准化' },
  { value: 'denoise', label: '降噪' },
  { value: 'enhance', label: '音质增强' },
];

export const DEFAULT_CUSTOM_SETTINGS = {
  resolution: '1080p',
  bitrate: 8000000,
  framerate: 30,
  useHardwareAcceleration: true,
};
