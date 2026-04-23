import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Copy, 
  Clock, 
  List, 
  Calendar
} from 'lucide-react';
import type { Script, ScriptSegment } from '@/types';
import { notify } from '@/shared';
import styles from './ScriptPreview.module.less';

const Title = ({ children, level, className }: { children: React.ReactNode; level?: number; className?: string }) => <h3 className={className} style={{ fontSize: level === 3 ? '1.25rem' : '1rem', fontWeight: level ? 600 : 400 }}>{children}</h3>;
const Paragraph = ({ children, className }: { children: React.ReactNode; className?: string }) => <p className={className}>{children}</p>;


interface ScriptPreviewProps {
  script: Script;
  onEdit: () => void;
  onExport: () => void;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({ script, onEdit, onExport }) => {
  const [copying, setCopying] = useState(false);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = () => {
    setCopying(true);
    const text = script.content
      .map(
        (segment: ScriptSegment) =>
          `[${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}] ${
            segment.content
          }`
      )
      .join('\n\n');

    navigator.clipboard.writeText(text).then(
      () => {
        notify.success('脚本已复制到剪贴板');
        setCopying(false);
      },
      (err) => {
        logger.error('复制失败:', { error: err });
        notify.error(err, '复制失败，请重试');
        setCopying(false);
      }
    );
  };

  const totalDuration = script.content.reduce(
    (acc: number, segment: ScriptSegment) => acc + (segment.endTime - segment.startTime),
    0
  );

  const getSegmentTypeInfo = (type: string) => {
    switch(type) {
      case 'narration':
        return { color: '#1890ff', text: '旁白', bgColor: 'rgba(24, 144, 255, 0.1)' };
      case 'dialogue':
        return { color: '#52c41a', text: '对话', bgColor: 'rgba(82, 196, 26, 0.1)' };
      default:
        return { color: '#fa8c16', text: '描述', bgColor: 'rgba(250, 140, 22, 0.1)' };
    }
  };

  return (
    <Card className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>脚本预览</h3>
          <div className="flex gap-4 items-center">
            <Tooltip title="总时长">
              <Badge variant="default" className={styles.metaTag}>
                {Math.round(totalDuration / 60)} 分钟
              </Badge>
            </Tooltip>
            <Tooltip title="段落数">
              <Badge variant="default" className={styles.metaTag}>
                {script.content.length} 段
              </Badge>
            </Tooltip>
            <Tooltip title="创建时间">
              <Badge variant="outline" className={styles.metaTag}>
                {new Date(script.createdAt).toLocaleDateString()}
              </Badge>
            </Tooltip>
          </div>
        </div>
        <div className={styles.actions}>
          <Button 
            variant="outline"
            onClick={copyToClipboard}
            className={styles.actionButton}
          >
            <Copy size={14} className="mr-1" />
            {copying ? '复制中...' : '复制全文'}
          </Button>
          <Button 
            variant="outline"
            onClick={onExport}
            className={styles.actionButton}
          >
            <FileText size={14} className="mr-1" />
            导出 PDF
          </Button>
          <Button 
            className={`bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white ${styles.actionButton} ${styles.editButton}`}
            onClick={onEdit}
          >
            <FileText size={14} className="mr-1" />
            编辑脚本
          </Button>
        </div>
      </div>

      <hr className={styles.mainDivider} />

      <div className={styles.scriptContent}>
        {script.content.map((segment: ScriptSegment, index: number) => {
          const typeInfo = getSegmentTypeInfo(segment.type ?? 'text');
          return (
            <div 
              key={segment.id} 
              className={styles.segment}
              style={{ borderLeft: `3px solid ${typeInfo.color}` }}
            >
              <div className={styles.segmentHeader}>
                <strong className={styles.timeCode}>
                  {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                </strong>
                <Badge className={styles.typeTag}>
                  {typeInfo.text}
                </Badge>
              </div>
              <p className={styles.content}>
                {segment.content}
              </p>
              {index < script.content.length - 1 && <hr className={styles.divider} />}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ScriptPreview; 
