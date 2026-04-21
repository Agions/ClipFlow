import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModeSelector } from './ModeSelector';

describe('ModeSelector', () => {
  it('should render three mode options', () => {
    render(<ModeSelector value="simple" onChange={() => {}} />);
    expect(screen.getByText('简单模式')).toBeDefined();
    expect(screen.getByText('标准模式')).toBeDefined();
    expect(screen.getByText('专业模式')).toBeDefined();
  });

  it('should call onChange when mode clicked', () => {
    const handler = vi.fn();
    render(<ModeSelector value="simple" onChange={handler} />);
    fireEvent.click(screen.getByText('标准模式'));
    expect(handler).toHaveBeenCalledWith('standard');
  });
});