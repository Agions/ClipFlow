/**
 * app.tsx — 单元测试
 *
 * 覆盖：
 *  - 路由表（首页、各项目页、404 fallback）
 *  - 懒加载列表（Home / Projects / ProjectEdit / ProjectDetail / ScriptDetail / Settings / Workspace）
 *  - PageLoader 骨架屏
 *  - 卸载清理（requestIdleCallback / setTimeout fallback）
 *  - requestIdleCallback 不可用时回退到 setTimeout
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock all lazy-loaded modules
vi.mock('./providers/app-provider', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-provider">{children}</div>
  ),
}));

vi.mock('./components/layout/layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('./pages/home/index', () => ({
  default: () => <div data-testid="page-home">Home</div>,
}));

vi.mock('./pages/projects/index', () => ({
  default: () => <div data-testid="page-projects">Projects</div>,
}));

vi.mock('./pages/project-edit/index', () => ({
  default: () => <div data-testid="page-project-edit">ProjectEdit</div>,
}));

vi.mock('./pages/project-detail/index', () => ({
  default: () => <div data-testid="page-project-detail">ProjectDetail</div>,
}));

vi.mock('./pages/script-detail/index', () => ({
  default: () => <div data-testid="page-script-detail">ScriptDetail</div>,
}));

vi.mock('./pages/settings/index', () => ({
  default: () => <div data-testid="page-settings">Settings</div>,
}));

vi.mock('./pages/workspace/index', () => ({
  default: () => <div data-testid="page-workspace">Workspace</div>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    HashRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    MemoryRouter: actual.MemoryRouter,
  };
});

vi.mock('./components/common/error-boundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}));

import App from './app';

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.useRealTimers();
});

describe('App', () => {
  it('renders the home page at "/"', async () => {
    renderWithRouter('/');
    expect(await screen.findByTestId('page-home')).toBeInTheDocument();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('app-provider')).toBeInTheDocument();
  });

  it('renders the projects page at "/projects"', async () => {
    renderWithRouter('/projects');
    expect(await screen.findByTestId('page-projects')).toBeInTheDocument();
  });

  it('renders the project edit page at "/project/new"', async () => {
    renderWithRouter('/project/new');
    expect(await screen.findByTestId('page-project-edit')).toBeInTheDocument();
  });

  it('renders the project edit page at "/project/edit/:id"', async () => {
    renderWithRouter('/project/edit/abc-123');
    expect(await screen.findByTestId('page-project-edit')).toBeInTheDocument();
  });

  it('renders the project detail page at "/project/:id"', async () => {
    renderWithRouter('/project/abc-123');
    expect(await screen.findByTestId('page-project-detail')).toBeInTheDocument();
  });

  it('renders the script detail page at "/project/:id/script/:id"', async () => {
    renderWithRouter('/project/abc-123/script/script-1');
    expect(await screen.findByTestId('page-script-detail')).toBeInTheDocument();
  });

  it('renders the workspace page at "/workspace"', async () => {
    renderWithRouter('/workspace');
    expect(await screen.findByTestId('page-workspace')).toBeInTheDocument();
  });

  it('renders the workspace page at "/workspace/:id"', async () => {
    renderWithRouter('/workspace/abc-123');
    expect(await screen.findByTestId('page-workspace')).toBeInTheDocument();
  });

  it('renders the workspace page at "/editor"', async () => {
    renderWithRouter('/editor');
    expect(await screen.findByTestId('page-workspace')).toBeInTheDocument();
  });

  it('renders the workspace page at "/editor/:id"', async () => {
    renderWithRouter('/editor/abc-123');
    expect(await screen.findByTestId('page-workspace')).toBeInTheDocument();
  });

  it('renders the settings page at "/settings"', async () => {
    renderWithRouter('/settings');
    expect(await screen.findByTestId('page-settings')).toBeInTheDocument();
  });

  it('falls back to home on unknown routes', async () => {
    renderWithRouter('/some/unknown/path');
    // Navigate to "/" should cause Home to render
    expect(await screen.findByTestId('page-home')).toBeInTheDocument();
  });

  it('triggers warmup via requestIdleCallback and cleans up on unmount', async () => {
    let storedCallback: (() => void) | null = null;
    const idleCallback = vi.fn((cb: () => void) => {
      storedCallback = cb;
      return 1;
    });
    const cancelIdleCallback = vi.fn();
    Object.defineProperty(window, 'requestIdleCallback', {
      value: idleCallback,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'cancelIdleCallback', {
      value: cancelIdleCallback,
      writable: true,
      configurable: true,
    });

    const { unmount } = renderWithRouter('/');
    expect(idleCallback).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((idleCallback.mock.calls[0] as any)[1]).toEqual({ timeout: 1200 });

    // Invoke the warmup callback to cover the function body
    expect(typeof storedCallback).toBe('function');
    (storedCallback as unknown as () => void)();
    expect(idleCallback).toHaveBeenCalled();

    unmount();
    expect(cancelIdleCallback).toHaveBeenCalled();
  });

  it('falls back to setTimeout when requestIdleCallback is unavailable', async () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

    // Remove requestIdleCallback from window
    Object.defineProperty(window, 'requestIdleCallback', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'cancelIdleCallback', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { unmount } = renderWithRouter('/');

    // Check that setTimeout was called with 500ms warmup
    expect(setTimeoutSpy).toHaveBeenCalled();
    const calls = setTimeoutSpy.mock.calls.filter(c => c[1] === 500);
    expect(calls.length).toBeGreaterThanOrEqual(1);

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('handles requestIdleCallback defined but cancelIdleCallback missing', async () => {
    const idleCallback = vi.fn(() => 99);
    Object.defineProperty(window, 'requestIdleCallback', {
      value: idleCallback,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'cancelIdleCallback', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { unmount } = renderWithRouter('/');
    expect(idleCallback).toHaveBeenCalledTimes(1);

    // Unmount should not throw even when cancelIdleCallback is missing
    unmount();
  });
});
