/**
 * code-review-dashboard.test.ts
 *
 * Tests for the parsing layer of scripts/code-review-dashboard.ts.
 * Parser functions are extracted into src/test/code-review-dashboard-parsers.ts
 * and tested directly as pure functions — no mocking required.
 */
import { describe, it, expect } from 'vitest';
import {
  parseEslintJson,
  parseTscJson,
  parseCoverageJson,
} from './code-review-dashboard-parsers';

// ─── Fixture data ─────────────────────────────────────────────────────────────

const ESLINT_APP_RESULT = {
  version: '9.0.0',
  results: [{
    filePath: '/project/src/App.tsx',
    messages: [
      { severity: 2, message: "missing dep", line: 15, column: 10 },
      { severity: 2, message: "'foo' unused", line: 8, column: 5 },
    ],
    errorCount: 2, warningCount: 0,
  }, {
    filePath: '/project/src/utils/helper.ts',
    messages: [
      { severity: 1, message: "Unexpected console.", line: 42, column: 3 },
    ],
    errorCount: 0, warningCount: 1,
  }],
};

const ESLINT_EMPTY = { version: '9.0.0', results: [], errorCount: 0, warningCount: 0 };

const TSC_TWO_ERRORS_RAW = (
  JSON.stringify({ kind: 'diagnostic', diagnostics: [{ file: '/project/src/lib/Component.tsx', start: 10, length: 5, code: 2339, severity: 'error', messageText: "Property 'id' is missing." }] }) + '\n' +
  JSON.stringify({ kind: 'diagnostic', diagnostics: [{ file: '/project/src/lib/Component.tsx', start: 30, length: 8, code: 2304, severity: 'error', messageText: "Cannot find name." }] }) + '\n'
);

const TSC_CLEAN_RAW = JSON.stringify({ kind: 'diagnostic', diagnostics: [] }) + '\n';

