import React, { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import VideoPlayer from '@/components/video-player/video-player';
import { ScriptSegment } from '@/types';
import { formatTime } from '@/shared';
import styles from '././video-editor.module.less';

interface PreviewModalProps {
  open: boolean;
  loading: boolean;
  previewUrl: string;
  previewSegment: ScriptSegment | null;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  open,
  loading,
  previewUrl,
  previewSegment,
  onClose,
}) => {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>片段预览</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className={styles.previewLoading}>
            <div className="animate-spin">⟳</div>
            <span className="ml-2">生成预览中...</span>
          </div>
        ) : previewUrl ? (
          <div className={styles.previewContainer}>
            <VideoPlayer src={previewUrl} autoPlay />
            {previewSegment && (
              <div className={styles.previewInfo}>
                <p className="mb-1">
                  <span className="font-semibold">时间段: </span>
                  <span>{formatTime(previewSegment.startTime)} - {formatTime(previewSegment.endTime)}</span>
                </p>
                <p className="mb-1">
                  <span className="font-semibold">内容: </span>
                  <span>{previewSegment.content}</span>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.previewError}>
            <span className="text-accent-danger">无法生成预览，请重试</span>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default memo(PreviewModal);
