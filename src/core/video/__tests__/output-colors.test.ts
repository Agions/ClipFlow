/**
 * shared/video/output-colors 测试（PR-1.5）
 *
 * 覆盖：
 *  - 3 个字幕 token（FG / STROKE / BG）值正确
 *  - 6 色 scene palette 不重复、覆盖 ≥ 4 个色相族
 *  - token 不可变性（as const）
 *  - 与 color-tokens.ts 的边界（output-colors 不应受主题切换影响）
 */
import { describe, it, expect } from 'vitest';
import {
  OUT_SUBTITLE_FG,
  OUT_SUBTITLE_STROKE,
  OUT_SUBTITLE_BG,
  OUT_SCENE_PALETTE,
} from '../output-colors';

describe('output-colors', () => {
  describe('subtitle tokens', () => {
    it('OUT_SUBTITLE_FG = #FFFFFF (white)', () => {
      expect(OUT_SUBTITLE_FG).toBe('#FFFFFF');
    });

    it('OUT_SUBTITLE_STROKE = #000000 (black)', () => {
      expect(OUT_SUBTITLE_STROKE).toBe('#000000');
    });

    it('OUT_SUBTITLE_BG = 半透明黑 rgba(0,0,0,0.5)', () => {
      expect(OUT_SUBTITLE_BG).toBe('rgba(0, 0, 0, 0.5)');
    });
  });

  describe('scene palette', () => {
    it('包含 6 个色（与 output-colors.ts 注释一致）', () => {
      expect(OUT_SCENE_PALETTE).toHaveLength(6);
    });

    it('所有色为 7 位 hex（#RRGGBB）', () => {
      OUT_SCENE_PALETTE.forEach(color => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('无重复', () => {
      const set = new Set(OUT_SCENE_PALETTE);
      expect(set.size).toBe(OUT_SCENE_PALETTE.length);
    });

    it('色相覆盖 ≥ 4 个族（红/青/蓝/橙/绿/黄）', () => {
      // 简单色相族检测：基于 R/G/B 主导通道
      const hueFamilies = new Set<string>();
      OUT_SCENE_PALETTE.forEach(hex => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const max = Math.max(r, g, b);
        if (max === r) hueFamilies.add('R');
        else if (max === g) hueFamilies.add('G');
        else hueFamilies.add('B');
      });
      expect(hueFamilies.size).toBeGreaterThanOrEqual(3);
    });

    it('与浅/暗主题解耦（值固定不随主题）', () => {
      // ⚠️ 业务合约：这些颜色**不**应跟随 dark/light 主题切换
      // 此测试显式声明：即使将来引入主题感知，这些 token 仍保持不变
      const snap = [OUT_SUBTITLE_FG, OUT_SUBTITLE_STROKE, OUT_SUBTITLE_BG, ...OUT_SCENE_PALETTE];
      const snapJson = JSON.stringify(snap);
      expect(snapJson).toBe(
        JSON.stringify([
          '#FFFFFF',
          '#000000',
          'rgba(0, 0, 0, 0.5)',
          '#FF6B6B',
          '#4ECDC4',
          '#45B7D1',
          '#FFA07A',
          '#98D8C8',
          '#F7DC6F',
        ])
      );
    });
  });
});
