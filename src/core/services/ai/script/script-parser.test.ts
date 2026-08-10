/**
 * script-parser 测试
 *
 * Stage 9 PR-3：脚本解析纯函数覆盖
 */
import { describe, it, expect } from 'vitest';
import { parseScriptContent, createScriptDraft, formatScriptToText } from './script-parser';

describe('parseScriptContent', () => {
  it('returns empty array for empty content', () => {
    expect(parseScriptContent('')).toEqual([]);
  });

  it('returns empty array for plain text without timestamps', () => {
    // This parser only handles timestamped content like [0:00] text
    const result = parseScriptContent('Hello world without timestamps');
    expect(result).toEqual([]);
  });

  it('parses single timestamped segment', () => {
    const result = parseScriptContent('[0:00] Hello world');
    expect(result.length).toBe(1);
    expect(result[0]?.content).toBe('Hello world');
    expect(result[0]?.startTime).toBe(0);
  });

  it('parses multiple timestamped segments', () => {
    const result = parseScriptContent('[0:00] First\n\n[0:05] Second\n\n[0:10] Third');
    expect(result.length).toBe(3);
    expect(result[0]?.content).toBe('First');
    expect(result[1]?.content).toBe('Second');
    expect(result[2]?.content).toBe('Third');
  });

  it('parses M:SS timestamps correctly', () => {
    const result = parseScriptContent('[1:30] One minute thirty');
    expect(result[0]?.startTime).toBe(90);
  });

  it('generates unique ids for each segment', () => {
    const result = parseScriptContent('[0:00] A\n\n[0:05] B\n\n[0:10] C');
    const ids = new Set(result.map(s => s.id));
    expect(ids.size).toBe(3);
  });

  it('appends continuation lines without timestamp into current segment', () => {
    // 验证 line 71-72 + branch 4 (line 69) truthy 臂: 无时间戳行追加到当前段落
    const result = parseScriptContent('[0:00] First line\ncontinued line\nstill more');
    expect(result).toHaveLength(1);
    expect(result[0]?.content).toBe('First line continued line still more');
    expect(result[0]?.startTime).toBe(0);
    // currentEndTime = startTime(0) + 10 + 2 + 2 = 14
    expect(result[0]?.endTime).toBe(14);
  });
});

describe('parseScriptContent — segment type detection', () => {
  it('detects narration type from Chinese 旁白 keyword', () => {
    // 验证 line 88 branch 5: includes('旁白') truthy 臂
    const result = parseScriptContent('[0:00] 这是一段旁白内容');
    expect(result[0]?.type).toBe('narration');
  });

  it('detects narration type from English "narration" keyword', () => {
    const result = parseScriptContent('[0:00] This is a narration segment');
    expect(result[0]?.type).toBe('narration');
  });

  it('detects dialogue type from Chinese 对话 keyword', () => {
    // 验证 line 91 branch 7: includes('对话') truthy 臂
    const result = parseScriptContent('[0:00] 角色对话内容');
    expect(result[0]?.type).toBe('dialogue');
  });

  it('detects dialogue type from English "dialogue" keyword', () => {
    const result = parseScriptContent('[0:00] Character dialogue line');
    expect(result[0]?.type).toBe('dialogue');
  });

  it('detects description type from Chinese 描述 keyword', () => {
    // 验证 line 94 branch 9: includes('描述') truthy 臂
    const result = parseScriptContent('[0:00] 场景描述文字');
    expect(result[0]?.type).toBe('description');
  });

  it('detects description type from English "description" keyword', () => {
    const result = parseScriptContent('[0:00] Scene description text');
    expect(result[0]?.type).toBe('description');
  });

  it('falls back to narration type when no keyword matches', () => {
    const result = parseScriptContent('[0:00] 没有任何关键词的普通段落');
    expect(result[0]?.type).toBe('narration');
  });
});

describe('createScriptDraft', () => {
  it('creates draft with all required fields', () => {
    const draft = createScriptDraft(
      '[0:00] First paragraph.\n\n[0:05] Second paragraph.',
      'proj-1'
    );
    expect(draft.projectId).toBe('proj-1');
    expect(draft.id).toBeDefined();
    expect(draft.createdAt).toBeDefined();
    expect(draft.updatedAt).toBeDefined();
    expect(draft.fullText).toContain('First paragraph');
    expect(draft.fullText).toContain('Second paragraph');
  });

  it('joins content into fullText', () => {
    const draft = createScriptDraft('[0:00] A\n\n[0:05] B\n\n[0:10] C', 'p');
    expect(draft.fullText).toContain('A');
    expect(draft.fullText).toContain('B');
    expect(draft.fullText).toContain('C');
  });
});

describe('formatScriptToText', () => {
  it('formats segments with content joined by double newline', () => {
    const segments = [
      { id: 's1', startTime: 0, endTime: 5, content: 'First', type: 'narration' as const },
      { id: 's2', startTime: 5, endTime: 10, content: 'Second', type: 'narration' as const },
    ];
    const formatted = formatScriptToText(
      segments as unknown as Parameters<typeof formatScriptToText>[0]
    );
    expect(formatted).toBe('First\n\nSecond');
  });

  it('returns empty string for empty segments', () => {
    expect(formatScriptToText([])).toBe('');
  });
});
