import React, { memo } from 'react';
import { Bot } from 'lucide-react';
import { AIClipAssistant } from '@/components/AIClipAssistant';
import type { ClipAnalysisResult, ClipSegment } from '@/core/services/aiClip.service';
import styles from '../index.module.less';

interface AIClipPanelProps {
  projectId: string | undefined;
  videoSrc: string;
  duration: number;
  onAnalysisComplete: (result: ClipAnalysisResult) => void;
  onApplySuggestions: (segments: ClipSegment[]) => void;
}

const AIClipPanel: React.FC<AIClipPanelProps> = ({
  projectId,
  videoSrc,
  duration,
  onAnalysisComplete,
  onApplySuggestions,
}) => {
  if (!videoSrc || duration === 0) {
    return (
      <div className={styles.aiClipPanel}>
        <h5 className={styles.sectionTitle}>
          <Bot size={16} /> AI 智能剪辑助手
        </h5>
        <div className="text-center text-muted-foreground py-8">请先加载视频</div>
      </div>
    );
  }

  return (
    <div className={styles.aiClipPanel}>
      <h5 className={styles.sectionTitle}>
        <Bot size={16} /> AI 智能剪辑助手
      </h5>

      <AIClipAssistant
        videoInfo={{
          id: projectId || 'new',
          path: videoSrc,
          name: '当前视频',
          duration,
          width: 1920,
          height: 1080,
          fps: 30,
          format: 'mp4',
          size: 0,
          createdAt: new Date().toISOString(),
        }}
        onAnalysisComplete={onAnalysisComplete}
        onApplySuggestions={onApplySuggestions}
      />
    </div>
  );
};

export default memo(AIClipPanel);
