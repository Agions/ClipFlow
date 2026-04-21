import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClipListView } from './ClipListView';

describe('ClipListView', () => {
  const mockSegments = [
    { id: '1', sourceStartMs: 0, sourceEndMs: 5000, duration: 5000, score: { total: 80 }, name: '片段1' },
    { id: '2', sourceStartMs: 5000, sourceEndMs: 10000, duration: 5000, score: { total: 75 }, name: '片段2' },
  ];

  it('should render clip list with segments', () => {
    render(<ClipListView segments={mockSegments} onExport={() => {}} />);
    expect(screen.getByText('片段1')).toBeDefined();
    expect(screen.getByText('片段2')).toBeDefined();
  });

  it('should toggle selection on checkbox click', () => {
    render(<ClipListView segments={mockSegments} onExport={() => {}} />);
    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(firstCheckbox);
    expect(firstCheckbox).toBeChecked();
  });

  it('should call onExport with selected ids and platform', () => {
    const handler = vi.fn();
    render(<ClipListView segments={mockSegments} onExport={handler} />);
    // Select first clip
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    // Click export button
    fireEvent.click(screen.getByRole('button', { name: /导出/ }));
    expect(handler).toHaveBeenCalledWith(['1'], 'douyin');
  });
});