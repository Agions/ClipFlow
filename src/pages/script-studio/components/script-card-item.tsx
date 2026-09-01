import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  Plus,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import type { ScriptBlock, ScriptBlockType } from '../types';

interface ScriptCardItemProps {
  block: ScriptBlock;
  config: {
    label: string;
    icon: React.ReactNode;
    colorClass: string;
    borderColor: string;
    badgeBg: string;
    placeholder: string;
  };
  formatDuration: (seconds: number) => string;
  onContentChange: (id: string, text: string) => void;
  onToggleCollapse: (id: string) => void;
  onAiPolish: (id: string) => void;
  onAiContinue: (id: string) => void;
  onRemove: (id: string) => void;
  onAddAfter: (type: ScriptBlockType, afterId: string) => void;
}

export const ScriptCardItem: React.FC<ScriptCardItemProps> = ({
  block,
  config,
  formatDuration,
  onContentChange,
  onToggleCollapse,
  onAiPolish,
  onAiContinue,
  onRemove,
  onAddAfter,
}) => {
  return (
    <div className={`bg-[#111220] border ${config.borderColor} rounded-xl overflow-hidden transition-all`}>
      {/* 卡片头部 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#0e0f1c]">
        <GripVertical size={14} className="text-white/20 cursor-grab" />
        <div className={`flex items-center gap-1.5 ${config.colorClass} font-semibold text-sm`}>
          {config.icon}
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
            onClick={() => onAiPolish(block.id)}
            title="AI 润色"
          >
            <Wand2 size={11} />
          </button>
          <button
            className="text-[10px] text-text-tertiary hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
            onClick={() => onToggleCollapse(block.id)}
            title={block.collapsed ? '展开' : '收起'}
          >
            {block.collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
          <button
            className="text-[10px] text-text-tertiary hover:text-red-400 px-1.5 py-0.5 rounded cursor-pointer"
            onClick={() => onRemove(block.id)}
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
            placeholder={config.placeholder}
            onChange={e => onContentChange(block.id, e.target.value)}
            rows={Math.max(4, (block.content.match(/\n/g) || []).length + 4)}
          />

          {/* 卡片底部操作条 */}
          <div className="flex items-center gap-2 pt-3 mt-2 border-t border-white/5">
            <button
              className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
              onClick={() => onAiContinue(block.id)}
            >
              <RefreshCw size={10} /> AI 续写
            </button>
            <button
              className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
              onClick={() => onAiPolish(block.id)}
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
                    onClick={() => onAddAfter(t, block.id)}
                  >
                    {t === 'hook' ? '🪝 黄金3秒 Hook' : t === 'act' ? '📖 主线递进' : t === 'climax' ? '🔥 高潮反转' : '🎯 互动结尾'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
