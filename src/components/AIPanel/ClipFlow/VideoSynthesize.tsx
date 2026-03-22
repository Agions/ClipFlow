import { logger } from '@/utils/logger';
/**
 * 步骤5: 视频合成 - 优化版
 * 
 * 数据输入: video, script, voice
 * 数据输出: synthesis (最终合成视频)
 */
import React, { useState, useCallback, useMemo } from 'react';
import { 
  Card, Button, Space, Typography, Tag,
  Switch, Slider, Alert, Progress, Tabs, Row, Col, Badge, Radio
} from 'antd';
import {
  PlayCircleOutlined,
  SoundOutlined,
  VideoCameraOutlined,
  SyncOutlined,
  FontSizeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useClipFlow } from '../AIEditorContext';
import { voiceSynthesisService } from '@/core/services/voice-synthesis.service';
import { videoEffectService } from '@/core/services/video-effect.service';
import { audioVideoSyncService } from '@/core/services/audio-sync.service';
import { subtitleService } from '@/core/services/subtitle.service';
import { orchestrateCommentaryAgents } from '@/core/services/workflow/agents';
import { ALIGNMENT_GATE_THRESHOLD, isAlignmentGatePassed } from '@/core/workflow/alignmentGate';
import { FEATURE_TO_FUNCTION, FUNCTION_TO_MODE } from './functionModeMap';
import { notify } from '@/shared';
import styles from './ClipFlow.module.less';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// 配音角色
const VOICE_OPTIONS = [
  { value: 'female_zh', label: '🎤 女声 (中文)', desc: '温柔甜美', style: 'warm' },
  { value: 'male_zh', label: '🎤 男声 (中文)', desc: '成熟稳重', style: 'deep' },
  { value: 'neutral', label: '🎤 中性声音', desc: '通用场景', style: 'neutral' },
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

const VideoSynthesize: React.FC<VideoSynthesizeProps> = ({ onNext }) => {
  const { state, setVoice, setSynthesis, goToNextStep, dispatch } = useClipFlow();
  const [synthesizing, setSynthesizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('voice');
  
  // 合成配置
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

  // 生成配音
  const handleGenerateVoice = useCallback(async () => {
    const scriptContent = getCurrentScriptContent();
    if (!scriptContent) {
      notify.warning('请先生成文案');
      return;
    }

    setSynthesizing(true);
    setProgress(0);

    try {
      // TODO: 实际配音生成
      setProgress(30);
      const voiceResult = await voiceSynthesisService.synthesize(scriptContent);
      
      setProgress(60);
      // TODO: voiceResult.audioUrl 应为实际的配音 URL
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
      logger.error('配音生成失败:', { error });
      notify.error(error, '配音生成失败');
    } finally {
      setSynthesizing(false);
    }
  }, [config.voiceId, config.voiceSpeed, config.voiceVolume, setVoice]);

  // 开始合成
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
      // 1. 生成配音
      if (config.enableVoice && !state.voiceData.audioUrl) {
        setProgress(20);
        await handleGenerateVoice();
      }

      // 2. 生成字幕
      if (config.enableSubtitle) {
        setProgress(40);
        await subtitleService.generateFromAudio(state.voiceData.audioUrl || state.currentVideo.path);
      }

      // 3. 应用特效
      if (config.enableEffect) {
        setProgress(60);
        const presetId = EFFECT_PRESET_MAP[config.effectStyle];
        if (presetId) {
          videoEffectService.applyPreset(presetId);
        } else {
          videoEffectService.reset();
        }
      }

      // 4. 音画同步
      if (config.syncAudioVideo) {
        setProgress(80);
        await audioVideoSyncService.autoSync(state.currentVideo.path, state.voiceData.audioUrl || undefined);
      }

      // 5. 完成
      setProgress(100);
      setSynthesis(`${state.currentVideo.path}?synthesized=${Date.now()}`, {
        syncAudioVideo: config.syncAudioVideo,
        addSubtitles: config.enableSubtitle,
        addWatermark: false
      });

      notify.success('视频合成完成！');

      setTimeout(() => {
        if (onNext) onNext();
        else goToNextStep();
      }, 500);

    } catch (error) {
      logger.error('合成失败:', { error });
      notify.error(error, '视频合成失败');
    } finally {
      setSynthesizing(false);
    }
  };

  // 检查前置条件
  const hasVideo = !!state.currentVideo;
  const hasScript = !!getCurrentScriptContent();
  const hasVoice = !!state.voiceData.audioUrl;
  const canProceed = hasVideo && (hasScript || !config.enableVoice);

  if (!hasVideo) {
    return (
      <Alert
        message="请先上传视频"
        description="请先完成视频上传"
        type="warning"
        showIcon
        action={
          <Button type="primary" onClick={() => dispatch({ type: 'SET_STEP', payload: 'video-upload' })}>
            去上传
          </Button>
        }
      />
    );
  }

  if (!hasScript && config.enableVoice) {
    return (
      <Alert
        message="请先生成文案"
        description="请先完成文案生成步骤"
        type="warning"
        showIcon
        action={
          <Button type="primary" onClick={() => dispatch({ type: 'SET_STEP', payload: 'script-generate' })}>
            去生成文案
          </Button>
        }
      />
    );
  }

  // 已合成
  if (state.synthesisData?.finalVideoUrl && state.stepStatus['video-synthesize']) {
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepTitle}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>🎬 视频合成完成</Title>
            <Badge status="success" text="已合成" />
          </Space>
        </div>

        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <Title level={3}>视频合成成功！</Title>
            <Paragraph>您的视频已准备就绪，可以进行导出</Paragraph>
            <Space>
              <Button icon={<PlayCircleOutlined />}>预览效果</Button>
              <Button type="primary" icon={<VideoCameraOutlined />} onClick={goToNextStep}>
                下一步：导出视频
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    );
  }

  // 合成中
  if (synthesizing) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Progress 
            type="circle" 
            percent={progress} 
            status="active"
            strokeColor={{ '0%': '#108ee9', '100%': '#52c41a' }}
          />
          <div style={{ marginTop: 24 }}>
            <Title level={4}>
              {progress < 30 ? '🎤 生成配音中...' : 
               progress < 60 ? '📝 生成字幕中...' : 
               progress < 80 ? '✨ 应用特效中...' : 
               '🔗 音画同步中...'}
            </Title>
          </div>
        </div>
      </Card>
    );
  }

  // 配置界面
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepTitle}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>⚙️ 视频合成配置</Title>
        </Space>
      </div>

      {alignmentQuality && (
        <Alert
          type={alignmentQuality.passed ? 'success' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
          message={alignmentQuality.passed ? '音画对齐质量通过' : '音画对齐建议优化'}
          description={`平均置信度 ${alignmentQuality.averageConfidence.toFixed(2)}（阈值 ${ALIGNMENT_GATE_THRESHOLD.minConfidence}），最大漂移 ${alignmentQuality.maxDriftSeconds.toFixed(2)}s（阈值 ${ALIGNMENT_GATE_THRESHOLD.maxDriftSeconds}s），原画覆盖建议 ${alignmentQuality.overlayCount} 段。`}
        />
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 配音设置 */}
        <TabPane tab={<><SoundOutlined /> 配音设置</>} key="voice">
          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Switch 
                  checked={config.enableVoice} 
                  onChange={(v) => setConfig({ ...config, enableVoice: v })}
                />
                <Text style={{ marginLeft: 8 }}>启用配音</Text>
              </div>

              {config.enableVoice && (
                <>
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>选择音色</Text>
                    <Radio.Group 
                      value={config.voiceId} 
                      onChange={(e) => setConfig({ ...config, voiceId: e.target.value })}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {VOICE_OPTIONS.map(voice => (
                          <Radio key={voice.value} value={voice.value} style={{ width: '100%', marginRight: 0, padding: '8px 12px', border: config.voiceId === voice.value ? '1px solid #1890ff' : '1px solid #d9d9d9', borderRadius: 8 }}>
                            <Space>
                              <Text>{voice.label}</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>({voice.desc})</Text>
                            </Space>
                          </Radio>
                        ))}
                      </Space>
                    </Radio.Group>
                  </div>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>语速: {config.voiceSpeed}%</Text>
                      <Slider 
                        min={50} 
                        max={150} 
                        value={config.voiceSpeed}
                        onChange={(value) => setConfig({ ...config, voiceSpeed: Array.isArray(value) ? value[0] : value })}
                      />
                    </Col>
                    <Col span={12}>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>音量: {config.voiceVolume}%</Text>
                      <Slider 
                        min={0} 
                        max={100} 
                        value={config.voiceVolume}
                        onChange={(value) => setConfig({ ...config, voiceVolume: Array.isArray(value) ? value[0] : value })}
                      />
                    </Col>
                  </Row>

                  <Space>
                    <Button 
                      icon={<SoundOutlined />} 
                      onClick={handleGenerateVoice}
                      loading={synthesizing}
                    >
                      {hasVoice ? '重新生成配音' : '生成配音'}
                    </Button>
                    {hasVoice && <Badge status="success" text="已生成" />}
                  </Space>
                </>
              )}
            </Space>
          </Card>
        </TabPane>

        {/* 字幕设置 */}
        <TabPane tab={<><FontSizeOutlined /> 字幕设置</>} key="subtitle">
          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Switch 
                  checked={config.enableSubtitle} 
                  onChange={(v) => setConfig({ ...config, enableSubtitle: v })}
                />
                <Text style={{ marginLeft: 8 }}>启用字幕</Text>
              </div>

              {config.enableSubtitle && (
                <>
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>字幕位置</Text>
                    <Radio.Group 
                      value={config.subtitlePosition}
                      onChange={(e) => setConfig({ ...config, subtitlePosition: e.target.value })}
                    >
                      {SUBTITLE_POSITIONS.map(pos => (
                        <Radio.Button key={pos.value} value={pos.value}>{pos.label}</Radio.Button>
                      ))}
                    </Radio.Group>
                  </div>
                </>
              )}
            </Space>
          </Card>
        </TabPane>

        {/* 特效设置 */}
        <TabPane tab={<><ThunderboltOutlined /> 特效设置</>} key="effect">
          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Switch 
                  checked={config.enableEffect} 
                  onChange={(v) => setConfig({ ...config, enableEffect: v })}
                />
                <Text style={{ marginLeft: 8 }}>启用视频特效</Text>
              </div>

              {config.enableEffect && (
                <>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>特效风格</Text>
                  <Row gutter={[8, 8]}>
                    {EFFECT_STYLES.map(style => (
                      <Col span={8} key={style.value}>
                        <div 
                          onClick={() => setConfig({ ...config, effectStyle: style.value })}
                          style={{ 
                            padding: 12, 
                            textAlign: 'center',
                            border: `2px solid ${config.effectStyle === style.value ? '#1890ff' : '#e8e8e8'}`,
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: config.effectStyle === style.value ? '#e6f7ff' : '#fff',
                          }}
                        >
                          <Text strong>{style.label}</Text>
                          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                            {style.desc}
                          </Text>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </>
              )}
            </Space>
          </Card>
        </TabPane>
      </Tabs>

      {/* 合成按钮 */}
      <Card style={{ marginTop: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical">
            <div>
              <Text type="secondary">
                {hasVoice ? '✅ 配音已就绪' : '❌ 请先生成配音'}
              </Text>
            </div>
            <Button 
              type="primary" 
              size="large"
              icon={<SyncOutlined />}
              onClick={handleSynthesize}
              disabled={!canProceed}
              style={{ 
                background: canProceed ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined,
                border: 'none'
              }}
            >
              开始合成视频
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default VideoSynthesize;
