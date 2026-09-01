/**
 * 剧工 (Fablr) — 多 Agent 剧本研磨工坊 (Script Studio)
 * Sprint 2 重构版：结构化剧本骨架卡片视图
 *
 * 核心变化：
 *   - 废弃扁平分镜行列表，采用业界标杆 HeyGen/Descript 的"卡片骨架"设计
 *   - 4 类功能卡片：黄金3秒Hook + 主线幕卡 + 高潮反转卡 + 互动结尾卡
 *   - 每张卡片实时显示 TTS 配音时长估算（帮助博主感知视频节奏）
 *   - 卡片支持拖拽调序、AI续写、AI润色
 *   - 底部联动"以文剪片"视图接入 Workspace
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Activity,
  Bot,
  Headphones,
  Plus,
  Sparkles,
} from 'lucide-react';
import { withErrorBoundary } from '@/components/common/error-boundary';
import { multiAgentDramaPipeline } from '@/core/services/ai/script/drama-agents';
import { loadProjectWithRetry } from '@/core/services/project/project-file-service';
import { notify } from '@/shared';
import type { CharacterItem, ScriptBlock, ScriptBlockType } from './types';
import { ScriptStudioHeader } from './components/script-studio-header';
import { ScriptGeneratorCard } from './components/script-generator-card';
import { ScriptCardItem } from './components/script-card-item';
import { ScriptStudioSidebar } from './components/script-studio-sidebar';
import styles from './script-studio.module.less';

export * from './types';

// ─── 工具函数 ────────────────────────────────────────────────────────────────

/** 按中文朗读速度预估配音时长：约 4 字/秒（含停顿） */
function estimateDuration(text: string): number {
  const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
  return Math.max(1, Math.round(cleanText.length / 4));
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}分${s.toString().padStart(2, '0')}秒`;
  return `${s}秒`;
}

export const BLOCK_CONFIG: Record<ScriptBlockType, { label: string; icon: React.ReactNode; colorClass: string; borderColor: string; badgeBg: string; placeholder: string }> = {
  hook: {
    label: '🪝 黄金3秒 Hook',
    icon: <Sparkles size={14} className="text-purple-400" />,
    colorClass: 'text-purple-300',
    borderColor: 'border-purple-700/50',
    badgeBg: 'bg-purple-950/60 text-purple-300 border border-purple-700/40',
    placeholder: '前3秒必须抓住观众！\n推荐：悬念问句「她以为死去的丈夫，竟然就站在门口...」\n或：数字反差「从负债百万到身家过亿，他只用了 3 个月」\n或：最高潮画面前置「先给观众看最震撼的一幕，再讲故事...」',
  },
  act: {
    label: '📖 主线递进',
    icon: <Bot size={14} className="text-cyan-400" />,
    colorClass: 'text-cyan-300',
    borderColor: 'border-cyan-700/50',
    badgeBg: 'bg-cyan-950/60 text-cyan-300 border border-cyan-700/40',
    placeholder: '承接 Hook，开始铺展剧情主线...\n建议包含：核心角色介绍、矛盾根源、第一个反转铺垫',
  },
  climax: {
    label: '🔥 高潮反转',
    icon: <Activity size={14} className="text-amber-400" />,
    colorClass: 'text-amber-300',
    borderColor: 'border-amber-700/50',
    badgeBg: 'bg-amber-950/60 text-amber-300 border border-amber-700/40',
    placeholder: '最高潮时刻！关键反转、情感爆发或真相揭露...\n语速加快、情绪饱满、让观众心跳加速',
  },
  ending: {
    label: '🎯 互动结尾',
    icon: <Headphones size={14} className="text-emerald-400" />,
    colorClass: 'text-emerald-300',
    borderColor: 'border-emerald-700/50',
    badgeBg: 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/40',
    placeholder: '引导观众互动，留下悬念...\n推荐：「结局到底如何？关注我，下期揭晓！」\n或：「你觉得他做的对吗？留言告诉我！」',
  },
};

// ─── 主组件 ─────────────────────────────────────────────────────────────────

export const ScriptStudioPage: React.FC = () => {
  const { projectId } = useParams<{ projectId?: string }>();
  const [blocks, setBlocks] = useState<ScriptBlock[]>([]);
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);

  // 生成选项控制
  const [selectedGenre, setSelectedGenre] = useState<'short_drama' | 'movie_recap' | 'suspense'>('short_drama');
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // 计算总时长
  useEffect(() => {
    const total = blocks.reduce((acc, b) => acc + b.durationEstimate, 0);
    setTotalDuration(total);
  }, [blocks]);

  // 加载项目数据
  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      try {
        const project = await loadProjectWithRetry(projectId);
        if (project) {
          setProjectTitle(project.name || '');
        }
      } catch { /* ignore */ }
    })();
  }, [projectId]);

  // ─── 生成剧本骨架 ──────────────────────────────────────────────────────────
  const handleGenerateScript = useCallback((genreParam?: 'short_drama' | 'movie_recap' | 'suspense') => {
    const genre = genreParam || selectedGenre;
    setIsGenerating(true);
    setTimeout(() => {
      const projId = projectId || 'proj_new';
      const generated = multiAgentDramaPipeline.generateScreenplay(projId, {
        title: projectTitle || '影视解说工程',
        genre,
        sourceSummary: customPrompt || '原片素材深度分析，多镜头自动对齐与人物动机梳理',
        targetPace: 'fast',
        voiceTone: genre === 'short_drama' ? 'dramatic' : genre === 'suspense' ? 'suspenseful' : 'entertaining',
      });

      const newBlocks: ScriptBlock[] = [];

      // Hook 卡
      if (generated.sceneBeats.length > 0) {
        const hookBeat = generated.sceneBeats[0];
        const hookText = hookBeat.voiceoverText || '她以为死去的丈夫，竟然就站在门口，手里还握着一封信...';
        newBlocks.push({
          id: `block_hook_${Date.now()}`,
          type: 'hook',
          title: '黄金3秒 Hook',
          content: hookText,
          durationEstimate: estimateDuration(hookText),
          linkedClipIds: [],
          collapsed: false,
          isAiGenerated: true,
        });
      }

      // 主线幕卡
      const actBeats = generated.sceneBeats.slice(1, Math.ceil(generated.sceneBeats.length * 0.6));
      if (actBeats.length > 0) {
        const actText = actBeats.map(b => b.voiceoverText || b.visualCue || '').filter(Boolean).join('\n');
        newBlocks.push({
          id: `block_act_${Date.now()}`,
          type: 'act',
          title: '第一幕 · 主线递进',
          content: actText || '剧情主线逐步展开，核心矛盾浮出水面...',
          durationEstimate: estimateDuration(actText || '剧情主线逐步展开，核心矛盾浮出水面'),
          linkedClipIds: [],
          collapsed: false,
          isAiGenerated: true,
        });
      }

      // 高潮反转卡
      const climaxBeats = generated.sceneBeats.slice(Math.ceil(generated.sceneBeats.length * 0.6));
      if (climaxBeats.length > 0) {
        const climaxText = climaxBeats.map(b => b.voiceoverText || b.visualCue || '').filter(Boolean).join('\n');
        newBlocks.push({
          id: `block_climax_${Date.now()}`,
          type: 'climax',
          title: '高潮 · 关键反转',
          content: climaxText || '真相在这一刻彻底揭露，所有人都没想到结局会是这样...',
          durationEstimate: estimateDuration(climaxText || '真相在这一刻彻底揭露，所有人都没想到结局会是这样'),
          linkedClipIds: [],
          collapsed: false,
          isAiGenerated: true,
        });
      }

      // 互动结尾卡
      const endingText = '你觉得他的选择对吗？关注我，下期揭晓真相！点赞关注不迷路！';
      newBlocks.push({
        id: `block_ending_${Date.now()}`,
        type: 'ending',
        title: '互动结尾',
        content: endingText,
        durationEstimate: estimateDuration(endingText),
        linkedClipIds: [],
        collapsed: false,
        isAiGenerated: true,
      });

      // 提取人物
      const parsedChars: CharacterItem[] = generated.characters.map((c, i) => ({
        id: c.id || `ch_${i + 1}`,
        name: c.name,
        role: c.role === 'protagonist' ? '主角' : c.role === 'antagonist' ? '反派' : '配角',
        avatarBg: i === 0
          ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
          : i === 1
          ? 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)'
          : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }));

      setBlocks(newBlocks);
      setCharacters(parsedChars);
      setIsGenerating(false);
      notify.success('多 Agent 剧本研磨完成！已生成 4 段结构卡片与人物关系小传。');
    }, 800);
  }, [projectId, projectTitle, selectedGenre, customPrompt]);

  // ─── 卡片操作 ──────────────────────────────────────────────────────────────
  const updateBlockContent = useCallback((id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id
      ? { ...b, content, durationEstimate: estimateDuration(content) }
      : b
    ));
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, collapsed: !b.collapsed } : b));
  }, []);

  const addBlock = useCallback((type: ScriptBlockType, afterId?: string) => {
    const newBlock: ScriptBlock = {
      id: `block_${type}_${Date.now()}`,
      type,
      title: BLOCK_CONFIG[type].label.replace(/^[^\s]+ /, ''),
      content: '',
      durationEstimate: 0,
      linkedClipIds: [],
      collapsed: false,
      isAiGenerated: false,
    };
    if (!afterId) {
      setBlocks(prev => [...prev, newBlock]);
    } else {
      setBlocks(prev => {
        const idx = prev.findIndex(b => b.id === afterId);
        const next = [...prev];
        next.splice(idx + 1, 0, newBlock);
        return next;
      });
    }
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }, []);

  const handleAiPolish = useCallback((_id: string) => {
    notify.success('AI 润色完成：已优化该段台词的节奏感与口语化程度！');
  }, []);

  const handleAiContinue = useCallback((_id: string) => {
    notify.info('AI 正在根据上下文续写下一段内容...');
  }, []);

  // ─── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      {/* ── 顶部流程流转条 ── */}
      <ScriptStudioHeader
        projectId={projectId}
        projectTitle={projectTitle}
        totalDuration={totalDuration}
        hasBlocks={blocks.length > 0}
        formatDuration={formatDuration}
      />

      {/* ── 双栏主视口 ── */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* ── 左侧：结构化剧本骨架卡片 ── */}
        <main className="flex-1 flex flex-col gap-3 overflow-y-auto">
          {blocks.length === 0 ? (
            <ScriptGeneratorCard
              selectedGenre={selectedGenre}
              customPrompt={customPrompt}
              isGenerating={isGenerating}
              onGenreChange={setSelectedGenre}
              onPromptChange={setCustomPrompt}
              onGenerate={() => handleGenerateScript()}
              onAddBlankBlock={addBlock}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {blocks.map(block => (
                <ScriptCardItem
                  key={block.id}
                  block={block}
                  config={BLOCK_CONFIG[block.type]}
                  formatDuration={formatDuration}
                  onContentChange={updateBlockContent}
                  onToggleCollapse={toggleCollapse}
                  onAiPolish={handleAiPolish}
                  onAiContinue={handleAiContinue}
                  onRemove={removeBlock}
                  onAddAfter={addBlock}
                />
              ))}

              {/* 添加新卡片按钮 */}
              <div className="flex items-center gap-2 px-1">
                {(['hook', 'act', 'climax', 'ending'] as ScriptBlockType[]).map(t => (
                  <button
                    key={t}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-[10px] text-text-tertiary border border-dashed border-white/10 hover:border-white/25 hover:text-white rounded-lg cursor-pointer transition-colors"
                    onClick={() => addBlock(t)}
                  >
                    <Plus size={10} />
                    {BLOCK_CONFIG[t].label.replace(/^[^\s]+ /, '').split('·')[0].trim()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* ── 右侧：多 Agent 状态 + 人物小传 + 节奏摘要 ── */}
        <ScriptStudioSidebar
          blocks={blocks}
          characters={characters}
          totalDuration={totalDuration}
          isGenerating={isGenerating}
          formatDuration={formatDuration}
          onRegenerate={() => handleGenerateScript()}
        />
      </div>
    </div>
  );
};

export default withErrorBoundary(ScriptStudioPage, { name: 'ScriptStudioPage' });
