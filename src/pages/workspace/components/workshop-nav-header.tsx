import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Layers, Send } from 'lucide-react';

interface WorkshopNavHeaderProps {
  projectId?: string;
  projectTitle?: string;
  viewMode: 'script' | 'timeline';
  onViewModeChange: (mode: 'script' | 'timeline') => void;
}

export const WorkshopNavHeader: React.FC<WorkshopNavHeaderProps> = ({
  projectId,
  projectTitle,
  viewMode,
  onViewModeChange,
}) => {
  const navigate = useNavigate();

  return (
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
            onClick={() => onViewModeChange('script')}
          >
            <FileText size={11} />
            剧本视图
          </button>
          <button
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${viewMode === 'timeline' ? 'bg-purple-600 text-white font-semibold shadow-sm' : 'text-text-tertiary hover:text-white'}`}
            onClick={() => onViewModeChange('timeline')}
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
  );
};
