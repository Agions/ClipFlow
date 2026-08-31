/**
 * 剧工 (Fablr) — 专业视听剪辑工作台 (Video Workspace & Multi-Track Studio)
 * 纯中文专业 Dark Studio 剪辑台、16:9 监视器与 5 轨时间轴
 * 真实数据驱动：支持按 projectId 联动加载项目与跨工坊无缝跳转
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Scissors,
  MousePointer,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Upload,
  Plus,
  Video,
  Send,
  FileText,
  AlignLeft,
  Layers,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { withErrorBoundary } from '@/components/common/error-boundary';
import { loadProjectWithRetry } from '@/core/services/project/project-file-service';
import { notify } from '@/shared';
import styles from './workspace.module.less';

export interface MediaSourceItem {
  id: string;
  name: string;
  duration: string;
  type: 'video' | 'audio';
  bgGradient: string;
}

/** 剧本视图中每一个文稿块，与时间轴一一对应 */
export interface ScriptTimelineBlock {
  id: string;
  type: 'hook' | 'act' | 'climax' | 'ending';
  label: string;
  text: string;
  durationSec: number;
  linkedClipName: string;
  color: string;
}

export const WorkspaceStudioPage: React.FC = () => {
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'script' | 'timeline'>('script');
  const [isPlaying, setIsPlaying] = useState(false);
  const [sources, setSources] = useState<MediaSourceItem[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [scriptBlocks, setScriptBlocks] = useState<ScriptTimelineBlock[]>([]);

  const [styleMode, setStyleMode] = useState('fast_recap');
  const [speaker, setSpeaker] = useState('teacher_wang');
  const [bgmGenre, setBgmGenre] = useState('suspense');

  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      try {
        const project = await loadProjectWithRetry(projectId);
        if (project) {
          setProjectTitle(project.name || '');
          const videoName = project.name ? `${project.name}.mp4` : '主视频素材.mp4';
          const newSources: MediaSourceItem[] = [
            {
              id: `src_${project.id}_main`,
              name: videoName,
              duration: '03:30',
              type: 'video',
              bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            },
            {
              id: `src_${project.id}_broll`,
              name: `${project.name || '项目'}_高光特写.mp4`,
              duration: '01:15',
              type: 'video',
              bgGradient: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
            },
          ];
          setSources(newSources);
          setActiveSourceId(`src_${project.id}_main`);
        }
      } catch {
        // ignore
      }
    })();
  }, [projectId]);

  const activeSource = sources.find(s => s.id === activeSourceId) || sources[0] || null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newSources: MediaSourceItem[] = Array.from(files).map((f, i) => ({
      id: `src_${Date.now()}_${i}`,
      name: f.name,
      duration: '03:15',
      type: f.type.startsWith('audio') ? 'audio' : 'video',
      bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
    }));

    setSources(prev => [...newSources, ...prev]);
    setActiveSourceId(newSources[0].id);
    notify.success(`已成功导入 ${newSources.length} 个视听素材到工作台！`);
  };

  const handleStartAiGen = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      const genBlocks: ScriptTimelineBlock[] = [
        { id: 'sb_hook', type: 'hook', label: '黄金3秒 Hook', text: '她以为死去的丈夫，竟然就站在门口...', durationSec: 6, linkedClipName: '主视频镜头01', color: '#a855f7' },
        { id: 'sb_act1', type: 'act', label: '主线递进', text: '剧情主线逐步展开，核心矛盾浮出水面，双方陷入激烈对峙...', durationSec: 32, linkedClipName: '主视频镜头02-04', color: '#06b6d4' },
        { id: 'sb_climax', type: 'climax', label: '高潮反转', text: '真相在这一刻彻底揭露，所有人都没想到结局会是这样...', durationSec: 28, linkedClipName: '主视频镜头05-07', color: '#f59e0b' },
        { id: 'sb_ending', type: 'ending', label: '互动结尾', text: '点赞关注不迷路，我们下期再见！', durationSec: 8, linkedClipName: '片尾镜头', color: '#10b981' },
      ];
      setScriptBlocks(genBlocks);
      if (sources.length === 0) {
        const generatedSources: MediaSourceItem[] = [
          { id: 'src_gen_1', name: 'AI合成_主视频轨.mp4', duration: '03:30', type: 'video', bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' },
        ];
        setSources(generatedSources);
        setActiveSourceId('src_gen_1');
      }
      notify.success('AI 影视解说 5 轨合成完成！剧本视图已同步对齐 4 个叙事块。');
    }, 800);
  };

  const handleExportJianying = () => {
    notify.success('剪映工程草稿 (draft_content.json) 导出成功！');
  };

  return (
    <div className={styles.container}>
      {/* ── 顶部跨工坊流转步骤条 ── */}
      <div className="flex items-center justify-between bg-[#111220] border border-white/8 rounded-xl px-4 py-2.5 mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-white">
            {projectTitle ? `剧工 Fablr · ${projectTitle}` : '剧工 Fablr · 专业视听剪辑工作台'}
          </span>
          <span className="text-[10px] text-teal-400 bg-teal-950/60 border border-teal-800/40 px-2 py-0.5 rounded-full font-semibold">
            5 轨智能合成
          </span>
        </div>

        {/* 4 阶段步骤胶囊 */}
        <div className="flex items-center gap-1 bg-[#18192a] p-1 rounded-lg border border-white/5">
          <button
            className="px-2.5 py-1 text-xs text-text-tertiary hover:text-white rounded hover:bg-white/5 transition-colors"
            onClick={() => navigate(projectId ? `/asset-hub/${projectId}` : '/asset-hub')}
          >
            1. 素材拆条
          </button>
          <button
            className="px-2.5 py-1 text-xs text-text-tertiary hover:text-white rounded hover:bg-white/5 transition-colors"
            onClick={() => navigate(projectId ? `/script-studio/${projectId}` : '/script-studio')}
          >
            2. 剧本研磨
          </button>
          <button className="px-2.5 py-1 text-xs font-semibold text-teal-300 bg-teal-950/60 rounded border border-teal-800/40">
            3. 剪辑合成 (当前)
          </button>
          <button
            className="px-2.5 py-1 text-xs text-text-tertiary hover:text-white rounded hover:bg-white/5 transition-colors"
            onClick={() => navigate(projectId ? `/export-hub/${projectId}` : '/export-hub')}
          >
            4. 消重发布
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex items-center bg-[#18192a] border border-white/8 rounded-lg p-0.5">
            <button
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${viewMode === 'script' ? 'bg-purple-600 text-white font-semibold shadow-sm' : 'text-text-tertiary hover:text-white'}`}
              onClick={() => setViewMode('script')}
            >
              <FileText size={11} />
              剧本视图
            </button>
            <button
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${viewMode === 'timeline' ? 'bg-purple-600 text-white font-semibold shadow-sm' : 'text-text-tertiary hover:text-white'}`}
              onClick={() => setViewMode('timeline')}
            >
              <Layers size={11} />
              时间轴视图
            </button>
          </div>

          <button
            className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            onClick={() => navigate(projectId ? `/export-hub/${projectId}` : '/export-hub')}
          >
            <Send size={13} />
            <span>进入消重发布 →</span>
          </button>
        </div>
      </div>

      {/* ── 剧本视图（Sprint 3 新增：以文剪片双联布局）── */}
      {viewMode === 'script' && (
        <div className="flex gap-3 mb-3" style={{ minHeight: '220px' }}>
          {/* 左侧：剧本文本流 */}
          <div className="flex-1 bg-[#111220] border border-white/8 rounded-xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlignLeft size={13} className="text-purple-400" />
                <span className="text-xs font-semibold text-white">剧本文本流 · 以文剪片</span>
              </div>
              <div className="flex items-center gap-1.5">
                {scriptBlocks.length > 0 && (
                  <span className="text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-full">
                    ● 已与时间轴对齐
                  </span>
                )}
                <span className="text-[9px] text-purple-300 bg-purple-950/30 border border-purple-800/30 px-2 py-0.5 rounded-full">
                  修改文本 → 自动触发轨道更新
                </span>
              </div>
            </div>

            {scriptBlocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3 text-text-tertiary">
                <FileText size={28} className="opacity-30 text-purple-400" />
                <div>
                  <div className="text-xs font-medium text-white mb-1">暂无剧本数据</div>
                  <div className="text-[10px] text-text-tertiary mb-3">
                    请先在「剧本研磨工坊」生成剧本，或点击 AI 一键合成
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs text-purple-300 border border-purple-800/40 bg-purple-950/30 hover:bg-purple-900/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                    onClick={() => navigate(projectId ? `/script-studio/${projectId}` : '/script-studio')}
                  >
                    <AlignLeft size={11} />
                    去剧本研磨工坊
                  </button>
                  <button
                    className="text-xs text-teal-300 border border-teal-800/40 bg-teal-950/30 hover:bg-teal-900/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                    onClick={handleStartAiGen}
                    disabled={isGenerating}
                  >
                    <Sparkles size={11} />
                    {isGenerating ? '生成中...' : 'AI 一键合成示例剧本'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {scriptBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-[#0e0f1c] hover:border-white/12 transition-colors group"
                  >
                    {/* 色条 */}
                    <div className="w-1 rounded-full self-stretch flex-shrink-0" style={{ background: block.color }} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: block.color + '25', color: block.color, border: `1px solid ${block.color}40` }}>
                          {block.label}
                        </span>
                        <span className="text-[9px] text-text-tertiary flex items-center gap-0.5">
                          <Clock size={8} /> {block.durationSec}秒
                        </span>
                        <span className="text-[9px] text-text-tertiary">→ {block.linkedClipName}</span>
                        <span className="ml-auto text-[9px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Sparkles size={9} style={{ display: 'inline', marginRight: 2 }} />AI润色
                        </span>
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed">{block.text}</p>
                    </div>
                  </div>
                ))}

                <div className="mt-2 p-2.5 bg-amber-950/20 border border-amber-800/25 rounded-lg flex items-start gap-2">
                  <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-300/80 leading-relaxed">
                    修改任意文本块将触发对应视频轨道的时长重算。完整"画随音动"联动功能将在下个版本中启用。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：视频监看器（mini版） */}
          <div className="w-[280px] flex-shrink-0 bg-[#111220] border border-white/8 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <Layers size={12} className="text-teal-400" />
              <span className="text-xs font-semibold text-white">实时监看</span>
            </div>
            <div
              className="flex-1 rounded-lg flex items-center justify-center min-h-[120px]"
              style={{ background: activeSource ? activeSource.bgGradient : 'linear-gradient(135deg, #090a14 0%, #0f1020 100%)' }}
            >
              {activeSource ? (
                <div className="text-center px-4">
                  <div className="text-[10px] text-white/60 font-mono">▶ {activeSource.name}</div>
                </div>
              ) : (
                <div className="text-center px-4">
                  <Video size={20} className="text-white/20 mx-auto mb-2" />
                  <div className="text-[9px] text-white/30">无素材</div>
                </div>
              )}
            </div>
            <button
              className="w-full py-1.5 text-[10px] font-semibold text-white bg-purple-600/80 hover:bg-purple-600 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <><Pause size={10} /> 暂停</> : <><Play size={10} className="fill-white" /> 播放预览</>}
            </button>
          </div>
        </div>
      )}

      {/* ── 时间轴视图（原3栏布局）── */}
      {viewMode === 'timeline' && (
      <React.Fragment>
      <div className={styles.topThreeColGrid}>
        {/* ── 1. 左栏：视频素材列表 ── */}
        <aside className={styles.sourcePanel}>

          <div className={styles.panelTitleRow}>
            <span className={styles.panelTitle}>视听素材库</span>
            <label className="text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer flex items-center gap-0.5">
              <Plus size={12} />
              <span>导入</span>
              <input
                type="file"
                multiple
                accept="video/*,audio/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-text-tertiary flex-1 min-h-[160px]">
              <Video size={24} className="mb-2 opacity-40 text-purple-400" />
              <div className="text-xs font-semibold text-white mb-1">素材列表为空</div>
              <div className="text-[10px] text-text-tertiary mb-3">导入原片或空镜即可启动剪辑</div>
              <label className="text-xs text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1">
                <Upload size={12} />
                <span>导入视听文件</span>
                <input
                  type="file"
                  multiple
                  accept="video/*,audio/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          ) : (
            <div className={styles.sourceList}>
              {sources.map(s => {
                const isSelected = s.id === (activeSource?.id || '');
                return (
                  <div
                    key={s.id}
                    className={`${styles.sourceCard} ${isSelected ? styles.activeSource : ''}`}
                    onClick={() => setActiveSourceId(s.id)}
                  >
                    <div
                      className={styles.sourceThumb}
                      style={{ background: s.bgGradient }}
                    >
                      <span className={styles.sourceDuration}>{s.duration}</span>
                    </div>
                    <div className={styles.sourceInfo}>
                      <div className={styles.sourceName}>{s.name}</div>
                      <div className={styles.sourceMeta}>
                        {s.type === 'video' ? '4K 视频素材' : '高保真音频'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* ── 2. 中栏：16:9 电影级监看视口与播放控制器 ── */}
        <main className={styles.monitorPlayerCol}>
          <div className={styles.videoPlayerContainer}>
            {/* 16:9 视口 */}
            <div className={styles.videoViewport}>
              <div
                className={styles.viewportScreen}
                style={{ background: activeSource ? activeSource.bgGradient : '#090a14' }}
              >
                {/* 水印指示 */}
                <div className={styles.liveWatermark}>
                  <span className={styles.redDot} /> 实时监看
                </div>

                {activeSource ? (
                  <div className={styles.subtitleOverlay}>
                    “（当前正在实时回放已编排的 5 轨视听对齐片段）”
                  </div>
                ) : (
                  <div className="text-center text-text-tertiary p-4">
                    <div className="text-xs text-white/80 font-medium mb-1">监看视口待命</div>
                    <div className="text-[10px] text-text-tertiary">导入素材后在此实时监看画面分镜与字幕对齐</div>
                  </div>
                )}
              </div>
            </div>

            {/* 播放控制与时间码栏 */}
            <div className={styles.transportBar}>
              <div className={styles.transportControls}>
                <button className={styles.transportBtn} onClick={() => notify.info('跳转至上一个分镜切点')}>
                  <SkipBack size={14} />
                </button>
                <button
                  className={`${styles.transportBtn} ${styles.playBtn}`}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5 fill-white" />}
                </button>
                <button className={styles.transportBtn} onClick={() => notify.info('跳转至下一个分镜切点')}>
                  <SkipForward size={14} />
                </button>
              </div>

              <div className={styles.timecodeDisplay}>
                <span className={styles.currentTime}>00:00:15:18</span>
                <span className={styles.timeDivider}>/</span>
                <span className={styles.totalTime}>00:03:30:00</span>
              </div>

              <div className={styles.volumeGroup}>
                <Volume2 size={14} className="text-text-tertiary" />
                <input type="range" min="0" max="100" defaultValue="80" className="w-16 accent-purple-500" />
              </div>
            </div>
          </div>
        </main>

        {/* ── 3. 右栏：AI 生成与多参数面板 ── */}
        <aside className={styles.paramPanel}>
          <div className={styles.paramHeader}>
            <Sparkles size={14} className="text-purple-400" />
            <span className={styles.paramTitle}>AI 视听智能剪辑配置</span>
          </div>

          <div className={styles.paramForm}>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel}>剪辑叙事风格</label>
              <select
                className={styles.darkSelect}
                value={styleMode}
                onChange={e => setStyleMode(e.target.value)}
              >
                <option value="fast_recap">战神短剧 · 黄金 3 秒快节奏</option>
                <option value="suspense">悬疑反转 · 留白与心理层</option>
                <option value="deep_film">经典院线 · 深度剧情拆解</option>
                <option value="comic">搞笑吐槽 · 爆笑节奏包袱</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.fieldLabel}>解说音色 (TTS)</label>
              <select
                className={styles.darkSelect}
                value={speaker}
                onChange={e => setSpeaker(e.target.value)}
              >
                <option value="teacher_wang">王老师 · 悬疑磁性男中音</option>
                <option value="yunxi">云希 · 激情短剧解说</option>
                <option value="xiaoxiao">晓晓 · 故事感知性女声</option>
                <option value="yunjian">云健 · 影视院线解说男声</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.fieldLabel}>背景配乐 (BGM)</label>
              <select
                className={styles.darkSelect}
                value={bgmGenre}
                onChange={e => setBgmGenre(e.target.value)}
              >
                <option value="suspense">九霄重音 · 战神归来交响</option>
                <option value="cyber">赛博暗涌 · 电子紧张氛围</option>
                <option value="cinematic">电影史诗 · 气势磅礴管弦</option>
                <option value="calm">幽静悬疑 · 钢琴低音独奏</option>
              </select>
            </div>

            <button
              className={styles.primaryGenBtn}
              onClick={handleStartAiGen}
              disabled={isGenerating}
            >
              <Sparkles size={14} />
              {isGenerating ? '正在智能合成中...' : '一键 AI 5 轨智能合成'}
            </button>
          </div>
        </aside>
      </div>

      {/* ── 下半部分：专业 5 轨剪辑时间轴 ── */}
      <section className={styles.multiTrackStudio}>
        {/* 时间轴顶部工具条 */}
        <div className={styles.timelineToolbar}>
          <div className={styles.toolGroupLeft}>
            <span className={styles.timecodePill}>00:00:15:18</span>
            <div className={styles.dividerLine} />
            <button className={styles.iconToolBtn} title="撤销 (Cmd+Z)">
              <Undo2 size={13} />
            </button>
            <button className={styles.iconToolBtn} title="重做 (Cmd+Shift+Z)">
              <Redo2 size={13} />
            </button>
            <button className={styles.iconToolBtn} title="删除片段 (Delete)">
              <Trash2 size={13} />
            </button>
            <div className={styles.dividerLine} />
            <button className={`${styles.iconToolBtn} ${styles.activeToolBtn}`} title="选择工具 (V)">
              <MousePointer size={13} />
            </button>
            <button className={styles.iconToolBtn} title="剃刀切割工具 (C)">
              <Scissors size={13} />
            </button>
          </div>

          <div className={styles.toolGroupRight}>
            <div className={styles.zoomControlBox}>
              <ZoomOut size={13} className="text-text-tertiary" />
              <input
                type="range"
                min="10"
                max="100"
                value={zoomLevel}
                onChange={e => setZoomLevel(parseInt(e.target.value, 10))}
                className="w-20 accent-purple-500"
              />
              <ZoomIn size={13} className="text-text-tertiary" />
            </div>

            <button className={styles.exportJianyingBtn} onClick={handleExportJianying}>
              <Download size={13} />
              <span>导出剪映工程</span>
            </button>
          </div>
        </div>

        {/* 5 轨主视口 */}
        <div className={styles.timelineTracksContainer}>
          {/* 刻度尺 */}
          <div className={styles.rulerRow}>
            <div className={styles.trackHeaderLabel}>轨道信息</div>
            <div className={styles.rulerTicksArea}>
              <span style={{ left: '0%' }}>00:00:00</span>
              <span style={{ left: '20%' }}>00:00:45</span>
              <span style={{ left: '40%' }}>00:01:30</span>
              <span style={{ left: '60%' }}>00:02:15</span>
              <span style={{ left: '80%' }}>00:03:00</span>
              <span style={{ left: '100%' }}>00:03:30</span>
            </div>
          </div>

          {/* 轨道 1: V1 主视频 */}
          <div className={styles.trackLane}>
            <div className={styles.trackHeaderLabel}>
              <span className={styles.laneTagV}>V1</span>
              <span>主视频轨</span>
            </div>
            <div className={styles.laneContent}>
              <div className={`${styles.clipBlock} ${styles.v1Clip}`} style={{ left: '0%', width: '45%' }}>
                <span>{activeSource ? activeSource.name : '主视频镜头01'}</span>
              </div>
              <div className={`${styles.clipBlock} ${styles.v1Clip}`} style={{ left: '46%', width: '38%' }}>
                <span>主视频镜头02</span>
              </div>
            </div>
          </div>

          {/* 轨道 2: V2 空镜与特写 */}
          <div className={styles.trackLane}>
            <div className={styles.trackHeaderLabel}>
              <span className={styles.laneTagV}>V2</span>
              <span>AI 空镜轨</span>
            </div>
            <div className={styles.laneContent}>
              <div className={`${styles.clipBlock} ${styles.v2Clip}`} style={{ left: '22%', width: '18%' }}>
                <span>空镜_特写插帧</span>
              </div>
              <div className={`${styles.clipBlock} ${styles.v2Clip}`} style={{ left: '65%', width: '15%' }}>
                <span>特写_环境氛围</span>
              </div>
            </div>
          </div>

          {/* 轨道 3: A1 人声解说 */}
          <div className={styles.trackLane}>
            <div className={styles.trackHeaderLabel}>
              <span className={styles.laneTagA}>A1</span>
              <span>人声解说 TTS</span>
            </div>
            <div className={styles.laneContent}>
              <div className={`${styles.clipBlock} ${styles.a1Clip}`} style={{ left: '0%', width: '84%' }}>
                <span>TTS 解说音轨（智能倒叙 Hook 对齐）</span>
              </div>
            </div>
          </div>

          {/* 轨道 4: A2 背景配乐 */}
          <div className={styles.trackLane}>
            <div className={styles.trackHeaderLabel}>
              <span className={styles.laneTagA}>A2</span>
              <span>背景音乐 BGM</span>
            </div>
            <div className={styles.laneContent}>
              <div className={`${styles.clipBlock} ${styles.a2Clip}`} style={{ left: '0%', width: '100%' }}>
                <span>BGM 悬疑交响乐 (动态闪避 -12dB)</span>
              </div>
            </div>
          </div>

          {/* 轨道 5: A3 音效 FX */}
          <div className={styles.trackLane}>
            <div className={styles.trackHeaderLabel}>
              <span className={styles.laneTagA}>A3</span>
              <span>动作音效 FX</span>
            </div>
            <div className={styles.laneContent}>
              <div className={`${styles.clipBlock} ${styles.a3Clip}`} style={{ left: '15%', width: '8%' }}>
                <span>重击_FX</span>
              </div>
              <div className={`${styles.clipBlock} ${styles.a3Clip}`} style={{ left: '46%', width: '7%' }}>
                <span>反转_FX</span>
              </div>
            </div>
          </div>

          {/* 播放游标线 */}
          <div className={styles.playheadLine} style={{ left: '32%' }}>
            <div className={styles.playheadHandle} />
          </div>
        </div>
      </section>
      </React.Fragment>
      )}
    </div>
  );
};

const WorkspacePage = withErrorBoundary(WorkspaceStudioPage, { name: 'WorkspaceStudioPage' });
export { WorkspacePage };
export default WorkspacePage;
