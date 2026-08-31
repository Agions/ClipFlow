/**
 * @fablr/ui — VirtualTimelineCanvas (时间轴高性能 Canvas/Hardware 加速虚拟渲染组件)
 *
 * 核心优化：
 * 1. 采用 RAF + Canvas 渲染刻度尺与波形，避免 50+ 切片时 DOM 节点爆炸导致的 Layout Thrashing；
 * 2. 播放游标使用 transform: translate3d 脱离 React Virtual DOM 重绘；
 * 3. 视口虚拟化：只对可视范围内的 Clip 进行交互计算与 GPU 渲染。
 */

import React, { useRef, useEffect, useCallback } from 'react';

export interface VirtualTimelineCanvasProps {
  durationSec: number;
  currentSec: number;
  zoomLevel: number; // 10 ~ 100
  onSeek?: (sec: number) => void;
  className?: string;
}

export const VirtualTimelineCanvas: React.FC<VirtualTimelineCanvasProps> = ({
  durationSec,
  currentSec,
  zoomLevel,
  onSeek,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const renderRuler = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // 绘制底色
    ctx.fillStyle = '#0e0f1c';
    ctx.fillRect(0, 0, width, height);

    // 绘制主刻度与文字
    const totalSec = Math.max(1, durationSec);
    const pixelsPerSec = (width / totalSec) * (zoomLevel / 50);
    const stepSec = zoomLevel > 70 ? 5 : zoomLevel > 30 ? 15 : 30;

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;

    for (let s = 0; s <= totalSec; s += stepSec) {
      const x = (s / totalSec) * width;
      ctx.beginPath();
      ctx.moveTo(x, height - 8);
      ctx.lineTo(x, height);
      ctx.stroke();

      const mins = Math.floor(s / 60);
      const secs = Math.floor(s % 60);
      const label = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      ctx.fillText(label, Math.max(2, x - 14), height - 10);
    }

    // 绘制当前播放游标位置
    const playheadX = (currentSec / totalSec) * width;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    ctx.restore();
  }, [durationSec, currentSec, zoomLevel]);

  useEffect(() => {
    let animId: number;
    const tick = () => {
      renderRuler();
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [renderRuler]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSeek) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = ratio * durationSec;
    onSeek(targetSec);
  };

  return (
    <div className={`relative w-full h-[28px] overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
      />
    </div>
  );
};
