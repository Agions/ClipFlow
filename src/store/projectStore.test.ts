/**
 * projectStore 过滤和排序逻辑测试
 */
import { describe, it, expect } from 'vitest';
import { filterProjects, sortProjects, type ProjectSortBy, type SortOrder } from './projectStore';
import type { Project } from '../core/types';

// 测试数据：每个字段值都不同，避免意外的 tie-breaking
const mockProjects: Project[] = [
  { id: '1', title: 'Zebra',   status: 'draft',     createdAt: '1970-01-01T00:00:09.000Z', updatedAt: '1970-01-01T00:00:09.000Z', duration: 30  },
  { id: '2', title: 'Apple',   status: 'completed', createdAt: '1970-01-01T00:00:08.000Z', updatedAt: '1970-01-01T00:00:07.000Z', duration: 60  },
  { id: '3', title: 'Banana',  status: 'draft',     createdAt: '1970-01-01T00:00:10.000Z', updatedAt: '1970-01-01T00:00:08.000Z', duration: 120 },
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
