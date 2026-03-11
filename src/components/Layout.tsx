import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Button, Tooltip, Avatar, Typography, Dropdown, Badge, Space, Drawer } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  ProjectOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Layout.module.less';
import { useTheme } from '@/context/ThemeContext';

const { Sider, Content, Header } = AntLayout;
const { Title, Text } = Typography;

// 电影导演工作室配色 - Cinema Director Studio
const CINEMA_COLORS = {
  bgVoid: '#08080a',
  bgPrimary: '#0d0d0f',
  bgElevated: '#141418',
  bgSurface: '#1c1c22',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderDefault: 'rgba(255, 255, 255, 0.1)',
  textPrimary: '#f8f8f2',
  textSecondary: '#a8a8b3',
  filmAmber: '#d4a574',
  filmAmberLight: '#e8c9a8',
  filmAmberGlow: 'rgba(212, 165, 116, 0.35)',
};

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const [browserWidth, setBrowserWidth] = useState(window.innerWidth);
  const isMobile = browserWidth < 768;

  useEffect(() => {
    const handleResize = () => {
      setBrowserWidth(window.innerWidth);
      if (window.innerWidth < 768 && !collapsed) setCollapsed(true);
      else if (window.innerWidth >= 1200 && collapsed) setCollapsed(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [collapsed]);

  // Close mobile drawer when route changes
  useEffect(() => {
    if (isMobile) {
      setMobileDrawerVisible(false);
    }
  }, [location.pathname, isMobile]);

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return '/';
    if (path.startsWith('/projects') || path.startsWith('/project')) return '/projects';
    if (path.startsWith('/settings')) return '/settings';
    return '/';
  };

  // 简化菜单 - 只保留首页、项目管理、设置
  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
      onClick: () => navigate('/')
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: '项目管理',
      onClick: () => navigate('/projects')
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings')
    }
  ];

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return '首页';
    if (path.startsWith('/projects') || path.startsWith('/project')) return '项目管理';
    if (path.startsWith('/settings')) return '设置';
    return 'ClipFlow';
  };

  const userMenu = {
    items: [
      { key: 'profile', label: '个人信息', icon: <UserOutlined /> },
      { key: 'preferences', label: '偏好设置', icon: <SettingOutlined /> },
      { type: 'divider' as const },
      { key: 'logout', label: '退出登录', danger: true }
    ],
    onClick: (e: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
      if (e.key === 'preferences') navigate('/settings');
    }
  };

  // Mobile drawer navigation menu
  const renderMobileMenu = () => (
    <Menu
      mode="inline"
      selectedKeys={[getSelectedKey()]}
      items={menuItems}
      style={{ border: 'none', marginTop: 8 }}
      onClick={({ key }) => {
        if (key.startsWith('/')) navigate(key);
      }}
    />
  );

  return (
    <AntLayout className={styles.layout} style={{ minHeight: '100vh' }}>
      {/* Desktop Sidebar - 科技暗黑风格 */}
      {!isMobile && (
        <Sider
          className={styles.sider}
          theme="dark"
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={220}
          collapsedWidth={64}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            background: isDarkMode ? CINEMA_COLORS.bgSecondary : '#fff',
            borderRight: `1px solid ${isDarkMode ? CINEMA_COLORS.border : 'rgba(0,0,0,0.06)'}`,
            boxShadow: isDarkMode ? '2px 0 10px rgba(0, 0, 0, 0.3)' : 'none',
          }}
        >
          {/* Logo */}
          <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 20px',
            borderBottom: `1px solid ${isDarkMode ? CINEMA_COLORS.border : 'rgba(0,0,0,0.06)'}`,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }} onClick={() => navigate('/')}>
            <img
              src="/logo.svg"
              alt="ClipFlow"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                flexShrink: 0,
                boxShadow: isDarkMode ? '0 0 15px rgba(99, 102, 241, 0.4)' : 'none',
              }}
            />
            {!collapsed && (
              <Title level={4} style={{
                margin: '0 0 0 12px',
                fontSize: 18,
                whiteSpace: 'nowrap',
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700
              }}>
                ClipFlow
              </Title>
            )}
          </div>

          {/* 导航菜单 - 暗色主题 */}
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            style={{
              border: 'none',
              marginTop: 8,
              background: 'transparent',
            }}
          />

          {/* 折叠按钮 */}
          <div style={{
            position: 'absolute',
            bottom: 16,
            width: '100%',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <Tooltip title={collapsed ? '展开' : '收起'} placement="right">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ color: isDarkMode ? CINEMA_COLORS.textSecondary : 'rgba(0,0,0,0.45)' }}
              />
            </Tooltip>
          </div>
        </Sider>
      )}

      {/* Mobile Drawer - 科技暗黑风格 */}
      <Drawer
        placement="left"
        open={mobileDrawerVisible}
        onClose={() => setMobileDrawerVisible(false)}
        width={280}
        bodyStyle={{ padding: 0, background: isDarkMode ? CINEMA_COLORS.bgSecondary : '#fff' }}
        className="mobile-drawer"
        styles={{
          body: { padding: 0 },
          header: { padding: '12px 16px', background: isDarkMode ? CINEMA_COLORS.bgSecondary : '#fff', borderBottom: `1px solid ${isDarkMode ? CINEMA_COLORS.border : 'rgba(0,0,0,0.06)'}` }
        }}
      >
        {/* Mobile Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: `1px solid ${isDarkMode ? CINEMA_COLORS.border : 'rgba(0,0,0,0.06)'}`,
          cursor: 'pointer'
        }} onClick={() => navigate('/')}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            flexShrink: 0,
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
          }}>
            C
          </div>
          <Title level={4} style={{
            margin: '0 0 0 12px',
            fontSize: 18,
            whiteSpace: 'nowrap',
            color: isDarkMode ? CINEMA_COLORS.textPrimary : 'inherit'
          }}>
            ClipFlow
          </Title>
        </div>

        {/* Mobile Navigation Menu */}
        {renderMobileMenu()}
      </Drawer>

      {/* Mobile Overlay */}
      {mobileDrawerVisible && isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99,
          }}
          onClick={() => setMobileDrawerVisible(false)}
        />
      )}

      <AntLayout style={{
        marginLeft: isMobile ? 0 : (collapsed ? 64 : 220),
        transition: 'margin-left 0.2s'
      }}>
        {/* 顶部栏 - 科技暗黑风格 */}
        <Header style={{
          background: isDarkMode ? CINEMA_COLORS.bgSecondary : '#fff',
          padding: isMobile ? '0 16px' : '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${isDarkMode ? CINEMA_COLORS.border : 'rgba(0,0,0,0.06)'}`,
          height: 56,
          lineHeight: '56px',
          position: 'sticky',
          top: 0,
          zIndex: 99,
          boxShadow: isDarkMode ? '0 2px 10px rgba(0, 0, 0, 0.3)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Hamburger Menu for Mobile */}
            {isMobile && (
              <Button
                type="text"
                icon={<MenuFoldOutlined />}
                onClick={() => setMobileDrawerVisible(true)}
                style={{
                  marginRight: 12,
                  width: 44,
                  height: 44,
                  fontSize: 18,
                  color: isDarkMode ? CINEMA_COLORS.textPrimary : 'inherit'
                }}
                className="touch-friendly"
              />
            )}
            <Text strong style={{ fontSize: isMobile ? 15 : 16, color: isDarkMode ? CINEMA_COLORS.textPrimary : 'inherit' }}>{getPageTitle()}</Text>
          </div>

          <Space size={isMobile ? 2 : 4}>
            {!isMobile && (
              <Tooltip title="帮助">
                <Button
                  type="text"
                  shape="circle"
                  icon={<QuestionCircleOutlined />}
                  size="small"
                  style={{ color: isDarkMode ? CINEMA_COLORS.textSecondary : 'inherit' }}
                />
              </Tooltip>
            )}
            <Tooltip title="通知">
              <Badge count={0} size="small">
                <Button
                  type="text"
                  shape="circle"
                  icon={<BellOutlined />}
                  size="small"
                  className="touch-friendly"
                  style={{ color: isDarkMode ? CINEMA_COLORS.textSecondary : 'inherit' }}
                />
              </Badge>
            </Tooltip>
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <Button type="text" style={{ padding: isMobile ? '0 4px' : '0 8px', color: isDarkMode ? CINEMA_COLORS.textPrimary : 'inherit' }}>
                <Space>
                  <Avatar size="small" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)' }}>U</Avatar>
                  {!isMobile && <span style={{ fontSize: 13, color: isDarkMode ? CINEMA_COLORS.textPrimary : 'inherit' }}>用户</span>}
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Header>

        {/* 内容区 - 科技暗黑风格 */}
        <Content style={{
          padding: isMobile ? 16 : 24,
          minHeight: 'calc(100vh - 56px)',
          background: isDarkMode ? CINEMA_COLORS.bgPrimary : '#f5f5f5',
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
