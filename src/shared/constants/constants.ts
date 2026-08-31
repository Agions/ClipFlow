/**
 * 项目核心常量（精简至实际使用的导出）
 */

// 视频格式（仅保留被引用的 VIDEO_EXTENSIONS）
export const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv'];

// 脚本风格/长度（被 style-length-config 和 script-config 使用）
export const SCRIPT_STYLES = ['humorous', 'serious', 'casual', 'professional', 'emotional'];

export const SCRIPT_LENGTHS = [
  { value: 'short', label: '短 (30s-1min)', min: 30, max: 60 },
  { value: 'medium', label: '中 (1-3min)', min: 60, max: 180 },
  { value: 'long', label: '长 (3min+)', min: 180, max: 600 },
];

// 转场/音效/配音选项（被 effect-settings-panel 和 voice-settings-panel 使用）
export const EFFECT_STYLES = ['fade', 'slide', 'zoom', 'cut', 'dissolve'];

export const VOICE_OPTIONS = [
  { value: 'zh-CN-XiaoxiaoNeural', label: 'xiaoxiao' },
  { value: 'zh-CN-YunxiNeural', label: 'yunxi' },
  { value: 'zh-CN-YunyangNeural', label: 'yunyang' },
];

// 持久化键（被 ProjectEdit/ScriptDetail hooks 使用）
export const PROJECT_SAVE_BEHAVIOR_KEY = 'project_save_behavior';
export const PROJECT_AUTO_SAVE_KEY = 'project_autosave_enabled';

// 文件大小限制（被 video-upload 使用）
export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export type ProjectSaveBehavior = 'stay' | 'detail' | 'workspace' | 'script' | 'asset';
