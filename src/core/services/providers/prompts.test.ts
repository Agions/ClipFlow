/**
 * core/services/providers/prompts.ts — 单元测试
 */
import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildScriptPrompt,
  buildAnalysisPrompt,
  buildOptimizationPrompt,
  buildTranslationPrompt,
} from './prompts';

describe('buildSystemPrompt', () => {
  it('returns a non-empty string containing core principles', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toBeTruthy();
    expect(prompt).toContain('视频');
    expect(prompt).toContain('口语');
  });
});

describe('buildScriptPrompt', () => {
  const baseParams = {
    topic: 'AI 视频剪辑',
    style: 'professional',
    tone: 'formal',
    length: 'medium',
    audience: 'B 端用户',
    language: 'zh',
  };

  it('contains topic, style mapping, tone guidance, length', () => {
    const out = buildScriptPrompt(baseParams);
    expect(out).toContain('AI 视频剪辑');
    expect(out).toContain('专业正式'); // STYLE_MAP['professional']
    expect(out).toContain('正式、严肃'); // TONE_MAP['formal']
    expect(out).toContain('3-5分钟'); // LENGTH_MAP['medium']
    expect(out).toContain('500-800字');
    expect(out).toContain('B 端用户');
  });

  it('falls back to default style/tone/length when unknown', () => {
    const out = buildScriptPrompt({
      ...baseParams,
      style: 'unknown-x',
      tone: 'unknown-y',
      length: 'unknown-z',
    });
    // 未知 style → 用 raw value；未知 tone → fallback 'casual'；未知 length → fallback 'medium'
    expect(out).toContain('unknown-x');
    expect(out).toContain('轻松、自然'); // fallback TONE_MAP.casual
    expect(out).toContain('3-5分钟'); // fallback LENGTH_MAP.medium
  });

  it('appends scene context block when scenes provided', () => {
    const out = buildScriptPrompt({
      ...baseParams,
      scenes: [
        { startTime: 0, endTime: 12.5, description: '开场', tags: ['产品'] },
        { startTime: 12.5, endTime: 30, emotion: 'positive' },
      ],
    });
    expect(out).toContain('视频镜头序列');
    expect(out).toContain('共2个镜头');
    expect(out).toContain('[镜头1]');
    expect(out).toContain('[标签: 产品]');
    expect(out).toContain('开场');
    expect(out).toContain('[情感: positive]');
  });

  it('appends subtitle context block when subtitles provided', () => {
    const out = buildScriptPrompt({
      ...baseParams,
      subtitles: [
        { start_ms: 0, end_ms: 2000, text: '你好' },
        { start_ms: 2000, end_ms: 4000, text: '世界' },
      ],
    });
    expect(out).toContain('视频语音字幕');
    expect(out).toContain('你好');
    expect(out).toContain('世界');
  });

  it('truncates subtitle context to first 20 entries with marker', () => {
    const subs = Array.from({ length: 25 }, (_, i) => ({
      start_ms: i * 1000,
      end_ms: (i + 1) * 1000,
      text: `subtitle-${i}`,
    }));
    const out = buildScriptPrompt({ ...baseParams, subtitles: subs });
    expect(out).toContain('subtitle-0');
    expect(out).toContain('subtitle-19');
    expect(out).not.toContain('subtitle-20');
    expect(out).toContain('共25条字幕');
  });

  it('appends keyword block when keywords provided', () => {
    const out = buildScriptPrompt({ ...baseParams, keywords: ['AI', '剪辑', '效率'] });
    expect(out).toContain('内容关键词');
    expect(out).toContain('AI、剪辑、效率');
  });

  it('appends duration hint when videoDuration provided', () => {
    const out = buildScriptPrompt({ ...baseParams, videoDuration: 125 });
    expect(out).toContain('视频总时长');
    expect(out).toContain('2分');
    expect(out).toContain('5秒');
  });

  it('appends special requirements block when provided', () => {
    const out = buildScriptPrompt({ ...baseParams, requirements: '面向老年人' });
    expect(out).toContain('特殊要求');
    expect(out).toContain('面向老年人');
  });

  it('always includes oral-fluff rules', () => {
    const out = buildScriptPrompt(baseParams);
    expect(out).toContain('口语化规则');
    expect(out).toContain('禁词列表');
  });
});

describe('buildAnalysisPrompt', () => {
  it('formats duration (minutes), resolution, format', () => {
    const out = buildAnalysisPrompt({
      duration: 125,
      width: 1920,
      height: 1080,
      format: 'mp4',
    });
    expect(out).toContain('2分钟');
    expect(out).toContain('1920x1080');
    expect(out).toContain('mp4');
  });
});

describe('buildOptimizationPrompt', () => {
  it('uses OPTIMIZATION_MAP for known values', () => {
    expect(buildOptimizationPrompt('原文', 'shorten')).toContain('缩短内容');
    expect(buildOptimizationPrompt('原文', 'lengthen')).toContain('扩展内容');
    expect(buildOptimizationPrompt('原文', 'simplify')).toContain('简化语言');
    expect(buildOptimizationPrompt('原文', 'professional')).toContain('提升专业性');
  });

  it('passes through unknown optimization values', () => {
    const out = buildOptimizationPrompt('原文', 'mystery-mode');
    expect(out).toContain('mystery-mode');
  });

  it('includes the original script text', () => {
    expect(buildOptimizationPrompt('原始脚本', 'shorten')).toContain('原始脚本');
  });
});

describe('buildTranslationPrompt', () => {
  it('includes target language and script content', () => {
    const out = buildTranslationPrompt('你好世界', '英语');
    expect(out).toContain('英语');
    expect(out).toContain('你好世界');
  });
});
