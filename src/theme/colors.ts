/**
 * CutDeck 统一色彩系统 - TypeScript
 * 
 * 基于 design-system.css OKLCH 语义化分层
 * 提供 Ant Design 5 兼容的 Design Token
 * 
 * 使用方式：
 *   import { colors, antdTokens } from '@/theme/colors';
 *   // 或在 ConfigProvider 中使用 antdTokens
 */

import type { ThemeConfig } from 'antd';

// =============================================
// 🎨 色彩 Token（OKLCH 语义化分层）
// =============================================

export const colors = {
  // --- 主色：琥珀色（电影胶片感）---
  primary: 'oklch(65% 0.18 70)',
  primaryHover: 'oklch(72% 0.18 70)',
  primaryActive: 'oklch(58% 0.18 70)',
  
  // --- 功能色 ---
  success: 'oklch(65% 0.20 145)',
  successBg: 'oklch(65% 0.20 145 / 0.12)',
  warning: 'oklch(75% 0.16 85)',
  warningBg: 'oklch(75% 0.16 85 / 0.12)',
  error: 'oklch(60% 0.22 25)',
  errorBg: 'oklch(60% 0.22 25 / 0.12)',
  info: 'oklch(70% 0.14 200)',
  
  // --- 科技霓虹色（Dashboard/VideoEditor 特色）---
  neonBlue: '#00d2ff',
  neonPurple: '#a855f7',
  neonPink: '#ec4899',
  neonGreen: '#10b981',
  neonOrange: '#f97316',
  accentCyan: '#06b6d4',
  accentPink: '#f43f5e',
  accentBlue: '#3b82f6',
  
  // --- 文字色（暗黑背景）---
  textPrimary: 'oklch(95% 0.01 70)',
  textSecondary: 'oklch(70% 0.02 70)',
  textTertiary: 'oklch(55% 0.02 70)',
  textDisabled: 'oklch(45% 0.01 70)',
  textInverse: 'oklch(15% 0.02 70)',
  
  // --- 背景色（科技暗黑层级）---
  bgBase: 'oklch(10% 0.02 70)',
  bgPrimary: 'oklch(8% 0.02 70)',
  bgSecondary: 'oklch(14% 0.02 70)',
  bgTertiary: 'oklch(18% 0.02 70)',
  bgElevated: 'oklch(22% 0.02 70)',
  bgHover: 'oklch(26% 0.02 70)',
  bgOverlay: 'oklch(5% 0.02 70 / 0.85)',
  
  // --- 边框 ---
  borderDefault: 'oklch(25% 0.02 70)',
  borderSecondary: 'oklch(30% 0.02 70)',
  borderActive: 'oklch(40% 0.02 70)',
  borderFocus: 'oklch(65% 0.18 70)',
  
  // --- 渐变 ---
  gradientPrimary: 'linear-gradient(135deg, oklch(65% 0.18 70) 0%, oklch(55% 0.22 280) 100%)',
  gradientHero: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #a855f7 100%)',
  gradientCyber: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
  gradientNeonPink: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
  gradientSurface: 'linear-gradient(180deg, oklch(18% 0.02 70) 0%, oklch(14% 0.02 70) 100%)',
  
  // --- 发光效果 ---
  glowPrimary: '0 0 20px oklch(65% 0.18 70 / 0.45)',
  glowCyan: '0 0 20px oklch(70% 0.14 200 / 0.4)',
  glowPink: '0 0 20px oklch(65% 0.22 25 / 0.4)',
  glowPurple: '0 0 20px oklch(60% 0.22 280 / 0.4)',
  glowNeonBlue: '0 0 10px rgba(0, 210, 255, 0.3), 0 0 20px rgba(0, 210, 255, 0.2)',
  glowNeonPurple: '0 0 10px rgba(168, 85, 247, 0.3), 0 0 20px rgba(168, 85, 247, 0.2)',
  glowNeonPink: '0 0 10px rgba(236, 72, 153, 0.3), 0 0 20px rgba(236, 72, 153, 0.2)',
  
  // --- 玻璃拟态 ---
  glassBg: 'oklch(14% 0.02 70 / 0.8)',
  glassBorder: 'oklch(100% 0 0 / 0.1)',
  glassBlur: 'blur(10px)',
} as const;

// =============================================
// Ant Design 5 Design Token
// =============================================

export const antdTokens: ThemeConfig['token'] = {
  // 色彩
  colorPrimary: '#d4a574',           // 琥珀色 (film-amber) - 主要品牌色
  colorSuccess: '#10b981',          // neon-green
  colorWarning: '#f97316',           // neon-orange  
  colorError: '#f43f5e',            // accent-pink
  colorInfo: '#3b82f6',             // accent-blue
  
  // 文字
  colorText: 'oklch(70% 0.02 70)',
  colorTextSecondary: 'oklch(55% 0.02 70)',
  colorTextTertiary: 'oklch(45% 0.01 70)',
  colorTextQuaternary: 'oklch(35% 0.01 70)',
  
  // 背景
  colorBgBase: 'oklch(10% 0.02 70)',
  colorBgContainer: 'oklch(14% 0.02 70)',
  colorBgElevated: 'oklch(22% 0.02 70)',
  colorBgLayout: 'oklch(8% 0.02 70)',
  colorBgSpotlight: 'oklch(26% 0.02 70)',
  
  // 边框
  colorBorder: 'oklch(25% 0.02 70)',
  colorBorderSecondary: 'oklch(20% 0.02 70)',
  
  // 圆角
  borderRadius: 8,
  borderRadiusLG: 12,
  borderRadiusSM: 4,
  
  // 字体
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Noto Sans SC', Roboto, sans-serif",
  fontFamilyCode: "'JetBrains Mono', 'Fira Code', monospace",
  fontSize: 14,
  
  // 间距
  padding: 16,
  paddingLG: 24,
  paddingSM: 12,
  paddingXS: 8,
  
  // 阴影
  boxShadow: `
    0 1px 2px oklch(0% 0 0 / 0.3),
    0 2px 4px oklch(0% 0 0 / 0.2)
  `,
  boxShadowSecondary: `
    0 4px 8px oklch(0% 0 0 / 0.4),
    0 2px 6px oklch(0% 0 0 / 0.3)
  `,
};

