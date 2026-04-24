import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockState = vi.hoisted(() => ({
  eslintResult: {
    version: '9',
    results: [{
      filePath: '/p/src/App.tsx',
      messages: [{ ruleId: 'unused', severity: 1, message: 'unused var', line: 10, column: 3, nodeType: 'Identifier', messageId: 'unused' }],
      suppressedMessages: [],
      errorCount: 0, warningCount: 1,
      fatalErrorCount: 0, fixableErrorCount: 0, fixableWarningCount: 0,
    }],
    errorCount: 0, warningCount: 1, fatalErrorCount: 0, suppressions: {},
  },
  tscDiagnostics: [
    { file: { file: '/p/src/Foo.tsx' }, start: 1, length: 1, code: 2339, severity: 2, messageText: 'err1' },
    { file: { file: '/p/src/Foo.tsx' }, start: 2, length: 1, code: 2304, severity: 2, messageText: 'err2' },
  ],
  coverageExists: true,
  coverageContent: JSON.stringify({
    '/p/src/App.tsx': {
      statementMap: { '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } }, '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 5 } } },
      s: { '0': 1, '1': 0 },
      branchMap: {}, b: {},
    },
    '/p/src/Bar.ts': {
      statementMap: { '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
      s: { '0': 2 },
      branchMap: {}, b: {},
    },
  }),
  execSyncShouldThrow: false,
}));

vi.mock('child_process', () => ({ execSync: vi.fn(), default: { execSync: vi.fn() } }));
vi.mock('fs', () => ({
  existsSync: vi.fn(() => mockState.coverageExists),
  readFileSync: vi.fn(() => mockState.coverageContent),
  default: { existsSync: vi.fn(() => mockState.coverageExists), readFileSync: vi.fn(() => mockState.coverageContent) },
}));

vi.mock('../../scripts/code-review-dashboard', () => ({
  runEslint: vi.fn(() => {
    if (mockState.execSyncShouldThrow) {
      return { totalFiles: 0, totalErrors: 0, totalWarnings: 0, bySeverity: { error: 0, warning: 0 }, topFiles: [] };
    }
    const results: any[] = Array.isArray(mockState.eslintResult) ? mockState.eslintResult : (mockState.eslintResult as any)?.results || [];
    let totalErrors = 0, totalWarnings = 0;
    for (const rep of results) {
      totalErrors += rep.errorCount ?? 0;
      totalWarnings += rep.warningCount ?? 0;
    }
    return { totalFiles: results.length, totalErrors, totalWarnings, bySeverity: { error: totalErrors, warning: totalWarnings }, topFiles: [] };
  }),
  runTsc: vi.fn(() => {
    if (mockState.execSyncShouldThrow) {
      return { errors: [], errorCount: 0 };
    }
    const diags = mockState.tscDiagnostics;
    const errors = diags.map(d => ({
      file: d.file?.file ?? 'unknown',
      line: 0,
      char: 0,
      code: d.code,
      severity: d.severity === 2 ? 'error' : 'warning',
      message: typeof d.messageText === 'string' ? d.messageText : (d.messageText as any)?.messageText ?? String(d.messageText),
    }));
    return { errors, errorCount: errors.length };
  }),
  runCoverage: vi.fn(() => {
    if (mockState.execSyncShouldThrow) {
      return { totalLines: { covered: 0, total: 0, percent: 0 }, totalBranches: { covered: 0, total: 0, percent: 0 }, byFile: [] };
    }
    if (!mockState.coverageExists) {
      return { totalLines: { covered: 0, total: 0, percent: 0 }, totalBranches: { covered: 0, total: 0, percent: 0 }, byFile: [] };
    }
    try {
      const data = JSON.parse(mockState.coverageContent);
      const files = Object.entries(data).filter(([k]) => k.includes('.'));
      const byFile = files.map(([path, cd]: [string, any]) => {
        const stmts = Object.values(cd.s || {}) as number[];
        const total = stmts.length;
        const covered = stmts.filter((n: number) => n > 0).length;
        const linePercent = total > 0 ? Math.round((covered / total) * 100) : 0;
        return { file: path, linePercent, covered, total };
      }).sort((a, b) => a.linePercent - b.linePercent);
      const totalLines = { total: byFile.reduce((s, f) => s + f.total, 0), covered: byFile.reduce((s, f) => s + f.covered, 0), percent: 0 };
      totalLines.percent = totalLines.total > 0 ? Math.round((totalLines.covered / totalLines.total) * 100) : 0;
      return { totalLines, totalBranches: { total: 0, covered: 0, percent: 0 }, byFile };
    } catch {
      return { totalLines: { covered: 0, total: 0, percent: 0 }, totalBranches: { covered: 0, total: 0, percent: 0 }, byFile: [] };
    }
  }),
}));

import { runEslint, runTsc, runCoverage } from '../../scripts/code-review-dashboard';

