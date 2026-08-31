/**
 * 前置步骤提示 — 要求用户先完成 AI 分析
 */
import React from 'react';
import type { StoryFabAction } from '@/core/types/storyfab';
import styles from './../edit-step/script-writing.module.less';

interface PrerequisiteStepProps {
  dispatch: (action: StoryFabAction) => void;
}

const PrerequisiteStep: React.FC<PrerequisiteStepProps> = ({ dispatch }) => {
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepTitle}>
        <div className={styles.stepTitleLeft}>
          <h2>📝 生成文案</h2>
        </div>
      </div>
      <div
        style={{
          padding: '28px',
          background: 'rgba(250, 173, 20, 0.06)',
          border: '1px solid rgba(250, 173, 20, 0.15)',
          borderRadius: '12px',
          textAlign: 'center',
          fontFamily: 'Figtree, sans-serif',
          color: 'rgba(255, 255, 255, 0.55)',
          fontSize: '14px',
        }}
      >
        ⚠️ 请先完成 AI 分析步骤，再生成文案
        <br />
        <button
          style={{
            marginTop: '14px',
            padding: '8px 20px',
            background: 'color-mix(in srgb, var(--accent-amber) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-amber) 25%, transparent)',
            borderRadius: '8px',
            color: 'var(--accent-amber)',
            fontFamily: 'Figtree, sans-serif',
            fontSize: '13px',
            cursor: 'pointer',
          }}
          onClick={() => dispatch({ type: 'SET_STEP', payload: 'ai-analyze' })}
        >
          去分析
        </button>
      </div>
    </div>
  );
};

export default PrerequisiteStep;
