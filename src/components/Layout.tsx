/**
 * CutDeck Layout — AI Cinema Studio Design
 * 三区制布局：AI工作流侧栏 | 预览区 | 片段卡片流
 *
 * Redesigned per frontend-design-pro principles:
 * - OKLCH color space / warm-tinted dark backgrounds
 * - 4px base spacing grid
 * - cubic-bezier(0.16, 1, 0.3, 1) easing / max 200ms micro-interactions
 * - prefers-reduced-motion respected
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  VideoCameraOutlined,
  SettingOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Tooltip, App } from 'antd';
import styles from './Layout.module.less';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const reducedMotion = useRef(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Auto-collapse on narrow screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) setSidebarCollapsed(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return '/';
    if (path.startsWith('/projects') || path.startsWith('/project') || path.startsWith('/editor')) return '/projects';
    if (path.startsWith('/settings')) return '/settings';
    return '/';
  };

  const navItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页', onClick: () => navigate('/') },
    { key: '/projects', icon: <VideoCameraOutlined />, label: '我的项目', onClick: () => navigate('/projects') },
    { key: '/settings', icon: <SettingOutlined />, label: '设置', onClick: () => navigate('/settings') },
  ];

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return '首页';
    if (path.startsWith('/projects') || path.startsWith('/project') || path.startsWith('/editor')) return '我的项目';
    if (path.startsWith('/settings')) return '设置';
    return 'CutDeck';
  };

  return (
    <div className={styles.shell}>
      {/* ── Left Sidebar ── */}
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
        {/* Logo */}
        <div className={styles.logo} onClick={() => navigate('/')} role="button" tabIndex={0}>
          <div className={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 160 160" fill="none" aria-hidden="true">
              <rect width="160" height="160" rx="20" fill="#1C1D2E"/>
              <polygon points="68,50 104,68 68,86" fill="url(#pg)"/>
              <defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#FF9F43"/></linearGradient></defs>
            </svg>
          </div>
          {!sidebarCollapsed && <span className={styles.logoText}>CutDeck</span>}
        </div>

        {/* New Project Button */}
        {!sidebarCollapsed && (
          <button className={styles.newProjectBtn} onClick={() => navigate('/editor/new')}>
            <PlusOutlined />
            <span>新建项目</span>
          </button>
        )}
        {sidebarCollapsed && (
          <Tooltip title="新建项目" placement="right">
            <button className={styles.newProjectBtnIcon} onClick={() => navigate('/editor/new')}>
              <PlusOutlined />
            </button>
          </Tooltip>
        )}

        {/* Nav */}
        <nav className={styles.nav} role="navigation" aria-label="主导航">
          {navItems.map(item => (
            <button
              key={item.key}
              className={`${styles.navItem} ${getSelectedKey() === item.key ? styles.active : ''}`}
              onClick={item.onClick}
              title={sidebarCollapsed ? item.label : undefined}
              aria-current={getSelectedKey() === item.key ? 'page' : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!sidebarCollapsed && <span className={styles.navLabel}>{item.label}</span>}
              {getSelectedKey() === item.key && !reducedMotion.current && <span className={styles.navIndicator} aria-hidden="true" />}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className={styles.sidebarBottom}>
          <button
            className={styles.collapseBtn}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? '展开' : '收起'}
            aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </div>
      </aside>

      {/* ── Top Bar ── */}
      <header className={styles.topbar} role="banner">
        <div className={styles.topbarLeft}>
          <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
        </div>
        <div className={styles.topbarRight}>
          <button className={styles.iconBtn} title="帮助" aria-label="帮助">
            <QuestionCircleOutlined />
          </button>
          <button className={styles.iconBtn} title="通知" aria-label="通知">
            <BellOutlined />
          </button>
          <button className={styles.userBtn} aria-label="用户菜单">
            <div className={styles.avatar} aria-hidden="true">A</div>
            <span className={styles.userName}>Agions</span>
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className={`${styles.content} ${sidebarCollapsed ? styles.contentExpanded : ''}`} id="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