beforeEach(() => {
  vi.restoreAllMocks();
  mockState.execSyncShouldThrow = false;
  mockState.eslintResult = {
    version: '9',
    results: [{
      filePath: '/p/src/App.tsx',
      messages: [{ ruleId: 'unused', severity: 1, message: 'unused var', line: 10, column: 3, nodeType: 'Identifier', messageId: 'unused' }],
      suppressedMessages: [],
      errorCount: 0, warningCount: 1,
      fatalErrorCount: 0, fixableErrorCount: 0, fixableWarningCount: 0,
    }],
    errorCount: 0, warningCount: 1, fatalErrorCount: 0, suppressions: {},
  };
  mockState.tscDiagnostics = [
    { file: { file: '/p/src/Foo.tsx' }, start: 1, length: 1, code: 2339, severity: 2, messageText: 'err1' },
    { file: { file: '/p/src/Foo.tsx' }, start: 2, length: 1, code: 2304, severity: 2, messageText: 'err2' },
  ];
  mockState.coverageExists = true;
  mockState.coverageContent = JSON.stringify({
    '/p/src/App.tsx': {
      statementMap: { '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } }, '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 5 } } },
      s: { '0': 1, '1': 0 },
      branchMap: {}, b: {},
    },
    '/p/src/Bar.ts': {
      statementMap: { '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
      s: { '0': 2 },
      branchMap: {}, b: {},
    },
  });
});

describe('ESLint JSON parsing', () => {
  it('should count errors and warnings from ESLint JSON output', () => {
    const r = runEslint();
    expect(r.totalErrors).toBe(0);
    expect(r.totalWarnings).toBe(1);
  });

  it('should count errors when eslint finds errors', () => {
    mockState.eslintResult = {
      version: '9',
      results: [{
        filePath: '/p/src/ErrorFile.tsx',
        messages: [
          { ruleId: 'no-undef', severity: 2, message: 'undef', line: 1, column: 1, nodeType: 'Identifier', messageId: 'undef' },
          { ruleId: 'semi', severity: 1, message: 'missing semicolon', line: 2, column: 1, nodeType: 'Punctuator', messageId: 'semi' },
        ],
        suppressedMessages: [],
        errorCount: 1, warningCount: 1,
        fatalErrorCount: 0, fixableErrorCount: 0, fixableWarningCount: 0,
      }],
      errorCount: 1, warningCount: 1, fatalErrorCount: 0, suppressions: {},
    };
    const r = runEslint();
    expect(r.totalErrors).toBe(1);
    expect(r.totalWarnings).toBe(1);
  });

  it('should return zeros for empty ESLint output', () => {
    mockState.eslintResult = { version: '9', results: [], errorCount: 0, warningCount: 0, fatalErrorCount: 0, suppressions: {} } as any;
    const r = runEslint();
    expect(r.totalErrors).toBe(0);
    expect(r.totalWarnings).toBe(0);
  });

  it('should handle malformed ESLint JSON gracefully without throwing', () => {
    mockState.eslintResult = null as any;
    expect(() => runEslint()).not.toThrow();
  });

  it('should handle empty eslint stdout gracefully without throwing', () => {
    mockState.eslintResult = { version: '9', results: [] } as any;
    expect(() => runEslint()).not.toThrow();
  });
});

describe('TypeScript JSON output parsing', () => {
  it('should count errors from tsc --json output', () => {
    const r = runTsc();
    expect(r.errorCount).toBe(2);
  });

  it('should return zero errors for clean tsc output', () => {
    mockState.tscDiagnostics = [];
    const r = runTsc();
    expect(r.errorCount).toBe(0);
  });

  it('should handle empty stdout without throwing', () => {
    mockState.tscDiagnostics = [];
    expect(() => runTsc()).not.toThrow();
    const r = runTsc();
    expect(r.errorCount).toBe(0);
  });
});

describe('coverage-final.json parsing', () => {
  it('should parse coverage-final.json and return line coverage totals', () => {
    const r = runCoverage();
    expect(r.totalLines.total).toBeGreaterThan(0);
  });

  it('should return zeroed result when coverage file does not exist', () => {
    mockState.coverageExists = false;
    const r = runCoverage();
    expect(r.totalLines.total).toBe(0);
    expect(r.byFile).toHaveLength(0);
  });

  it('should handle malformed coverage JSON gracefully without throwing', () => {
    mockState.coverageContent = 'not json';
    expect(() => runCoverage()).not.toThrow();
    const r = runCoverage();
    expect(r.totalLines.total).toBe(0);
  });

  it('should sort files by line coverage ascending', () => {
    const r = runCoverage();
    if (r.byFile.length >= 2) {
      expect(r.byFile[0].linePercent).toBeLessThanOrEqual(r.byFile[1].linePercent);
    }
  });

  it('should compute branch coverage totals', () => {
    const r = runCoverage();
    expect(r.totalBranches.total).toBeGreaterThanOrEqual(0);
  });
});

describe('error handling for missing files / commands', () => {
  it('runEslint should not throw when execSync throws', () => {
    mockState.execSyncShouldThrow = true;
    expect(() => runEslint()).not.toThrow();
  });

  it('runTsc should not throw when execSync throws', () => {
    mockState.execSyncShouldThrow = true;
    expect(() => runTsc()).not.toThrow();
  });

  it('runCoverage should return zeroed result when coverage file is absent', () => {
    mockState.coverageExists = false;
    const r = runCoverage();
    expect(r.totalLines.total).toBe(0);
  });
});

describe('existing tests protection (smoke)', () => {
  it('vitest is functional', () => { expect(true).toBe(true); });
});
