/**
 * understanding-page 测试
 *
 * 覆盖 L0 页面各状态渲染与关键交互：
 *  - idle：导入步骤（开始分析禁用 → 选择视频后可用）
 *  - running：进度展示
 *  - done：统计 + 加载明细
 *  - failed：错误 + 重试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UnderstandingPage from './understanding-page';

// 可控 store：vi.hoisted 避免 mock 工厂 hoisting 问题
const mockStore = vi.hoisted(() => ({
  status: 'idle' as string,
  progress: 0,
  stage: null as string | null,
  message: null as string | null,
  stats: null as null | {
    scenesCount: number;
    subtitlesCount: number;
    highlightsCount: number;
    durationSecs: number;
  },
  storyline: null,
  artifactPath: null as string | null,
  error: null as string | null,
  startAnalysis: vi.fn(),
  loadStoryline: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('@/stores/understanding-store', () => ({
  useUnderstandingStore: <T,>(selector: (s: typeof mockStore) => T) => selector(mockStore),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));

import { open as dialogOpen } from '@tauri-apps/plugin-dialog';

const resetStore = () => {
  mockStore.status = 'idle';
  mockStore.progress = 0;
  mockStore.stage = null;
  mockStore.message = null;
  mockStore.stats = null;
  mockStore.storyline = null;
  mockStore.artifactPath = null;
  mockStore.error = null;
  mockStore.startAnalysis.mockReset();
  mockStore.loadStoryline.mockReset();
  mockStore.reset.mockReset();
};

describe('UnderstandingPage', () => {
  beforeEach(resetStore);

  it('idle：渲染导入步骤，开始分析禁用', () => {
    render(<UnderstandingPage />);
    expect(screen.getByText('内容理解（L0）')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /选择视频/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /开始分析/ })).toBeDisabled();
  });

  it('选择视频后开始分析可用并触发 startAnalysis', async () => {
    vi.mocked(dialogOpen).mockResolvedValue('/tmp/video.mp4');
    render(<UnderstandingPage />);

    fireEvent.click(screen.getByRole('button', { name: /选择视频/ }));
    await screen.findByText('/tmp/video.mp4');

    const startBtn = screen.getByRole('button', { name: /开始分析/ });
    expect(startBtn).not.toBeDisabled();
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(mockStore.startAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({ videoPath: '/tmp/video.mp4' })
      );
    });
  });

  it('running：渲染进度与阶段消息', () => {
    mockStore.status = 'running';
    mockStore.progress = 42;
    mockStore.message = '正在转录字幕...';
    render(<UnderstandingPage />);
    expect(screen.getByText('正在分析视频')).toBeInTheDocument();
    expect(screen.getByText('正在转录字幕...')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('done：渲染统计与加载明细入口', () => {
    mockStore.status = 'done';
    mockStore.stats = {
      scenesCount: 12,
      subtitlesCount: 88,
      highlightsCount: 5,
      durationSecs: 123,
    };
    mockStore.artifactPath = '/app/storyline.json';
    render(<UnderstandingPage />);
    expect(screen.getByText('剧情时间线构建完成')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('/app/storyline.json')).toBeInTheDocument();
    const loadBtn = screen.getByRole('button', { name: /加载明细/ });
    fireEvent.click(loadBtn);
    expect(mockStore.loadStoryline).toHaveBeenCalledWith('/app/storyline.json');
  });

  it('failed：渲染错误与重试按钮', () => {
    mockStore.status = 'failed';
    mockStore.error = '场景切分失败';
    render(<UnderstandingPage />);
    expect(screen.getByText('分析失败')).toBeInTheDocument();
    expect(screen.getByText('场景切分失败')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重试分析/ })).toBeInTheDocument();
  });
});