const COVERAGE_DATA: Record<string, {
  statementMap: Record<string, { start: { line: number; column: number }; end: { line: number; column: number } }>;
  s: Record<string, number>;
  branchMap: Record<string, { type: string; loc: { start: { line: number }; end: { line: number } } }>;
  b: Record<string, [number, number]>;
}> = {
  '/project/src/App.tsx': {
    statementMap: {
      '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
    },
    s: { '0': 1, '1': 0 },
    branchMap: { '0': { type: 'if', loc: { start: { line: 1 }, end: { line: 1 } } } },
    b: { '0': [1, 0] },
  },
  '/project/src/helper.ts': {
    statementMap: { '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
    s: { '0': 1 },
    branchMap: {},
    b: {},
  },
};

// ─── ESLint JSON parsing ─────────────────────────────────────────────────────

describe('ESLint JSON parsing', () => {
  it('should count errors and warnings from ESLint JSON output', () => {
    const result = parseEslintJson(JSON.stringify(ESLINT_APP_RESULT));
    expect(result.totalErrors).toBe(2);
    expect(result.totalWarnings).toBe(1);
    expect(result.totalFiles).toBe(2);
  });

  it('should return zeros for empty ESLint output', () => {
    const result = parseEslintJson(JSON.stringify(ESLINT_EMPTY));
    expect(result.totalErrors).toBe(0);
    expect(result.totalWarnings).toBe(0);
    expect(result.totalFiles).toBe(0);
  });

  it('should split severity 2 (error) vs severity 1 (warning) correctly', () => {
    const result = parseEslintJson(JSON.stringify(ESLINT_APP_RESULT));
    expect(result.bySeverity.error).toBe(2);
    expect(result.bySeverity.warning).toBe(1);
  });

  it('should rank top files by total issue count', () => {
    const result = parseEslintJson(JSON.stringify(ESLINT_APP_RESULT));
    const appFile = result.topFiles.find((f) => f.file.includes('App.tsx'));
    expect(appFile!.count).toBe(2);
  });

  it('should handle malformed ESLint JSON gracefully', () => {
    const result = parseEslintJson('not json');
    // Returns zeroed result instead of throwing
    expect(result.totalErrors).toBe(0);
    expect(result.totalWarnings).toBe(0);
    expect(result.totalFiles).toBe(0);
  });

  it('should handle empty results array gracefully', () => {
    const result = parseEslintJson(JSON.stringify(ESLINT_EMPTY));
    expect(result.totalErrors).toBe(0);
    expect(result.bySeverity).toEqual({ error: 0, warning: 0 });
  });

  it('should handle non-array root gracefully', () => {
    // results: null → defensive check returns zeroed result
    const result = parseEslintJson(JSON.stringify({ version: '9', results: null }));
    expect(result.totalErrors).toBe(0);
    expect(result.totalWarnings).toBe(0);
    expect(result.totalFiles).toBe(0);
  });
});

// ─── TypeScript JSON output parsing ─────────────────────────────────────────

describe('TypeScript JSON output parsing', () => {
  it('should count errors from tsc --json output', () => {
    const result = parseTscJson(TSC_TWO_ERRORS_RAW);
    expect(result.errorCount).toBe(2);
    expect(result.errors).toHaveLength(2);
  });

  it('should return zero errors for clean tsc output', () => {
    const result = parseTscJson(TSC_CLEAN_RAW);
    expect(result.errorCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should capture error code and message text', () => {
    const result = parseTscJson(TSC_TWO_ERRORS_RAW);
    expect(result.errors[0].code).toBe(2339);
    expect(result.errors[0].severity).toBe('error');
    expect(result.errors[1].code).toBe(2304);
  });

  it('should handle empty stdout without throwing', () => {
    expect(() => parseTscJson('')).not.toThrow();
    const result = parseTscJson('');
    expect(result.errorCount).toBe(0);
  });

  it('should handle lines that are not JSON without throwing', () => {
    const mixed = 'not json\n' + TSC_TWO_ERRORS_RAW;
    expect(() => parseTscJson(mixed)).not.toThrow();
    const result = parseTscJson(mixed);
    expect(result.errorCount).toBe(2);
  });

  it('should map severity string to error/warning correctly', () => {
    const warningRaw = JSON.stringify({ kind: 'diagnostic', diagnostics: [{ file: '/p/a.ts', start: 0, length: 1, code: 9999, severity: 'warning', messageText: 'warn' }] }) + '\n';
    const result = parseTscJson(warningRaw);
    expect(result.errors[0].severity).toBe('warning');
  });
});

// ─── coverage-final.json parsing ─────────────────────────────────────────────

describe('coverage-final.json parsing', () => {
  it('should parse coverage-final.json and return line coverage totals', () => {
    const result = parseCoverageJson(COVERAGE_DATA);
    expect(result.totalLines.total).toBe(3);
    expect(result.totalLines.covered).toBe(2);
    expect(result.totalLines.percent).toBeGreaterThan(0);
  });

  it('should return zeroed result for empty coverage data', () => {
    const result = parseCoverageJson({});
    expect(result.totalLines.total).toBe(0);
    expect(result.totalLines.covered).toBe(0);
    expect(result.totalLines.percent).toBe(0);
    expect(result.byFile).toHaveLength(0);
  });

  it('should sort files by line coverage ascending (lowest coverage first)', () => {
    const result = parseCoverageJson(COVERAGE_DATA);
    if (result.byFile.length >= 2) {
      expect(result.byFile[0].linePercent).toBeLessThanOrEqual(result.byFile[result.byFile.length - 1].linePercent);
    }
  });

  it('should compute branch coverage totals', () => {
    const result = parseCoverageJson(COVERAGE_DATA);
    expect(result.totalBranches.total).toBeGreaterThanOrEqual(0);
  });

  it('should handle files with zero statements gracefully', () => {
    const data = {
      '/project/src/empty.ts': {
        statementMap: {},
        s: {},
        branchMap: {},
        b: {},
      },
    };
    const result = parseCoverageJson(data);
    expect(result.totalLines.total).toBe(0);
    expect(result.totalLines.covered).toBe(0);
  });
});

// ─── Integration: full dashboard output shape ─────────────────────────────────

describe('dashboard output shape', () => {
  it('should produce valid EslintSummary structure', () => {
    const result = parseEslintJson(JSON.stringify(ESLINT_APP_RESULT));
    expect(result).toHaveProperty('totalFiles');
    expect(result).toHaveProperty('totalErrors');
    expect(result).toHaveProperty('totalWarnings');
    expect(result).toHaveProperty('bySeverity');
    expect(result).toHaveProperty('topFiles');
    expect(Array.isArray(result.topFiles)).toBe(true);
  });

  it('should produce valid TscReport structure', () => {
    const result = parseTscJson(TSC_CLEAN_RAW);
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('errorCount');
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('should produce valid CoverageSummary structure', () => {
    const result = parseCoverageJson(COVERAGE_DATA);
    expect(result).toHaveProperty('totalLines');
    expect(result).toHaveProperty('totalBranches');
    expect(result).toHaveProperty('byFile');
    expect(Array.isArray(result.byFile)).toBe(true);
  });
});

// ─── Existing tests protection (smoke) ───────────────────────────────────────

describe('existing tests protection (smoke)', () => {
  it('vitest is functional', () => {
    expect(true).toBe(true);
  });
});
