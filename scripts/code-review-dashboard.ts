#!/usr/bin/env node
/**
 * scripts/code-review-dashboard.ts
 *
 * Code Quality Dashboard for CutDeck
 * Parses ESLint, TypeScript, and test coverage reports.
 *
 * Usage:
 *   - Local:       npx ts-node scripts/code-review-dashboard.ts
 *   - CI (JSON):   npx ts-node scripts/code-review-dashboard.ts --json
 *
 * Output:
 *   - CI/--json:   reports/code-quality.json
 *   - Local:       human-readable summary to stdout
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = join(__filename, '..');
const ROOT       = join(__dirname, '..');  // project root

// ─── Types ────────────────────────────────────────────────────────────────────

interface EslintMessage {
  ruleId: string | null;
  severity: number;
  line: number;
  column: number;
  message: string;
  file: string;
}

interface EslintWarning {
  filePath: string;
  messages: EslintMessage[];
  errorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
}

interface EslintSummary {
  totalFiles: number;
  totalErrors: number;
  totalWarnings: number;
  bySeverity: { error: number; warning: number };
  topFiles: Array<{ file: string; count: number }>;
}

interface TscIssue {
  file: string;
  line: number;
  char: number;
  code: number;
  severity: string;
  message: string;
}

interface TscReport {
  errors: TscIssue[];
  errorCount: number;
}

interface CoverageFile {
  path: string;
  lineCovered: number;
  lineTotal: number;
  linePercent: number;
  branchCovered: number;
  branchTotal: number;
  branchPercent: number;
}

interface CoverageSummary {
  totalLines: { covered: number; total: number; percent: number };
  totalBranches: { covered: number; total: number; percent: number };
  byFile: CoverageFile[];
}

interface QualityReport {
  generatedAt: string;
  branch: string;
  isCI: boolean;
  eslint: EslintSummary;
  typescript: TscReport;
  coverage: CoverageSummary;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isCI = process.env.CI === 'true' || !!process.env.GITHUB_ACTIONS;

// Injectable executor for testing — set via __setExecutor() before calling run* functions
let _execSync = execSync;
let _existsSync = existsSync;
let _readFileSync = readFileSync;

/** @internal — used by tests to inject mock implementations */
export function __setExecutor(opts: {
  execSync?: (cmd: string) => string;
  existsSync?: (path: string) => boolean;
  readFileSync?: (path: string) => string;
}) {
  if (opts.execSync)    _execSync    = opts.execSync;
  if (opts.existsSync)  _existsSync  = opts.existsSync;
  if (opts.readFileSync) _readFileSync = opts.readFileSync;
}

function runCmd(cmd: string, cwd: string = ROOT): string {
  try {
    return _execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'stdout' in e) {
      return (e as { stdout: string }).stdout ?? '';
    }
    return '';
  }
}

function green(text: string) { return `\x1b[32m${text}\x1b[0m`; }
function red(text: string)   { return `\x1b[31m${text}\x1b[0m`; }
function yellow(text: string){ return `\x1b[33m${text}\x1b[0m`; }
function bold(text: string)  { return `\x1b[1m${text}\x1b[0m`; }
function dim(text: string)   { return `\x1b[2m${text}\x1b[0m`; }

// ─── ESLint ───────────────────────────────────────────────────────────────────

function runEslint(): EslintSummary {
  console.log(dim('[1/3] Running ESLint...'));
  let raw = '';
  try {
    raw = _execSync('eslint src --format json --max-warnings 9999', {
      cwd: ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e: unknown) {
    // ESLint exits non-zero when it finds errors; capture what it wrote to stdout
    if (e && typeof e === 'object' && 'stdout' in e) {
      raw = (e as { stdout: string }).stdout ?? '';
    }
  }

  let reports: EslintWarning[] = [];
  try {
    const parsed = JSON.parse(raw) as { results?: unknown };
    if (!Array.isArray(parsed.results)) {
      console.warn(dim('  ESLint: failed to parse JSON output'));
      return { totalFiles: 0, totalErrors: 0, totalWarnings: 0, bySeverity: { error: 0, warning: 0 }, topFiles: [] };
    }
    reports = parsed.results as EslintWarning[];
  } catch {
    console.warn(dim('  ESLint: failed to parse JSON output'));
    return { totalFiles: 0, totalErrors: 0, totalWarnings: 0, bySeverity: { error: 0, warning: 0 }, topFiles: [] };
  }

  const totalErrors   = reports.reduce((s, r) => s + r.errorCount, 0);
  const totalWarnings = reports.reduce((s, r) => s + r.warningCount, 0);

  // Count by severity (severity 2 = error, 1 = warning)
  const bySeverity = { error: 0, warning: 0 };
  for (const rep of reports) {
    for (const msg of rep.messages) {
      if (msg.severity === 2) bySeverity.error++;
      else if (msg.severity === 1) bySeverity.warning++;
    }
  }

  // Top 10 files by error+warning count
  const fileCounts: Record<string, number> = {};
  for (const rep of reports) {
    fileCounts[rep.filePath] = (fileCounts[rep.filePath] ?? 0) + rep.errorCount + rep.warningCount;
  }
  const topFiles = Object.entries(fileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file: relative(ROOT, file), count }));

  return { totalFiles: reports.length, totalErrors, totalWarnings, bySeverity, topFiles };
}

