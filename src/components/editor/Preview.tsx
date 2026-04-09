import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import { Button, Space } from 'antd';
import { FullscreenOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import styles from './Preview.module.less';

interface PreviewProps {
  playing?: boolean;
  onTimeUpdate?: (time: number) => void;
}

const DURATION_SECONDS = 120;

const Preview = forwardRef<HTMLDivElement, PreviewProps>(({ playing = false, onTimeUpdate }, ref) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!playing) return;

    const timer = window.setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.1;
        const clamped = next >= DURATION_SECONDS ? 0 : next;
        onTimeUpdate?.(clamped);
        return clamped;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [playing, onTimeUpdate]);

  useEffect(() => {
    if (!playing) {
      onTimeUpdate?.(currentTime);
    }
  }, [playing, currentTime, onTimeUpdate]);

  const zoomPercent = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom]);

  return (
    <div className={styles.previewContainer} ref={ref}>
      <div className={styles.previewContent} style={{ transform: `scale(${zoom})` }}>
        <div className={styles.emptyPreview}>
          <div className={styles.previewPlaceholder}>预览画面</div>
        </div>
      </div>

      <div className={styles.previewControls}>
        <Space>
          <Button
            type="text"
            size="small"
            icon={<ZoomOutOutlined />}
            onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.1))}
            aria-label="缩小"
          />
          <span className={styles.zoomLevel}>{zoomPercent}</span>
          <Button
            type="text"
            size="small"
            icon={<ZoomInOutlined />}
            onClick={() => setZoom((prev) => Math.min(2, prev + 0.1))}
            aria-label="放大"
          />
          <Button type="text" size="small" icon={<FullscreenOutlined />} aria-label="全屏" />
        </Space>
      </div>
    </div>
  );
});

Preview.displayName = 'Preview';

export default Preview;
