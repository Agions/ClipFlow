/**
 * 剧工 (Fablr) — 专业影视工业级 Dark Studio 主布局与侧边栏导航
 */

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { ShortcutOverlay } from '@/components/shortcut-overlay';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Video,
  Settings,
  Bell,
  Plus,
  FileText,
  Sparkles,
  Share2,
  Film,
  Command,
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { UpdateModal } from '@/components/updater/update-modal';
import { useUpdaterStore } from '@/stores/updater-store';
import styles from './layout.module.less';

interface LayoutProps {
  children: React.ReactNode;
}

const usePageInfo = (pathname: string) => {
  return useMemo(() => {
    if (pathname === '/') return { selectedKey: '/', pageTitle: '首页' };
    if (pathname.startsWith('/asset-hub')) return { selectedKey: '/asset-hub', pageTitle: '智能素材库' };
    if (pathname.startsWith('/script-studio')) return { selectedKey: '/script-studio', pageTitle: 'AI 剧本研磨工坊' };
    if (pathname.startsWith('/workspace') || pathname.startsWith('/editor')) {
      return { selectedKey: '/workspace', pageTitle: '专业视听剪辑工作台' };
    }
    if (pathname.startsWith('/export-hub')) return { selectedKey: '/export-hub', pageTitle: '消重发布中心' };
    if (pathname.startsWith('/projects') || pathname.startsWith('/project')) {
      return { selectedKey: '/projects', pageTitle: '项目' };
    }
    if (pathname.startsWith('/settings')) return { selectedKey: '/settings', pageTitle: '设置' };
    return { selectedKey: '/', pageTitle: 'Fablr' };
  }, [pathname]);
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [shortcutOverlayOpen, setShortcutOverlayOpen] = useState(false);

  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const { hasUnreadUpdate, openUpdateModal, checkForUpdates, initAutoCheck } = useUpdaterStore();

  React.useEffect(() => {
    initAutoCheck();
  }, [initAutoCheck]);

  const { selectedKey, pageTitle } = usePageInfo(location.pathname);

  const handleLogoKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate('/');
      }
    },
    [navigate]
  );

  const coreNavItems = useMemo(
    () => [
      { key: '/', icon: <Home size={16} />, label: '首页', onClick: () => navigate('/') },
      {
        key: '/projects',
        icon: <Video size={16} />,
        label: '项目',
        onClick: () => navigate('/projects'),
      },
      {
        key: '/asset-hub',
        icon: <Sparkles size={16} />,
        label: '素材拆条',
        onClick: () => navigate('/asset-hub'),
      },
      {
        key: '/script-studio',
        icon: <FileText size={16} />,
        label: '剧本工坊',
        onClick: () => navigate('/script-studio'),
      },
      {
        key: '/workspace',
        icon: <Film size={16} />,
        label: '剪辑合成',
        onClick: () => navigate('/workspace'),
      },
      {
        key: '/export-hub',
        icon: <Share2 size={16} />,
        label: '消重发布',
        onClick: () => navigate('/export-hub'),
      },
    ],
    [navigate]
  );

  return (
    <TooltipProvider>
      <div className={styles.shell}>
        {/* ── 左侧 220px 影视工坊导航栏 ── */}
        <aside className={styles.sidebar}>
          {/* Brand Logo 区域 */}
          <div
            className={styles.brandHeader}
            onClick={() => navigate('/')}
            onKeyDown={handleLogoKeyDown}
            role="button"
            tabIndex={0}
            aria-label="剧工首页"
          >
            <div className={styles.logoIcon}>
              <img src="/logo.svg" alt="Fablr Logo" className="w-full h-full object-contain p-1" />
            </div>
            <div className={styles.brandTextCol}>
              <span className={styles.brandTitle}>
                剧工 <span className="text-[#c084fc] font-mono text-xs">Fablr</span>
              </span>
              <span className={styles.brandSubtitle}>AI 影视解说创作工坊</span>
            </div>
          </div>

          {/* 新建创作项目按钮 */}
          <button
            className={styles.newProjectBtn}
            onClick={() => navigate('/project/new')}
            aria-label="新建项目"
          >
            <Plus size={15} />
            <span className={styles.newProjectBtnLabel}>新建创作项目</span>
          </button>

          {/* 导航栏列表 */}
          <div className={styles.navSectionTitle}>全链路工坊流水线</div>
          <nav className={styles.nav} role="navigation" aria-label="主导航">
            {coreNavItems.map(item => {
              const isActive = selectedKey === item.key;
              return (
                <button
                  key={item.key}
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                  onClick={item.onClick}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                  {isActive && !reducedMotion.current && (
                    <span className={styles.navIndicator} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* 侧边栏底部设置与用户卡片 */}
          <div className={styles.sidebarBottom}>
            <button
              className={`${styles.navItem} ${selectedKey === '/settings' ? styles.active : ''}`}
              onClick={() => navigate('/settings')}
              aria-current={selectedKey === '/settings' ? 'page' : undefined}
              aria-label="设置"
            >
              <span className={styles.navIcon}>
                <Settings size={16} />
              </span>
              <span className={styles.navLabel}>系统设置</span>
            </button>

            <div className={styles.userCard}>
              <div className={styles.avatar}>创</div>
              <div className={styles.userMeta}>
                <span className={styles.userName}>专业版创作者</span>
                <span className={styles.userStatus}>● 本地引擎已就绪</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── 顶部 Header ── */}
        <header className={styles.topbar} role="banner">
          <div className={styles.topbarLeft}>
            <h1 className={styles.pageTitle}>{pageTitle}</h1>
            <div className={styles.statusPills}>
              <span className={styles.gpuPill}>
                <span className={styles.pulseDot} /> GPU 硬件加速: 激活
              </span>
              <span className={styles.computePill}>
                算力状态: 85K / 100K
              </span>
            </div>
          </div>

          <div className={styles.topbarRight}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    className={styles.iconBtn}
                    onClick={() => setShortcutOverlayOpen(true)}
                    aria-label="键盘快捷键"
                  />
                }
              >
                <Command size={15} />
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                快捷键清单 (Cmd+/)
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    className={styles.iconBtn}
                    onClick={() => {
                      if (hasUnreadUpdate) {
                        openUpdateModal();
                      } else {
                        void checkForUpdates(false);
                      }
                    }}
                    aria-label="版本与系统通知"
                  />
                }
              >
                <div className="relative">
                  <Bell size={15} />
                  {hasUnreadUpdate && (
                    <span className={styles.redDot} />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                {hasUnreadUpdate ? '发现新版本，点击查看' : '检查版本更新'}
              </TooltipContent>
            </Tooltip>

            <button
              className={styles.userBtn}
              onClick={() => navigate('/settings')}
              aria-label="用户菜单"
            >
              <div className={styles.avatar}>创</div>
              <span className={styles.userName}>创作者</span>
            </button>
          </div>
        </header>

        {/* ── 主内容视口 ── */}
        <main className={styles.content} id="main-content" role="main">
          {children}
        </main>
      </div>

      <ShortcutOverlay open={shortcutOverlayOpen} onOpenChange={setShortcutOverlayOpen} />
      <UpdateModal />
    </TooltipProvider>
  );
};

export default Layout;
