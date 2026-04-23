import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import styles from './ClipListView.module.less';

interface ClipSegment {
  id: string;
  name?: string;
  sourceStartMs: number;
  sourceEndMs: number;
  duration: number;
  score: { total: number };
}

interface ClipListViewProps {
  segments: ClipSegment[];
  onExport: (selectedIds: string[], platform: string) => void;
}

const PlatformOptions = [
  { value: 'douyin', label: '抖音' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'bilibili', label: 'B站' },
  { value: 'youtube', label: 'YouTube' },
];

export const ClipListView: React.FC<ClipListViewProps> = ({ segments, onExport }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [platform, setPlatform] = useState('douyin');

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleExport = () => {
    if (selected.size > 0) {
      onExport([...selected], platform);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.list}>
        {segments.map((seg, i) => (
          <div key={seg.id} className={`${styles.clipCard} ${selected.has(seg.id) ? styles.selected : ''}`}>
            <Checkbox
              checked={selected.has(seg.id)}
              onCheckedChange={() => toggle(seg.id)}
            />
            <span className={styles.index}>{seg.name ?? `片段 ${i + 1}`}</span>
            <span className={styles.duration}>{(seg.duration / 1000).toFixed(1)}s</span>
            <span className={styles.score}>评分 {seg.score.total}</span>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <Select value={platform} onValueChange={(v: string) => setPlatform(v)}>
          <SelectTrigger className="w-[120px] platformSelect">
            <SelectValue placeholder="选择平台" />
          </SelectTrigger>
          <SelectContent>
            {PlatformOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white"
          disabled={selected.size === 0}
          onClick={handleExport}
        >
          导出 ({selected.size})
        </Button>
      </div>
    </div>
  );
};