import React from 'react';
import {
  Monitor,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Square,
  Zap,
} from 'lucide-react';

interface AspectMonitorPanelProps {
  aspectRatio: '9:16' | '16:9' | '1:1';
  exportResolution: '1080p' | '4k';
  onAspectRatioChange: (ratio: '9:16' | '16:9' | '1:1') => void;
  onResolutionChange: (res: '1080p' | '4k') => void;
}

export const AspectMonitorPanel: React.FC<AspectMonitorPanelProps> = ({
  aspectRatio,
  exportResolution,
  onAspectRatioChange,
  onResolutionChange,
}) => {
  return (
    <main className="col-span-6 bg-[#111220] border border-white/8 rounded-xl p-4 flex flex-col items-center justify-between">
      {/* 画幅切换 Tab 组 */}
      <div className="w-full flex items-center justify-center gap-2 p-1 bg-[#18192a] border border-white/6 rounded-lg mb-3">
        <button
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            aspectRatio === '9:16'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-text-tertiary hover:text-white'
          }`}
          onClick={() => onAspectRatioChange('9:16')}
        >
          <Smartphone size={13} />
          <span>9:16 竖屏 (抖音/快手)</span>
        </button>
        <button
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            aspectRatio === '16:9'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-text-tertiary hover:text-white'
          }`}
          onClick={() => onAspectRatioChange('16:9')}
        >
          <Monitor size={13} />
          <span>16:9 横屏 (B站/西瓜)</span>
        </button>
        <button
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            aspectRatio === '1:1'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-text-tertiary hover:text-white'
          }`}
          onClick={() => onAspectRatioChange('1:1')}
        >
          <Square size={13} />
          <span>1:1 正方 (小红书)</span>
        </button>
      </div>

      {/* 高清监看屏幕容器 */}
      <div className="flex-1 w-full bg-[#08080c] border border-white/6 rounded-xl flex items-center justify-center p-4 relative overflow-hidden">
        {/* 模拟画幅窗口 */}
        <div
          className="relative transition-all duration-300 flex flex-col justify-between p-3 rounded-lg overflow-hidden border border-white/10 shadow-2xl"
          style={{
            width: aspectRatio === '9:16' ? '210px' : aspectRatio === '16:9' ? '360px' : '260px',
            height: aspectRatio === '9:16' ? '340px' : aspectRatio === '16:9' ? '202px' : '260px',
            background: 'radial-gradient(circle at center, #1e1b4b 0%, #0c0d18 100%)',
          }}
        >
          {/* 顶部消重水印徽章 */}
          <div className="self-start z-10 flex items-center gap-1 text-[9px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm">
            <ShieldCheck size={10} className="text-emerald-400" />
            已套用 5 级消重滤镜
          </div>

          {/* 正中央绝对居中播放按钮 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-purple-600/80 flex items-center justify-center shadow-lg shadow-purple-600/40 text-white pl-0.5 pointer-events-auto cursor-pointer hover:scale-105 transition-transform">
              <Play size={18} className="fill-white" />
            </div>
          </div>

          {/* 底部字幕模拟 */}
          <div className="z-10 bg-black/60 backdrop-blur-md rounded px-2 py-1 text-center border border-white/5">
            <div className="text-[10px] text-white font-medium">“这才是真正的短剧解说天花板...”</div>
            <div className="text-[8px] text-text-tertiary mt-0.5 font-mono">00:00:15:18 / 4K 60FPS HDR</div>
          </div>
        </div>
      </div>

      {/* 底部导出清晰度与参数摘要 */}
      <div className="w-full flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">导出清晰度：</span>
          <div className="flex items-center bg-[#18192a] border border-white/6 rounded-lg p-0.5">
            <button
              className={`px-2.5 py-0.5 text-xs rounded transition-all cursor-pointer ${
                exportResolution === '1080p'
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'text-text-tertiary hover:text-white'
              }`}
              onClick={() => onResolutionChange('1080p')}
            >
              1080P 高清
            </button>
            <button
              className={`px-2.5 py-0.5 text-xs rounded transition-all cursor-pointer ${
                exportResolution === '4k'
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'text-text-tertiary hover:text-white'
              }`}
              onClick={() => onResolutionChange('4k')}
            >
              4K 超清 60FPS
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-purple-400 font-medium">
          <Sparkles size={12} />
          <span>GPU 硬件加速就绪 (NVIDIA/Apple Silicon)</span>
        </div>
      </div>
    </main>
  );
};
