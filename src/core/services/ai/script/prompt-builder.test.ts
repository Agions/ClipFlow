/**
 * buildScriptPrompt — 单元测试
 */
import { describe, it, expect } from 'vitest';
import { buildScriptPrompt, type AnalysisInput } from './prompt-builder';

describe('buildScriptPrompt', () => {
  it('produces a prompt containing title and duration when provided', () => {
    const analysis: AnalysisInput = {
      title: '测试标题',
      duration: 120,
      summary: '简介',
    };
    const prompt = buildScriptPrompt(analysis);
    expect(prompt).toContain('视频标题: 测试标题');
    expect(prompt).toContain('时长: 120秒');
    expect(prompt).toContain('简介');
  });

  it('omits title/duration when absent', () => {
    const prompt = buildScriptPrompt({ summary: 's' });
    expect(prompt).not.toContain('视频标题:');
    expect(prompt).not.toContain('时长:');
  });

  it('formats key moments with timestamp + description + importance', () => {
    const analysis: AnalysisInput = {
      keyMoments: [
        { timestamp: 65, description: '高潮', importance: 8 }, // 1分5秒
      ],
    };
    const prompt = buildScriptPrompt(analysis);
    expect(prompt).toContain('时间点: 1分5秒');
    expect(prompt).toContain('描述: 高潮');
    expect(prompt).toContain('重要性: 8/10');
  });

  it('handles empty keyMoments with fallback text', () => {
    const prompt = buildScriptPrompt({ keyMoments: [] });
    expect(prompt).toContain('关键时刻:\n无');
  });

  it('formats string emotions verbatim', () => {
    const prompt = buildScriptPrompt({ emotions: ['开心', '悲伤'] });
    expect(prompt).toContain('开心');
    expect(prompt).toContain('悲伤');
    expect(prompt).not.toContain('时间点:'); // 字符串形式不带时间戳
  });

  it('formats object emotions with timestamp/type/intensity', () => {
    const prompt = buildScriptPrompt({
      emotions: [{ timestamp: 120, type: 'joy', intensity: 0.9 }],
    });
    expect(prompt).toContain('时间点: 2分0秒');
    expect(prompt).toContain('情感: joy');
    expect(prompt).toContain('强度: 0.9');
  });

  it('mixes string and object emotions', () => {
    // 类型为 string[] | AnalysisEmotion[]，分别测两种用法
    const stringPrompt = buildScriptPrompt({ emotions: ['开心', '兴奋'] });
    const objectPrompt = buildScriptPrompt({
      emotions: [{ timestamp: 0, type: 'joy', intensity: 1 }],
    });
    expect(stringPrompt).toContain('开心');
    expect(objectPrompt).toContain('情感: joy');
  });

  it('applies style guidance from STYLE_GUIDANCE_MAP', () => {
    const prompt = buildScriptPrompt({}, { style: 'informative' });
    expect(prompt).toContain('客观、教育性');
  });

  it('applies tone guidance from TONE_GUIDANCE_MAP', () => {
    const prompt = buildScriptPrompt({}, { tone: 'humorous' });
    expect(prompt).toContain('幽默');
  });

  it('falls back to default guidance for unknown style/tone', () => {
    // 通过类型断言触发 unknown 分支（运行时校验 hasOwnProperty）
    const prompt = buildScriptPrompt(
      {},
      { style: 'bogus' as 'informative', tone: 'mystery' as 'neutral' }
    );
    expect(prompt).toContain('请生成一个专业');
    expect(prompt).toContain('使用中立');
  });

  it('omits guidance sections when no options provided', () => {
    const prompt = buildScriptPrompt({});
    // 默认引导文本（无 style/tone）
    expect(prompt).toContain('请生成一个专业、信息丰富的解说脚本');
    expect(prompt).toContain('使用中立、专业的语气');
  });

  it('includes mandatory writing rules (timestamps, segments, no AI tone)', () => {
    const prompt = buildScriptPrompt({});
    expect(prompt).toContain('时间戳');
    expect(prompt).toContain('分段');
    expect(prompt).toContain('避免AI机械口吻');
  });

  it('handles summary fallback when missing', () => {
    const prompt = buildScriptPrompt({});
    expect(prompt).toContain('视频摘要:\n无');
  });

  it('uses options.instruction as additive requirement (if referenced)', () => {
    // instruction 仅作为参数存在；prompt 主体固定包含 10 条要求
    const prompt = buildScriptPrompt({}, { instruction: '加入旁白' });
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('formats timestamp minutes/seconds correctly at boundaries', () => {
    const prompt = buildScriptPrompt({
      keyMoments: [
        { timestamp: 59, description: 'a', importance: 1 }, // 0分59秒
        { timestamp: 60, description: 'b', importance: 2 }, // 1分0秒
        { timestamp: 0, description: 'c', importance: 3 }, // 0分0秒
      ],
    });
    expect(prompt).toContain('时间点: 0分59秒, 描述: a');
    expect(prompt).toContain('时间点: 1分0秒, 描述: b');
    expect(prompt).toContain('时间点: 0分0秒, 描述: c');
  });
});
