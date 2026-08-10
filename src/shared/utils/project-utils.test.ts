/**
 * project-utils 过滤与排序逻辑测试
 *
 * 原 project-store.test.ts 实际只覆盖 filterProjects/sortProjects，
 * 与 store 消费者无关，故迁移以让测试紧贴被测对象。
 */
import { describe, it, expect, vi } from 'vitest';
import { filterProjects, sortProjects, updateProject, getStatusColor } from './project-utils';
import type { Project } from '@/types';

// 每个字段值都不同，避免意外的 tie-breaking
const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Zebra',
    status: 'draft',
    createdAt: '1970-01-01T00:00:09.000Z',
    updatedAt: '1970-01-01T00:00:09.000Z',
    duration: 30,
    size: 100,
    tags: ['animal'],
    starred: true,
  },
  {
    id: '2',
    title: 'Apple',
    status: 'completed',
    createdAt: '1970-01-01T00:00:08.000Z',
    updatedAt: '1970-01-01T00:00:07.000Z',
    duration: 60,
    size: 200,
    tags: ['fruit'],
    starred: false,
  },
  {
    id: '3',
    title: 'Banana',
    status: 'draft',
    createdAt: '1970-01-01T00:00:10.000Z',
    updatedAt: '1970-01-01T00:00:08.000Z',
    duration: 120,
    size: 300,
    tags: ['fruit'],
    starred: false,
  },
];

describe('filterProjects', () => {
  it('should return all when no filter', () => {
    expect(filterProjects(mockProjects, {})).toHaveLength(3);
  });

  it('should filter by status', () => {
    const result = filterProjects(mockProjects, { status: 'completed' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Apple');
  });

  it('should filter by search (case-insensitive)', () => {
    expect(filterProjects(mockProjects, { search: 'apple' })).toHaveLength(1);
    expect(filterProjects(mockProjects, { search: 'APPLE' })).toHaveLength(1);
  });

  it('should return empty for no match', () => {
    expect(filterProjects(mockProjects, { search: 'xyz' })).toHaveLength(0);
  });

  it('should combine status + search', () => {
    const result = filterProjects(mockProjects, { status: 'draft', search: 'banana' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Banana');
  });
});

describe('sortProjects', () => {
  const allTitles = () => sortProjects(mockProjects, 'updatedAt', 'desc').map(p => p.title);

  it('should sort by updatedAt desc (largest first)', () => {
    // Zebra(9) > Banana(8) > Apple(7)
    expect(allTitles()).toEqual(['Zebra', 'Banana', 'Apple']);
  });

  it('should sort by updatedAt asc (smallest first)', () => {
    const r = sortProjects(mockProjects, 'updatedAt', 'asc').map(p => p.title);
    expect(r).toEqual(['Apple', 'Banana', 'Zebra']);
  });

  it('should sort by createdAt desc', () => {
    // Banana(10) > Zebra(9) > Apple(8)
    const r = sortProjects(mockProjects, 'createdAt', 'desc').map(p => p.title);
    expect(r).toEqual(['Banana', 'Zebra', 'Apple']);
  });

  it('should sort by title alphabetically (asc)', () => {
    // Apple < Banana < Zebra
    const r = sortProjects(mockProjects, 'title', 'asc').map(p => p.title);
    expect(r).toEqual(['Apple', 'Banana', 'Zebra']);
  });

  it('should sort by title desc', () => {
    const r = sortProjects(mockProjects, 'title', 'desc').map(p => p.title);
    expect(r).toEqual(['Zebra', 'Banana', 'Apple']);
  });

  it('should sort by duration desc', () => {
    // Banana(120) > Apple(60) > Zebra(30)
    const r = sortProjects(mockProjects, 'duration', 'desc').map(p => p.title);
    expect(r).toEqual(['Banana', 'Apple', 'Zebra']);
  });

  it('should sort by duration asc', () => {
    const r = sortProjects(mockProjects, 'duration', 'asc').map(p => p.title);
    expect(r).toEqual(['Zebra', 'Apple', 'Banana']);
  });

  it('should not mutate original array', () => {
    const original = mockProjects.map(p => p.id);
    sortProjects(mockProjects, 'title', 'asc');
    expect(mockProjects.map(p => p.id)).toEqual(original);
  });
});

describe('filterProjects — additional filters', () => {
  it('should filter by starred=true', () => {
    const result = filterProjects(mockProjects, { starred: true });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Zebra');
  });

  it('should filter by starred=false', () => {
    const result = filterProjects(mockProjects, { starred: false });
    expect(result).toHaveLength(2);
  });

  it('should filter by tags (any-of match)', () => {
    const result = filterProjects(mockProjects, { tags: ['fruit'] });
    expect(result.map(p => p.title).sort()).toEqual(['Apple', 'Banana']);
  });

  it('should match search against description (not just title)', () => {
    const projects: Project[] = [
      {
        id: '1',
        title: 'X',
        status: 'draft',
        createdAt: '',
        updatedAt: '',
        duration: 0,
        size: 0,
        tags: [],
        starred: false,
        description: 'introduction to bananas',
      },
      {
        id: '2',
        title: 'Y',
        status: 'draft',
        createdAt: '',
        updatedAt: '',
        duration: 0,
        size: 0,
        tags: [],
        starred: false,
      },
    ];
    const result = filterProjects(projects, { search: 'bananas' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('updateProject', () => {
  it('overrides fields and bumps updatedAt to a fresh ISO string', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-07T12:34:56.000Z'));
    try {
      const original: Project = {
        id: '1',
        title: 'Old',
        status: 'draft',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        duration: 0,
        size: 0,
        tags: [],
        starred: false,
      };
      const result = updateProject(original, { title: 'New' });
      expect(result.title).toBe('New');
      expect(result.id).toBe('1');
      expect(result.status).toBe('draft');
      expect(result.updatedAt).toBe('2026-08-07T12:34:56.000Z');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not mutate the original project', () => {
    const original: Project = {
      id: '1',
      title: 'Old',
      status: 'draft',
      createdAt: 'x',
      updatedAt: 'y',
      duration: 0,
      size: 0,
      tags: [],
      starred: false,
    };
    updateProject(original, { title: 'New' });
    expect(original.title).toBe('Old');
    expect(original.updatedAt).toBe('y');
  });
});

describe('getStatusColor', () => {
  it('returns semantic tag color for each known status', () => {
    expect(getStatusColor('draft')).toBe('default');
    expect(getStatusColor('processing')).toBe('processing');
    expect(getStatusColor('completed')).toBe('success');
    expect(getStatusColor('failed')).toBe('error');
  });
});
