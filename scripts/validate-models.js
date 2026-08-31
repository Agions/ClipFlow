/**
 * Validate that all Rust model IDs exist in the frontend catalog.
 *
 * This script is called from build.rs during `cargo build` to ensure
 * the Rust models.json stays in sync with the frontend AI_MODELS catalog.
 *
 * Usage: node scripts/validate-models.js
 * Exit 0 = valid, Exit 1 = mismatch found
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const FRONTEND_CATALOG = resolve(ROOT, 'src/core/config/ai-models/catalog.ts');
const RUST_MODELS = resolve(ROOT, 'src-tauri/src/llm/models.json');

function extractFrontendModelIds(content) {
  const ids = new Set();
  const regex = /id:\s*'([^']+)'/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

function extractRustModelIds(content) {
  const data = JSON.parse(content);
  return new Set(data.map(m => m.id));
}

function main() {
  const catalog = readFileSync(FRONTEND_CATALOG, 'utf-8');
  const models = readFileSync(RUST_MODELS, 'utf-8');

  const frontendIds = extractFrontendModelIds(catalog);
  const rustIds = extractRustModelIds(models);

  const missingInFrontend = [...rustIds].filter(id => !frontendIds.has(id));
  const unusedInRust = [...rustIds].filter(id => !frontendIds.has(id));

  if (missingInFrontend.length > 0) {
    console.error('[模型同步校验失败] 以下 Rust 模型在前端目录中不存在:');
    missingInFrontend.forEach(id => console.error(`  - ${id}`));
    console.error('\n请更新 src-tauri/src/llm/models.json 以匹配前端 catalog.ts');
    process.exit(1);
  }

  console.log(`[模型同步校验通过] ${rustIds.size} 个 Rust 模型均在前端目录中存在`);
}

main();
