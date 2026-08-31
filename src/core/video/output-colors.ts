/**
 * 渲染层输出颜色 Token（Stage 1 PR-1.5 + CodeReview P0 修复）
 *
 * ⚠️ 重要：与 `@/shared/tokens/color-tokens` 的区别
 * ─────────────────────────────────────────────────────────
 * | 维度 | color-tokens.ts | output-colors.ts（本文件）|
 * |------|----------------|------------------------|
 * | 用途 | UI 主题色 | 视频/字幕输出 |
 * | 跟随主题 | ✅ 是（dark/light）| ❌ 否（固定值）|
 * | 出现位置 | CSS class / style | 序列化到 ASS/SRT/VTT |
 * | 主题切换影响 | 实时响应 | **不应受影响**（产物已生成）|
 *
 * 边界规则（DESIGN.md §3.2）：
 *  - 凡写入 ASS/SRT/VTT/JSON 序列化、跨 IPC 的颜色 → 本文件
 *  - 凡仅 UI 渲染 → `color-tokens.ts`
 *
 * 命名规范：所有 token 用 `OUT_*` 前缀表示"Output · 不可变"。
 *
 * 历史：PR-1.2 阶段曾创建 `src/shared/tokens/video-output-colors.ts`
 * 用 `VideoOutputColor` 联合类型 + `subtitle-text/stroke/bg` 命名；
 * PR-1.5 落地为 `src/core/video/output-colors.ts` 并改用 `OUT_*` 风格。
 * 本次 CodeReview P0-1 合并两份：保留 `OUT_*` 风格 + 全部 8 个 token。
 *
 * @see docs/refactor/DESIGN.md §3.2
 * @see docs/refactor/STAGE-1-PR-PLAN.md §5 PR-1.5
 */

// ─── 字幕文字（白字 + 黑边 + 半透明黑底）─────────────────────────
/** 字幕文字主色（白色） */
export const OUT_SUBTITLE_FG = '#FFFFFF';
/** 字幕文字描边色（黑色） */
export const OUT_SUBTITLE_STROKE = '#000000';
/**
 * 字幕背景底色（半透明黑，alpha = 0.5）
 *
 * ⚠️ CodeReview P0-7：原 `project-setup.tsx` 使用 `rgba(0,0,0,0.5)`，
 * 合并文件时曾误改为 0.7。已回滚为 0.5 保持向后兼容。
 * 透明度调整须同步更新 docs/refactor/DESIGN.md §2.1.5 + CHANGELOG。
 */
export const OUT_SUBTITLE_BG = 'rgba(0, 0, 0, 0.5)';

// ─── 水印 & 导出 ───────────────────────────────────────
/** 水印文字色（白色） */
export const OUT_WATERMARK_TEXT = '#FFFFFF';
/** 导出进度条色（森林绿） */
export const OUT_EXPORT_PROGRESS = '#5A9E6F';

// ─── AI 场景检测调色板（算法语义色）──────────────────────────────
/**
 * 场景检测可视化调色板
 *
 * 设计原则：
 * - 选色与 Tailwind / 主题完全解耦，仅用于 AI 输出（图表/覆盖层）
 * - 高对比度（≥ WCAG AA 在白底上），便于识别不同场景聚类
 * - 色相覆盖光谱，确保相似场景能用色相区隔
 *
 * ⚠️ 修改此处会改变场景缩略图/可视化的视觉编码，须同步更新 docs/DESIGN.md
 */
export const OUT_SCENE_PALETTE: readonly string[] = [
  '#FF6B6B', // coral red
  '#4ECDC4', // turquoise
  '#45B7D1', // sky blue
  '#FFA07A', // light salmon
  '#98D8C8', // mint
  '#F7DC6F', // gold
] as const;

// ─── 语义色 ────────────────────────────────────────────
/**
 * 情感/浪漫风格色（粉红）
 *
 * CodeReview P0-4：`script-config.ts` 的 `emotional`（情感共鸣）风格
 * 原色 `#eb2f96`，不应误用 `accent-danger`（红色 = 错误/危险语义）。
 * 本 token 明确表达"情感 / 浪漫 / 心动"等积极语义。
 *
 * ⚠️ 不要把 `OUT_PINK` 用于 error / warning / delete 等"负向"反馈。
 */
export const OUT_PINK = '#eb2f96';
