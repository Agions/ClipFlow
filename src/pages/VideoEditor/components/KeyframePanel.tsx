import React, { memo } from 'react';
import styles from '../index.module.less';

interface KeyframePanelProps {
  keyframes: string[];
}

const KeyframePanel: React.FC<KeyframePanelProps> = ({ keyframes }) => {
  return (
    <div className={styles.keyframesContainer}>
      <h5 className={styles.sectionTitle}>关键帧</h5>

      {keyframes.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          暂无关键帧
        </div>
      ) : (
        <div className={styles.keyframeList}>
          {keyframes.map((frame, index) => (
            <div key={index} className={styles.keyframeItem}>
              <img
                src={frame}
                alt={`关键帧 ${index + 1}`}
                className={styles.keyframeImage}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default memo(KeyframePanel);
