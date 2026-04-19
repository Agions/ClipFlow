import React, { memo } from 'react';
import { formatTime } from './utils';
import styles from './Timeline.module.less';

interface TimeRulerProps {
  duration: number;
  zoom: number;
  scrollX: number;
  width: number;
}

export const TimeRuler = memo<TimeRulerProps>(({ duration, zoom, scrollX, width }) => {
  const msPerPixel = 1000 / zoom;
  let majorInterval = 1000;
  let minorDivisions = 4;
  if (msPerPixel > 500) { majorInterval = 5000; minorDivisions = 5; }
  else if (msPerPixel > 200) { majorInterval = 2000; minorDivisions = 4; }
  else if (msPerPixel > 100) { majorInterval = 1000; minorDivisions = 4; }
  else if (msPerPixel > 50) { majorInterval = 500; minorDivisions = 5; }
  else if (msPerPixel > 20) { majorInterval = 200; minorDivisions = 4; }
  else if (msPerPixel > 10) { majorInterval = 100; minorDivisions = 4; }
  else { majorInterval = 50; minorDivisions = 5; }

  const minorInterval = majorInterval / minorDivisions;
  const totalMs = Math.max(duration, 60000);
  const visibleStartMs = scrollX * msPerPixel;
  const visibleEndMs = visibleStartMs + width * msPerPixel;

  const ticks: { ms: number; major: boolean }[] = [];
  const startMs = Math.floor(visibleStartMs / minorInterval) * minorInterval;

  for (let ms = startMs; ms <= visibleEndMs + majorInterval; ms += minorInterval) {
    if (ms < 0) continue;
    const major = Math.abs(ms % majorInterval) < 1;
    ticks.push({ ms, major });
  }

  return (
    <div className={styles.timeRuler}>
      {ticks.map(({ ms, major }) => {
        const x = (ms / msPerPixel) - scrollX;
        return (
          <div key={ms} className={`${styles.tick} ${major ? styles.major : styles.minor}`} style={{ left: x }}>
            {major && <span className={styles.tickLabel}>{formatTime(ms)}</span>}
          </div>
        );
      })}
    </div>
  );
});
TimeRuler.displayName = 'TimeRuler';
