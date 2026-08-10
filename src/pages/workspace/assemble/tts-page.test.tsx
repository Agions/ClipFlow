/**
 * TtsPage — 单元测试（PR-4.1b）
 *
 * 验证：
 *  1. 占位组件正常渲染（含 testid）
 *  2. 实验性 UX 标识明确告知用户
 *  3. onNext 回调可选
 *
 * @see docs/PR41_PLAN.md PR-4.1b
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TtsPage from './tts-page';

describe('TtsPage', () => {
  it('renders experimental TTS page placeholder', () => {
    render(<TtsPage />);
    expect(screen.getByTestId('tts-page')).toBeInTheDocument();
    expect(screen.getByTestId('tts-page-placeholder')).toBeInTheDocument();
  });

  it('明确告知用户这是实验性 UX', () => {
    render(<TtsPage />);
    expect(screen.getByText(/TTS 配音页（实验性）/)).toBeInTheDocument();
    expect(screen.getByText(/experimental\.tts-page/)).toBeInTheDocument();
  });

  it('UX 定位说明包含"AI 一键配音"', () => {
    render(<TtsPage />);
    expect(screen.getByText(/AI 一键配音/)).toBeInTheDocument();
  });

  it('提供了 FFEASIBILITY_REPORT.md 链接（可追溯性）', () => {
    render(<TtsPage />);
    const link = screen.getByRole('link', { name: /FFEASIBILITY_REPORT/ });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('docs/FFEASIBILITY_REPORT.md');
  });

  it('没有 onNext 时不渲染"下一步"按钮', () => {
    render(<TtsPage />);
    expect(screen.queryByText(/下一步/)).not.toBeInTheDocument();
  });

  it('提供 onNext 时渲染"下一步"按钮', () => {
    const onNext = vi.fn();
    render(<TtsPage onNext={onNext} />);
    const button = screen.getByText(/下一步/);
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('占位说明指向 PR-4.1c（不伪装已实现）', () => {
    render(<TtsPage />);
    expect(screen.getByText(/PR-4.1c/)).toBeInTheDocument();
  });
});
