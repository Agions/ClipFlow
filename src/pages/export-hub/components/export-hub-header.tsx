import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';

interface ExportHubHeaderProps {
  projectId?: string;
  projectTitle?: string;
  isPublishing: boolean;
  onPublishAll: () => void;
}

export const ExportHubHeader: React.FC<ExportHubHeaderProps> = ({
  projectId,
  projectTitle,
  isPublishing,
  onPublishAll,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between bg-[#111220] border border-white/8 rounded-xl px-4 py-2.5 mb-1 flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm text-white">
          {projectTitle ? `剧工 Fablr · ${projectTitle}` : '剧工 Fablr · 智能消重与多平台矩阵发布中心'}
        </span>
        <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-full font-semibold">
          防搬运指纹重构
        </span>
      </div>

      <div className="flex items-center gap-1 bg-[#18192a] p-1 rounded-lg border border-white/5">
        <button
          className="px-2.5 py-1 text-xs text-text-tertiary hover:text-white rounded hover:bg-white/5 transition-colors cursor-pointer"
          onClick={() => navigate(projectId ? `/asset-hub/${projectId}` : '/asset-hub')}
        >
          1. 素材拆条
        </button>
        <button
          className="px-2.5 py-1 text-xs text-text-tertiary hover:text-white rounded hover:bg-white/5 transition-colors cursor-pointer"
          onClick={() => navigate(projectId ? `/script-studio/${projectId}` : '/script-studio')}
        >
          2. 剧本研磨
        </button>
        <button
          className="px-2.5 py-1 text-xs text-text-tertiary hover:text-white rounded hover:bg-white/5 transition-colors cursor-pointer"
          onClick={() => navigate(projectId ? `/workspace/${projectId}` : '/workspace')}
        >
          3. 剪辑合成
        </button>
        <button className="px-2.5 py-1 text-xs font-semibold text-purple-300 bg-purple-950/60 rounded border border-purple-800/40">
          4. 消重发布 (当前)
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          onClick={onPublishAll}
          disabled={isPublishing}
        >
          <Send size={13} />
          <span>{isPublishing ? '正在全网矩阵发布中...' : '一键矩阵多平台发布'}</span>
        </button>
      </div>
    </div>
  );
};
