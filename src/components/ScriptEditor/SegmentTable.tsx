import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Edit3, Play, Trash2 } from 'lucide-react';
import { formatDuration } from '@/core/video';
import type { ScriptSegment } from '@/core/types';
import { getTypeLabel } from './types';
import styles from './ScriptEditor.module.less';

interface SegmentTableProps {
  segments: ScriptSegment[];
  onEdit: (index: number) => void;
  onPreview: (index: number) => void;
  onDelete: (index: number) => void;
  onAdd: () => void;
}

const SegmentTable: React.FC<SegmentTableProps> = ({
  segments,
  onEdit,
  onPreview,
  onDelete,
  onAdd,
}) => {
  if (segments.length === 0) {
    return (
      <div className={styles.segmentsTable}>
        <div className="text-center py-8 text-muted-foreground">暂无片段，请先添加</div>
        <div className="flex justify-center mt-4">
          <Button onClick={onAdd}>添加片段</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.segmentsTable}>
      {segments.map((record: ScriptSegment, index: number) => (
        <div
          key={`${record.startTime}-${record.endTime}-${index}`}
          className="flex items-start gap-4 p-4 border-b last:border-b-0 hover:bg-accent/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline">{getTypeLabel(record.type || '')}</Badge>
              <span className="text-sm">{formatDuration(record.startTime)} - {formatDuration(record.endTime)}</span>
              <span className="text-sm text-muted-foreground">时长 {formatDuration(record.endTime - record.startTime)}</span>
            </div>
            <div className={styles.contentCell}>
              {record.content || <span className={styles.emptyContent}>（无内容）</span>}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={() => onEdit(index)}>
                    <Edit3 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>编辑</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={() => onPreview(index)}>
                    <Play size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>预览</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={() => onDelete(index)}>
                    <Trash2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(SegmentTable);
