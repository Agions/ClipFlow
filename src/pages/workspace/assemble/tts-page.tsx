/**
 * TTS 配音页 — 实验性占位组件（PR-4.1b）
 *
 * 🎯 目标：UX 重定位 — 从"标准剪辑软件"转向"AI 一键配音"
 * 🚧 状态：仅占位实现（不依赖 video-composing 子组件，保持零耦合）
 * 🔁 回滚：关闭 feature flag `experimental.tts-page` → 自动回落 video-composing
 *
 * 设计原则：
 * - 不引入任何新依赖（保持最小可逆）
 * - 不修改 store 数据流
 * - 仅当 `useFeatureFlag('experimental.tts-page') === true` 时才挂载
 *
 * 后续 PR-4.1c 计划：
 * - 重构 `useVideoSynthesize` 把 voice/subtitle 配置提取为共享 hook
 * - 把 VoiceSettingsPanel 作为 presentational component 复用
 *
 * @see docs/PR41_PLAN.md PR-4.1b
 * @see docs/FFEASIBILITY_REPORT.md Finding 2
 */
import React, { memo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircleIcon, FilmIcon } from '@/components/icons';
import { Mic } from 'lucide-react';

export interface TtsPageProps {
  /** 跳转到下一步（占位，预留） */
  onNext?: () => void;
}

/**
 * TTS 配音页占位组件
 *
 * 当前实现（PR-4.1b 阶段）：
 * - 顶部 Alert：明确告知用户这是实验性 UX
 * - 后续 PR-4.1c 再接入真实的 VoiceSettingsPanel
 */
const TtsPage: React.FC<TtsPageProps> = memo(({ onNext }) => {
  return (
    <div data-testid="tts-page" style={{ padding: 24 }}>
      <Alert>
        <AlertCircleIcon />
        <AlertDescription>
          <strong>TTS 配音页（实验性）</strong>
          <br />
          本页面由 feature flag <code>experimental.tts-page</code> 启用。 关闭后自动回落至{' '}
          <code>video-composing</code>。
          <br />
          <strong>UX 定位：</strong>
          "AI 一键配音"，而非"标准剪辑软件"。详见{' '}
          <a href="docs/FFEASIBILITY_REPORT.md" target="_blank" rel="noreferrer">
            FFEASIBILITY_REPORT.md Finding 2
          </a>
          。
        </AlertDescription>
      </Alert>

      <div
        style={{
          marginTop: 24,
          padding: 24,
          border: '1px dashed rgba(255,255,255,0.2)',
          borderRadius: 8,
          textAlign: 'center',
        }}
        data-testid="tts-page-placeholder"
      >
        <FilmIcon size={48} />
        <h3 style={{ marginTop: 16 }}>TTS 配音占位</h3>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>
          PR-4.1c 将接入真实的音色选择 / 试听 / 风格预设
        </p>

        {onNext && (
          <Button type="button" onClick={onNext} style={{ marginTop: 16 }}>
            <Mic /> 下一步（占位）
          </Button>
        )}
      </div>
    </div>
  );
});

TtsPage.displayName = 'TtsPage';

export default TtsPage;
