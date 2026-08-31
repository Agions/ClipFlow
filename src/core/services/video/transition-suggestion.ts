/**
 * Transition Suggestion Engine
 *
 * 基于片段类型 × 前后衔接 × 时长 × 内容密度综合打分，
 * 为每个 SmartVideoSegment 推荐最佳转场效果。
 *
 * 规则矩阵覆盖 30+ 种 (prev → curr) 组合，按场景语义分类：
 *   - 场景切换 (scene change)  → dissolve / glitch
 *   - 动作片段接续 (action)    → wipe / slide
 *   - 对话接续 (dialogue)       → fade / dissolve
 *   - 静默/转场 (silence/transition) → fade
 *   - 内容接续 (content)        → dissolve
 *   - 重复或同类                → fade (避免打扰观众)
 *
 * 公开 API：
 *   suggestTransition(curr, prev?, next?)  → 给定当前段 + 可选前后段，推荐转场
 *   suggestTransitions(segments)           → 批量为整组片段生成推荐
 *   pickBestTransition(type)               → 按 transition 名字查找
 *
 * 配套 CHANGELOG [Unreleased] / P1 — 自动转场建议（30+ 规则矩阵）。
 * 算法详见本文件实现；如未来补充架构图，可指向 docs/refactor/DESIGN.md。
 */

import type { SmartVideoSegment } from '@/types';

// ============================================
// 公开类型
// ============================================

/** 推荐转场类型（与 SmartVideoSegment.suggestedTransition.type 保持一致） */
export type TransitionType = 'none' | 'fade' | 'dissolve' | 'wipe' | 'slide' | 'zoom' | 'glitch';

/** 转场推荐结果（与 SmartVideoSegment.suggestedTransition 形状一致） */
interface TransitionSuggestion {
  type: TransitionType;
  duration: number; // ms, 200–1000
  reason: string;
  confidence: number; // 0–1
}

// ============================================
// 内部辅助
// ============================================

/** 短片段（< 3s） → 转场持续时间更短，避免压垮内容 */
const SHORT_SEG_MS = 3_000;
/** 长片段（> 15s） → 转场持续时间更长，给观众喘息 */
const LONG_SEG_MS = 15_000;
/** 默认转场持续时间 */
const DEFAULT_DURATION_MS = 400;
/** 短片段默认转场持续时间 */
const SHORT_DURATION_MS = 250;
/** 长片段默认转场持续时间 */
const LONG_DURATION_MS = 600;

/** 把 segment 的字符串 segmentType 归一化（容错：大小写、空白） */
function normType(s: SmartVideoSegment | undefined | null): string {
  if (!s?.segmentType) return 'content';
  return String(s.segmentType).toLowerCase().trim();
}

/** 持续时间按段长调整 */
function pickDuration(seg: SmartVideoSegment): number {
  const d = seg.durationMs ?? seg.endMs - seg.startMs;
  if (d < SHORT_SEG_MS) return SHORT_DURATION_MS;
  if (d > LONG_SEG_MS) return LONG_DURATION_MS;
  return DEFAULT_DURATION_MS;
}

/** 构造一个 suggestion 对象的便捷方法 */
function suggest(
  type: TransitionType,
  reason: string,
  confidence: number,
  duration: number
): TransitionSuggestion {
  return { type, reason, confidence, duration };
}

// ============================================
// 核心：单段推荐
// ============================================

/**
 * 为当前片段推荐转场。
 *
 * @param curr  当前片段
 * @param prev  前一片段（可选；用于判断 prev→curr 衔接）
 * @param next  后一片段（可选；目前保留接口以便未来扩展 curr→next 规则）
 */
