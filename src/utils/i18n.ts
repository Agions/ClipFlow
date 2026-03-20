import { useCallback } from 'react';

export type Language = 'zh';

interface Translations {
  [key: string]: string;
}

const translations: Translations = {
  'app.name': 'ClipFlow',
  'app.save': '保存',
  'app.cancel': '取消',
  'app.confirm': '确认',
  'app.delete': '删除',
  'app.edit': '编辑',
  'app.add': '添加',
  'theme.mode': '主题模式',
  'theme.light': '亮色',
  'theme.dark': '暗色',
  'theme.auto': '自动',
  'theme.toggle': '切换亮/暗色主题',
  'settings.title': '设置',
  'settings.subtitle': '自定义您的应用程序设置和AI模型配置',
  'settings.save': '保存设置',
  'settings.saved': '设置已保存',
  'settings.saveSuccess': '您的设置已成功保存并应用',
  'settings.models': 'AI模型',
  'settings.general': '通用设置',
  'settings.about': '关于',
  'settings.privacy': '隐私',
  'settings.models.title': 'AI模型',
  'settings.models.message': '选择您偏好的AI模型',
  'settings.models.description': '请选择您想要使用的AI模型，并配置相应的API密钥。不同模型有不同的功能和价格。',
  'settings.models.available': '可用模型',
  'settings.models.selectPreferred': '选择您喜欢的AI模型作为默认选项',
  'settings.models.canChange': '您可以随时更改默认模型，或为特定任务选择不同的模型。某些模型可能需要额外的API密钥配置。',
  'settings.api.title': 'API密钥',
  'settings.api.message': '配置AI服务提供商API密钥',
  'settings.api.description': '为了使用各种AI模型，您需要配置相应服务提供商的API密钥。这些密钥仅存储在您的本地设备，不会传输到其他位置。',
  'settings.api.keyConfig': 'API密钥配置',
  'settings.api.domesticServices': '国内AI服务',
  'settings.api.howToGet': '如何获取API密钥',
  'settings.api.missing': 'API密钥缺失',
  'settings.api.enterFirst': '请输入API密钥后再进行测试',
  'settings.api.valid': 'API密钥有效',
  'settings.api.invalid': 'API密钥无效',
  'settings.api.validationError': '验证API密钥时发生错误，请稍后再试',
  'settings.api.test': '测试',
  'settings.general.title': '通用设置',
  'settings.general.autoSave': '自动保存',
  'settings.general.autoSaveDesc': '自动保存您的编辑，避免意外丢失数据',
  'settings.general.lineNumbers': '显示行号',
  'settings.general.lineNumbersDesc': '在编辑器中显示行号，方便代码导航和引用',
  'settings.general.autoUpdate': '自动更新',
  'settings.general.autoUpdateDesc': '启用自动更新，确保您始终使用最新版本',
  'settings.general.performance': '性能与导出',
  'settings.general.highQuality': '高质量导出',
  'settings.general.highQualityDesc': '导出更高质量的视频和图像，可能需要更多处理时间',
  'settings.general.transcode': '启用转码',
  'settings.general.transcodeDesc': '自动转码上传的视频，以适应不同的播放设备（需更多系统资源）',
  'settings.general.language': '界面语言',
  'settings.general.languageDesc': '选择应用界面的显示语言',
};

export function useTranslation() {
  const language: Language = 'zh';

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = translations[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
      });
    }
    return text;
  }, []);

  const changeLanguage = useCallback((_newLang2: Language) => {
    window.localStorage.setItem('app_language', 'zh');
  }, []);

  const formatDate = useCallback((date: Date | string | number): string => {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dateObj);
  }, []);

  const formatNumber = useCallback((num: number): string => {
    return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(num);
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${formatNumber(size)} ${units[i]}`;
  }, [formatNumber]);

  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    if (minutes > 0) return `${minutes}分${secs}秒`;
    return `${secs}秒`;
  }, []);

  return { t, language, changeLanguage, formatDate, formatNumber, formatFileSize, formatDuration };
}

export default useTranslation;
