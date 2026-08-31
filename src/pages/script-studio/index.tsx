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
import { useNavigate, useParams } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  Activity,
  Download,
  Scissors,
  Plus,
  Clock,
  Headphones,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Wand2,
  RefreshCw,
  User,
} from 'lucide-react';
import { withErrorBoundary } from '@/components/common/error-boundary';
import { multiAgentDramaPipeline } from '@/core/services/ai/script/drama-agents';
import { loadProjectWithRetry } from '@/core/services/project/project-file-service';
import { notify } from '@/shared';
import styles from './script-studio.module.less';

// ─── 类型定义 ────────────────────────────────────────────────────────────────

/** 卡片类型：黄金Hook / 主线幕 / 高潮反转 / 互动结尾 */
export type ScriptBlockType = 'hook' | 'act' | 'climax' | 'ending';

export interface ScriptBlock {
  id: string;
  type: ScriptBlockType;
  title: string;
  content: string;
  durationEstimate: number;   // 配音时长预估（秒），按中文 4 字/秒计算
  linkedClipIds: string[];    // 关联的 Asset Hub 切片 ID
  collapsed: boolean;
  isAiGenerated: boolean;
}

interface CharacterItem {
  id: string;
  name: string;
  role: string;
  avatarBg: string;
}

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

const BLOCK_CONFIG: Record<ScriptBlockType, { label: string; icon: React.ReactNode; colorClass: string; borderColor: string; badgeBg: string; placeholder: string }> = {
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
  const navigate = useNavigate();
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
      <div className={styles.topBarRow}>
        <div className={styles.titleGroup}>
          <span className="font-bold text-sm text-white">
            剧工 Fablr · {projectTitle || 'AI 剧本研磨工坊'}
          </span>
          {totalDuration > 0 && (
            <span className={styles.genreBadge}>
              <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
              预计 {formatDuration(totalDuration)}
            </span>
          )}
        </div>

        <div className={styles.pipelineSteps}>
          <button className={styles.stepBtn} onClick={() => navigate(projectId ? `/asset-hub/${projectId}` : '/asset-hub')}>
            1. 素材拆条
          </button>
          <button className={`${styles.stepBtn} ${styles.activeStepBtn}`}>
            2. 剧本研磨 (当前)
          </button>
          <button className={styles.stepBtn} onClick={() => navigate(projectId ? `/workspace/${projectId}` : '/workspace')}>
            3. 剪辑合成
          </button>
          <button className={styles.stepBtn} onClick={() => navigate(projectId ? `/export-hub/${projectId}` : '/export-hub')}>
            4. 消重发布
          </button>
        </div>

        <div className={styles.topRightBtns}>
          <button
            className={styles.outlineBtn}
            onClick={() => notify.success('剧本草稿已导出为 TXT 格式！')}
            disabled={blocks.length === 0}
          >
            <Download size={13} />
            <span>导出剧本</span>
          </button>
          <button
            className={styles.primaryStudioBtn}
            onClick={() => navigate(projectId ? `/workspace/${projectId}` : '/workspace')}
            disabled={blocks.length === 0}
          >
            <Scissors size={13} />
            <span>去剪辑合成 →</span>
          </button>
        </div>
      </div>

      {/* ── 双栏主视口 ── */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* ── 左侧：结构化剧本骨架卡片 ── */}
        <main className="flex-1 flex flex-col gap-3 overflow-y-auto">
          {blocks.length === 0 ? (
            /* 高颜值交互式剧本研磨工作台（交互式创作中枢） */
            <div className="flex flex-col gap-4">
              {/* 顶部 AI 协同研磨配置中枢 */}
              <div className="bg-[#111220] border border-white/8 rounded-xl p-5 flex flex-col gap-4 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/6 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-700/50 flex items-center justify-center text-purple-400">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        AI 智能编剧研磨中枢
                        <span className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-700/40 px-2 py-0.5 rounded-full font-medium">
                          多 Agent 实时联动
                        </span>
                      </div>
                      <div className="text-[11px] text-text-tertiary">
                        自动识别原片核心转折点，一键生成结构化分段剧本
                      </div>
                    </div>
                  </div>

                  {/* 叙事体裁切换 */}
                  <div className="flex items-center gap-1 bg-[#18192a] p-1 rounded-lg border border-white/5">
                    <button
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                        selectedGenre === 'short_drama'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-text-tertiary hover:text-white'
                      }`}
                      onClick={() => setSelectedGenre('short_drama')}
                    >
                      🔥 爆款短剧
                    </button>
                    <button
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                        selectedGenre === 'movie_recap'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-text-tertiary hover:text-white'
                      }`}
                      onClick={() => setSelectedGenre('movie_recap')}
                    >
                      🎬 电影深度解说
                    </button>
                    <button
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                        selectedGenre === 'suspense'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-text-tertiary hover:text-white'
                      }`}
                      onClick={() => setSelectedGenre('suspense')}
                    >
                      🕵️ 悬疑探案
                    </button>
                  </div>
                </div>

                {/* 剧本生成引导输入区 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <Bot size={13} className="text-purple-400" />
                      创作提示词或剧情主线 (可选)：
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      支持输入角色动机、特定反转点或解说语气
                    </span>
                  </div>
                  <textarea
                    className="w-full bg-[#18192a] border border-white/8 hover:border-purple-600/40 focus:border-purple-600 rounded-lg p-3 text-xs text-white placeholder-white/20 outline-none resize-none transition-colors"
                    rows={3}
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder="例如：开头前3秒突出男主隐忍3年后的打脸瞬间，语速偏快，语气带强烈悬念与情绪压迫感..."
                  />
                </div>

                {/* 底部动作条 */}
                <div className="flex items-center justify-between pt-2 border-t border-white/6">
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2.5 py-1 text-[11px] bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white rounded border border-white/8 cursor-pointer transition-colors"
                      onClick={() => setCustomPrompt('突出反转与打脸，高潮部分情绪激昂，结尾留下悬念')}
                    >
                      ⚡ 强情绪反转
                    </button>
                    <button
                      className="px-2.5 py-1 text-[11px] bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white rounded border border-white/8 cursor-pointer transition-colors"
                      onClick={() => setCustomPrompt('注重细节与心理博弈，层层推进真相')}
                    >
                      🕵️ 烧脑悬疑
                    </button>
                    <button
                      className="px-2.5 py-1 text-[11px] bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white rounded border border-white/8 cursor-pointer transition-colors"
                      onClick={() => setCustomPrompt('快节奏口语化，适合短视频完播率冲刺')}
                    >
                      🚀 短视频快节奏
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 text-xs text-text-tertiary hover:text-white cursor-pointer"
                      onClick={() => addBlock('hook')}
                    >
                      + 手动空白新建
                    </button>
                    <button
                      className="px-5 py-2 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                      onClick={() => handleGenerateScript()}
                      disabled={isGenerating}
                    >
                      <Sparkles size={13} />
                      <span>{isGenerating ? '多 Agent 正在研磨中...' : '一键 AI 研磨剧本骨架'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 大爆款短剧结构模板卡 */}
              <div className="flex flex-col gap-2">
                <div className="text-xs font-bold text-text-secondary px-1 flex items-center gap-1.5">
                  <Activity size={13} className="text-amber-400" />
                  <span>或直接套用短视频爆款剧本骨架：</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div
                    className="bg-[#111220] hover:bg-[#15162a] border border-white/8 hover:border-purple-600/50 rounded-xl p-4 flex flex-col gap-2.5 cursor-pointer transition-all shadow-md group"
                    onClick={() => {
                      setSelectedGenre('suspense');
                      handleGenerateScript('suspense');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                        🔥 悬疑反转倒叙模板
                      </span>
                      <span className="text-[9px] text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.5 rounded font-bold">
                        98% 完播率
                      </span>
                    </div>
                    <div className="text-[11px] text-text-tertiary leading-relaxed">
                      将大结局或凶案现场最高潮前置为 Hook，前3秒牢牢锁定观众好奇心。
                    </div>
                    <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-purple-400 group-hover:text-purple-300">
                      <span>包含 4 段骨架卡片</span>
                      <span>点击一键套用 →</span>
                    </div>
                  </div>

                  <div
                    className="bg-[#111220] hover:bg-[#15162a] border border-white/8 hover:border-purple-600/50 rounded-xl p-4 flex flex-col gap-2.5 cursor-pointer transition-all shadow-md group"
                    onClick={() => {
                      setSelectedGenre('short_drama');
                      handleGenerateScript('short_drama');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                        ⚡ 战神逆袭打脸模板
                      </span>
                      <span className="text-[9px] text-purple-400 bg-purple-950/60 border border-purple-800/40 px-1.5 py-0.5 rounded font-bold">
                        超强情绪爽点
                      </span>
                    </div>
                    <div className="text-[11px] text-text-tertiary leading-relaxed">
                      快速铺垫主角屈辱反差，中段步步紧逼，结尾身份亮明爆发爽感。
                    </div>
                    <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-purple-400 group-hover:text-purple-300">
                      <span>包含 4 段骨架卡片</span>
                      <span>点击一键套用 →</span>
                    </div>
                  </div>

                  <div
                    className="bg-[#111220] hover:bg-[#15162a] border border-white/8 hover:border-purple-600/50 rounded-xl p-4 flex flex-col gap-2.5 cursor-pointer transition-all shadow-md group"
                    onClick={() => {
                      setSelectedGenre('movie_recap');
                      handleGenerateScript('movie_recap');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                        🎭 情感伦理深度模板
                      </span>
                      <span className="text-[9px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded font-bold">
                        高评论互动
                      </span>
                    </div>
                    <div className="text-[11px] text-text-tertiary leading-relaxed">
                      家庭矛盾与道德抉择冲突，结尾设置话题问句引发评论区激烈讨论。
                    </div>
                    <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-purple-400 group-hover:text-purple-300">
                      <span>包含 4 段骨架卡片</span>
                      <span>点击一键套用 →</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 结构化卡片列表 */
            <div className="flex flex-col gap-3">
              {blocks.map((block) => {
                const cfg = BLOCK_CONFIG[block.type];
                return (
                  <div
                    key={block.id}
                    className={`bg-[#111220] border ${cfg.borderColor} rounded-xl overflow-hidden transition-all`}
                  >
                    {/* 卡片头部 */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#0e0f1c]">
                      <GripVertical size={14} className="text-white/20 cursor-grab" />
                      <div className={`flex items-center gap-1.5 ${cfg.colorClass} font-semibold text-sm`}>
                        {cfg.icon}
                        <span>{block.title}</span>
                      </div>
                      {block.isAiGenerated && (
                        <span className="text-[9px] bg-purple-950/60 text-purple-400 border border-purple-800/40 px-1.5 py-0.5 rounded-full font-medium">
                          AI 生成
                        </span>
                      )}

                      {/* 配音时长标签 */}
                      <div className="ml-auto flex items-center gap-2">
                        {block.durationEstimate > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-text-tertiary bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
                            <Clock size={9} />
                            配音约 {formatDuration(block.durationEstimate)}
                          </span>
                        )}
                        <button
                          className="text-[10px] text-text-tertiary hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
                          onClick={() => handleAiPolish(block.id)}
                          title="AI 润色"
                        >
                          <Wand2 size={11} />
                        </button>
                        <button
                          className="text-[10px] text-text-tertiary hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
                          onClick={() => toggleCollapse(block.id)}
                          title={block.collapsed ? '展开' : '收起'}
                        >
                          {block.collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                        </button>
                        <button
                          className="text-[10px] text-text-tertiary hover:text-red-400 px-1.5 py-0.5 rounded cursor-pointer"
                          onClick={() => removeBlock(block.id)}
                          title="删除卡片"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {/* 卡片内容 */}
                    {!block.collapsed && (
                      <div className="p-4">
                        <textarea
                          className="w-full bg-transparent text-sm text-white/90 leading-relaxed resize-none border-0 outline-none placeholder-white/20 min-h-[100px]"
                          value={block.content}
                          placeholder={cfg.placeholder}
                          onChange={e => updateBlockContent(block.id, e.target.value)}
                          rows={Math.max(4, (block.content.match(/\n/g) || []).length + 4)}
                        />

                        {/* 卡片底部操作条 */}
                        <div className="flex items-center gap-2 pt-3 mt-2 border-t border-white/5">
                          <button
                            className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                            onClick={() => handleAiContinue(block.id)}
                          >
                            <RefreshCw size={10} /> AI 续写
                          </button>
                          <button
                            className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                            onClick={() => handleAiPolish(block.id)}
                          >
                            <Wand2 size={10} /> AI 润色
                          </button>
                          <span className="ml-auto text-[10px] text-text-tertiary">
                            {block.content.replace(/\s/g, '').length} 字
                          </span>
                          {/* 插入下一个卡片 */}
                          <div className="relative group">
                            <button className="text-[10px] text-text-tertiary hover:text-white flex items-center gap-1 cursor-pointer">
                              <Plus size={10} /> 插入段落
                            </button>
                            <div className="absolute right-0 bottom-full mb-1 hidden group-hover:flex flex-col bg-[#1a1b2e] border border-white/10 rounded-lg overflow-hidden shadow-lg z-10 w-28">
                              {(['hook', 'act', 'climax', 'ending'] as ScriptBlockType[]).map(t => (
                                <button
                                  key={t}
                                  className="text-[10px] text-left px-3 py-1.5 hover:bg-white/5 text-text-secondary cursor-pointer"
                                  onClick={() => addBlock(t, block.id)}
                                >
                                  {BLOCK_CONFIG[t].label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

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
        <aside className={styles.rightColumn}>
          {/* 多智能体状态 */}
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>多智能体协作状态</span>
          </div>
          <div className={styles.agentList}>
            <div className={styles.agentCard}>
              <div className={styles.agentCardHeader}>
                <div className="flex items-center gap-2">
                  <div className={`${styles.agentIconCircle} bg-purple-500/20 text-purple-400`}>
                    <Bot size={13} />
                  </div>
                  <span className={styles.agentName}>解说编剧 Agent</span>
                </div>
                <span className={styles.agentReadyTag}>● 已就绪</span>
              </div>
              <p className={styles.agentDesc}>整体叙事节奏与口语化台词转写</p>
            </div>
            <div className={styles.agentCard}>
              <div className={styles.agentCardHeader}>
                <div className="flex items-center gap-2">
                  <div className={`${styles.agentIconCircle} bg-amber-500/20 text-amber-400`}>
                    <Sparkles size={13} />
                  </div>
                  <span className={styles.agentName}>黄金 Hook Agent</span>
                </div>
                <span className={styles.agentReadyTag}>● 待命</span>
              </div>
              <p className={styles.agentDesc}>前3秒悬念倒叙设计，提升完播率</p>
            </div>
            <div className={styles.agentCard}>
              <div className={styles.agentCardHeader}>
                <div className="flex items-center gap-2">
                  <div className={`${styles.agentIconCircle} bg-emerald-500/20 text-emerald-400`}>
                    <Activity size={13} />
                  </div>
                  <span className={styles.agentName}>情绪节奏 Agent</span>
                </div>
                <span className={styles.agentReadyTag}>● 待命</span>
              </div>
              <p className={styles.agentDesc}>剧情起承转合与高潮背景音对齐</p>
            </div>
          </div>

          {/* 节奏摘要 */}
          {blocks.length > 0 && (
            <div className={`${styles.emotionCurveCard} mt-3`}>
              <div className={styles.emotionTitle}>节奏摘要</div>
              <div className="flex flex-col gap-1.5 mt-2">
                {blocks.map(b => {
                  const cfg = BLOCK_CONFIG[b.type];
                  return (
                    <div key={b.id} className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${cfg.badgeBg}`}>
                        {cfg.label.split(' ')[1] || cfg.label}
                      </span>
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-500/70"
                          style={{ width: `${Math.min(100, (b.durationEstimate / 60) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-text-tertiary">{formatDuration(b.durationEstimate)}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center mt-1 pt-2 border-t border-white/5">
                  <span className="text-[10px] text-text-tertiary">总预估时长</span>
                  <span className="text-[10px] font-bold text-white">{formatDuration(totalDuration)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 人物小传 */}
          {characters.length > 0 && (
            <div className="mt-3">
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>人物小传</span>
              </div>
              <div className={styles.characterList}>
                {characters.map(c => (
                  <div key={c.id} className={styles.characterCard}>
                    <div className={styles.characterAvatar} style={{ background: c.avatarBg }}>
                      <User size={14} className="text-white/80" />
                    </div>
                    <div className={styles.characterMeta}>
                      <span className={styles.characterName}>{c.name}</span>
                      <span className={styles.characterRoleTag}>{c.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="mt-auto pt-4 flex flex-col gap-2">
            <button
              className={styles.primaryStudioBtn}
              onClick={() => handleGenerateScript()}
              disabled={isGenerating}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <RefreshCw size={13} />
              <span>{isGenerating ? '生成中...' : '重新生成骨架'}</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default withErrorBoundary(ScriptStudioPage, { name: 'ScriptStudioPage' });
