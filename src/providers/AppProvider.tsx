import React, { ReactNode } from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { SettingsProvider } from '../context/SettingsContext';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useTheme } from '../context/ThemeContext';

// App Provider Props
interface AppProviderProps {
  children: ReactNode;
}

/**
 * CutDeck Design System — 深炭底 + 琥珀光 + 电青色
 * 与 global.css / theme.ts 保持一致
 */
const getDarkThemeTokens = () => ({
  // 主强调色 — 琥珀光（行动点/CTA）
  colorPrimary: '#FF9F43',
  colorPrimaryHover: '#FFBE76',
  colorPrimaryActive: '#E8891C',
  colorPrimaryBg: 'rgba(255, 159, 67, 0.15)',
  colorPrimaryBgHover: 'rgba(255, 159, 67, 0.25)',

  // 功能色
  colorSuccess: '#4ADE80',
  colorSuccessBg: 'rgba(74, 222, 128, 0.15)',
  colorWarning: '#FBBF24',
  colorWarningBg: 'rgba(251, 191, 36, 0.15)',
  colorError: '#F87171',
  colorErrorBg: 'rgba(248, 113, 113, 0.15)',
  colorInfo: '#60A5FA',
  colorInfoBg: 'rgba(96, 165, 250, 0.15)',

  // 背景
  colorBgBase: '#0C0D14',
  colorBgContainer: '#141520',
  colorBgElevated: '#1C1D2E',
  colorBgLayout: '#0C0D14',
  colorBgSpotlight: '#24263A',

  // 边框
  colorBorder: '#2A2D42',
  colorBorderSecondary: '#1E2030',

  // 文字
  colorText: '#F0F0F5',
  colorTextSecondary: '#8888A0',
  colorTextTertiary: '#55556A',
  colorTextQuaternary: '#3D4166',

  // 圆角
  borderRadius: 8,

  // 其他
  wireframe: false,
  fontSize: 14,
  // Outfit (Display) + Figtree (Body)，禁用 Inter
  fontFamily: "'Outfit', 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif",
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
  motionEaseInOut: 'cubic-bezier(0.23, 1, 0.32, 1)',
});

/**
 * 亮色主题配色 — 保持与深色一致的 Amber 主调
 */
const getLightThemeTokens = () => ({
  colorPrimary: '#E8891C',
  colorPrimaryHover: '#FF9F43',
  colorPrimaryActive: '#D4760F',
  colorPrimaryBg: 'rgba(255, 159, 67, 0.1)',
  colorPrimaryBgHover: 'rgba(255, 159, 67, 0.2)',

  colorSuccess: '#10b981',
  colorSuccessBg: 'rgba(16, 185, 129, 0.1)',
  colorWarning: '#f59e0b',
  colorWarningBg: 'rgba(245, 158, 11, 0.1)',
  colorError: '#ef4444',
  colorErrorBg: 'rgba(239, 68, 68, 0.1)',
  colorInfo: '#3b82f6',
  colorInfoBg: 'rgba(59, 130, 246, 0.1)',

  colorTextBase: 'rgba(0, 0, 0, 0.87)',
  colorBgBase: '#F5F5F0',
  colorBgContainer: '#FFFFFF',
  colorBgElevated: '#FAFAFA',
  colorBgLayout: '#F5F5F0',

  colorBorder: 'rgba(0, 0, 0, 0.08)',
  colorBorderSecondary: 'rgba(0, 0, 0, 0.04)',

  colorText: 'rgba(0, 0, 0, 0.87)',
  colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
  colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
  colorTextQuaternary: 'rgba(0, 0, 0, 0.25)',

  borderRadius: 8,

  wireframe: false,
  fontSize: 14,
  fontFamily: "'Outfit', 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif",
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  motionEaseInOut: 'cubic-bezier(0.23, 1, 0.32, 1)',
});

/**
 * 全局主题配置获取器
 * 用于在ThemeProvider内获取主题配置
 */
const ThemeConfigurator: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isDarkMode } = useTheme();

  // 获取主题 tokens
  const themeTokens = isDarkMode ? getDarkThemeTokens() : getLightThemeTokens();

  // 共享组件样式
  // CutDeck Amber 主色调 — 琥珀光 + 深炭底
  const sharedComponentStyles = {
    Button: {
      borderRadius: 8,
      controlHeight: 40,
      fontWeight: 500,
      primaryShadow: isDarkMode
        ? '0 4px 12px rgba(255, 159, 67, 0.3)'
        : '0 2px 6px rgba(232, 137, 28, 0.25)',
    },
    Card: {
      borderRadiusLG: 12,
      borderRadiusSM: 8,
      boxShadow: isDarkMode ? '0 4px 16px rgba(0, 0, 0, 0.5)' : '0 2px 8px rgba(0, 0, 0, 0.06)',
    },
    Menu: {
      itemBorderRadius: 8,
      subMenuItemBorderRadius: 6,
      itemBg: 'transparent',
      itemSelectedBg: isDarkMode ? 'rgba(255, 159, 67, 0.15)' : 'rgba(255, 159, 67, 0.1)',
      itemSelectedColor: '#FF9F43',
    },
    Modal: {
      borderRadiusLG: 12,
      contentBg: isDarkMode ? '#141520' : '#ffffff',
      headerBg: isDarkMode ? '#141520' : '#ffffff',
    },
    Select: {
      borderRadius: 8,
      optionSelectedBg: isDarkMode ? 'rgba(255, 159, 67, 0.15)' : 'rgba(255, 159, 67, 0.1)',
    },
    Input: {
      borderRadius: 8,
      activeBorderColor: '#FF9F43',
      hoverBorderColor: isDarkMode ? '#3D4166' : '#FF9F43',
    },
    Radio: {
      borderRadius: 4,
    },
    Checkbox: {
      borderRadiusSM: 4,
    },
    Avatar: {
      borderRadius: 8,
    },
    Dropdown: {
      borderRadiusLG: 8,
      paddingBlock: 4,
      paddingInline: 8,
    },
    Tabs: {
      cardBg: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
      cardGutter: 4,
      inkBarColor: '#FF9F43',
      itemActiveColor: '#FF9F43',
      itemSelectedColor: '#FF9F43',
    },
    Table: {
      borderRadiusLG: 12,
      headerBg: isDarkMode ? '#1C1D2E' : '#f5f7fa',
      headerColor: isDarkMode ? '#8888A0' : 'rgba(0, 0, 0, 0.65)',
      rowHoverBg: isDarkMode ? 'rgba(255, 159, 67, 0.08)' : 'rgba(255, 159, 67, 0.04)',
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Tooltip: {
      borderRadius: 8,
    },
    Popover: {
      borderRadiusLG: 12,
    },
    Progress: {
      defaultColor: '#FF9F43',
    },
    Slider: {
      trackBg: 'rgba(255, 159, 67, 0.3)',
      railBg: isDarkMode ? '#2A2D42' : '#e0e0e0',
    },
    Switch: {
      primaryColor: '#FF9F43',
    },
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: themeTokens,
        components: sharedComponentStyles as unknown as Record<string, any>,
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  );
};

/**
 * 应用根Provider组件
 * 包含所有需要的Context Provider
 */
const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <ThemeConfigurator>{children}</ThemeConfigurator>
      </SettingsProvider>
    </ThemeProvider>
  );
};

export default AppProvider;
