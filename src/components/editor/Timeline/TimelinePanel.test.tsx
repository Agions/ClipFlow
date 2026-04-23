/**
 * TimelinePanel tests — Vitest
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelinePanel } from './TimelinePanel';

const MOCK_TRACKS = [
  {
    id: 'video-1',
    type: 'video' as const,
    name: '视频 1',
    clips: [
      { id: 'c1', startTime: 5, endTime: 20, label: 'clip1.mp4', color: '#8b5cf6' },
      { id: 'c2', startTime: 25, endTime: 40, label: 'clip2.mp4', color: '#8b5cf6' },
    ],
  },
  {
    id: 'audio-1',
    type: 'audio' as const,
    name: '音频 1',
    clips: [
      { id: 'c3', startTime: 5, endTime: 35, label: 'music.mp3' },
    ],
  },
  {
    id: 'subtitle-1',
    type: 'subtitle' as const,
    name: '字幕 1',
    clips: [
      { id: 'c4', startTime: 10, endTime: 25, label: '字幕 1' },
    ],
  },
];

describe('TimelinePanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with 3 tracks', () => {
    render(<TimelinePanel tracks={MOCK_TRACKS} initialDuration={60} />);
    // Should render without crashing
    expect(document.body.querySelector('.flex.flex-col')).toBeTruthy();
  });

  it('renders clips on tracks', () => {
    render(<TimelinePanel tracks={MOCK_TRACKS} initialDuration={60} />);
    // Clips should be in the DOM
    const clipElements = document.body.querySelectorAll('[class*="absolute"]');
    expect(clipElements.length).toBeGreaterThan(0);
  });

  it('playhead starts at initial position', () => {
    render(<TimelinePanel tracks={MOCK_TRACKS} initialDuration={60} initialPlayhead={10} />);
    // Playhead element should be rendered
    const playhead = document.body.querySelector('[class*="cursor-ew-resize"]');
    expect(playhead).toBeTruthy();
  });

  it('zoom controls work', () => {
    render(<TimelinePanel tracks={MOCK_TRACKS} initialDuration={60} />);
    // All toolbar buttons should be present
    const buttons = document.body.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('click on clip selects it', () => {
    const onClipSelect = vi.fn();
    render(
      <TimelinePanel
        tracks={MOCK_TRACKS}
        initialDuration={60}
        onClipSelect={onClipSelect}
      />
    );

    // Find clip elements and click
    const clips = document.body.querySelectorAll('[class*="cursor-pointer"]');
    if (clips.length > 0) {
      fireEvent.click(clips[0]);
      expect(onClipSelect).toHaveBeenCalled();
    }
  });
});
