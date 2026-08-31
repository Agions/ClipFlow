/**
 * Fablr — 多 Agent 影视与短剧剧本工坊 (Multi-Agent Drama & Recap Studio)
 *
 * 核心 Agent 体系：
 * 1. DramaDeconstructAgent (剧情大纲与人物小传拆解)
 * 2. HookCraftAgent (前 3 秒爆点与悬念倒叙设计)
 * 3. CommentaryWriterAgent (双栏分镜解说台词生成)
 * 4. StoryboardAlignerAgent (镜头与音画时间戳对齐校验)
 */

export interface DramaCharacter {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'narrator';
  description: string;
  emotionalArc: string;
}

export interface DramaPlotBeat {
  id: string;
  sceneIndex: number;
  timeRange: [number, number]; // [startSec, endSec]
  title: string;
  conflictType: 'twist' | 'climax' | 'revelation' | 'setup' | 'suspense';
  intensity: number; // 1-10
  summary: string;
}

export interface DramaHook {
  hookType: 'question' | 'shocking_statement' | 'flash_forward' | 'emotional_punch';
  headline: string;
  openingText: string;
  durationSec: number;
}

export interface ScreenplaySceneBeat {
  id: string;
  sceneIndex: number;
  timecode: string; // e.g. "00:00:15 - 00:00:28"
  startTimeSec: number;
  endTimeSec: number;
  visualCue: string;
  shotType: 'CU' | 'MS' | 'LS' | 'PAN' | 'ACTION'; // Close-Up, Medium, Long Shot, Pan, Action
  voiceoverText: string;
  emotion: 'tense' | 'humorous' | 'dramatic' | 'suspenseful' | 'neutral' | 'heartfelt';
  soundFx?: string;
  bgmSuggestion?: string;
}

export interface DramaScreenplay {
  projectId: string;
  title: string;
  synopsis: string;
  characters: DramaCharacter[];
  plotBeats: DramaPlotBeat[];
  hook: DramaHook;
  sceneBeats: ScreenplaySceneBeat[];
  totalEstimatedDurationSec: number;
  generatedAt: string;
}

export interface MultiAgentInput {
  title: string;
  genre: 'short_drama' | 'movie_recap' | 'suspense' | 'comedy' | 'romance';
  sourceSummary: string;
  transcriptList?: Array<{ startMs: number; endMs: number; text: string }>;
  keyFramesDescriptions?: string[];
  targetPace?: 'fast' | 'balanced' | 'deep';
  voiceTone?: 'entertaining' | 'suspenseful' | 'dramatic' | 'documentary';
}

/**
 * 1. DramaDeconstructAgent — 剧情与角色拆解 Agent
 */
export const DramaDeconstructAgent = {
  deconstruct: (input: MultiAgentInput): { characters: DramaCharacter[]; plotBeats: DramaPlotBeat[] } => {
    const isShortDrama = input.genre === 'short_drama';

    const characters: DramaCharacter[] = [
      {
        id: 'char_1',
        name: '主角 / 叙事核心',
        role: 'protagonist',
        description: '推动剧情核心冲突的关键人物，经历情绪转折与反击',
        emotionalArc: isShortDrama ? '隐忍受辱 → 身份揭秘 → 强势反击' : '迷茫探索 → 遭遇危机 → 破局升华',
      },
      {
        id: 'char_2',
        name: '反派 / 对立面',
        role: 'antagonist',
        description: '制造主要情节阻碍与核心悬念的对象',
        emotionalArc: '嚣张跋扈 → 步步紧逼 → 错愕瓦解',
      },
    ];

    const plotBeats: DramaPlotBeat[] = [
      {
        id: 'beat_1',
        sceneIndex: 1,
        timeRange: [0, 15],
        title: '引子：核心悬念与矛盾初现',
        conflictType: 'setup',
        intensity: 7,
        summary: '交代关键背景，抛出最反常识或最具张力的事件诱因。',
      },
      {
        id: 'beat_2',
        sceneIndex: 2,
        timeRange: [15, 60],
        title: '发展：冲突升级与身份对峙',
        conflictType: isShortDrama ? 'twist' : 'suspense',
        intensity: 8,
        summary: '双方博弈加剧，矛盾推向临界点。',
      },
      {
        id: 'beat_3',
        sceneIndex: 3,
        timeRange: [60, 120],
        title: '高潮：惊天反转与情绪爆发',
        conflictType: 'climax',
        intensity: 10,
        summary: '暗线收拢，真相揭晓，达成最强情绪爽点或视听震撼。',
      },
    ];

    return { characters, plotBeats };
  },
};

