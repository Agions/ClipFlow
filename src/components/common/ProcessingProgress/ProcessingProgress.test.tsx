import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProcessingProgress from './index';

describe('ProcessingProgress', () => {
  it('should render with correct percentage', () => {
    render(<ProcessingProgress percent={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should render line progress when type="line"', () => {
    const { container } = render(<ProcessingProgress percent={75} type="line" />);
    expect(container.querySelector('[data-slot="progress"]')).toBeInTheDocument();
  });

  it('should display the correct percentage text', () => {
    render(<ProcessingProgress percent={42} />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('should display status text when provided', () => {
    render(<ProcessingProgress percent={50} statusText="处理中..." />);
    expect(screen.getByText('处理中...')).toBeInTheDocument();
  });

  it('should render extra content when provided', () => {
    render(<ProcessingProgress percent={50} extra={<span data-testid="extra">额外信息</span>} />);
    expect(screen.getByTestId('extra')).toBeInTheDocument();
  });

  it('should hide icon when showIcon=false', () => {
    const { container } = render(
      <ProcessingProgress percent={50} status="active" showIcon={false} statusText="处理中" />
    );
    // No icon element when showIcon is false
    const icons = container.querySelectorAll('[class*="icon"]');
    expect(icons.length).toBe(0);
  });

  it('should render with 0% correctly', () => {
    render(<ProcessingProgress percent={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should render with 100% correctly', () => {
    render(<ProcessingProgress percent={100} status="success" />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should render with different sizes without crashing', () => {
    const { container: small } = render(<ProcessingProgress percent={30} size="small" type="line" />);
    expect(small.querySelector('[data-slot="progress"]')).toBeInTheDocument();

    const { container: large } = render(<ProcessingProgress percent={30} size="large" type="line" />);
    expect(large.querySelector('[data-slot="progress"]')).toBeInTheDocument();
  });
});
