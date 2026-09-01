import React from 'react';
import type { MatrixPlatformItem } from '../types';

interface BindAccountModalProps {
  platform: MatrixPlatformItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const BindAccountModal: React.FC<BindAccountModalProps> = ({
  platform,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !platform) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141524] border border-white/10 rounded-xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ background: platform.badgeColor }}
          >
            {platform.name.slice(0, 2)}
          </span>
          <span className="text-sm font-bold text-white">
            授权绑定 {platform.name} 账号
          </span>
        </div>
        <p className="text-xs text-text-tertiary leading-relaxed">
          点击下方按钮模拟完成 OAuth2 开放平台授权登录，绑定后系统将自动同步全网粉丝数与矩阵发布权限。
        </p>
        <div className="flex justify-end gap-2 pt-2 border-t border-white/6">
          <button
            className="px-3 py-1.5 text-xs text-text-tertiary hover:text-white rounded cursor-pointer"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg cursor-pointer transition-colors"
            onClick={onConfirm}
          >
            确认授权绑定
          </button>
        </div>
      </div>
    </div>
  );
};
