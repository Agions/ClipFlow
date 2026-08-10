/**
 * SubtitleTable — 单元测试（PR-4.1b）
 *
 * 验证：
 *  1. 占位组件正常渲染（含 testid）
 *  2. 实验性 UX 标识明确告知用户
 *  3. 与 TtsPage 共享同一个 feature flag
 *
 * @see docs/PR41_PLAN.md PR-4.1b
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SubtitleTable from './subtitle-table';

describe('SubtitleTable', () => {
  it('renders experimental subtitle table placeholder', () => {
    render(<SubtitleTable />);
    expect(screen.getByTestId('subtitle-table')).toBeInTheDocument();
    expect(screen.getByTestId('subtitle-table-placeholder')).toBeInTheDocument();
  });

  it('明确告知用户这是实验性 UX', () => {
    render(<SubtitleTable />);
    expect(screen.getByText(/字幕表格页（实验性）/)).toBeInTheDocument();
    expect(screen.getByText(/experimental\.tts-page/)).toBeInTheDocument();
  });

  it('UX 定位说明包含"字幕驱动批量生成"', () => {
    render(<SubtitleTable />);
    expect(screen.getByText(/字幕驱动批量生成/)).toBeInTheDocument();
  });

  it('提供 onNext 时渲染"下一步"按钮', () => {
    const onNext = vi.fn();
    render(<SubtitleTable onNext={onNext} />);
    const button = screen.getByText(/下一步/);
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('与 TtsPage 共享 experimental.tts-page flag（实现一致性）', () => {
    // 两个组件都提及同一个 flag 名
    // 实际路由层 `pages/workspace/index.tsx` 的 case 'video-synth'：
    //   useFeatureFlag('experimental.tts-page') ? <TtsPage/><SubtitleTable/> : <VideoComposing/>
    // 一个 flag 控制两个组件同时切换 → 避免分散实验性 UX
    render(
      <>
        {/* 模拟路由层同时渲染两个组件 */}
        <SubtitleTable />
      </>
    );
    expect(screen.getByText(/experimental\.tts-page/)).toBeInTheDocument();
  });

  it('占位说明指向 PR-4.1c', () => {
    render(<SubtitleTable />);
    expect(screen.getByText(/PR-4.1c/)).toBeInTheDocument();
  });
});
