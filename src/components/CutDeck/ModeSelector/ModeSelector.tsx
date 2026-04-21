import React from 'react';
import styles from './ModeSelector.module.less';

export type EditorMode = 'simple' | 'standard' | 'professional';

const EditorModes = {
  simple: { label: '简单模式', desc: 'AI 选段，一键导出', icon: '🚀' },
  standard: { label: '标准模式', desc: '预览微调，再导出', icon: '🎬' },
  professional: { label: '专业模式', desc: '时间轴完整编辑', icon: '⚡' },
} as const;

interface ModeSelectorProps {
  value: EditorMode;
  onChange: (mode: EditorMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className={styles.modeSelector}>
      {(Object.keys(EditorModes) as EditorMode[]).map(mode => (
        <div
          key={mode}
          className={`${styles.modeCard} ${value === mode ? styles.active : ''}`}
          onClick={() => onChange(mode)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onChange(mode)}
        >
          <span className={styles.icon}>{EditorModes[mode].icon}</span>
          <span className={styles.label}>{EditorModes[mode].label}</span>
          <span className={styles.desc}>{EditorModes[mode].desc}</span>
        </div>
      ))}
    </div>
  );
};