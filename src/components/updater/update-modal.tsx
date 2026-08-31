/**
 * 剧工 (Fablr) — 客户端版本升级弹窗组件 (UpdateModal 增强版)
 * 黑曜石工业风设计，精准系统安装包识别、更新日志、跳过版本与镜像下载
 */

import React from 'react';
import {
  Sparkles,
  Download,
  X,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Layers,
  Laptop,
  EyeOff,
} from 'lucide-react';
import { useUpdaterStore } from '@/stores/updater-store';
import { updaterService, detectHostPlatform } from '@fablr/core';
import { formatFileSize } from '@/shared';

export const UpdateModal: React.FC = () => {
  const {
    isModalOpen,
    updateInfo,
    currentVersion,
    customMirrorUrl,
    closeUpdateModal,
    ignoreCurrentVersion,
  } = useUpdaterStore();

  if (!isModalOpen || !updateInfo) return null;

  const currentPlatform = detectHostPlatform();
  const matchedAsset = updateInfo.matchedAsset;

  const handleDownload = () => {
    if (updateInfo.downloadUrl) {
      updaterService.openDownloadPage(updateInfo.downloadUrl, customMirrorUrl);
    }
  };

  const getPlatformLabel = () => {
    if (currentPlatform === 'macos') return 'macOS 架构 (Apple Silicon / Intel)';
    if (currentPlatform === 'windows') return 'Windows x64 / ARM64';
    return 'Linux (AppImage / DEB)';
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-purple-800/40 bg-[#111220] shadow-2xl shadow-purple-950/60 flex flex-col">
        {/* 顶部极光背景装饰 */}
        <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-purple-600/20 via-purple-600/5 to-transparent pointer-events-none" />

        {/* 弹窗头部 */}
        <div className="relative flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/8">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-950/80 border border-purple-700/50 text-purple-400 shadow-md">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">发现剧工作坊新版本</span>
                <span className="rounded-full bg-emerald-950/80 border border-emerald-700/50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  v{updateInfo.version}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-text-tertiary mt-1">
                <span>当前版本: v{currentVersion}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> 发布于 {updateInfo.releaseDate || '最近'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={closeUpdateModal}
            className="rounded-lg p-1.5 text-text-tertiary hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {/* 专属适配安装包提示卡 */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between p-3 rounded-xl border border-purple-900/30 bg-[#17182e]/80">
            <div className="flex items-center gap-2.5">
              <Laptop size={16} className="text-purple-400" />
              <div>
                <div className="text-xs font-semibold text-white">
                  已适配当前设备：{getPlatformLabel()}
                </div>
                <div className="text-[10px] text-text-tertiary font-mono mt-0.5">
                  {matchedAsset?.name || '官方安装包分发源'}
                  {matchedAsset?.size ? ` (${formatFileSize(matchedAsset.size)})` : ''}
                </div>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded">
              高速下载通道
            </span>
          </div>
        </div>

        {/* 更新日志主体 */}
        <div className="px-6 py-2 flex flex-col gap-2.5 max-h-[260px] overflow-y-auto">
          <div className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
            <Layers size={13} className="text-cyan-400" />
            <span>更新日志与新功能 (Release Notes)</span>
          </div>

          <div className="rounded-xl border border-white/6 bg-[#151628] p-4 text-xs text-text-secondary leading-relaxed space-y-2 select-text">
            <div className="font-bold text-purple-300 mb-1">
              {updateInfo.releaseTitle}
            </div>
            <div className="whitespace-pre-wrap font-sans text-white/80">
              {updateInfo.releaseNotes}
            </div>
          </div>

          {/* 核心亮点标签 */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-[#141526] p-2.5 text-[11px] text-text-tertiary">
              <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
              <span>多 Agent 剧本算法与剪辑稳定性</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-[#141526] p-2.5 text-[11px] text-text-tertiary">
              <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
              <span>5 轨硬件加速与消重矩阵优化</span>
            </div>
          </div>
        </div>

        {/* 弹窗底部操作条 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/8 bg-[#0e0f1a] mt-2">
          <button
            onClick={ignoreCurrentVersion}
            className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
          >
            <EyeOff size={12} />
            <span>跳过此版本</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={closeUpdateModal}
              className="px-3.5 py-2 text-xs text-text-secondary hover:text-white rounded-lg hover:bg-white/5 border border-white/8 transition-colors cursor-pointer"
            >
              稍后提醒
            </button>
            <button
              onClick={handleDownload}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              <Download size={13} />
              <span>立即下载并安装</span>
              <ExternalLink size={11} className="opacity-70 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
