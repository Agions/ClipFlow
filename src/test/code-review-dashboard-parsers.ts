/**
 * code-review-dashboard-parsers.ts
 *
 * Standalone parsing functions extracted from scripts/code-review-dashboard.ts.
 * These have NO external dependencies (no child_process, no fs), making them
 * trivially testable with plain Vitest assertions — no mocking needed.
 */

import type { EslintSummary, TscReport, CoverageSummary, TscIssue } from '../scripts/code-review-dashboard';

// ─── ESLint JSON parsing ─────────────────────────────────────────────────────

export interface EslintResultFile {
  filePath: string;
  messages: Array<{
    severity: number;
    message: string;
    line: number;
    column: number;
  }>;
  errorCount: number;
  warningCount: number;
}

export function parseEslintJson(raw: string): EslintSummary {
  let reports: EslintResultFile[] = [];
  try {
    const parsed = JSON.parse(raw) as { results?: unknown };
    if (!Array.isArray(parsed.results)) {
      return { totalFiles: 0, totalErrors: 0, totalWarnings: 0, bySeverity: { error: 0, warning: 0 }, topFiles: [] };
    }
    reports = parsed.results as EslintResultFile[];
  } catch {
    return { totalFiles: 0, totalErrors: 0, totalWarnings: 0, bySeverity: { error: 0, warning: 0 }, topFiles: [] };
  }

  const totalErrors   = reports.reduce((s, r) => s + r.errorCount, 0);
  const totalWarnings = reports.reduce((s, r) => s + r.warningCount, 0);

  const bySeverity = { error: 0, warning: 0 };
  for (const rep of reports) {
    for (const msg of rep.messages) {
      if (msg.severity === 2) bySeverity.error++;
      else if (msg.severity === 1) bySeverity.warning++;
    }
  }

  const fileCounts: Record<string, number> = {};
  for (const rep of reports) {
    fileCounts[rep.filePath] = (fileCounts[rep.filePath] ?? 0) + rep.errorCount + rep.warningCount;
  }
  const topFiles = Object.entries(fileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));

  return { totalFiles: reports.length, totalErrors, totalWarnings, bySeverity, topFiles };
}

// ─── TypeScript JSON output parsing ───────────────────────────────────────────

export function parseTscJson(raw: string): TscReport {
  const errors: TscIssue[] = [];
  for (const line of raw.split('\n').filter(Boolean)) {
    try {
      const obj = JSON.parse(line);
      if (obj.kind === 'diagnostic' && obj.diagnostics?.length) {
        for (const d of obj.diagnostics) {
          errors.push({
            file:     d.file?.file ?? 'unknown',
            line:     0,
            char:     0,
            code:     d.code,
            severity: d.severity === 'error' ? 'error' : 'warning',
            message:  d.messageText,
          });
        }
      }
    } catch {
      // skip unparseable lines
    }
  }
  return { errors, errorCount: errors.length };
}

// ─── Coverage-final.json parsing ─────────────────────────────────────────────

interface CoverageFileEntry {
  path: string;
  statementMap: Record<string, { start: { line: number; column: number }; end: { line: number; column: number } }>;
  s: Record<string, number>;
  branchMap: Record<string, { type: string; loc: { start: { line: number }; end: { line: number } } }>;
  b: Record<string, [number, number]>;
}

export function parseCoverageJson(data: Record<string, CoverageFileEntry>): CoverageSummary {
  const byFile: CoverageSummary['byFile'] = [];

  let totalStatements = 0;
  let coveredStatements = 0;
  let totalBranches = 0;
  let coveredBranches = 0;

  for (const [filePath, entry] of Object.entries(data)) {
    const stmts = Object.values(entry.s);
    const branches = Object.values(entry.b);

    totalStatements += stmts.length;
    coveredStatements += stmts.filter((n) => n > 0).length;

    const branchCount = branches.reduce((acc: number, [t, f]: [number, number]) => {
      return acc + (t > 0 ? 1 : 0) + (f > 0 ? 1 : 0);
    }, 0);
    totalBranches += branchCount;
    coveredBranches += branches.filter(([t, f]) => t > 0 || f > 0).length;

    const fileStmts = stmts.length;
    const fileCovered = stmts.filter((n) => n > 0).length;
    const linePercent = fileStmts > 0 ? Math.round((fileCovered / fileStmts) * 100) : 0;

    byFile.push({ file: filePath, linePercent });
  }

  const totalLines = totalStatements;
  const coveredLines = coveredStatements;
  const totalLinesPercent = totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0;
  const totalBranchesPercent = totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0;

  byFile.sort((a, b) => a.linePercent - b.linePercent);

  return {
    totalLines:  { total: totalLines, covered: coveredLines, percent: totalLinesPercent },
    totalBranches: { total: totalBranches, covered: coveredBranches, percent: totalBranchesPercent },
    byFile,
  };
}
