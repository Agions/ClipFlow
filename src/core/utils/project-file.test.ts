/**
 * normalizeProjectFile / findProjectByScriptId — 单元测试
 */
import { describe, it, expect } from 'vitest';
import { normalizeProjectFile, findProjectByScriptId, type ProjectFileLike } from './project-file';

describe('normalizeProjectFile', () => {
  it('preserves videoUrl when present', () => {
    const p: ProjectFileLike = {
      id: 'p1',
      name: 'Project 1',
      videoUrl: 'https://cdn/video.mp4',
    };
    const result = normalizeProjectFile(p);
    expect(result.videoUrl).toBe('https://cdn/video.mp4');
  });

  it('falls back to videoPath when no videoUrl', () => {
    const p: ProjectFileLike = {
      id: 'p1',
      name: 'Project 1',
      videoPath: '/local/video.mp4',
    };
    const result = normalizeProjectFile(p);
    expect(result.videoUrl).toBe('/local/video.mp4');
  });

  it('falls back to videos[0].path when no videoUrl/videoPath', () => {
    const p: ProjectFileLike = {
      id: 'p1',
      name: 'Project 1',
      videos: [{ path: '/v/a.mp4' }, { path: '/v/b.mp4' }],
    };
    const result = normalizeProjectFile(p);
    expect(result.videoUrl).toBe('/v/a.mp4');
  });

  it('returns undefined videoUrl when no source available', () => {
    const p: ProjectFileLike = { id: 'p1', name: 'Project 1' };
    const result = normalizeProjectFile(p);
    expect(result.videoUrl).toBeUndefined();
  });

  it('returns undefined videoUrl when videos is empty array', () => {
    const p: ProjectFileLike = { id: 'p1', name: 'Project 1', videos: [] };
    const result = normalizeProjectFile(p);
    expect(result.videoUrl).toBeUndefined();
  });

  it('uses updatedAt when present', () => {
    const p: ProjectFileLike = {
      id: 'p1',
      name: 'Project 1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    };
    const result = normalizeProjectFile(p);
    expect(result.updatedAt).toBe('2026-02-01T00:00:00.000Z');
  });

  it('falls back to createdAt when updatedAt missing', () => {
    const p: ProjectFileLike = {
      id: 'p1',
      name: 'Project 1',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const result = normalizeProjectFile(p);
    expect(result.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('generates timestamp when both missing', () => {
    const before = new Date().toISOString();
    const p: ProjectFileLike = { id: 'p1', name: 'Project 1' };
    const result = normalizeProjectFile(p);
    const after = new Date().toISOString();
    expect(result.updatedAt >= before).toBe(true);
    expect(result.updatedAt <= after).toBe(true);
  });

  it('initializes scripts to [] when missing', () => {
    const p: ProjectFileLike = { id: 'p1', name: 'Project 1' };
    const result = normalizeProjectFile(p);
    expect(result.scripts).toEqual([]);
  });

  it('preserves existing scripts array', () => {
    const scripts = [{ id: 's1', text: 'hello' }];
    const p: ProjectFileLike<{ id: string; text: string }> = {
      id: 'p1',
      name: 'Project 1',
      scripts,
    };
    const result = normalizeProjectFile(p);
    expect(result.scripts).toBe(scripts);
  });
});

describe('findProjectByScriptId', () => {
  type Script = { id: string; text: string };
  const projects: ProjectFileLike<Script>[] = [
    {
      id: 'p1',
      name: 'P1',
      scripts: [
        { id: 's1', text: 'a' },
        { id: 's2', text: 'b' },
      ],
    },
    { id: 'p2', name: 'P2', scripts: [{ id: 's3', text: 'c' }] },
    { id: 'p3', name: 'P3' }, // no scripts
  ];

  it('finds project containing matching script', () => {
    const found = findProjectByScriptId(projects, 's2');
    expect(found?.id).toBe('p1');
  });

  it('returns undefined when script id not found', () => {
    expect(findProjectByScriptId(projects, 's999')).toBeUndefined();
  });

  it('skips projects without scripts', () => {
    expect(findProjectByScriptId(projects, 'p3')).toBeUndefined();
  });

  it('returns undefined for empty projects array', () => {
    expect(findProjectByScriptId([], 's1')).toBeUndefined();
  });
});
