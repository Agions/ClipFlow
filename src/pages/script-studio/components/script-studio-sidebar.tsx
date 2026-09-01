import React from 'react';
import { Activity, Bot, RefreshCw, Sparkles, User } from 'lucide-react';
import type { CharacterItem, ScriptBlock } from '../types';
import styles from '../script-studio.module.less';

interface ScriptStudioSidebarProps {
  blocks: ScriptBlock[];
  characters: CharacterItem[];
  totalDuration: number;
  isGenerating: boolean;
  formatDuration: (seconds: number) => string;
  onRegenerate: () => void;
}

export const ScriptStudioSidebar: React.FC<ScriptStudioSidebarProps> = ({
  blocks,
  characters,
  totalDuration,
  isGenerating,
  formatDuration,
  onRegenerate,
}) => {
  return (
    <aside className={styles.rightColumn}>
      {/* 多智能体状态 */}
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>多智能体协作状态</span>
      </div>
      <div className={styles.agentList}>
        <div className={styles.agentCard}>
          <div className={styles.agentCardHeader}>
            <div className="flex items-center gap-2">
              <div className={`${styles.agentIconCircle} bg-purple-500/20 text-purple-400`}>
                <Bot size={13} />
              </div>
              <span className={styles.agentName}>解说编剧 Agent</span>
            </div>
            <span className={styles.agentReadyTag}>● 已就绪</span>
          </div>
          <p className={styles.agentDesc}>整体叙事节奏与口语化台词转写</p>
        </div>
        <div className={styles.agentCard}>
          <div className={styles.agentCardHeader}>
            <div className="flex items-center gap-2">
              <div className={`${styles.agentIconCircle} bg-amber-500/20 text-amber-400`}>
                <Sparkles size={13} />
              </div>
              <span className={styles.agentName}>黄金 Hook Agent</span>
            </div>
            <span className={styles.agentReadyTag}>● 待命</span>
          </div>
          <p className={styles.agentDesc}>前3秒悬念倒叙设计，提升完播率</p>
        </div>
        <div className={styles.agentCard}>
          <div className={styles.agentCardHeader}>
            <div className="flex items-center gap-2">
              <div className={`${styles.agentIconCircle} bg-emerald-500/20 text-emerald-400`}>
                <Activity size={13} />
              </div>
              <span className={styles.agentName}>情绪节奏 Agent</span>
            </div>
            <span className={styles.agentReadyTag}>● 待命</span>
          </div>
          <p className={styles.agentDesc}>剧情起承转合与高潮背景音对齐</p>
        </div>
      </div>

      {/* 节奏摘要 */}
      {blocks.length > 0 && (
        <div className={`${styles.emotionCurveCard} mt-3`}>
          <div className={styles.emotionTitle}>节奏摘要</div>
          <div className="flex flex-col gap-1.5 mt-2">
            {blocks.map(b => (
              <div key={b.id} className="flex items-center gap-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/80">
                  {b.title}
                </span>
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500/70"
                    style={{ width: `${Math.min(100, (b.durationEstimate / 60) * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] text-text-tertiary">{formatDuration(b.durationEstimate)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center mt-1 pt-2 border-t border-white/5">
              <span className="text-[10px] text-text-tertiary">总预估时长</span>
              <span className="text-[10px] font-bold text-white">{formatDuration(totalDuration)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 人物小传 */}
      {characters.length > 0 && (
        <div className="mt-3">
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>人物小传</span>
          </div>
          <div className={styles.characterList}>
            {characters.map(c => (
              <div key={c.id} className={styles.characterCard}>
                <div className={styles.characterAvatar} style={{ background: c.avatarBg }}>
                  <User size={14} className="text-white/80" />
                </div>
                <div className={styles.characterMeta}>
                  <span className={styles.characterName}>{c.name}</span>
                  <span className={styles.characterRoleTag}>{c.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="mt-auto pt-4 flex flex-col gap-2">
        <button
          className={styles.primaryStudioBtn}
          onClick={onRegenerate}
          disabled={isGenerating}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <RefreshCw size={13} />
          <span>{isGenerating ? '生成中...' : '重新生成骨架'}</span>
        </button>
      </div>
    </aside>
  );
};
