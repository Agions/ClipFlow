/**
 * 步骤5: 视频合成 — AI Cinema Studio Redesign
 * 数据输入: video, script, voice
 * 数据输出: synthesis (最终合成视频)
 */
import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import { useCutDeck } from '../AIEditorContext';
import { voiceSynthesisService } from '../../../core/services/voice-synthesis.service';
import { videoEffectService } from '../../../core/services/video-effect.service';
import { audioVideoSyncService } from '../../../core/services/audio-sync.service';
import { orchestrateCommentaryAgents } from '../../../core/services/workflow/commentaryAgents';
import { ALIGNMENT_GATE_THRESHOLD, isAlignmentGatePassed } from '../../../core/workflow/alignmentGate';
import { FEATURE_TO_FUNCTION, FUNCTION_TO_MODE } from './functionModeMap';
import { notify } from '../../../shared';
import styles from './VideoComposing.module.less';

interface VideoSynthesizeProps {
  onNext?: () => void;
}

interface SynthesizeConfig {
  voiceId: string;
  voiceSpeed: number;
  voiceVolume: number;
  enableVoice: boolean;
  enableSubtitle: boolean;
  subtitlePosition: 'bottom' | 'center' | 'top';
  enableEffect: boolean;
  effectStyle: string;
  syncAudioVideo: boolean;
}

const EFFECT_PRESET_MAP: Record<string, string | null> = {
  none: null,
  cinematic: 'smooth-fade',
  vivid: 'vibrant',
  retro: 'vintage',
  cool: 'cool',
  warm: 'warm',
};

// 配音角色
const VOICE_OPTIONS = [
  { value: 'female_zh', label: '女声 (中文)', desc: '温柔甜美', emoji: '🎤' },
  { value: 'male_zh', label: '男声 (中文)', desc: '成熟稳重', emoji: '🎙️' },
  { value: 'neutral', label: '中性声音', desc: '通用场景', emoji: '🔊' },
];

// 特效风格
const EFFECT_STYLES = [
  { value: 'none', label: '无', desc: '保持原样' },
  { value: 'cinematic', label: '电影感', desc: '调色+暗角' },
  { value: 'vivid', label: '鲜艳', desc: '色彩增强' },
  { value: 'retro', label: '复古', desc: '怀旧色调' },
  { value: 'cool', label: '冷色调', desc: '蓝色系' },
  { value: 'warm', label: '暖色调', desc: '橙色系' },
];

// 字幕位置
const SUBTITLE_POSITIONS = [
  { value: 'bottom', label: '底部' },
  { value: 'center', label: '中间' },
  { value: 'top', label: '顶部' },
];

