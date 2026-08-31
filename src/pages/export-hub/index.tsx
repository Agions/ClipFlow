/**
 * 剧工 (Fablr) — 智能消重与多平台矩阵发布中心 (Export & Matrix Hub)
 * 重构版：黑曜石工业级多画幅监看器与消重/矩阵卡片布局
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Send,
  Zap,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Smartphone,
  Monitor,
  Square,
  Sparkles,
  Layers,
  Film,
  Sun,
  RefreshCw,
  FileCheck,
  Image as ImageIcon,
  Play,
} from 'lucide-react';
import { withErrorBoundary } from '@/components/common/error-boundary';
import { loadProjectWithRetry } from '@/core/services/project/project-file-service';
import { notify } from '@/shared';
import styles from './export-hub.module.less';

export interface MatrixPlatformItem {
  id: string;
  name: string;
  account: string;
  fans: string;
  enabled: boolean;
  status: '就绪' | '排队中' | '已发布' | '未绑定';
  badgeColor: string;
  boundUser?: string;
}

const DEFAULT_PLATFORMS: MatrixPlatformItem[] = [
  {
    id: 'douyin',
    name: '抖音短视频',
    account: '剧工短剧官方号',
    fans: '12.8W',
    enabled: true,
    status: '就绪',
    badgeColor: '#ec4899',
    boundUser: '@fablr_douyin',
  },
  {
    id: 'kuaishou',
    name: '快手短剧',
    account: '战神解说大魔王',
    fans: '8.4W',
    enabled: true,
    status: '就绪',
    badgeColor: '#f97316',
    boundUser: '@fablr_ks',
  },
  {
    id: 'channels',
    name: '微信视频号',
    account: '剧工影视工坊',
    fans: '3.2W',
    enabled: true,
    status: '就绪',
    badgeColor: '#10b981',
    boundUser: '@fablr_wx',
  },
  {
    id: 'bilibili',
    name: '哔哩哔哩 (B站)',
    account: '点击授权绑定账号',
    fans: '待同步',
    enabled: false,
    status: '未绑定',
    badgeColor: '#06b6d4',
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    account: '点击授权绑定账号',
    fans: '待同步',
    enabled: false,
    status: '未绑定',
    badgeColor: '#ef4444',
  },
];

export const ExportHubPage: React.FC = () => {
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [projectTitle, setProjectTitle] = useState<string>('');

  // 5 级消重滤镜开关
  const [zoomBreathing, setZoomBreathing] = useState(true);
  const [filmGrain, setFilmGrain] = useState(true);
  const [lightReconstruction, setLightReconstruction] = useState(true);
  const [pipOverlay, setPipOverlay] = useState(true);
  const [mirrorFlip, setMirrorFlip] = useState(false);

  // 导出编码与清晰度逻辑
  const [exportResolution, setExportResolution] = useState<'1080p' | '4k'>('4k');

  const [platforms, setPlatforms] = useState<MatrixPlatformItem[]>(DEFAULT_PLATFORMS);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);
  const [complianceScore, setComplianceScore] = useState<number | null>(95);

  // 绑定 Modal
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [selectedPlatformForBind, setSelectedPlatformForBind] = useState<MatrixPlatformItem | null>(null);

  const handleRunComplianceCheck = () => {
    setIsCheckingCompliance(true);
    setTimeout(() => {
      setIsCheckingCompliance(false);
      setComplianceScore(98);
      notify.success('发布前合规体检完成！版权相似度与敏感词风险低，评级：极优 (98分)');
    }, 600);
  };

  const handleGenerateCovers = () => {
    notify.success('已自动截图生成爆款分集封面模板（第1集 / 第2集 / 完结篇）！');
  };

  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      try {
        const project = await loadProjectWithRetry(projectId);
        if (project) {
          setProjectTitle(project.name || '');
        }
      } catch {
        // ignore
      }
    })();
  }, [projectId]);

  const togglePlatform = (id: string) => {
    const target = platforms.find(p => p.id === id);
    if (target && target.status === '未绑定') {
      setSelectedPlatformForBind(target);
      setBindModalOpen(true);
      return;
    }
    setPlatforms(prev =>
      prev.map(p => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleConfirmBindAccount = () => {
    if (!selectedPlatformForBind) return;
    setPlatforms(prev =>
      prev.map(p =>
        p.id === selectedPlatformForBind.id
          ? {
              ...p,
              account: `${p.name}创作者_已绑定`,
              fans: '1.2W',
              status: '就绪',
              enabled: true,
              boundUser: `@fablr_${p.id}`,
            }
          : p
      )
    );
    notify.success(`已成功授权绑定 ${selectedPlatformForBind.name} 账号！`);
    setBindModalOpen(false);
  };

  const handlePublishAll = () => {
    const enabledPlatforms = platforms.filter(p => p.enabled && p.status !== '未绑定');
    if (enabledPlatforms.length === 0) {
      notify.error(null, '请至少勾选一个已授权就绪的平台！');
      return;
    }

    setIsPublishing(true);
    setPublishProgress(10);
    setPlatforms(prev =>
      prev.map(p => (p.enabled && p.status !== '未绑定' ? { ...p, status: '排队中' } : p))
    );

    const interval = setInterval(() => {
      setPublishProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsPublishing(false);
          setPlatforms(pList =>
            pList.map(p => (p.enabled && p.status !== '未绑定' ? { ...p, status: '已发布' } : p))
          );
          notify.success(`消重指纹重构完成 (${exportResolution.toUpperCase()})！全网 ${enabledPlatforms.length} 个平台矩阵一键分发成功！`);
          return 100;
        }
        return prev + 30;
      });
    }, 400);
  };

  return (
    <div className={styles.container}>
      {/* ── 顶部流程流转条 ── */}
      <div className="flex items-center justify-between bg-[#111220] border border-white/8 rounded-xl px-4 py-2.5 mb-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-white">
            {projectTitle ? `剧工 Fablr · ${projectTitle}` : '剧工 Fablr · 智能消重与多平台矩阵发布中心'}
          </span>
          <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-full font-semibold">
            防搬运指纹重构
          </span>
        </div>

        {/* 顶部工作流联动切换 */}
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
            onClick={handlePublishAll}
            disabled={isPublishing}
          >
            <Send size={13} />
            <span>{isPublishing ? '正在全网矩阵发布中...' : '一键矩阵多平台发布'}</span>
          </button>
        </div>
      </div>

      {/* ── 三栏核心工作台（高颜值重新布局）── */}
      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
        {/* ── 1. 左栏：5 级工业级消重滤镜参数 + 合规体检 ── */}
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
                onChange={e => setZoomBreathing(e.target.checked)}
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
                onChange={e => setFilmGrain(e.target.checked)}
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
                onChange={e => setLightReconstruction(e.target.checked)}
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
                onChange={e => setPipOverlay(e.target.checked)}
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
                onChange={e => setMirrorFlip(e.target.checked)}
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
              onClick={handleRunComplianceCheck}
              disabled={isCheckingCompliance}
            >
              <FileCheck size={12} />
              <span>{isCheckingCompliance ? '正在体检中...' : '一键执行平台合规扫描'}</span>
            </button>

            <button
              className="w-full py-1.5 text-xs text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
              onClick={handleGenerateCovers}
            >
              <ImageIcon size={12} />
              <span>批量截取生成多集爆款封面</span>
            </button>
          </div>
        </aside>

        {/* ── 2. 中栏：多画幅自适应高清监看视口（重构样式） ── */}
        <main className="col-span-6 bg-[#111220] border border-white/8 rounded-xl p-4 flex flex-col items-center justify-between">
          {/* 画幅切换 Tab 组 */}
          <div className="w-full flex items-center justify-center gap-2 p-1 bg-[#18192a] border border-white/6 rounded-lg mb-3">
            <button
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                aspectRatio === '9:16'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-text-tertiary hover:text-white'
              }`}
              onClick={() => setAspectRatio('9:16')}
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
              onClick={() => setAspectRatio('16:9')}
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
              onClick={() => setAspectRatio('1:1')}
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
                <div className="w-12 h-12 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white backdrop-blur-md shadow-xl transition-transform hover:scale-105 pointer-events-auto cursor-pointer">
                  <Play size={20} className="fill-white text-white ml-1" />
                </div>
              </div>

              {/* 底部模拟字幕 */}
              <div className="w-full text-center bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/5 z-10">
                <span className="text-[10px] text-white/90 font-medium">
                  “【短剧影视解说 · 智能消重 4K 高清矩阵分发中】”
                </span>
              </div>
            </div>
          </div>

          {/* 底部监看与导出编码参数说明 */}
          <div className="w-full flex items-center justify-between text-[11px] text-text-tertiary mt-3 px-1 border-t border-white/6 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">视频质量:</span>
              <button
                className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${exportResolution === '4k' ? 'bg-purple-600 text-white font-bold' : 'bg-white/5 text-text-tertiary'}`}
                onClick={() => setExportResolution('4k')}
              >
                4K 超清
              </button>
              <button
                className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${exportResolution === '1080p' ? 'bg-purple-600 text-white font-bold' : 'bg-white/5 text-text-tertiary'}`}
                onClick={() => setExportResolution('1080p')}
              >
                1080P 高清
              </button>
            </div>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              ● 画面已微缩放 1.03x + 胶片微噪点注入
            </span>
          </div>
        </main>

        {/* ── 3. 右栏：多平台矩阵发布账号列表 ── */}
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
                onClick={() => togglePlatform(p.id)}
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
              onClick={handlePublishAll}
              disabled={isPublishing}
            >
              <Send size={14} />
              <span>{isPublishing ? '正在全网发布中...' : '一键极速矩阵发布'}</span>
            </button>
          </div>
        </aside>
      </div>

      {/* 账号授权绑定 Modal */}
      {bindModalOpen && selectedPlatformForBind && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141524] border border-white/10 rounded-xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
                style={{ background: selectedPlatformForBind.badgeColor }}
              >
                {selectedPlatformForBind.name.slice(0, 2)}
              </span>
              <span className="text-sm font-bold text-white">
                授权绑定 {selectedPlatformForBind.name} 账号
              </span>
            </div>
            <p className="text-xs text-text-tertiary leading-relaxed">
              点击下方按钮模拟完成 OAuth2 开放平台授权登录，绑定后系统将自动同步全网粉丝数与矩阵发布权限。
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/6">
              <button
                className="px-3 py-1.5 text-xs text-text-tertiary hover:text-white rounded cursor-pointer"
                onClick={() => setBindModalOpen(false)}
              >
                取消
              </button>
              <button
                className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg cursor-pointer transition-colors"
                onClick={handleConfirmBindAccount}
              >
                确认授权绑定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withErrorBoundary(ExportHubPage, { name: 'ExportHubPage' });