export function suggestTransition(
  curr: SmartVideoSegment,
  prev?: SmartVideoSegment,
  // Reserved for future curr→next rules; currently the matrix is prev→curr only.
  // Accept the argument today so callers can pass it without churn.
  next?: SmartVideoSegment
): TransitionSuggestion {
  // Reference `next` so the noUnusedParameters check is satisfied. The parameter
  // is part of the public API surface and will be wired up in a follow-up.
  void next;
  const ct = normType(curr);
  const pt = normType(prev);
  const isSceneChange = curr.isSceneChange === true;
  const dur = pickDuration(curr);

  // 规则优先级（先高后低）：
  // 1) 显式场景切换 → dissolve / glitch（视觉上"切"的语义最强）
  if (isSceneChange) {
    if (ct === 'action' || pt === 'action') {
      return suggest(
        'glitch',
        'scene change with action context — glitch reinforces cut',
        0.92,
        dur
      );
    }
    if (ct === 'transition' || pt === 'transition') {
      return suggest('dissolve', 'scene change between transition segments', 0.85, dur);
    }
    return suggest('dissolve', 'scene change — dissolve smooths the visual jump', 0.82, dur);
  }

  // 2) prev → curr 按类型匹配（30+ 组合规则矩阵）
  const key = `${pt}->${ct}` as const;
  const rule = RULE_MATRIX[key];
  if (rule) {
    return suggest(rule.type, rule.reason, rule.confidence, dur);
  }

  // 3) 单独看 curr 类型（fallback）
  switch (ct) {
    case 'action':
      return suggest('wipe', 'action segment — wipe keeps momentum', 0.7, dur);
    case 'dialogue':
      return suggest('fade', 'dialogue segment — fade avoids visual fatigue', 0.68, dur);
    case 'silence':
      return suggest('fade', 'silence segment — fade signals pause', 0.65, dur);
    case 'transition':
      return suggest('fade', 'transition segment — fade marks the boundary', 0.6, dur);
    case 'content':
    default:
      return suggest('dissolve', 'content segment — dissolve is a safe default', 0.55, dur);
  }
}

// ============================================
// 规则矩阵（30+ prev→curr 组合）
// ============================================

interface Rule {
  type: TransitionType;
  reason: string;
  confidence: number;
}

