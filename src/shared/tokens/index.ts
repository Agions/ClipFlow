/**
 * shared/tokens — StoryFab 设计 Token 统一出口
 *
 * 架构定位：
 * - **真值**：CSS custom properties 定义于 `src/styles/globals.css :root`
 * - **运行时 fallback**：本目录（用于 SSR / Canvas / 跨窗口 IPC 等无 DOM 环境）
 * - **类型单一可信源**：本目录导出字面量联合类型供全局消费
 *
 * 注意事项：
 * - 新增 token 时同步：`globals.css` + `tailwind.config.ts` + 本目录
 * - CI 校验脚本：`scripts/check-color-tokens.ts`（PR-1.2 同期落地）
 *
 * @see docs/refactor/DESIGN.md §2
 * @see docs/refactor/STAGE-1-PR-PLAN.md §2 PR-1.2
 */

export * from './color-tokens';
export * from './spacing-tokens';
export * from './size-tokens';