/**
 * 2. HookCraftAgent — 黄金 3 秒爆点设计 Agent
 */
export const HookCraftAgent = {
  craftHook: (input: MultiAgentInput): DramaHook => {
    const isShortDrama = input.genre === 'short_drama';
    if (isShortDrama) {
      return {
        hookType: 'flash_forward',
        headline: `谁能想到！原本受尽屈辱的他，竟在这一秒让全场鸦雀无声！`,
        openingText: `“你以为他只是个普通人？接下来的画面，请看仔细了！”`,
        durationSec: 3.5,
      };
    }
    return {
      hookType: 'question',
      headline: `一场精心策划的局，全员各怀鬼胎，究竟谁才是幕后操盘手？`,
      openingText: `“如果给你一次重写命运的机会，你会选择相信眼前的一切吗？”`,
      durationSec: 4.0,
    };
  },
};

/**
 * 3. CommentaryWriterAgent — 双栏分镜解说台词生成 Agent
 */
export const CommentaryWriterAgent = {
  generateBeats: (
    input: MultiAgentInput,
    hook: DramaHook,
    plotBeats: DramaPlotBeat[]
  ): ScreenplaySceneBeat[] => {
    const beats: ScreenplaySceneBeat[] = [
      {
        id: 'sb_0',
        sceneIndex: 0,
        timecode: '00:00:00 - 00:00:04',
        startTimeSec: 0,
        endTimeSec: 4,
        visualCue: '【高潮倒叙快切】特写主角眼神反转，电光石火间镜头推近',
        shotType: 'CU',
        voiceoverText: hook.openingText,
        emotion: 'tense',
        soundFx: 'whoosh_heavy_impact',
        bgmSuggestion: 'epic_tension_riser',
      },
    ];

    plotBeats.forEach((pb, idx) => {
      const start = pb.timeRange[0] + (idx === 0 ? 4 : 0);
      const end = pb.timeRange[1];
      const startStr = formatSecToTimecode(start);
      const endStr = formatSecToTimecode(end);

      beats.push({
        id: `sb_${idx + 1}`,
        sceneIndex: idx + 1,
        timecode: `${startStr} - ${endStr}`,
        startTimeSec: start,
        endTimeSec: end,
        visualCue: `【${pb.title}】${pb.summary}`,
        shotType: idx % 2 === 0 ? 'MS' : 'ACTION',
        voiceoverText: generateNarrationForBeat(pb, input.genre, idx),
        emotion: pb.intensity >= 9 ? 'dramatic' : pb.intensity >= 7 ? 'tense' : 'neutral',
        soundFx: pb.intensity >= 9 ? 'cinematic_boom' : 'soft_ambient',
        bgmSuggestion: pb.intensity >= 9 ? 'rhythmic_suspense' : 'ambient_drone',
      });
    });

    return beats;
  },
};

/**
 * 4. StoryboardAlignerAgent — 分镜音画对齐校验 Agent
 */
export const StoryboardAlignerAgent = {
  alignAndVerify: (beats: ScreenplaySceneBeat[]): { beats: ScreenplaySceneBeat[]; totalDuration: number } => {
    let currentSec = 0;
    const aligned = beats.map((beat, index) => {
      // 按照语速（中文字符约 4 字/秒，西文约 3 词/秒）估算解说所需保底时长
      const wordCount = beat.voiceoverText.length;
      const minDuration = Math.max(3, Number((wordCount / 3.8).toFixed(1)));
      const actualDuration = Math.max(minDuration, beat.endTimeSec - beat.startTimeSec);

      const start = currentSec;
      const end = Number((start + actualDuration).toFixed(1));
      currentSec = end;

      return {
        ...beat,
        sceneIndex: index,
        startTimeSec: start,
        endTimeSec: end,
        timecode: `${formatSecToTimecode(start)} - ${formatSecToTimecode(end)}`,
      };
    });

    return { beats: aligned, totalDuration: currentSec };
  },
};

