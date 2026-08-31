#!/usr/bin/env node
/* eslint-disable */
// 文件扩展名为 .cjs 但 package.json type=module 让 Node 25 的 detect-module 误判为 ESM
// 用 CommonJS 风格 require + module.exports
// 强制 CJS 解析：使用 Function 包装避免 __filename 重复声明


const { readFileSync, existsSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { execFileSync } = require('node:child_process');

// __filename / __dirname 在 CommonJS 模式下是内置全局，不需要显式赋值
const ROOT_DIR = resolve(dirname(__filename), '..');

const CSS_PATH = resolve(ROOT_DIR, 'src/styles/globals.css');
const TOKENS_PATH = resolve(ROOT_DIR, 'src/shared/tokens/color-tokens.ts');
const COMPILED_DIR = resolve(ROOT_DIR, '.cache/check-color-tokens');

// ─── 配色：终端输出 ───
const COLOR = {
  red: s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
};

/**
 * 颜色值判定：hex / rgb / rgba / hsl / oklch / color(...) 函数式。
 */
function isColorValue(v) {
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return true;
  if (/^(rgb|rgba|hsl|hsla|oklch|oklab|color)\s*\(/.test(v)) return true;
  return false;
}

/**
 * 颜色规范化（小写、剥空白），用于比较。
 */
function normalizeColor(v) {
  return v.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * 用 tsc 把 color-tokens.ts 编译成 CJS，然后 require 拿真实 token 表。
 * 这是消除"硬编码 29 token 白名单"的关键。
 */
function loadColorTokensFromTs() {
  if (!existsSync(TOKENS_PATH)) {
    throw new Error(`color-tokens.ts 不存在: ${TOKENS_PATH}`);
  }

  const compiledJs = resolve(COMPILED_DIR, 'color-tokens.js');

  // 确保缓存目录存在 + 写入 package.json 强制 CJS（避开项目根 type:module）
  const { mkdirSync, writeFileSync } = require('node:fs');
  mkdirSync(COMPILED_DIR, { recursive: true });
  writeFileSync(
    resolve(COMPILED_DIR, 'package.json'),
    '{"type":"commonjs"}\n',
    'utf8'
  );

  // execFileSync 用 argv 数组避免 shell 解析（即使所有路径都是字面量，也防御性使用）
  try {
    execFileSync(
      'npx',
      [
        'tsc',
        '--target', 'es2020',
        '--module', 'commonjs',
        '--moduleResolution', 'node',
        '--esModuleInterop',
        '--skipLibCheck',
        '--outDir', COMPILED_DIR,
        TOKENS_PATH,
      ],
      { cwd: ROOT_DIR, stdio: 'pipe' }
    );
  } catch (err) {
    const msg = err.stderr ? err.stderr.toString() : err.message;
    throw new Error(`tsc 编译 color-tokens.ts 失败:\n${msg}`);
  }

  if (!existsSync(compiledJs)) {
    throw new Error(`编译产物缺失: ${compiledJs}`);
  }

  // 清除 require 缓存（避免连续运行拿到旧产物）
  delete require.cache[compiledJs];
  // eslint-disable-next-line no-undef
  return require(compiledJs);
}

// ─── 解析 globals.css ───
function parseCssTokens(coreTokenSet) {
  const css = readFileSync(CSS_PATH, 'utf8');

  // 提取 :root { ... } 块
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\s*\}/);
  // 提取 .light { ... } 块（如果存在）
  const lightMatch = css.match(/\.light\s*\{([\s\S]*?)\n\s*\}/);

  function extract(map, block) {
    if (!block) return;
    const tokenRegex = /--([a-z][a-z0-9-]*)\s*:\s*([^;]+);/g;
    let match;
    while ((match = tokenRegex.exec(block)) !== null) {
      const name = match[1];
      const value = match[2].trim();
      // 只收录 color-tokens.ts 中声明的 token（其它 --color-*, --font-*, --space-* 全部跳过）
      if (coreTokenSet.has(name) && isColorValue(value)) {
        map.set(name, value);
      }
    }
  }

  const dark = new Map();
  extract(dark, rootMatch ? rootMatch[1] : null);
  const light = new Map();
  extract(light, lightMatch ? lightMatch[1] : null);
  return { dark, light };
}

// ─── 主流程 ───
function main() {
  console.log(COLOR.bold('\ncheck-color-tokens: 校验 globals.css ↔ color-tokens.ts 双向一致性\n'));

  // 1. 从 color-tokens.ts 加载真实 token 集合
  let tokens;
  try {
    tokens = loadColorTokensFromTs();
  } catch (err) {
    console.log(COLOR.red(`✗ ${err.message}\n`));
    process.exit(1);
  }

  const darkTable = tokens.COLOR_TOKENS;
  const lightTable = tokens.COLOR_TOKENS_LIGHT;
  if (!darkTable) {
    console.log(COLOR.red('✗ color-tokens.ts 未导出 COLOR_TOKENS\n'));
    process.exit(1);
  }

  const coreTokenSet = new Set(Object.keys(darkTable));
  const expectedCount = coreTokenSet.size;

  // 2. 解析 CSS
  const css = parseCssTokens(coreTokenSet);

  const errors = [];
  const warnings = [];

  // ─── 检查 1：CSS 暗色 token 是否都存在于 TS ───
  for (const [name, value] of css.dark) {
    if (!darkTable[name]) {
      errors.push(
        `[CSS-only] '${name}' 在 globals.css 中定义但 color-tokens.ts 缺失（值: ${value}）`
      );
    } else if (normalizeColor(darkTable[name]) !== normalizeColor(value)) {
      errors.push(
        `[dark mismatch] '${name}' 不一致:\n` +
          `  globals.css :root    → ${value}\n` +
          `  color-tokens.ts      → ${darkTable[name]}`
      );
    }
  }

  // ─── 检查 2：TS 中 token 是否都存在于 CSS ───
  for (const name of coreTokenSet) {
    if (!css.dark.has(name)) {
      errors.push(`[TS-only] '${name}' 在 color-tokens.ts 中但 globals.css 缺失`);
    }
  }

  // ─── 检查 3：浅色主题（如 globals.css 定义了 .light）───
  if (css.light.size > 0) {
    if (!lightTable) {
      errors.push('globals.css 定义了 .light 但 color-tokens.ts 缺少 COLOR_TOKENS_LIGHT');
    } else {
      for (const [name, value] of css.light) {
        if (lightTable[name]) {
          if (normalizeColor(lightTable[name]) !== normalizeColor(value)) {
            errors.push(
              `[light mismatch] '${name}' 不一致:\n` +
                `  globals.css .light   → ${value}\n` +
                `  color-tokens.ts      → ${lightTable[name]}`
            );
          }
        } else {
          warnings.push(`[light: CSS-only] '${name}' 在 .light 中定义但 COLOR_TOKENS_LIGHT 缺失`);
        }
      }
      const lightTokenSet = new Set(Object.keys(lightTable));
      for (const name of lightTokenSet) {
        if (!css.light.has(name) && css.dark.has(name)) {
          warnings.push(`[light: TS-only] '${name}' 在 COLOR_TOKENS_LIGHT 中但 globals.css 缺失`);
        }
      }
    }
  } else if (lightTable && Object.keys(lightTable).length > 0) {
    warnings.push(
      `globals.css 未定义 .light 块，但 color-tokens.ts 有 COLOR_TOKENS_LIGHT（${Object.keys(lightTable).length} 项）`
    );
  }

  // ─── 数量统计 ───
  console.log(
    COLOR.dim(
      `  CSS 暗色: ${css.dark.size}  |  TS 暗色: ${css.dark.size}` +
        `  |  CSS 浅色: ${css.light.size}  |  TS 浅色: ${lightTable ? Object.keys(lightTable).length : 0}` +
        `  |  expected count: ${expectedCount}\n`
    )
  );

  // ─── 报告 ───
  if (warnings.length > 0) {
    console.log(COLOR.yellow(`⚠️  ${warnings.length} warnings:`));
    for (const w of warnings) console.log(`  - ${w}`);
    console.log('');
  }

  if (errors.length > 0) {
    console.log(COLOR.red(`✗ ${errors.length} errors:`));
    for (const e of errors) console.log(`  - ${e}`);
    console.log('');
    console.log(
      COLOR.red(
        'check-color-tokens FAILED — 修复后重新运行。\n' + '参考流程见 docs/refactor/DESIGN.md §2.1'
      )
    );
    process.exit(1);
  }

  console.log(
    COLOR.green('✓ check-color-tokens PASSED — globals.css ↔ color-tokens.ts 完全一致\n')
  );
  process.exit(0);
}

main();
