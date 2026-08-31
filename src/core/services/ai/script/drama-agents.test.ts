/**
 * Multi-Agent Drama Pipeline 单元测试
 */
import { describe, it, expect } from 'vitest';
import {
  DramaDeconstructAgent,
  HookCraftAgent,
  CommentaryWriterAgent,
  StoryboardAlignerAgent,
  multiAgentDramaPipeline,
} from './drama-agents';

describe('Drama Pipeline Agents', () => {
  const shortDramaInput = {
    title: '龙王出狱：绝世神医',
    genre: 'short_drama' as const,
    sourceSummary: '主角出狱隐忍三年，最终在一场豪门晚宴上展露神医身份逆风翻盘。',
  };

  const movieInput = {
    title: '星际谍影：奥德赛',
    genre: 'movie_recap' as const,
    sourceSummary: '一艘迷失深空的考察飞船，船员在幽闭空间内经历信任崩塌与悬疑反转。',
  };

  it('DramaDeconstructAgent decomposes characters and plot beats', () => {
    const res = DramaDeconstructAgent.deconstruct(shortDramaInput);
    expect(res.characters.length).toBeGreaterThanOrEqual(2);
    expect(res.plotBeats.length).toBe(3);
    expect(res.characters[0].role).toBe('protagonist');
    expect(res.characters[1].role).toBe('antagonist');
  });

  it('HookCraftAgent crafts punchy hook for short drama vs movie', () => {
    const dramaHook = HookCraftAgent.craftHook(shortDramaInput);
    expect(dramaHook.hookType).toBe('flash_forward');
    expect(dramaHook.durationSec).toBe(3.5);

    const movieHook = HookCraftAgent.craftHook(movieInput);
    expect(movieHook.hookType).toBe('question');
    expect(movieHook.durationSec).toBe(4.0);
  });

  it('CommentaryWriterAgent generates structured beats matching plot beats', () => {
    const { plotBeats } = DramaDeconstructAgent.deconstruct(shortDramaInput);
    const hook = HookCraftAgent.craftHook(shortDramaInput);
    const beats = CommentaryWriterAgent.generateBeats(shortDramaInput, hook, plotBeats);

    expect(beats.length).toBe(plotBeats.length + 1); // hook beat + 3 plot beats
    expect(beats[0].sceneIndex).toBe(0);
    expect(beats[0].voiceoverText).toBe(hook.openingText);
  });

  it('StoryboardAlignerAgent aligns timestamps sequentially and computes total duration', () => {
    const { plotBeats } = DramaDeconstructAgent.deconstruct(shortDramaInput);
    const hook = HookCraftAgent.craftHook(shortDramaInput);
    const rawBeats = CommentaryWriterAgent.generateBeats(shortDramaInput, hook, plotBeats);
    const { beats, totalDuration } = StoryboardAlignerAgent.alignAndVerify(rawBeats);

    expect(beats[0].startTimeSec).toBe(0);
    expect(beats[1].startTimeSec).toBe(beats[0].endTimeSec);
    expect(totalDuration).toBeGreaterThan(0);
  });

  it('multiAgentDramaPipeline generates complete drama screenplay', () => {
    const screenplay = multiAgentDramaPipeline.generateScreenplay('proj_123', shortDramaInput);

    expect(screenplay.projectId).toBe('proj_123');
    expect(screenplay.title).toBe(shortDramaInput.title);
    expect(screenplay.characters.length).toBeGreaterThanOrEqual(2);
    expect(screenplay.sceneBeats.length).toBe(4);
    expect(screenplay.totalEstimatedDurationSec).toBeGreaterThan(10);
    expect(screenplay.hook.headline).toBeDefined();
  });
});
