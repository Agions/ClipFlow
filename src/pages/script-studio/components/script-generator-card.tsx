import React from 'react';
import { Bot, Sparkles } from 'lucide-react';
import type { ScriptBlockType } from '../types';

interface ScriptGeneratorCardProps {
  selectedGenre: 'short_drama' | 'movie_recap' | 'suspense';
  customPrompt: string;
  isGenerating: boolean;
  onGenreChange: (genre: 'short_drama' | 'movie_recap' | 'suspense') => void;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  onAddBlankBlock: (type: ScriptBlockType) => void;
}

export const ScriptGeneratorCard: React.FC<ScriptGeneratorCardProps> = ({
  selectedGenre,
  customPrompt,
  isGenerating,
  onGenreChange,
  onPromptChange,
  onGenerate,
  onAddBlankBlock,
}) => {
  return (
    <div className="flex flex-col gap-4">
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

          <div className="flex items-center gap-1 bg-[#18192a] p-1 rounded-lg border border-white/5">
            <button
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                selectedGenre === 'short_drama'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-text-tertiary hover:text-white'
              }`}
              onClick={() => onGenreChange('short_drama')}
            >
              🔥 爆款短剧
            </button>
            <button
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                selectedGenre === 'movie_recap'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-text-tertiary hover:text-white'
              }`}
              onClick={() => onGenreChange('movie_recap')}
            >
              🎬 电影深度解说
            </button>
            <button
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                selectedGenre === 'suspense'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-text-tertiary hover:text-white'
              }`}
              onClick={() => onGenreChange('suspense')}
            >
              🕵️ 悬疑探案
            </button>
          </div>
        </div>

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
            onChange={e => onPromptChange(e.target.value)}
            placeholder="例如：开头前3秒突出男主隐忍3年后的打脸瞬间，语速偏快，语气带强烈悬念与情绪压迫感..."
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/6">
          <div className="flex items-center gap-2">
            <button
              className="px-2.5 py-1 text-[11px] bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white rounded border border-white/8 cursor-pointer transition-colors"
              onClick={() => onPromptChange('突出反转与打脸，高潮部分情绪激昂，结尾留下悬念')}
            >
              ⚡ 强情绪反转
            </button>
            <button
              className="px-2.5 py-1 text-[11px] bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white rounded border border-white/8 cursor-pointer transition-colors"
              onClick={() => onPromptChange('注重细节与心理博弈，层层推进真相')}
            >
              🕵️ 烧脑悬疑
            </button>
            <button
              className="px-2.5 py-1 text-[11px] bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white rounded border border-white/8 cursor-pointer transition-colors"
              onClick={() => onPromptChange('快节奏口语化，适合短视频完播率冲刺')}
            >
              🚀 短视频快节奏
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-xs text-text-tertiary hover:text-white cursor-pointer"
              onClick={() => onAddBlankBlock('hook')}
            >
              + 手动空白新建
            </button>
            <button
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              onClick={onGenerate}
              disabled={isGenerating}
            >
              <Sparkles size={13} />
              <span>{isGenerating ? 'AI 正在分析并研磨中...' : '一键 AI 生成 4 段骨架'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
