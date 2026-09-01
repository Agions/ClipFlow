import React from 'react';
import { Sparkles } from 'lucide-react';
import styles from '../workspace.module.less';

interface AiParamsPanelProps {
  styleMode: string;
  speaker: string;
  bgmGenre: string;
  isGenerating: boolean;
  onStyleModeChange: (val: string) => void;
  onSpeakerChange: (val: string) => void;
  onBgmGenreChange: (val: string) => void;
  onStartAiGen: () => void;
}

export const AiParamsPanel: React.FC<AiParamsPanelProps> = ({
  styleMode,
  speaker,
  bgmGenre,
  isGenerating,
  onStyleModeChange,
  onSpeakerChange,
  onBgmGenreChange,
  onStartAiGen,
}) => {
  return (
    <aside className={styles.paramPanel}>
      <div className={styles.paramHeader}>
        <Sparkles size={14} className="text-purple-400" />
        <span className={styles.paramTitle}>AI 视听智能剪辑配置</span>
      </div>

      <div className={styles.paramForm}>
        <div className={styles.formGroup}>
          <label className={styles.fieldLabel}>剪辑叙事风格</label>
          <select
            className={styles.darkSelect}
            value={styleMode}
            onChange={e => onStyleModeChange(e.target.value)}
          >
            <option value="fast_recap">战神短剧 · 黄金 3 秒快节奏</option>
            <option value="suspense">悬疑反转 · 留白与心理层</option>
            <option value="deep_film">经典院线 · 深度剧情拆解</option>
            <option value="comic">搞笑吐槽 · 爆笑节奏包袱</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.fieldLabel}>解说音色 (TTS)</label>
          <select
            className={styles.darkSelect}
            value={speaker}
            onChange={e => onSpeakerChange(e.target.value)}
          >
            <option value="teacher_wang">王老师 · 悬疑磁性男中音</option>
            <option value="yunxi">云希 · 激情短剧解说</option>
            <option value="xiaoxiao">晓晓 · 故事感知性女声</option>
            <option value="yunjian">云健 · 影视院线解说男声</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.fieldLabel}>背景配乐 (BGM)</label>
          <select
            className={styles.darkSelect}
            value={bgmGenre}
            onChange={e => onBgmGenreChange(e.target.value)}
          >
            <option value="suspense">九霄重音 · 战神归来交响</option>
            <option value="cyber">赛博暗涌 · 电子紧张氛围</option>
            <option value="cinematic">电影史诗 · 气势磅礴管弦</option>
            <option value="calm">幽静悬疑 · 钢琴低音独奏</option>
          </select>
        </div>

        <button
          className={styles.primaryGenBtn}
          onClick={onStartAiGen}
          disabled={isGenerating}
        >
          <Sparkles size={14} />
          {isGenerating ? '正在智能合成中...' : '一键 AI 5 轨智能合成'}
        </button>
      </div>
    </aside>
  );
};
