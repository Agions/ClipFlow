/**
 * Feature Flags — 类型定义 + 静态默认值
 *
 * 设计目标：
 *  1. 编译时类型安全：所有 flag key 必须在 FeatureFlagKey 枚举中
 *  2. 运行时可覆盖：用户/测试可通过 localStorage 临时切换
 *  3. 默认值集中：所有默认行为在 DEFAULT_FLAGS 一处定义
 *
 * 关联文档：docs/TECH_DEBT.md §2.2（PR-4.1 灰度回滚门）
 * 关联 PR：PR-4.1（MultiTrackTimeline 重构）+ 后续 M4 命名迁移
 */

// ─── Feature Flag 枚举 ────────────────────────────────────

/**
 * 所有受支持的 feature flag key。
 * 新增 flag 必须在 DEFAULT_FLAGS 中提供默认值。
 */
export type FeatureFlagKey =
  /** PR-4.1：替换 MultiTrackTimeline 为 TTS 配音页 + 字幕表格（默认 OFF） */
  | 'experimental.tts-page'
  /** M4 命名迁移：切换到 @cinevoice/* 包名（默认 OFF） */
  | 'experimental.monorepo'
  /** M3设计语言：场记板开场动画（默认 OFF） */
  | 'experimental.clapperboard'
  /** M3设计语言：轨道灯状态指示（默认 OFF） */
  | 'experimental.track-light';

// ─── 默认值合并约束 ──────────────────────────────────────

/**
 * 编译期约束：DEFAULT_FLAGS 必须覆盖所有 FeatureFlagKey。
 * 通过 Record<FeatureFlagKey, boolean> 强制。
 */
export type DefaultFlagMap = Record<FeatureFlagKey, boolean>;

/**
 * 默认值（集中定义）。
 *
 * 规则：所有 experimental.* 默认 OFF（用户主动开启才生效）。
 * 这样保证 ① PR-4.1 出问题时回滚成本为 0（关掉就回到旧组件）；
 * ② 灰度开关不会"无意中"向所有用户推送实验性功能。
 */
export const DEFAULT_FLAGS: DefaultFlagMap = {
  'experimental.tts-page': false,
  'experimental.monorepo': false,
  'experimental.clapperboard': false,
  'experimental.track-light': false,
};

// ─── 运行时类型守卫 ──────────────────────────────────────

/**
 * 检查字符串是否为合法 FeatureFlagKey。
 * 用于过滤 localStorage 中脏数据（用户手动改键值）。
 */
export function isFeatureFlagKey(key: string): key is FeatureFlagKey {
  return key in DEFAULT_FLAGS;
}