// =============================================
// 组件级别 Token（Component Token）
// =============================================

export const antdComponentTokens: ThemeConfig['components'] = {
  Button: {
    primaryColor: '#0a0a0f',
    borderRadius: 8,
  },
  Card: {
    colorBgContainer: 'oklch(14% 0.02 70)',
    borderRadiusLG: 12,
  },
  Input: {
    colorBgContainer: 'oklch(18% 0.02 70)',
    borderRadiusSM: 8,
  },
  Select: {
    colorBgContainer: 'oklch(18% 0.02 70)',
    borderRadiusSM: 8,
  },
  Modal: {
    colorBgElevated: 'oklch(22% 0.02 70)',
    borderRadiusLG: 16,
  },
  Slider: {
    trackBg: '#d4a574',
    trackHoverBg: '#e8c9a8',
    handleColor: '#d4a574',
    handleActiveColor: '#e8c9a8',
    railBg: 'oklch(25% 0.02 70)',
    railHoverBg: 'oklch(30% 0.02 70)',
  },
};

// =============================================
// Dashboard 专用 Token（映射到统一色彩）
// =============================================

export const dashboardTokens = {
  // Dashboard 主背景
  bgBase: '#0C0D14',
  bgSurface: '#141520',
  bgElevated: '#1C1D2E',
  bgOverlay: '#24263A',
  
  // 边框
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderDefault: 'rgba(255, 255, 255, 0.10)',
  borderStrong: 'rgba(255, 255, 255, 0.18)',
  
  // 琥珀色（与 design-system primary 对应）
  accent: '#FF9F43',
  accentLight: '#FFBE76',
  accentDark: '#E8891C',
  accentGlow: 'rgba(255, 159, 67, 0.25)',
  accentGlowStrong: 'rgba(255, 159, 67, 0.40)',
  
  // 电青色
  cyan: '#00D4FF',
  cyanLight: '#66E3FF',
  cyanDark: '#00A8CC',
  cyanGlow: 'rgba(0, 212, 255, 0.20)',
  
  // 文字
  textPrimary: '#F0F0F5',
  textSecondary: '#8888A0',
  textTertiary: '#55556A',
  
  // 状态
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  
  // 圆角
  radiusSm: '4px',
  radiusMd: '8px',
  radiusLg: '12px',
  radiusXl: '16px',
  radius2xl: '24px',
  radiusFull: '9999px',
};

// =============================================
// VideoEditor 专用 Token（映射到统一色彩）
// =============================================

export const videoEditorTokens = {
  // 胶片琥珀
  filmAmber: '#d4a574',
  filmAmberLight: '#e8c9a8',
  filmAmberGlow: 'rgba(212, 165, 116, 0.35)',
  
  // 墨黑
  inkBlack: '#0d0d0f',
  inkDeep: '#141418',
  inkCharcoal: '#1c1c22',
  inkSurface: '#242430',
  
  // 背景
  bgVoid: '#08080a',
  bgPrimary: '#0d0d0f',
  bgElevated: '#141418',
  bgSurface: '#1c1c22',
  bgCard: 'rgba(28, 28, 34, 0.7)',
  
  // 边框
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderDefault: 'rgba(255, 255, 255, 0.10)',
  
  // 文字
  textPrimary: '#f8f8f2',
  textSecondary: '#a8a8b3',
  textMuted: '#6b6b7a',
  textDim: '#45455a',
  
  // 圆角
  radiusMd: '8px',
  radiusSm: '4px',
  radiusLg: '12px',
  radiusXl: '16px',
};

// =============================================
// 工具函数
// =============================================

/**
 * 将 OKLCH 颜色转换为 HEX（用于某些需要 hex 的场景）
 * 注意：这是近似转换，OKLCH 到 RGB/HEX 不是无损的
 */
export function oklchToHex(oklch: string): string {
  // 如果已经是 hex 则直接返回
  if (oklch.startsWith('#')) return oklch;
  
  // 这里可以添加 OKLCH -> RGB -> HEX 的转换逻辑
  // 目前 design-system.css 中有些颜色仍是 hex，可以逐步迁移
  return oklch;
}

/**
 * 获取 CSS 变量引用
 */
export function getCssVar(name: string): string {
  return `var(--${name})`;
}

// 重新导出 design-system.css 中的主 CSS 变量名（供 TypeScript 使用）
export const cssVarNames = {
  colorPrimary: '--color-primary',
  colorSuccess: '--color-success',
  colorWarning: '--color-warning',
  colorError: '--color-error',
  colorBgBase: '--color-bg-base',
  colorBgSecondary: '--color-bg-secondary',
  colorBgElevated: '--color-bg-elevated',
  colorTextPrimary: '--color-text-primary',
  colorBorderDefault: '--color-border-default',
  glowPrimary: '--glow-primary',
  glassBg: '--glass-bg',
} as const;
