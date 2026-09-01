import React from 'react';
import {
  FileCheck,
  Film,
  Image as ImageIcon,
  Layers,
  RefreshCw,
  Sliders,
  Sparkles,
  Sun,
} from 'lucide-react';

interface DedupFiltersPanelProps {
  zoomBreathing: boolean;
  filmGrain: boolean;
  lightReconstruction: boolean;
  pipOverlay: boolean;
  mirrorFlip: boolean;
  complianceScore: number | null;
  isCheckingCompliance: boolean;
  onZoomBreathingChange: (val: boolean) => void;
  onFilmGrainChange: (val: boolean) => void;
  onLightReconstructionChange: (val: boolean) => void;
  onPipOverlayChange: (val: boolean) => void;
  onMirrorFlipChange: (val: boolean) => void;
  onRunComplianceCheck: () => void;
  onGenerateCovers: () => void;
}

export const DedupFiltersPanel: React.FC<DedupFiltersPanelProps> = ({
  zoomBreathing,
  filmGrain,
  lightReconstruction,
  pipOverlay,
  mirrorFlip,
  complianceScore,
  isCheckingCompliance,
  onZoomBreathingChange,
  onFilmGrainChange,
  onLightReconstructionChange,
  onPipOverlayChange,
  onMirrorFlipChange,
  onRunComplianceCheck,
  onGenerateCovers,
}) => {
  return (
    <aside className="col-span-3 bg-[#111220] border border-white/8 rounded-xl p-3.5 flex flex-col gap-3 overflow-y-auto">
      <div className="flex items-center gap-2 pb-2 border-b border-white/6">
        <Sliders size={14} className="text-purple-400" />
        <span className="text-xs font-bold text-white">5 级智能消重滤镜</span>
      </div>

      <div className="flex flex-col gap-2">
        {/* 1. 微距呼吸缩放 */}
        <div className="p-2.5 bg-[#18192a] border border-white/5 rounded-lg flex items-center justify-between hover:border-white/12 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
              <Sparkles size={12} />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">微距呼吸缩放</div>
              <div className="text-[10px] text-text-tertiary">1.02x ~ 1.05x 正弦动态缩放</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={zoomBreathing}
            onChange={e => onZoomBreathingChange(e.target.checked)}
            className="accent-purple-500 cursor-pointer"
          />
        </div>

        {/* 2. 电影胶片微噪点 */}
        <div className="p-2.5 bg-[#18192a] border border-white/5 rounded-lg flex items-center justify-between hover:border-white/12 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <Film size={12} />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">电影胶片微噪点</div>
              <div className="text-[10px] text-text-tertiary">注入 3% 胶片颗粒重构哈希</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={filmGrain}
            onChange={e => onFilmGrainChange(e.target.checked)}
            className="accent-purple-500 cursor-pointer"
          />
        </div>

        {/* 3. 智能光影重构 */}
        <div className="p-2.5 bg-[#18192a] border border-white/5 rounded-lg flex items-center justify-between hover:border-white/12 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Sun size={12} />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">智能光影重构</div>
              <div className="text-[10px] text-text-tertiary">微调色阶曲线与边缘高光</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={lightReconstruction}
            onChange={e => onLightReconstructionChange(e.target.checked)}
            className="accent-purple-500 cursor-pointer"
          />
        </div>

        {/* 4. 微透明画中画背景 */}
        <div className="p-2.5 bg-[#18192a] border border-white/5 rounded-lg flex items-center justify-between hover:border-white/12 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Layers size={12} />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">微透明画中画底层</div>
              <div className="text-[10px] text-text-tertiary">底层高斯模糊镜像填充黑边</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={pipOverlay}
            onChange={e => onPipOverlayChange(e.target.checked)}
            className="accent-purple-500 cursor-pointer"
          />
        </div>

        {/* 5. 镜头水平动态镜像 */}
        <div className="p-2.5 bg-[#18192a] border border-white/5 rounded-lg flex items-center justify-between hover:border-white/12 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
              <RefreshCw size={12} />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">镜头水平动态镜像</div>
              <div className="text-[10px] text-text-tertiary">无文字镜头处智能翻转画面</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={mirrorFlip}
            onChange={e => onMirrorFlipChange(e.target.checked)}
            className="accent-purple-500 cursor-pointer"
          />
        </div>
      </div>

      {/* 合规体检与分集封面 */}
      <div className="mt-auto pt-3 border-t border-white/6 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white flex items-center gap-1">
            <FileCheck size={12} className="text-emerald-400" /> 发布合规体检
          </span>
          {complianceScore !== null && (
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full font-bold">
              {complianceScore}分 · 极优
            </span>
          )}
        </div>
        <button
          className="w-full py-1.5 text-xs text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
          onClick={onRunComplianceCheck}
          disabled={isCheckingCompliance}
        >
          <FileCheck size={12} />
          <span>{isCheckingCompliance ? '正在体检中...' : '一键执行平台合规扫描'}</span>
        </button>

        <button
          className="w-full py-1.5 text-xs text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
          onClick={onGenerateCovers}
        >
          <ImageIcon size={12} />
          <span>批量截取生成多集爆款封面</span>
        </button>
      </div>
    </aside>
  );
};