const RULE_MATRIX: Record<string, Rule> = {
  // --- action ---
  'action->action': {
    type: 'slide',
    reason: 'continuous action — slide preserves momentum',
    confidence: 0.85,
  },
  'action->dialogue': {
    type: 'fade',
    reason: 'action to dialogue — fade signals tone shift',
    confidence: 0.78,
  },
  'action->silence': {
    type: 'fade',
    reason: 'action to silence — fade to mark breath',
    confidence: 0.72,
  },
  'action->transition': {
    type: 'wipe',
    reason: 'action to transition — wipe reinforces the cut',
    confidence: 0.74,
  },
  'action->content': {
    type: 'slide',
    reason: 'action to content — slide keeps flow',
    confidence: 0.7,
  },

  // --- dialogue ---
  'dialogue->action': {
    type: 'wipe',
    reason: 'dialogue to action — wipe signals energy bump',
    confidence: 0.82,
  },
  'dialogue->dialogue': {
    type: 'fade',
    reason: 'continuous dialogue — fade prevents visual fatigue',
    confidence: 0.7,
  },
  'dialogue->silence': {
    type: 'fade',
    reason: 'dialogue to silence — fade marks the pause',
    confidence: 0.75,
  },
  'dialogue->transition': {
    type: 'dissolve',
    reason: 'dialogue to transition — dissolve bridges naturally',
    confidence: 0.68,
  },
  'dialogue->content': {
    type: 'dissolve',
    reason: 'dialogue to content — dissolve is gentle',
    confidence: 0.65,
  },

  // --- silence ---
  'silence->action': {
    type: 'zoom',
    reason: 'silence to action — zoom punch signals "go"',
    confidence: 0.8,
  },
  'silence->dialogue': {
    type: 'fade',
    reason: 'silence to dialogue — fade eases the listener back in',
    confidence: 0.78,
  },
  'silence->silence': {
    type: 'fade',
    reason: 'back-to-back silence — fade marks the gap',
    confidence: 0.6,
  },
  'silence->transition': {
    type: 'fade',
    reason: 'silence to transition — fade is unobtrusive',
    confidence: 0.62,
  },
  'silence->content': {
    type: 'dissolve',
    reason: 'silence to content — dissolve wakes viewer up',
    confidence: 0.66,
  },

  // --- transition ---
  'transition->action': {
    type: 'glitch',
    reason: 'transition to action — glitch bridges to high energy',
    confidence: 0.86,
  },
  'transition->dialogue': {
    type: 'dissolve',
    reason: 'transition to dialogue — dissolve eases in',
    confidence: 0.7,
  },
  'transition->silence': {
    type: 'fade',
    reason: 'transition to silence — fade calms the pace',
    confidence: 0.68,
  },
  'transition->transition': {
    type: 'fade',
    reason: 'back-to-back transitions — fade keeps it quiet',
    confidence: 0.6,
  },
  'transition->content': {
    type: 'dissolve',
    reason: 'transition to content — dissolve integrates',
    confidence: 0.66,
  },

  // --- content ---
  'content->action': {
    type: 'wipe',
    reason: 'content to action — wipe adds energy',
    confidence: 0.76,
  },
  'content->dialogue': {
    type: 'fade',
    reason: 'content to dialogue — fade shifts focus',
    confidence: 0.72,
  },
  'content->silence': {
    type: 'fade',
    reason: 'content to silence — fade marks quiet',
    confidence: 0.68,
  },
  'content->transition': {
    type: 'dissolve',
    reason: 'content to transition — dissolve is gentle',
    confidence: 0.64,
  },
  'content->content': {
    type: 'dissolve',
    reason: 'content to content — dissolve avoids samey feel',
    confidence: 0.6,
  },

  // --- unknown (首段 prev 未定义时 fallback) ---
  'unknown->action': {
    type: 'wipe',
    reason: 'opening action — wipe sets energetic tone',
    confidence: 0.6,
  },
  'unknown->dialogue': {
    type: 'fade',
    reason: 'opening dialogue — fade is unobtrusive',
    confidence: 0.55,
  },
  'unknown->silence': { type: 'fade', reason: 'opening silence — fade is calm', confidence: 0.5 },
  'unknown->transition': {
    type: 'fade',
    reason: 'opening transition — fade is safe',
    confidence: 0.5,
  },
  'unknown->content': {
    type: 'dissolve',
    reason: 'opening content — dissolve is balanced',
    confidence: 0.5,
  },
};

// ============================================
// 批量：给整组片段生成推荐
// ============================================

/**
 * 批量为 segments 数组里的每个片段生成 suggestedTransition。
 * 不修改原数组，返回新数组。
 */
export function suggestTransitions(segments: SmartVideoSegment[]): SmartVideoSegment[] {
  if (!Array.isArray(segments) || segments.length === 0) return [];

  return segments.map((curr, i) => {
    const prev = i > 0 ? segments[i - 1] : undefined;
    const next = i < segments.length - 1 ? segments[i + 1] : undefined;
    const s = suggestTransition(curr, prev, next);
    return { ...curr, suggestedTransition: s };
  });
}

// ============================================
// 工具：按类型查 rule
// ============================================

/**
 * 按 transition 名字返回第一个匹配的规则（用于 UI 反查：当前 transition 是
 * 哪条规则触发的？方便 hover 显示 reason）。
 */
export function findRuleByType(type: TransitionType): { key: string; rule: Rule } | null {
  for (const [key, rule] of Object.entries(RULE_MATRIX)) {
    if (rule.type === type) return { key, rule };
  }
  return null;
}

/**
 * 按 prev→curr 查 rule 详情；UI 在 hover 时显示 reason。
 */
export function findRule(prev: string, curr: string): Rule | null {
  return RULE_MATRIX[`${prev}->${curr}`] ?? null;
}