/**
 * MultiAgentDramaPipeline — 多 Agent 剧本工坊总入口
 */
export const multiAgentDramaPipeline = {
  generateScreenplay: (projectId: string, input: MultiAgentInput): DramaScreenplay => {
    const { characters, plotBeats } = DramaDeconstructAgent.deconstruct(input);
    const hook = HookCraftAgent.craftHook(input);
    const rawBeats = CommentaryWriterAgent.generateBeats(input, hook, plotBeats);
    const { beats, totalDuration } = StoryboardAlignerAgent.alignAndVerify(rawBeats);

    return {
      projectId,
      title: input.title || '未命名影视剧作',
      synopsis: input.sourceSummary || '剧情大纲',
      characters,
      plotBeats,
      hook,
      sceneBeats: beats,
      totalEstimatedDurationSec: totalDuration,
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * P1 优化：多 Agent 流式生成器 (首屏 Hook 秒级输出)
   */
  generateScreenplayStream: async function* (
    projectId: string,
    input: MultiAgentInput
  ): AsyncGenerator<{
    stage: 'deconstruct' | 'hook' | 'beats' | 'aligned' | 'done';
    progress: number;
    partial: Partial<DramaScreenplay>;
  }> {
    // 阶段 1: 角色与大纲拆解
    const { characters, plotBeats } = DramaDeconstructAgent.deconstruct(input);
    yield {
      stage: 'deconstruct',
      progress: 25,
      partial: { projectId, characters, plotBeats },
    };

    // 阶段 2: 黄金 3 秒 Hook 提炼 (秒级呈现)
    const hook = HookCraftAgent.craftHook(input);
    yield {
      stage: 'hook',
      progress: 50,
      partial: { projectId, characters, plotBeats, hook },
    };

    // 阶段 3: 双栏解说分镜台词
    const rawBeats = CommentaryWriterAgent.generateBeats(input, hook, plotBeats);
    yield {
      stage: 'beats',
      progress: 75,
      partial: { projectId, characters, plotBeats, hook, sceneBeats: rawBeats },
    };

    // 阶段 4: 音画时间戳对齐与总长校验
    const { beats, totalDuration } = StoryboardAlignerAgent.alignAndVerify(rawBeats);
    const finalScreenplay: DramaScreenplay = {
      projectId,
      title: input.title || '未命名影视剧作',
      synopsis: input.sourceSummary || '剧情大纲',
      characters,
      plotBeats,
      hook,
      sceneBeats: beats,
      totalEstimatedDurationSec: totalDuration,
      generatedAt: new Date().toISOString(),
    };

    yield {
      stage: 'done',
      progress: 100,
      partial: finalScreenplay,
    };
  },
};

// ─── 内部工具函数 ──────────────────────────────────────────

function formatSecToTimecode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `00:${pad(mins)}:${pad(secs)}`;
}

function generateNarrationForBeat(_beat: DramaPlotBeat, genre: string, index: number): string {
  if (genre === 'short_drama') {
    if (index === 0) {
      return `故事开场，所有人都在看他的笑话，然而谁也没料到，看似逆来顺受的背后，其实早已布好了一张天罗地网。`;
    }
    if (index === 1) {
      return `面对反派的连环步步紧逼，气氛一度降到冰点。就在所有人以为大局已定时，一个关键细节瞬间扭转了局势！`;
    }
    return `真正的王牌在这一刻揭晓！雷霆手段直接让对手彻底瘫倒在地，这波反击看得人直呼过瘾！`;
  }

  // 电影解说模式
  if (index === 0) {
    return `画面拉开，镜头在冷冽的色调中缓缓推进，导演用极度克制的视听语言，埋下了整部影片最深沉的伏笔。`;
  }
  if (index === 1) {
    return `随着调查的深入，真相像洋葱一样被层层剥开。每个角色的细微神态都在诉说着不可告人的隐秘。`;
  }
  return `当宿命的终局降临，视听张力在这一刻达到了顶峰，留给观众的是长久的心灵震撼与回响。`;
}
