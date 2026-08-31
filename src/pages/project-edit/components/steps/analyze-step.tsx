/**
 * AnalyzeStep — 分析视频步骤
 */
import React from 'react';
import { Sparkles, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import VideoSelector from '@/components/video-selector/video-selector';
import styles from '@/pages/project-edit/index.module.less';

interface AnalyzeStepProps {
  videoPath: string;
  keyFrames: string[];
  scriptSegmentsCount: number;
  loading: boolean;
  onVideoSelect: (path: string) => void;
  onVideoRemove: () => void;
  onAnalyze: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const AnalyzeStep: React.FC<AnalyzeStepProps> = ({
  videoPath,
  keyFrames,
  scriptSegmentsCount,
  loading,
  onVideoSelect,
  onVideoRemove,
  onAnalyze,
  onPrev,
  onNext,
}) => (
  <div className={styles.stepCard}>
    <div className={styles.stepCardHeader}>
      <div className={styles.stepCardTitle}>
        <Sparkles size={16} className="text-cyan-400" />
        <span>2. AI 视听多模态深度拆解</span>
      </div>
      <p className={styles.stepCardDesc}>
        自动探测镜头切点、提取关键高清帧与 ASR 语音台词，生成剧本研磨分镜草稿。
      </p>
    </div>

    <div>
      <VideoSelector
        initialVideoPath={videoPath}
        onVideoSelect={onVideoSelect}
        onVideoRemove={onVideoRemove}
        loading={false}
      />

      {keyFrames.length > 0 && (
        <div className="mt-4 p-3 bg-[#18192a] rounded-lg border border-white/5">
          <div className="text-xs font-semibold text-white mb-2">已智能提取 {keyFrames.length} 个镜头关键帧</div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {keyFrames.map((frame, index) => (
              <img
                key={index}
                src={frame}
                alt={`关键帧 ${index + 1}`}
                className="w-full aspect-video object-cover rounded border border-white/10"
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        </div>
      )}

      {scriptSegmentsCount > 0 && (
        <div className="mt-3 text-xs text-emerald-400 font-medium">
          ✓ 已同步生成 {scriptSegmentsCount} 组解说台词与分镜映射
        </div>
      )}
    </div>

    <div className={styles.stepBottomActions}>
      <button className={styles.prevStepBtn} onClick={onPrev}>
        <ArrowLeft size={14} />
        <span>上一步：重新选择原片</span>
      </button>

      <div className="flex items-center gap-2">
        <button
          className={styles.prevStepBtn}
          onClick={onAnalyze}
          disabled={loading}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          <span>{loading ? '正在深度分析中...' : '重新启动 AI 分析'}</span>
        </button>

        <button
          className={styles.nextStepBtn}
          onClick={onNext}
          disabled={loading}
        >
          <span>下一步：剧本研磨与分镜编排</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  </div>
);
