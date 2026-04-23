import React, { memo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { TimelineClip } from './types';
import { formatTime } from './utils';
import { MIN_CLIP_DURATION } from './constants';
import styles from './Timeline.module.less';

interface ClipPropertiesPanelProps {
  clip: TimelineClip;
  onUpdate: (clipId: string, data: Partial<TimelineClip>) => void;
  onClose: () => void;
  onDelete: (clipId: string) => void;
}

export const ClipPropertiesPanel = memo<ClipPropertiesPanelProps>(({ clip, onUpdate, onClose, onDelete }) => {
  const [startSec, setStartSec] = useState(clip.startMs / 1000);
  const [endSec, setEndSec] = useState(clip.endMs / 1000);
  const [volume, setVolume] = useState(100);

  useEffect(() => {
    setStartSec(clip.startMs / 1000);
    setEndSec(clip.endMs / 1000);
  }, [clip]);

  const handleApply = () => {
    const newStartMs = startSec * 1000;
    const newEndMs = endSec * 1000;
    if (newEndMs > newStartMs + MIN_CLIP_DURATION) {
      onUpdate(clip.id, { startMs: newStartMs, endMs: newEndMs });
    }
    onClose();
  };

  return (
    <div className={styles.propertiesPanel}>
      <div className={styles.propertiesHeader}>
        <span>片段属性</span>
        <Button size="sm" variant="ghost" onClick={onClose}>×</Button>
      </div>
      <div className={styles.propertiesBody}>
        <div className={styles.propRow}>
          <label>名称</label>
          <span className={styles.propValue}>{clip.name}</span>
        </div>
        <div className={styles.propRow}>
          <label>开始 (s)</label>
          <Input type="number" value={startSec} onChange={(e) => setStartSec(parseFloat(e.target.value) || 0)} step={0.1} min={0} className="w-20" />
          <label>结束 (s)</label>
          <Input type="number" value={endSec} onChange={(e) => setEndSec(parseFloat(e.target.value) || 1)} step={0.1} min={0} className="w-20" />
        </div>
        <div className={styles.propRow}>
          <label>音量</label>
          <Slider min={0} max={200} defaultValue={[volume]} onValueChange={(v) => setVolume(Array.isArray(v) ? v[0] : v)} className="w-24" />
        </div>
        <div className={styles.propRow}>
          <label>时长</label>
          <span className={styles.propTime}>{formatTime(clip.endMs - clip.startMs)}</span>
          <label>源</label>
          <span className={styles.propTime}>{formatTime(clip.sourceEndMs - clip.sourceStartMs)}</span>
        </div>
      </div>
      <div className={cn(styles.propertiesFooter, 'flex items-center justify-end gap-2')}>
        <Button size="sm" variant="destructive" onClick={() => { onDelete(clip.id); onClose(); }}>
          删除片段
        </Button>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white" onClick={handleApply}>应用</Button>
        </div>
      </div>
    </div>
  );
});
ClipPropertiesPanel.displayName = 'ClipPropertiesPanel';
