import React, { forwardRef, useEffect, useMemo, useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import styles from './Preview.module.less';

interface PreviewProps {
  playing?: boolean;
  onTimeUpdate?: (time: number) => void;
}

const DURATION_SECONDS = 120;

const Preview = forwardRef<HTMLDivElement, PreviewProps>(({ playing = false, onTimeUpdate }, ref) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  useEffect(() => {
    if (!playing) return;

    const timer = window.setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.1;
        const clamped = next >= DURATION_SECONDS ? 0 : next;
        onTimeUpdateRef.current?.(clamped);
        return clamped;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (!playing) {
      onTimeUpdateRef.current?.(currentTime);
    }
  }, [playing, currentTime]);

  const zoomPercent = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom]);

  return (
    <div className={styles.previewContainer} ref={ref}>
      <div className={styles.previewContent} style={{ transform: `scale(${zoom})` }}>
        <div className={styles.emptyPreview}>
          <div className={styles.previewPlaceholder}>预览画面</div>
        </div>
      </div>

      <div className={styles.previewControls}>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="缩小"
            onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.1))}
          >
            <ZoomOut />
          </Button>
          <span className={styles.zoomLevel}>{zoomPercent}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="放大"
            onClick={() => setZoom((prev) => Math.min(2, prev + 0.1))}
          >
            <ZoomIn />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="全屏">
            <Maximize />
          </Button>
        </div>
      </div>
    </div>
  );
});

Preview.displayName = 'Preview';

export default Preview;
