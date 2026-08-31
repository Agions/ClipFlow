/**
 * components/layout 测试
 *
 * Stage 9 PR-14: layout.tsx shell 测试
 * - 侧边栏 (logo + nav + bottom)
 * - 顶栏 (page title + user)
 * - main content area
 * - ShortcutOverlay trigger
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../layout';

// jsdom doesn't provide window.matchMedia — layout uses it for prefers-reduced-motion
// NOTE: use a plain function — vi.fn().mockImplementation loses its
// implementation across the beforeAll → test boundary in this version of
// vitest, returning undefined when called from the component.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
});

// Mock react-router's useNavigate / useLocation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock ShortcutOverlay — we only verify the trigger behavior
vi.mock('@/components/shortcut-overlay', () => ({
  ShortcutOverlay: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
  }) => (
    <div data-testid="shortcut-overlay" data-open={open}>
      <button data-testid="close-overlay" onClick={() => onOpenChange(false)}>
        close
      </button>
    </div>
  ),
}));

const renderWithRouter = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Layout>
        <div data-testid="main-child">child content</div>
      </Layout>
    </MemoryRouter>
  );

describe('Layout', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders sidebar, topbar, and main content', () => {
    renderWithRouter('/');
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('main-child')).toBeInTheDocument();
  });

  it('shows "首页" page title on /', () => {
    renderWithRouter('/');
    expect(screen.getByRole('heading', { name: '首页' })).toBeInTheDocument();
  });

  it('shows "项目" page title on /projects', () => {
    renderWithRouter('/projects');
    expect(screen.getByRole('heading', { name: '项目' })).toBeInTheDocument();
  });

  it('shows "专业视听剪辑工作台" page title on /workspace', () => {
    renderWithRouter('/workspace/abc');
    expect(screen.getByRole('heading', { name: '专业视听剪辑工作台' })).toBeInTheDocument();
  });

  it('shows "AI 剧本研磨工坊" page title on /script-studio', () => {
    renderWithRouter('/script-studio');
    expect(screen.getByRole('heading', { name: 'AI 剧本研磨工坊' })).toBeInTheDocument();
  });

  it('shows "智能素材库" page title on /asset-hub', () => {
    renderWithRouter('/asset-hub');
    expect(screen.getByRole('heading', { name: '智能素材库' })).toBeInTheDocument();
  });

  it('shows "消重发布中心" page title on /export-hub', () => {
    renderWithRouter('/export-hub');
    expect(screen.getByRole('heading', { name: '消重发布中心' })).toBeInTheDocument();
  });

  it('shows "设置" page title on /settings', () => {
    renderWithRouter('/settings');
    expect(screen.getByRole('heading', { name: '设置' })).toBeInTheDocument();
  });

  it('falls back to "Fablr" for unknown paths', () => {
    renderWithRouter('/random/unknown');
    expect(screen.getByRole('heading', { name: 'Fablr' })).toBeInTheDocument();
  });

  it('logo navigates to / on click', () => {
    renderWithRouter('/projects');
    const logo = screen.getByRole('button', { name: '剧工首页' });
    fireEvent.click(logo);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('logo triggers navigation on Enter key', () => {
    renderWithRouter('/projects');
    const logo = screen.getByRole('button', { name: '剧工首页' });
    fireEvent.keyDown(logo, { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('logo triggers navigation on Space key', () => {
    renderWithRouter('/projects');
    const logo = screen.getByRole('button', { name: '剧工首页' });
    fireEvent.keyDown(logo, { key: ' ' });
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('aria-current=page on active nav item', () => {
    renderWithRouter('/projects');
    const projectsBtn = screen.getByRole('button', { name: '项目' });
    expect(projectsBtn).toHaveAttribute('aria-current', 'page');
  });

  it('aria-current undefined on inactive nav item', () => {
    renderWithRouter('/');
    const settingsBtn = screen.getByRole('button', { name: '设置' });
    expect(settingsBtn).not.toHaveAttribute('aria-current');
  });

  it('navigates to new project on + button click', () => {
    renderWithRouter('/');
    const newProjectBtn = screen.getByRole('button', { name: '新建项目' });
    fireEvent.click(newProjectBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/project/new');
  });

  it('navigates to home on 首页 click', () => {
    renderWithRouter('/projects');
    const homeBtn = screen.getByRole('button', { name: '首页' });
    fireEvent.click(homeBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('opens ShortcutOverlay on 快捷键 button click', () => {
    renderWithRouter('/');
    const overlay = screen.getByTestId('shortcut-overlay');
    expect(overlay).toHaveAttribute('data-open', 'false');
    const shortcutBtn = screen.getByRole('button', { name: '键盘快捷键' });
    fireEvent.click(shortcutBtn);
    expect(overlay).toHaveAttribute('data-open', 'true');
  });

  it('renders user info in topbar', () => {
    renderWithRouter('/');
    expect(screen.getByRole('button', { name: '用户菜单' })).toBeInTheDocument();
    expect(screen.getByText('创作者')).toBeInTheDocument();
  });
});
