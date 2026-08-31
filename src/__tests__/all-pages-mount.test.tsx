import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Home from '@/pages/home/index';
import Projects from '@/pages/projects/index';
import ProjectEdit from '@/pages/project-edit/index';
import ProjectDetail from '@/pages/project-detail/index';
import ScriptDetail from '@/pages/script-detail/index';
import ScriptStudio from '@/pages/script-studio/index';
import AssetHub from '@/pages/asset-hub/index';
import ExportHub from '@/pages/export-hub/index';
import Settings from '@/pages/settings/index';
import WorkspacePage from '@/pages/workspace/index';

describe('All Pages Mounting Verification', () => {
  beforeEach(() => {
    window.localStorage.setItem(
      'fablr_proj_proj_123',
      JSON.stringify({
        id: 'proj_123',
        name: '测试项目',
        scripts: [{ id: 'script_123', title: '测试剧本', segments: [] }],
        videos: [],
      })
    );
    window.localStorage.setItem('fablr_web_projects_index', JSON.stringify(['proj_123']));
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('mounts Home without crashing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('mounts Projects without crashing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/projects" element={<Projects />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('mounts ScriptStudio without crashing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/script-studio']}>
        <Routes>
          <Route path="/script-studio" element={<ScriptStudio />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('mounts AssetHub without crashing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/asset-hub']}>
        <Routes>
          <Route path="/asset-hub" element={<AssetHub />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('mounts ExportHub without crashing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/export-hub']}>
        <Routes>
          <Route path="/export-hub" element={<ExportHub />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('mounts Settings without crashing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('mounts WorkspaceStudioPage without crashing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/workspace']}>
        <Routes>
          <Route path="/workspace" element={<WorkspacePage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('mounts ProjectEdit without crashing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/project/new']}>
        <Routes>
          <Route path="/project/new" element={<ProjectEdit />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('mounts ProjectDetail without crashing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/project/proj_123']}>
        <Routes>
          <Route path="/project/:projectId" element={<ProjectDetail />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('mounts ScriptDetail without crashing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/project/proj_123/script/script_123']}>
        <Routes>
          <Route path="/project/:projectId/script/:scriptId" element={<ScriptDetail />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
