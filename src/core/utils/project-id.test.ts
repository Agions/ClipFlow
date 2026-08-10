/**
 * normalizeProjectId / buildProjectIdCandidates — 单元测试
 */
import { describe, it, expect } from 'vitest';
import { normalizeProjectId, buildProjectIdCandidates } from './project-id';

describe('normalizeProjectId', () => {
  it('trims whitespace', () => {
    expect(normalizeProjectId('  abc  ')).toBe('abc');
  });

  it('strips .json suffix (case-insensitive)', () => {
    expect(normalizeProjectId('abc.json')).toBe('abc');
    expect(normalizeProjectId('abc.JSON')).toBe('abc');
    expect(normalizeProjectId('abc.Json')).toBe('abc');
  });

  it('keeps name without .json suffix', () => {
    expect(normalizeProjectId('abc')).toBe('abc');
  });

  it('only strips trailing .json', () => {
    expect(normalizeProjectId('abc.json.bak')).toBe('abc.json.bak');
  });
});

describe('buildProjectIdCandidates', () => {
  it('returns array of unique candidates for simple id', () => {
    const result = buildProjectIdCandidates('p1');
    expect(result).toContain('p1');
    expect(result.length).toBeGreaterThan(0);
  });

  it('strips .json suffix', () => {
    const result = buildProjectIdCandidates('p1.json');
    expect(result).toContain('p1');
    expect(result).not.toContain('p1.json');
  });

  it('handles path-like ids (basename extraction)', () => {
    const result = buildProjectIdCandidates('/tmp/projects/p2.json');
    expect(result).toContain('p2');
  });

  it('decodes URI-encoded ids', () => {
    const encoded = encodeURIComponent('项目-1');
    const result = buildProjectIdCandidates(encoded);
    expect(result).toContain('项目-1');
  });

  it('returns empty list for empty input', () => {
    const result = buildProjectIdCandidates('');
    // raw '' → normalized '' is filtered by Boolean filter
    expect(result).toEqual([]);
  });

  it('deduplicates when raw and basename are the same', () => {
    const result = buildProjectIdCandidates('p3');
    const uniqueCount = new Set(result).size;
    expect(uniqueCount).toBe(result.length);
  });

  it('handles invalid URI sequences gracefully', () => {
    // "%E0%A4%A" is invalid URI — decodeURIComponent throws, falls back to raw
    const result = buildProjectIdCandidates('bad%E0%A4%A');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
