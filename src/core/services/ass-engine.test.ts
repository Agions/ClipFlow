/**
 * ASS 引擎单元测试（Stage 15.3）
 *
 * 覆盖：toAssTime / toAssColor / serializeAssStyle / serializeAssDialogue / buildAssFile
 */

import { describe, expect, it } from 'vitest';
import {
  buildAssFile,
  buildSrtFile,
  serializeAssDialogue,
  serializeAssStyle,
  toAssTime,
} from './ass-engine';
import type { SubtitleCue, SubtitleStyle, SubtitleTrack } from '@/core/domain/assembly';

describe('toAssTime', () => {
  it('formats 0 as 0:00:00.00', () => {
    expect(toAssTime(0)).toBe('0:00:00.00');
  });
  it('formats 1.5 seconds', () => {
    expect(toAssTime(1.5)).toBe('0:00:01.50');
  });
  it('formats 65.25 seconds (1 min)', () => {
    expect(toAssTime(65.25)).toBe('0:01:05.25');
  });
  it('formats 3661.123 seconds (1h+1m+1.123s)', () => {
    expect(toAssTime(3661.123)).toBe('1:01:01.12');
  });
  it('clamps negative to 0', () => {
    expect(toAssTime(-5)).toBe('0:00:00.00');
  });
});

describe('serializeAssStyle', () => {
  const baseStyle: SubtitleStyle = {
    id: 'default',
    fontFamily: 'Source Han Sans',
    fontSize: 24,
    color: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 3,
    position: 'middle',
    opacity: 1.0,
  };

  it('emits Style line with all 23 V4+ fields', () => {
    const out = serializeAssStyle(baseStyle);
    expect(out).toMatch(/^Style: default,Source Han Sans,24,/);
    // V4+ Style 格式：Name + 22 字段 = 23 个逗号分隔值
    const fields = out.split(',');
    expect(fields.length).toBe(23);
    expect(fields[0]).toBe('Style: default');
  });

  it('converts #RRGGBB to ASS BGR order', () => {
    const out = serializeAssStyle({ ...baseStyle, color: '#FF0000', opacity: 1.0 });
    // Red FF0000 → BGR 顺序 00 00 FF → &H000000FF
    expect(out).toContain('&H000000FF');
  });

  it('applies opacity as alpha', () => {
    const out = serializeAssStyle({ ...baseStyle, color: '#FFFFFF', opacity: 0.5 });
    // 50% opacity → alpha 0x80 → &H80FFFFFF
    expect(out).toContain('&H80FFFFFF');
  });

  it('maps top → 8, middle → 5, bottom → 2 alignment', () => {
    expect(serializeAssStyle({ ...baseStyle, position: 'top' })).toContain(',8,');
    expect(serializeAssStyle({ ...baseStyle, position: 'middle' })).toContain(',5,');
    expect(serializeAssStyle({ ...baseStyle, position: 'bottom' })).toContain(',2,');
  });
});

describe('serializeAssDialogue', () => {
  const cue: SubtitleCue = {
    id: 'c1',
    startSecs: 0,
    endSecs: 3.5,
    text: 'Hello world',
    styleId: 'douyin-default',
  };

  it('emits Dialogue with H:MM:SS.CC timestamps', () => {
    const out = serializeAssDialogue(cue, 'default');
    expect(out).toMatch(/^Dialogue: 0,0:00:00\.00,0:00:03\.50,douyin-default,,0,0,0,,Hello world$/);
  });

  it('uses defaultStyleId when cue has no styleId', () => {
    const out = serializeAssDialogue({ ...cue, styleId: '' }, 'fallback');
    expect(out).toContain(',fallback,');
  });

  it('converts \n to \\N (ASS newlines)', () => {
    const out = serializeAssDialogue({ ...cue, text: 'line1\nline2' }, 'default');
    expect(out).toContain('line1\\Nline2');
  });
});

describe('buildAssFile', () => {
  const styles: SubtitleStyle[] = [
    {
      id: 'default',
      fontFamily: 'Source Han Sans',
      fontSize: 22,
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 2,
      position: 'bottom',
      opacity: 1.0,
    },
  ];
  const cues: SubtitleCue[] = [
    { id: '1', startSecs: 0, endSecs: 2, text: '第一句', styleId: 'default' },
    { id: '2', startSecs: 2, endSecs: 4.5, text: '第二句', styleId: 'default' },
  ];
  const track: SubtitleTrack = { cues, styles };

  it('contains Script Info / V4+ Styles / Events sections', () => {
    const out = buildAssFile(track);
    expect(out).toContain('[Script Info]');
    expect(out).toContain('[V4+ Styles]');
    expect(out).toContain('[Events]');
  });

  it('emits PlayResX/Y from options', () => {
    const out = buildAssFile(track, { width: 1080, height: 1920 });
    expect(out).toContain('PlayResX: 1080');
    expect(out).toContain('PlayResY: 1920');
  });

  it('emits one Style line per track.styles entry', () => {
    const out = buildAssFile({
      ...track,
      styles: [...styles, { ...styles[0], id: 'bili' }],
    });
    const styleCount = (out.match(/^Style:/gm) ?? []).length;
    expect(styleCount).toBe(2);
  });

  it('emits one Dialogue line per cue', () => {
    const out = buildAssFile(track);
    const dialogueCount = (out.match(/^Dialogue:/gm) ?? []).length;
    expect(dialogueCount).toBe(2);
  });

  it('uses first style as default if not specified', () => {
    const out = buildAssFile(track);
    const dialogueLines = out.split('\n').filter(l => l.startsWith('Dialogue:'));
    expect(dialogueLines[0]).toContain(',default,');
  });

  it('respects defaultStyleId option as fallback when cue has no styleId', () => {
    const trackNoStyle: SubtitleTrack = {
      cues: [{ id: '1', startSecs: 0, endSecs: 2, text: 'hi', styleId: '' }],
      styles: [{ id: 'main', fontFamily: 'A', fontSize: 24, color: '#FFF', strokeColor: '#000', strokeWidth: 1, position: 'bottom', opacity: 1 }],
    };
    const out = buildAssFile(trackNoStyle, { defaultStyleId: 'fallback' });
    const dialogueLines = out.split('\n').filter(l => l.startsWith('Dialogue:'));
    expect(dialogueLines[0]).toContain(',fallback,');
  });
});

describe('buildSrtFile', () => {
  it('formats with HH:MM:SS,mmm timestamps', () => {
    const track: SubtitleTrack = {
      cues: [
        { id: '1', startSecs: 0, endSecs: 2, text: 'hi', styleId: 'd' },
      ],
      styles: [],
    };
    const out = buildSrtFile(track);
    expect(out).toContain('00:00:00,000 --> 00:00:02,000');
  });

  it('numbers cues sequentially', () => {
    const track: SubtitleTrack = {
      cues: [
        { id: '1', startSecs: 0, endSecs: 1, text: 'a', styleId: 'd' },
        { id: '2', startSecs: 1, endSecs: 2, text: 'b', styleId: 'd' },
        { id: '3', startSecs: 2, endSecs: 3, text: 'c', styleId: 'd' },
      ],
      styles: [],
    };
    const out = buildSrtFile(track);
    expect(out).toMatch(/^1\n/);
    expect(out).toMatch(/\n\n2\n/);
    expect(out).toMatch(/\n\n3\n/);
  });
});