const VideoSynthesize: React.FC<VideoSynthesizeProps> = memo(({ onNext }) => {
  const { state, setVoice, setSynthesis, goToNextStep, dispatch } = useCutDeck();
  const [synthesizing, setSynthesizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'voice' | 'subtitle' | 'effect'>('voice');
  const synthesizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup setTimeout on unmount
  useEffect(() => {
    return () => {
      if (synthesizeTimerRef.current) {
        clearTimeout(synthesizeTimerRef.current);
      }
    };
  }, []);

  const [config, setConfig] = useState<SynthesizeConfig>({
    voiceId: 'female_zh',
    voiceSpeed: 100,
    voiceVolume: 80,
    enableVoice: true,
    enableSubtitle: true,
    subtitlePosition: 'bottom',
    enableEffect: false,
    effectStyle: 'cinematic',
    syncAudioVideo: true,
  });

  const getCurrentScriptContent = (): string => {
    return state.scriptData.narration?.content || state.scriptData.remix?.content || '';
  };

  const alignmentQuality = useMemo(() => {
    if (!state.analysis?.scenes?.length) return null;
    const activeFunction = state.selectedFeature !== 'none'
      ? FEATURE_TO_FUNCTION[state.selectedFeature as 'smartClip' | 'voiceover' | 'subtitle']
      : undefined;
    const script =
      activeFunction === 'remix'
        ? state.scriptData.remix
        : state.scriptData.narration || state.scriptData.remix;
    if (!script?.segments?.length) return null;

    const mode = activeFunction ? FUNCTION_TO_MODE[activeFunction] : 'ai-commentary';
    const orchestration = orchestrateCommentaryAgents({
      mode,
      analysis: state.analysis,
      segments: script.segments,
    });
    const passed = isAlignmentGatePassed(orchestration.alignmentSummary);
    return {
      passed,
      averageConfidence: orchestration.alignmentSummary.averageConfidence,
      maxDriftSeconds: orchestration.alignmentSummary.maxDriftSeconds,
      overlayCount: orchestration.overlayPlan.length,
    };
  }, [state.analysis, state.scriptData.narration, state.scriptData.remix, state.selectedFeature]);

  const handleGenerateVoice = useCallback(async () => {
    const scriptContent = getCurrentScriptContent();
    if (!scriptContent) {
      notify.warning('请先生成文案');
      return;
    }

    setSynthesizing(true);
    setProgress(0);

    try {
      setProgress(30);
      const voiceResult = await voiceSynthesisService.synthesize(scriptContent);

      setProgress(60);
      if (voiceResult.audioUrl) {
        setVoice(voiceResult.audioUrl, {
          voiceId: config.voiceId,
          speed: config.voiceSpeed / 100,
          volume: config.voiceVolume / 100
        });
      }

      setProgress(100);
      notify.success('配音生成功能待实现');
    } catch (error) {
      notify.error(error, '配音生成失败');
    } finally {
      setSynthesizing(false);
    }
  }, [config.voiceId, config.voiceSpeed, config.voiceVolume, setVoice]);

  const handleSynthesize = async () => {
    if (!state.currentVideo) {
      notify.warning('请先上传视频');
      return;
    }

    const scriptContent = getCurrentScriptContent();
    if (!scriptContent && config.enableVoice) {
      notify.warning('请先生成文案');
      return;
    }

    setSynthesizing(true);
    setProgress(0);

    try {
      if (config.enableVoice && !state.voiceData.audioUrl) {
        setProgress(20);
        await handleGenerateVoice();
      }

      if (config.enableSubtitle) {
        setProgress(40);
        // Subtitle generation from audio not yet implemented
      }

      if (config.enableEffect) {
        setProgress(60);
        const presetId = EFFECT_PRESET_MAP[config.effectStyle];
        if (presetId) {
          videoEffectService.applyPreset(presetId);
        } else {
          videoEffectService.reset();
        }
      }

      if (config.syncAudioVideo) {
        setProgress(80);
        await audioVideoSyncService.autoSync(state.currentVideo.path, state.voiceData.audioUrl || undefined);
      }

      setProgress(100);
      setSynthesis(`${state.currentVideo.path}?synthesized=${Date.now()}`, {
        syncAudioVideo: config.syncAudioVideo,
        addSubtitles: config.enableSubtitle,
        addWatermark: false
      });

      notify.success('视频合成完成！');

      synthesizeTimerRef.current = setTimeout(() => {
        if (onNext) onNext();
        else goToNextStep();
      }, 500);

    } catch (error) {
      notify.error(error, '视频合成失败');
    } finally {
      setSynthesizing(false);
    }
  };

  // ==== 前置条件检查 ====
  const hasVideo = !!state.currentVideo;
  const hasScript = !!getCurrentScriptContent();
  const hasVoice = !!state.voiceData.audioUrl;
  const canProceed = hasVideo && (hasScript || !config.enableVoice);

  if (!hasVideo) {
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepTitle}>
          <div className={styles.stepTitleLeft}>
            <h2><span aria-hidden="true">⚙️</span> 视频合成配置</h2>
          </div>
        </div>
        <div className={styles.warningAlert}>
          <span aria-hidden="true">⚠️</span> 请先上传视频
          <button
            className={styles.warningAlertBtn}
            onClick={() => dispatch({ type: 'SET_STEP', payload: 'video-upload' })}
          >
            去上传
          </button>
        </div>
      </div>
    );
  }

  if (!hasScript && config.enableVoice) {
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepTitle}>
          <div className={styles.stepTitleLeft}>
            <h2><span aria-hidden="true">⚙️</span> 视频合成配置</h2>
          </div>
        </div>
        <div className={styles.warningAlert}>
          <span aria-hidden="true">⚠️</span> 请先生成文案
          <button
            className={styles.warningAlertBtn}
            onClick={() => dispatch({ type: 'SET_STEP', payload: 'script-generate' })}
          >
            去生成文案
          </button>
        </div>
      </div>
    );
  }

  // ==== 合成中 ====
  if (synthesizing) {
    const circumference = 2 * Math.PI * 45; // r=45
    const offset = circumference - (progress / 100) * circumference;

    return (
      <div className={styles.stepContent}>
        <div className={styles.synthesizingCard}>
          <div className={styles.synthesizeProgressCircle}>
            <svg className={styles.synthesizeProgressCircleSvg} viewBox="0 0 100 100">
              <circle className={styles.synthesizeProgressCircleTrack} cx="50" cy="50" r="45" />
              <circle
                className={styles.synthesizeProgressCircleFill}
                cx="50"
                cy="50"
                r="45"
                style={{ strokeDashoffset: offset }}
              />
            </svg>
            <div className={styles.synthesizeProgressPercent}>{progress}%</div>
          </div>
          <div className={styles.synthesizeProgressLabel}>
            {progress < 30 ? <><span aria-hidden="true">🎤</span> 生成配音中...</> :
             progress < 60 ? <><span aria-hidden="true">📝</span> 生成字幕中...</> :
             progress < 80 ? <><span aria-hidden="true">✨</span> 应用特效中...</> :
             <><span aria-hidden="true">🔗</span> 音画同步中...</>}
          </div>
          <div className={styles.synthesizeProgressSub}>请耐心等待...</div>
        </div>
      </div>
    );
  }

  // ==== 已合成完成 ====
  if (state.synthesisData?.finalVideoUrl && state.stepStatus['video-synthesize']) {
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepTitle}>
          <div className={styles.stepTitleLeft}>
            <h2><span aria-hidden="true">🎬</span> 视频合成完成</h2>
            <span className={styles.statusBadge}>
              <span className={styles.statusBadgeDot} />
              已合成
            </span>
          </div>
        </div>

        <div className={styles.completeCard}>
          <svg className={styles.completeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h3 className={styles.completeTitle}>视频合成成功！</h3>
          <p className={styles.completeDesc}>您的视频已准备就绪，可以进行导出</p>
          <div className={styles.completeActions}>
            <button className={`${styles.completeBtn} ${styles.completeBtnSecondary}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
              预览效果
            </button>
            <button
              className={`${styles.completeBtn} ${styles.completeBtnPrimary}`}
              onClick={goToNextStep}
            >
              下一步：导出视频
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==== 配置界面 ====
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepTitle}>
        <div className={styles.stepTitleLeft}>
          <h2><span aria-hidden="true">⚙️</span> 视频合成配置</h2>
        </div>
      </div>

      {alignmentQuality && (
        <div className={`${styles.alignmentAlert} ${alignmentQuality.passed ? styles.alertSuccess : styles.alertWarning}`}>
          <svg className={styles.alertIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {alignmentQuality.passed
              ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
              : <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>}
          </svg>
          <div>
            <div className={styles.alertTitle}>
              {alignmentQuality.passed ? '✓ 音画对齐质量通过' : '⚠ 音画对齐建议优化'}
            </div>
            <div>
              平均置信度 {alignmentQuality.averageConfidence.toFixed(2)}（阈值 {ALIGNMENT_GATE_THRESHOLD.minConfidence}），
              最大漂移 {alignmentQuality.maxDriftSeconds.toFixed(2)}s（阈值 {ALIGNMENT_GATE_THRESHOLD.maxDriftSeconds}s），
              原画覆盖建议 {alignmentQuality.overlayCount} 段。
            </div>
          </div>
        </div>
      )}

      {/* 预览播放器 */}
      <div className={styles.previewSection}>
        <div className={styles.previewPlayer}>
          {state.currentVideo ? (
            <>
              <video
                className={styles.previewVideo}
                src={state.currentVideo.path}
                muted
                aria-label="视频预览"
              />
              <div className={styles.previewOverlay}>
                <button className={styles.playBtn} aria-label="播放预览">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div className={styles.previewPlaceholder}>
              <svg className={styles.previewPlaceholderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              <span className={styles.previewPlaceholderText}>视频预览</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab 切换 */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'voice' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('voice')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          配音设置
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'subtitle' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('subtitle')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="15" width="20" height="4" rx="1" />
            <path d="M6 11h4M14 11h4M6 7h12" />
          </svg>
          字幕设置
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'effect' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('effect')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          特效设置
        </button>
      </div>

      <div className={styles.panelCard}>
        {/* 配音设置 */}
        {activeTab === 'voice' && (
          <div className={styles.panelBody}>
            <div className={styles.switchRow}>
              <div>
                <div className={styles.switchLabel}>启用配音</div>
                <div className={styles.switchSub}>为视频添加 AI 配音</div>
              </div>
              <button
                className={`${styles.toggle} ${config.enableVoice ? styles.toggleOn : ''}`}
                onClick={() => setConfig({ ...config, enableVoice: !config.enableVoice })}
                role="switch"
                aria-checked={config.enableVoice}
              />
            </div>

            {config.enableVoice && (
              <>
                {/* 音色选择 */}
                <div className={styles.voiceGrid}>
                  {VOICE_OPTIONS.map(voice => (
                    <div
                      key={voice.value}
                      className={`${styles.voiceItem} ${config.voiceId === voice.value ? styles.voiceActive : ''}`}
                      onClick={() => setConfig({ ...config, voiceId: voice.value })}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setConfig({ ...config, voiceId: voice.value })}
                    >
                      <div className={styles.voiceCheck}>
                        <div className={styles.voiceCheckDot} />
                      </div>
                      <div className={styles.voiceName}>
                        <span className={styles.voiceEmoji}>{voice.emoji}</span>
                        {voice.label}
                      </div>
                      <div className={styles.voiceDesc}>{voice.desc}</div>
                    </div>
                  ))}
                </div>

                {/* 语速滑块 */}
                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <span className={styles.sliderLabel}>语速</span>
                    <span className={styles.sliderValue}>{config.voiceSpeed}%</span>
                  </div>
                  <div className={styles.sliderTrack}>
                    <div
                      className={styles.sliderFill}
                      style={{ width: `${((config.voiceSpeed - 50) / 100) * 100}%` }}
                    />
                    <div className={styles.sliderThumb} style={{ left: `${((config.voiceSpeed - 50) / 100) * 100}%` }} />
                    <input
                      type="range"
                      className={styles.sliderInput}
                      min={50}
                      max={150}
                      value={config.voiceSpeed}
                      onChange={(e) => setConfig({ ...config, voiceSpeed: Number(e.target.value) })}
                      aria-label="语速"
                    />
                  </div>
                </div>

                {/* 音量滑块 */}
                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <span className={styles.sliderLabel}>音量</span>
                    <span className={styles.sliderValue}>{config.voiceVolume}%</span>
                  </div>
                  <div className={styles.sliderTrack}>
                    <div
                      className={styles.sliderFill}
                      style={{ width: `${config.voiceVolume}%` }}
                    />
                    <div className={styles.sliderThumb} style={{ left: `${config.voiceVolume}%` }} />
                    <input
                      type="range"
                      className={styles.sliderInput}
                      min={0}
                      max={100}
                      value={config.voiceVolume}
                      onChange={(e) => setConfig({ ...config, voiceVolume: Number(e.target.value) })}
                      aria-label="音量"
                    />
                  </div>
                </div>

                {/* 生成配音按钮 */}
                <div className={styles.statusRow}>
                  {hasVoice ? (
                    <>
                      <span className={`${styles.statusDot} ${styles.dotGreen}`} />
                      <span>配音已就绪</span>
                    </>
                  ) : (
                    <>
                      <span className={`${styles.statusDot} ${styles.dotRed}`} />
                      <span>请先生成配音</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* 字幕设置 */}
        {activeTab === 'subtitle' && (
          <div className={styles.panelBody}>
            <div className={styles.switchRow}>
              <div>
                <div className={styles.switchLabel}>启用字幕</div>
                <div className={styles.switchSub}>自动生成同步字幕</div>
              </div>
              <button
                className={`${styles.toggle} ${config.enableSubtitle ? styles.toggleOn : ''}`}
                onClick={() => setConfig({ ...config, enableSubtitle: !config.enableSubtitle })}
                role="switch"
                aria-checked={config.enableSubtitle}
              />
            </div>

            {config.enableSubtitle && (
              <>
                <div className={styles.sliderLabel} style={{ marginBottom: '10px', display: 'block' }}>字幕位置</div>
                <div className={styles.positionGroup}>
                  {SUBTITLE_POSITIONS.map(pos => (
                    <button
                      key={pos.value}
                      className={`${styles.positionBtn} ${config.subtitlePosition === pos.value ? styles.positionActive : ''}`}
                      onClick={() => setConfig({ ...config, subtitlePosition: pos.value as 'bottom' | 'center' | 'top' })}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 特效设置 */}
        {activeTab === 'effect' && (
          <div className={styles.panelBody}>
            <div className={styles.switchRow}>
              <div>
                <div className={styles.switchLabel}>启用视频特效</div>
                <div className={styles.switchSub}>为视频添加视觉特效</div>
              </div>
              <button
                className={`${styles.toggle} ${config.enableEffect ? styles.toggleOn : ''}`}
                onClick={() => setConfig({ ...config, enableEffect: !config.enableEffect })}
                role="switch"
                aria-checked={config.enableEffect}
              />
            </div>

            {config.enableEffect && (
              <>
                <div className={styles.sliderLabel} style={{ marginBottom: '10px', display: 'block' }}>特效风格</div>
                <div className={styles.effectGrid}>
                  {EFFECT_STYLES.map(style => (
                    <div
                      key={style.value}
                      className={`${styles.effectItem} ${config.effectStyle === style.value ? styles.effectActive : ''}`}
                      onClick={() => setConfig({ ...config, effectStyle: style.value })}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setConfig({ ...config, effectStyle: style.value })}
                    >
                      <div className={styles.effectName}>{style.label}</div>
                      <div className={styles.effectDesc}>{style.desc}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 合成按钮 */}
      <div className={styles.synthesizeSection}>
        <div className={styles.statusRow}>
          {hasVoice ? (
            <>
              <span className={`${styles.statusDot} ${styles.dotGreen}`} />
              <span>✅ 配音已就绪</span>
            </>
          ) : (
            <>
              <span className={`${styles.statusDot} ${styles.dotRed}`} />
              <span>❌ 请先生成配音</span>
            </>
          )}
        </div>
        <button
          className={`${styles.synthesizeBtn} ${canProceed ? styles.synthesizeBtnReady : ''}`}
          onClick={handleSynthesize}
          disabled={!canProceed}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          开始合成视频
        </button>
      </div>
    </div>
  );
});

VideoSynthesize.displayName = 'VideoSynthesize';
export default VideoSynthesize;

