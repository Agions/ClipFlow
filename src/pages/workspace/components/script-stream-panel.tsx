import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlignLeft, AlertTriangle, Clock, FileText, Layers, Pause, Play, Sparkles, Video } from 'lucide-react';
import type { MediaSourceItem, ScriptTimelineBlock } from '../types';

interface ScriptStreamPanelProps {
  projectId?: string;
  scriptBlocks: ScriptTimelineBlock[];
  activeSource: MediaSourceItem | null;
  isPlaying: boolean;
  isGenerating: boolean;
  onTogglePlay: () => void;
  onStartAiGen: () => void;
}

export const ScriptStreamPanel: React.FC<ScriptStreamPanelProps> = ({
  projectId,
  scriptBlocks,
  activeSource,
  isPlaying,
  isGenerating,
  onTogglePlay,
  onStartAiGen,
}) => {
  const navigate = useNavigate();

  return (
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
                onClick={onStartAiGen}
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
                修改任意文本块将触发对应视频轨道的时长重算。完整&quot;画随音动&quot;联动功能将在下个版本中启用。
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
          onClick={onTogglePlay}
        >
          {isPlaying ? <><Pause size={10} /> 暂停</> : <><Play size={10} className="fill-white" /> 播放预览</>}
        </button>
      </div>
    </div>
  );
};
