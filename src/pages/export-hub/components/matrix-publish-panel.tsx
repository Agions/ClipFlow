import React from 'react';
import { CheckCircle2, Send, Zap } from 'lucide-react';
import type { MatrixPlatformItem } from '../types';

interface MatrixPublishPanelProps {
  platforms: MatrixPlatformItem[];
  isPublishing: boolean;
  publishProgress: number;
  onTogglePlatform: (id: string) => void;
  onPublishAll: () => void;
}

export const MatrixPublishPanel: React.FC<MatrixPublishPanelProps> = ({
  platforms,
  isPublishing,
  publishProgress,
  onTogglePlatform,
  onPublishAll,
}) => {
  return (
    <aside className="col-span-3 bg-[#111220] border border-white/8 rounded-xl p-3.5 flex flex-col gap-3 overflow-y-auto">
      <div className="flex items-center gap-2 pb-2 border-b border-white/6">
        <Zap size={14} className="text-purple-400" />
        <span className="text-xs font-bold text-white">多平台发布矩阵</span>
      </div>

      <div className="flex flex-col gap-2">
        {platforms.map(p => (
          <div
            key={p.id}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              p.enabled
                ? 'bg-[#18192a] border-purple-600/50 shadow-md'
                : 'bg-[#141522] border-white/5 opacity-60'
            }`}
            onClick={() => onTogglePlatform(p.id)}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: p.badgeColor }}
                >
                  {p.name.slice(0, 2)}
                </span>
                <div>
                  <div className="text-xs font-bold text-white">{p.name}</div>
                  <div className="text-[10px] text-text-tertiary">{p.account}</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={p.enabled}
                onChange={() => {}}
                className="accent-purple-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
              <span className="text-text-tertiary">粉丝: {p.fans}</span>
              <span
                className={`flex items-center gap-0.5 px-1.5 py-0.2 rounded ${
                  p.status === '已发布'
                    ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 font-semibold'
                    : p.status === '未绑定'
                    ? 'text-amber-400 bg-amber-950/60 border border-amber-800/40'
                    : 'text-text-tertiary bg-white/5'
                }`}
              >
                {p.status === '已发布' && <CheckCircle2 size={10} />}
                {p.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 进度条与一键发布大按钮 */}
      <div className="mt-auto pt-3 border-t border-white/6 flex flex-col gap-2">
        {isPublishing && (
          <div className="w-full bg-[#18192a] p-2 rounded-lg border border-purple-800/40">
            <div className="flex justify-between text-[10px] text-white mb-1">
              <span>多平台矩阵发布进度...</span>
              <span className="font-bold text-purple-300">{publishProgress}%</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300"
                style={{ width: `${publishProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          className="w-full py-2.5 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          onClick={onPublishAll}
          disabled={isPublishing}
        >
          <Send size={14} />
          <span>{isPublishing ? '正在全网发布中...' : '一键极速矩阵发布'}</span>
        </button>
      </div>
    </aside>
  );
};
