import { overlayQualityService } from './overlay-quality.service';

export interface OverlayMarker {
  start: number;
  end: number;
  label: string;
}

export interface OverlayOptimizationInput {
  markers: OverlayMarker[];
  subtitles: Array<{ start: number; end: number }>;
  qualityScore: number;
  baseOpacity: number;
  preferredMode: 'pip' | 'full';
  duration: number;
}

export interface OverlayOptimizationResult {
  final: { markers: OverlayMarker[]; opacity: number; mixMode: 'pip' | 'full' };
  predictedScore: number;
  passes: number;
  enableOverlay: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getSubtitleOverlap(
  window: { start: number; end: number },
  subtitles: Array<{ start: number; end: number }>
): number {
  return subtitles.reduce((sum, subtitle) => {
    const start = Math.max(window.start, subtitle.start);
    const end = Math.min(window.end, subtitle.end);
    return sum + Math.max(0, end - start);
  }, 0);
}

function optimizeOverlayForExport(input: {
  markers: OverlayMarker[];
  subtitles: Array<{ start: number; end: number }>;
  qualityScore: number;
  baseOpacity: number;
  preferredMode: 'pip' | 'full';
}): { markers: OverlayMarker[]; opacity: number; mixMode: 'pip' | 'full' } {
  const baseOpacity = clamp(input.baseOpacity, 0.1, 1);
  const score = input.qualityScore;

  if (score >= 80) {
    return {
      markers: input.markers,
      opacity: baseOpacity,
      mixMode: input.preferredMode,
    };
  }

  const targetOpacity = score >= 60 ? Math.min(baseOpacity, 0.62) : Math.min(baseOpacity, 0.48);
  const compressRatio = score >= 60 ? 0.85 : 0.7;
  const markerMinDuration = score >= 60 ? 0.35 : 0.25;

  const compressedMarkers = input.markers
    .map((marker) => {
      const duration = Math.max(0, marker.end - marker.start);
      const nextDuration = Math.max(markerMinDuration, duration * compressRatio);
      const center = (marker.start + marker.end) / 2;
      let start = Math.max(0, center - nextDuration / 2);
      let end = center + nextDuration / 2;

      const overlap = getSubtitleOverlap({ start, end }, input.subtitles);
      if (overlap / Math.max(end - start, 0.001) > 0.4) {
        const shiftedStart = end + 0.18;
        const shiftedEnd = shiftedStart + nextDuration;
        start = shiftedStart;
        end = shiftedEnd;
      }

      return { ...marker, start, end };
    })
    .filter((marker) => marker.end > marker.start);

  return {
    markers: compressedMarkers,
    opacity: targetOpacity,
    mixMode: 'pip',
  };
}

export function optimizeOverlayIteratively(input: OverlayOptimizationInput): OverlayOptimizationResult {
  const pass1 = optimizeOverlayForExport({
    markers: input.markers,
    subtitles: input.subtitles,
    qualityScore: input.qualityScore,
    baseOpacity: input.baseOpacity,
    preferredMode: input.preferredMode,
  });
  let predictedScore = overlayQualityService.evaluate({
    brightnessThreshold: 0.3,
    contrastThreshold: 0.2,
  });

  if (predictedScore < 65) {
    const pass2 = optimizeOverlayForExport({
      markers: pass1.markers.map((item) => {
        const center = (item.start + item.end) / 2;
        const duration = Math.max(0.2, (item.end - item.start) * 0.8);
        return {
          ...item,
          start: Math.max(0, center - duration / 2),
          end: center + duration / 2,
        };
      }),
      subtitles: input.subtitles,
      qualityScore: Math.max(40, predictedScore - 10),
      baseOpacity: Math.min(pass1.opacity, 0.42),
      preferredMode: 'pip',
    });

    predictedScore = overlayQualityService.evaluate({
    brightnessThreshold: 0.3,
    contrastThreshold: 0.2,
  });

    return {
      final: pass2,
      predictedScore,
      passes: 2,
      enableOverlay: predictedScore >= 50,
    };
  }

  return {
    final: pass1,
    predictedScore,
    passes: input.qualityScore < 80 ? 1 : 0,
    enableOverlay: predictedScore >= 50,
  };
}