// ─── TypeScript ───────────────────────────────────────────────────────────────

function runTsc(): TscReport {
  console.log(dim('[2/3] Running TypeScript check...'));
  let raw = '';
  try {
    raw = _execSync('tsc --noEmit --json', {
      cwd: ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'stdout' in e) {
      raw = (e as { stdout: string }).stdout ?? '';
    }
  }
  const errors: TscIssue[] = [];
  for (const line of raw.split('\n').filter(Boolean)) {
    try {
      const obj = JSON.parse(line);
      if (obj.kind === 'diagnostic' && obj.diagnostics?.length) {
        for (const d of obj.diagnostics) {
          errors.push({
            file:       d.file?.file ?? 'unknown',
            line:       d.file?.getLineAndCharacterOfPosition(d.start)?.line ?? 0,
            char:       d.file?.getLineAndCharacterOfPosition(d.start)?.character ?? 0,
            code:       d.code,
            severity:   d.severity === 'error' ? 'error' : 'warning',
            message:    d.messageText,
          });
        }
      }
    } catch {
      // skip unparseable lines
    }
  }

  return { errors, errorCount: errors.length };
}

// ─── Coverage ────────────────────────────────────────────────────────────────

function runCoverage(): CoverageSummary {
  console.log(dim('[3/3] Reading coverage report...'));

  // vitest generates coverage-final.json (not coverage-summary.json)
  const coveragePath = join(ROOT, 'coverage/coverage-final.json');
  if (!_existsSync(coveragePath)) {
    console.warn(dim('  Coverage: coverage-final.json not found, skipping'));
    return {
      totalLines: { covered: 0, total: 0, percent: 0 },
      totalBranches: { covered: 0, total: 0, percent: 0 },
      byFile: [],
    };
  }

  let data: Record<string, {
    statementMap: Record<string, { start: { line: number; column: number }; end: { line: number; column: number } }>;
    s: Record<string, number>;
    branchMap: Record<string, { type: string; loc: { start: { line: number; column: number }; end: { line: number; column: number } }[] }>;
    b: Record<string, number[]>;
  }>;
  try {
    data = JSON.parse(_readFileSync(coveragePath));
  } catch {
    return {
      totalLines: { covered: 0, total: 0, percent: 0 },
      totalBranches: { covered: 0, total: 0, percent: 0 },
      byFile: [],
    };
  }

  let totalLineCovered = 0, totalLineTotal = 0;
  let totalBranchCovered = 0, totalBranchTotal = 0;
  const byFile: CoverageFile[] = [];

  for (const [filePath, fileData] of Object.entries(data)) {
    const statements = fileData.s ?? {};
    const branches   = fileData.b ?? {};

    // Line coverage: count statements that were executed
    const lineCovered = Object.values(statements).filter(v => v > 0).length;
    const lineTotal   = Object.keys(statements).length;
    const linePercent = lineTotal > 0 ? Math.round((lineCovered / lineTotal) * 100) : 0;

    // Branch coverage: count branches that were hit
    let branchCovered = 0, branchTotal = 0;
    for (const hits of Object.values(branches)) {
      for (const h of hits) {
        branchTotal++;
        if (h > 0) branchCovered++;
      }
    }
    const branchPercent = branchTotal > 0 ? Math.round((branchCovered / branchTotal) * 100) : 0;

    totalLineCovered   += lineCovered;
    totalLineTotal     += lineTotal;
    totalBranchCovered += branchCovered;
    totalBranchTotal   += branchTotal;

    byFile.push({
      path:            relative(ROOT, filePath),
      lineCovered,
      lineTotal,
      linePercent,
      branchCovered,
      branchTotal,
      branchPercent,
    });
  }

  byFile.sort((a, b) => a.linePercent - b.linePercent); // lowest coverage first

  const totalLinePercent   = totalLineTotal   > 0 ? Math.round((totalLineCovered   / totalLineTotal)   * 100) : 0;
  const totalBranchPercent = totalBranchTotal > 0 ? Math.round((totalBranchCovered / totalBranchTotal) * 100) : 0;

  return {
    totalLines:    { covered: totalLineCovered,   total: totalLineTotal,   percent: totalLinePercent },
    totalBranches: { covered: totalBranchCovered, total: totalBranchTotal, percent: totalBranchPercent },
    byFile:        byFile.slice(0, 30), // top 30 files
  };
}

// ─── Output ───────────────────────────────────────────────────────────────────

function printSummary(report: QualityReport): void {
  const { eslint, typescript: tsc, coverage } = report;

  console.log('\n' + bold('━━━ Code Quality Dashboard ━━━') + '\n');

  // ESLint section
  {
    const ok = eslint.totalErrors === 0 && eslint.totalWarnings === 0;
    const label = ok ? green('✅ ESLint') : eslint.totalErrors > 0 ? red('❌ ESLint') : yellow('⚠️  ESLint');
    console.log(bold(`${label}  —  ${eslint.totalErrors} errors, ${eslint.totalWarnings} warnings across ${eslint.totalFiles} files`));
    if (eslint.topFiles.length > 0) {
      console.log(dim('  Top issues by file:'));
      for (const { file, count } of eslint.topFiles.slice(0, 5)) {
        console.log(`    ${count.toString().padStart(4)}  ${file}`);
      }
    }
    console.log();
  }

  // TypeScript section
  {
    const ok = tsc.errorCount === 0;
    const label = ok ? green('✅ TypeScript') : red('❌ TypeScript');
    console.log(bold(`${label}  —  ${tsc.errorCount} type error(s)`));
    if (tsc.errors.length > 0) {
      for (const err of tsc.errors.slice(0, 10)) {
        const file = relative(ROOT, err.file);
        console.log(`    ${red('error')} TS${err.code}  ${dim(file + ':' + (err.line + 1))}  ${err.message}`);
      }
      if (tsc.errors.length > 10) {
        console.log(dim(`    ... and ${tsc.errors.length - 10} more`));
      }
    }
    console.log();
  }

  // Coverage section
  {
    const { totalLines: lc, totalBranches: bc } = coverage;
    const lcColor = lc.percent >= 70 ? green : lc.percent >= 50 ? yellow : red;
    const bcColor = bc.percent >= 70 ? green : bc.percent >= 50 ? yellow : red;
    console.log(bold('📊 Coverage'));
    console.log(`   Lines:    ${lcColor(lc.percent + '%')}  (${lc.covered} / ${lc.total})`);
    console.log(`   Branch:   ${bcColor(bc.percent + '%')}  (${bc.covered} / ${bc.total})`);
    if (coverage.byFile.length > 0) {
      console.log(dim('   Lowest line coverage:'));
      for (const f of coverage.byFile.slice(-3)) {
        const c = f.linePercent >= 70 ? green : f.linePercent >= 50 ? yellow : red;
        console.log(`     ${c(f.linePercent.toString().padStart(3) + '%')}  ${f.path}`);
      }
    }
    console.log();
  }
}

function writeJsonReport(report: QualityReport): void {
  const reportsDir = join(ROOT, 'reports');
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
  const outPath = join(reportsDir, 'code-quality.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(dim(`\nJSON report → ${outPath}`));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// ─── Exports (for testing) ─────────────────────────────────────────────────────
export { runEslint, runTsc, runCoverage };

async function main() {
  const jsonMode = process.argv.includes('--json');

  console.log(bold(`\nCutDeck Code Quality Dashboard  ${dim(isCI ? '(CI)' : '(local)')}\n`));

  const eslintReport = runEslint();
  const tscReport    = runTsc();
  const coverage     = runCoverage();

  const branch = process.env.GITHUB_REF?.replace('refs/heads/', '') ?? 'unknown';

  const report: QualityReport = {
    generatedAt: new Date().toISOString(),
    branch,
    isCI,
    eslint: eslintReport,
    typescript: tscReport,
    coverage,
  };

  if (isCI || jsonMode) {
    writeJsonReport(report);
  } else {
    printSummary(report);
  }

  // Exit with error if there are critical issues
  const hasErrors = eslintReport.totalErrors > 0 || tscReport.errorCount > 0;
  process.exit(hasErrors ? 1 : 0);
}

// Guard: only run main() when this file is executed directly (not imported as a module)
const isMainModule = process.argv[1] && import.meta.url.includes(process.argv[1].replace(/^file:\/\//, ''));
if (isMainModule) {
  main().catch((err) => {
    console.error(red('[Fatal]'), err);
    process.exit(2);
  });
}
