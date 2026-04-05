/**
 * CutDeck Design System v2
 * AI Cinema Studio — 智能剪辑工具视觉语言
 *
 * 设计理念：深炭底 + 琥珀光 + 电青色点缀
 * 质感：专业电影工作台，不是工具箱
 */

// ============================================================================
// 颜色系统
// ============================================================================

export const colors = {
  // 深炭底 — 沉浸式工作台
  bg: {
    base: '#0C0D14',      // 最深背景
    primary: '#0C0D14',   // 主背景
    surface: '#141520',   // 卡片/面板
    elevated: '#1C1D2E',  // 悬浮/高亮
    overlay: '#24263A',    // 模态/弹出
  },

  // 边框
  border: {
    subtle: '#1E2030',    // 极淡边框
    default: '#2A2D42',   // 默认边框
    strong: '#3D4166',    // 强调边框
  },

  // 主强调色 — 琥珀光（行动点/CTA）
  accent: {
    DEFAULT: '#FF9F43',
    light: '#FFBE76',
    dark: '#E8891C',
    glow: 'rgba(255, 159, 67, 0.25)',
    glowStrong: 'rgba(255, 159, 67, 0.4)',
  },

  // 次强调色 — 电青色（AI状态/信息）
  cyan: {
    DEFAULT: '#00D4FF',
    light: '#66E3FF',
    dark: '#00A8CC',
    glow: 'rgba(0, 212, 255, 0.2)',
    glowStrong: 'rgba(0, 212, 255, 0.35)',
  },

  // 功能色
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  // 文字色
  text: {
    primary: '#F0F0F5',    // 标题/重要文字
    secondary: '#8888A0',  // 描述文字
    tertiary: '#55556A',   // 辅助/占位
    disabled: '#3D4166',
    inverse: '#0C0D14',
  },

  // 纯白（用于深色元素）
  white: '#FFFFFF',
};

// ============================================================================
// 字体系统
// ============================================================================

export const typography = {
  fontFamily: {
    // Display — 标题/数字/大文字
    display: '"Outfit", system-ui, -apple-system, sans-serif',
    // Body — 正文/按钮/标签
    body: '"Figtree", system-ui, -apple-system, sans-serif',
    // Mono — 时间码/代码/数据
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },

  fontSize: {
    '2xs': '10px',
    xs: '11px',
    sm: '12px',
    base: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '22px',
    '3xl': '26px',
    '4xl': '32px',
    '5xl': '40px',
    '6xl': '52px',
  },

  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
  },
};

// ============================================================================
// 间距系统
// ============================================================================

export const spacing = {
  0: 0,
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
};

// ============================================================================
// 圆角系统
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
};

// ============================================================================
// 阴影系统
// ============================================================================

export const shadows = {
  // 层级阴影
  sm: '0 2px 8px rgba(0, 0, 0, 0.4)',
  md: '0 4px 16px rgba(0, 0, 0, 0.5)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.6)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.7)',

  // 发光效果
  glow: {
    accent: '0 0 24px rgba(255, 159, 67, 0.3), 0 0 48px rgba(255, 159, 67, 0.1)',
    cyan: '0 0 24px rgba(0, 212, 255, 0.3), 0 0 48px rgba(0, 212, 255, 0.1)',
    card: '0 0 0 1px rgba(255, 255, 255, 0.05)',
  },

  // 内阴影
  inner: {
    subtle: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
    glow: 'inset 0 0 20px rgba(0, 0, 0, 0.4)',
  },
};

// ============================================================================
// 动画系统
// ============================================================================

export const transitions = {
  duration: {
    instant: '50ms',
    fast: '120ms',
    DEFAULT: '200ms',
    slow: '350ms',
    slower: '500ms',
  },

  easing: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    smooth: 'cubic-bezier(0.23, 1, 0.32, 1)',
  },
};

// 关键帧动画
export const keyframes = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  fadeInUp: {
    from: { opacity: 0, transform: 'translateY(12px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  fadeInScale: {
    from: { opacity: 0, transform: 'scale(0.96)' },
    to: { opacity: 1, transform: 'scale(1)' },
  },
  slideInLeft: {
    from: { opacity: 0, transform: 'translateX(-16px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
  },
  slideInRight: {
    from: { opacity: 0, transform: 'translateX(16px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
  },
  // AI 神经脉冲
  neuralPulse: {
    '0%': { opacity: 0.3, transform: 'scale(0.98)' },
    '50%': { opacity: 1, transform: 'scale(1)' },
    '100%': { opacity: 0.3, transform: 'scale(0.98)' },
  },
  // 光点闪烁
  sparkPulse: {
    '0%, 100%': { opacity: 0.4, transform: 'scale(0.8)' },
    '50%': { opacity: 1, transform: 'scale(1.2)' },
  },
  // 渐变流动
  gradientShift: {
    '0%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
    '100%': { backgroundPosition: '0% 50%' },
  },
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
};

// ============================================================================
// Z-Index
// ============================================================================

export const zIndex = {
  hide: -1,
  base: 0,
  raised: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  toast: 600,
  tooltip: 700,
};

// ============================================================================
// 默认主题
// ============================================================================

const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  keyframes,
  zIndex,
};

export default theme;

// CSS 变量（用于 HTML）
export const cssVariables = {
  // 背景
  '--bg-base': colors.bg.base,
  '--bg-surface': colors.bg.surface,
  '--bg-elevated': colors.bg.elevated,
  '--bg-overlay': colors.bg.overlay,

  // 边框
  '--border-subtle': colors.border.subtle,
  '--border-default': colors.border.default,
  '--border-strong': colors.border.strong,

  // 强调色
  '--accent': colors.accent.DEFAULT,
  '--accent-light': colors.accent.light,
  '--accent-dark': colors.accent.dark,
  '--accent-glow': colors.accent.glow,

  '--cyan': colors.cyan.DEFAULT,
  '--cyan-light': colors.cyan.light,
  '--cyan-dark': colors.cyan.dark,
  '--cyan-glow': colors.cyan.glow,

  // 文字
  '--text-primary': colors.text.primary,
  '--text-secondary': colors.text.secondary,
  '--text-tertiary': colors.text.tertiary,

  // 功能色
  '--success': colors.success,
  '--warning': colors.warning,
  '--error': colors.error,
  '--info': colors.info,

  // 字体
  '--font-display': typography.fontFamily.display,
  '--font-body': typography.fontFamily.body,
  '--font-mono': typography.fontFamily.mono,

  // 圆角
  '--radius-sm': borderRadius.sm,
  '--radius-md': borderRadius.md,
  '--radius-lg': borderRadius.lg,
  '--radius-xl': borderRadius.xl,
  '--radius-full': borderRadius.full,
};
