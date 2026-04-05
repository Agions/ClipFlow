/**
 * SubtitleEditor — 字幕编辑器组件
 *
 * 功能：
 * - 波形图可视化（Canvas）
 * - 时间戳字幕列表，支持点击跳帧
 * - 在线编辑字幕文本
 * - 导入/导出 SRT / VTT / ASS 格式
 * - Whisper AI 转录集成
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import {
  Card,
  Button,
  Space,
  Select,
  Progress,
  List,
  Input,
  Slider,
  Typography,
  Tooltip,
  Modal,
  message,
  Empty,
  Tag,
  Divider,
  Dropdown,
} from 'antd';
import {
  AudioOutlined,
  EditOutlined,
  SaveOutlined,
  DownloadOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  CloudDownloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { motion } from '@/components/common/motion-shim';
import { whisperService } from '@/core/services/subtitle.service';
import type {
  WhisperModelInfo,
  WhisperProgress,
  WhisperResult,
} from '@/core/services/subtitle.service';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ============================================
// 类型定义
// ============================================

export interface EditorSegment {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
}

export interface SubtitleEditorProps {
  /** 视频/音频文件路径 */
  mediaPath?: string;
  /** 媒体时长（秒） */
  duration?: number;
  /** 初始字幕片段 */
  initialSegments?: EditorSegment[];
  /** 点击某时间点时的回调（用于跳帧） */
  onSeek?: (timeSeconds: number) => void;
  /** 当前播放时间（秒） */
  currentTime?: number;
  /** 是否正在播放 */
  isPlaying?: boolean;
  /** 字幕轨道 ID */
  trackId?: string;
  /** 字幕语言 */
  language?: string;
  /** 字幕变化时的回调 */
  onChange?: (segments: EditorSegment[]) => void;
  /** 项目 ID（用于导出文件名） */
  projectId?: string;
}

const MODEL_SIZES = [
  { value: 'tiny', label: 'Tiny (39M) — 最快', recommended: false },
  { value: 'base', label: 'Base (74M) — 推荐', recommended: true },
  { value: 'small', label: 'Small (244M)', recommended: false },
  { value: 'medium', label: 'Medium (769M)', recommended: false },
  { value: 'large-v2', label: 'Large v2 (1550M)', recommended: false },
  { value: 'large-v3', label: 'Large v3 (1550M)', recommended: false },
  { value: 'distil-large-v2', label: 'Distil Large v2 (820M)', recommended: false },
];

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: '自动检测' },
  { value: 'zh', label: '中文' },
  { value: 'en', label: '英语' },
  { value: 'ja', label: '日语' },
  { value: 'ko', label: '韩语' },
  { value: 'fr', label: '法语' },
  { value: 'de', label: '德语' },
  { value: 'es', label: '西班牙语' },
  { value: 'pt', label: '葡萄牙语' },
  { value: 'ru', label: '俄语' },
];

// ============================================
// 工具函数
// ============================================

function msToSRTTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const msRem = ms % 1000;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${msRem.toString().padStart(3, '0')}`;
}

function msToDisplay(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function srtTimeToMs(time: string): number {
  const match = time.match(
    /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
  );
  if (!match) return 0;
  const [, h, m, s, ms] = match;
  return (
    parseInt(h) * 3600000 +
    parseInt(m) * 60000 +
    parseInt(s) * 1000 +
    parseInt(ms)
  );
}

function parseSRT(content: string): EditorSegment[] {
  const blocks = content.trim().split(/\n\n+/);
  const segments: EditorSegment[] = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;
    const timeLine = lines[1];
    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if (!timeMatch) continue;
    const startMs = srtTimeToMs(timeMatch[1]);
    const endMs = srtTimeToMs(timeMatch[2]);
    const text = lines.slice(2).join('\n').replace(/<[^>]+>/g, '');

    segments.push({
      id: crypto.randomUUID(),
      startMs,
      endMs,
      text,
    });
  }
  return segments;
}

function generateSRT(segments: EditorSegment[]): string {
  return segments
    .map((seg, i) => {
      return `${i + 1}\n${msToSRTTime(seg.startMs)} --> ${msToSRTTime(seg.endMs)}\n${seg.text}`;
    })
    .join('\n\n');
}

function generateVTT(segments: EditorSegment[]): string {
  const header = 'WEBVTT\n\n';
  const body = segments
    .map((seg) => {
      const start = msToSRTTime(seg.startMs).replace(',', '.');
      const end = msToSRTTime(seg.endMs).replace(',', '.');
      return `${start} --> ${end}\n${seg.text}`;
    })
    .join('\n\n');
  return header + body;
}

function generateASS(segments: EditorSegment[]): string {
  const header = `[Script Info]
Title: Generated by CutDeck
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const body = segments
    .map((seg) => {
      const start = msToSRTTime(seg.startMs).replace(',', '.');
      const end = msToSRTTime(seg.endMs).replace(',', '.');
      const text = seg.text.replace(/\n/g, '\\N');
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    })
    .join('\n');
  return header + body;
}

// ============================================
// WaveformCanvas 组件
// ============================================

interface WaveformCanvasProps {
  duration: number;
  segments: EditorSegment[];
  currentTime: number;
  onSeek: (timeSeconds: number) => void;
}

const WaveformCanvas: React.FC<WaveformCanvasProps> = React.memo(
  ({ duration, segments, currentTime, onSeek }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = 80;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, width, height);

      if (duration <= 0) return;

      const pixelsPerSecond = width / duration;

      // Draw waveform bars (simulated)
      const barWidth = 2;
      const barGap = 1;
      const numBars = Math.floor(width / (barWidth + barGap));

      for (let i = 0; i < numBars; i++) {
        const t = (i / numBars) * duration;
        // Pseudo-random amplitude based on position
        const amp = 0.2 + 0.6 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.3));
        const barHeight = amp * (height * 0.8);
        const x = i * (barWidth + barGap);
        const y = (height - barHeight) / 2;

        // Highlight active segment
        const activeSeg = segments.find(
          (s) => t * 1000 >= s.startMs && t * 1000 <= s.endMs
        );
        ctx.fillStyle = activeSeg ? '#7c3aed' : '#4a4a6a';
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      // Draw subtitle region overlays
      ctx.globalAlpha = 0.15;
      for (const seg of segments) {
        const x1 = (seg.startMs / 1000) * pixelsPerSecond;
        const x2 = (seg.endMs / 1000) * pixelsPerSecond;
        ctx.fillStyle = '#7c3aed';
        ctx.fillRect(x1, 0, x2 - x1, height);
      }
      ctx.globalAlpha = 1.0;

      // Playhead
      const playheadX = currentTime * pixelsPerSecond;
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(playheadX - 1, 0, 2, height);

      // Time labels
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px monospace';
      const step = duration > 300 ? 60 : duration > 60 ? 10 : 5;
      for (let t = 0; t <= duration; t += step) {
        const x = t * pixelsPerSecond;
        ctx.fillText(msToDisplay(t * 1000), x + 2, height - 4);
      }
    }, [duration, segments, currentTime]);

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!containerRef.current || duration <= 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const t = (x / rect.width) * duration;
        onSeek(Math.max(0, Math.min(t, duration)));
      },
      [duration, onSeek]
    );

    return (
      <div
        ref={containerRef}
        style={{ width: '100%', cursor: 'crosshair', borderRadius: 8, overflow: 'hidden' }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          style={{ display: 'block', width: '100%', height: 80 }}
        />
      </div>
    );
  }
);

// ============================================
// 主组件
// ============================================

const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  mediaPath,
  duration: propDuration,
  initialSegments = [],
  onSeek,
  currentTime = 0,
  isPlaying = false,
  trackId,
  language = 'auto',
  onChange,
  projectId = 'subtitle',
}) => {
  const [segments, setSegments] = useState<EditorSegment[]>(initialSegments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [exportFormat, setExportFormat] = useState<'srt' | 'vtt' | 'ass'>('srt');

  // Whisper state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [fasterWhisperAvailable, setFasterWhisperAvailable] = useState<boolean | null>(null);
  const [selectedModel, setSelectedModel] = useState('base');
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [whisperResult, setWhisperResult] = useState<WhisperResult | null>(null);

  const duration = propDuration ?? (whisperResult?.duration_ms ?? 0) / 1000;

  // Check faster-whisper availability on mount
  useEffect(() => {
    whisperService.checkFasterWhisper().then(setFasterWhisperAvailable);
  }, []);

  // Sync external initial segments
  useEffect(() => {
    if (initialSegments.length > 0) {
      setSegments(initialSegments);
    }
  }, [initialSegments]);

  // Emit changes
  useEffect(() => {
    onChange?.(segments);
  }, [segments, onChange]);

  // ============================================
  // Handlers
  // ============================================

  const handleSeek = useCallback(
    (timeSeconds: number) => {
      onSeek?.(timeSeconds);
    },
    [onSeek]
  );

  const handleSaveEdit = useCallback(
    (id: string) => {
      setSegments((prev) =>
        prev.map((s) => (s.id === id ? { ...s, text: editingText } : s))
      );
      setEditingId(null);
      message.success('字幕已保存');
    },
    [editingText]
  );

  const handleDeleteSegment = useCallback((id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
    message.info('字幕片段已删除');
  }, []);

  const handleAddSegment = useCallback(() => {
    const insertMs = currentTime * 1000;
    const newSeg: EditorSegment = {
      id: crypto.randomUUID(),
      startMs: insertMs,
      endMs: insertMs + 3000,
      text: '新字幕文本',
    };

    setSegments((prev) => {
      const next = [...prev, newSeg].sort((a, b) => a.startMs - b.startMs);
      return next;
    });
    setEditingId(newSeg.id);
    setEditingText(newSeg.text);
  }, [currentTime]);

  const handleWhisperTranscribe = useCallback(async () => {
    if (!mediaPath) {
      message.error('未提供媒体文件路径');
      return;
    }

    if (fasterWhisperAvailable === false) {
      Modal.confirm({
        title: 'faster-whisper 未安装',
        content: (
          <div>
            <p>请先安装 faster-whisper Python 包：</p>
            <code style={{ display: 'block', padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
              pip install faster-whisper
            </code>
            <p style={{ marginTop: 8 }}>推荐搭配 NVIDIA GPU 以获得最佳性能：</p>
            <code style={{ display: 'block', padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
              pip install faster-whisper[gpu] || pip install torch && pip install faster-whisper
            </code>
          </div>
        ),
        okText: '知道了',
      });
      return;
    }

    setIsTranscribing(true);
    setProgress(0);
    setProgressStage('');
    setWhisperResult(null);

    try {
      const result = await whisperService.transcribe(
        mediaPath,
        selectedModel,
        selectedLanguage,
        (prog: WhisperProgress) => {
          setProgress(prog.progress * 100);
          setProgressStage(prog.stage);
        }
      );

      setWhisperResult(result);

      const newSegments: EditorSegment[] = result.segments.map((seg, i) => ({
        id: `whisper-${Date.now()}-${i}`,
        startMs: seg.start_ms,
        endMs: seg.end_ms,
        text: seg.text,
      }));

      setSegments(newSegments);
      message.success(
        `Whisper 转录完成！检测语言: ${result.language} (${(
          result.language_probability * 100
        ).toFixed(1)}%), ${result.segments.length} 条字幕`
      );
    } catch (error: any) {
      message.error(`Whisper 转录失败: ${error?.message ?? error}`);
    } finally {
      setIsTranscribing(false);
    }
  }, [mediaPath, fasterWhisperAvailable, selectedModel, selectedLanguage]);

  const handleImportSRT = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.srt,.vtt,.ass,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const parsed = parseSRT(text);
      if (parsed.length === 0) {
        message.warning('未能解析任何字幕条目');
        return;
      }
      setSegments(parsed);
      message.success(`成功导入 ${parsed.length} 条字幕`);
    };
    input.click();
  }, []);

  const handleExport = useCallback(() => {
    if (segments.length === 0) {
      message.warning('没有字幕可导出');
      return;
    }

    let content = '';
    let filename = '';
    switch (exportFormat) {
      case 'srt':
        content = generateSRT(segments);
        filename = `${projectId}.srt`;
        break;
      case 'vtt':
        content = generateVTT(segments);
        filename = `${projectId}.vtt`;
        break;
      case 'ass':
        content = generateASS(segments);
        filename = `${projectId}.ass`;
        break;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success(`已导出为 ${exportFormat.toUpperCase()} 格式`);
  }, [segments, exportFormat, projectId]);

  // ============================================
  // Render
  // ============================================

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      role="region"
      aria-label="字幕编辑器"
    >
      {/* 波形图 + 控制栏 */}
      {duration > 0 && (
        <Card
          bordered={false}
          style={{ borderRadius: 10, background: '#1a1a2e' }}
          bodyStyle={{ padding: '12px 16px' }}
        >
          <WaveformCanvas
            duration={duration}
            segments={segments}
            currentTime={currentTime}
            onSeek={handleSeek}
          />
        </Card>
      )}

      {/* Whisper 转录控制栏 */}
      <Card
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#7c3aed' }} />
            <span>Whisper AI 字幕转录</span>
            {fasterWhisperAvailable === true && (
              <Tag color="green" icon={<CheckCircleOutlined />}>
                faster-whisper 就绪
              </Tag>
            )}
            {fasterWhisperAvailable === false && (
              <Tag color="orange" icon={<WarningOutlined />}>
                未检测到 faster-whisper
              </Tag>
            )}
            {fasterWhisperAvailable === null && (
              <Tag>检测中...</Tag>
            )}
          </Space>
        }
        bordered={false}
        style={{ borderRadius: 10 }}
        extra={
          <Space>
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              style={{ width: 180 }}
              size="small"
            >
              {MODEL_SIZES.map((m) => (
                <Option key={m.value} value={m.value}>
                  {m.label}
                </Option>
              ))}
            </Select>
            <Select
              value={selectedLanguage}
              onChange={setSelectedLanguage}
              style={{ width: 120 }}
              size="small"
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <Option key={l.value} value={l.value}>
                  {l.label}
                </Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<CloudDownloadOutlined />}
              onClick={handleWhisperTranscribe}
              loading={isTranscribing}
              disabled={!mediaPath || fasterWhisperAvailable === null}
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none',
              }}
            >
              {isTranscribing ? '转录中...' : '开始转录'}
            </Button>
          </Space>
        }
      >
        {isTranscribing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Text type="secondary">{progressStage}</Text>
              <Progress
                percent={Math.round(progress)}
                strokeColor={{ from: '#667eea', to: '#764ba2' }}
                status="active"
              />
            </Space>
          </motion.div>
        )}

        {!isTranscribing && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {mediaPath
              ? `输入: ${mediaPath.split('/').pop()}`
              : '未加载媒体文件 — 请先在时间线中选择视频'}
            {' · '}
            推荐使用 Base 模型，兼顾速度与准确率
          </Text>
        )}
      </Card>

      {/* 字幕列表 + 操作栏 */}
      <Card
        title={
          <Space>
            <span>字幕轨道</span>
            <Tag>{segments.length} 条</Tag>
            {whisperResult && (
              <Tag color="purple">
                {whisperResult.language} ({(whisperResult.language_probability * 100).toFixed(0)}%)
              </Tag>
            )}
          </Space>
        }
        bordered={false}
        style={{ borderRadius: 10 }}
        extra={
          <Space>
            <Button size="small" icon={<PlusOutlined />} onClick={handleAddSegment}>
              添加片段
            </Button>
            <Button size="small" icon={<DownloadOutlined />} onClick={handleImportSRT}>
              导入 SRT
            </Button>
            <Dropdown
              menu={{
                items: [
                  { key: 'srt', label: '导出 SRT' },
                  { key: 'vtt', label: '导出 VTT' },
                  { key: 'ass', label: '导出 ASS' },
                ],
                onClick: ({ key }) => {
                  setExportFormat(key as 'srt' | 'vtt' | 'ass');
                  setTimeout(handleExport, 0);
                },
              }}
            >
              <Button size="small" icon={<SaveOutlined />}>
                导出
              </Button>
            </Dropdown>
          </Space>
        }
      >
        {segments.length === 0 ? (
          <Empty
            description="暂无字幕"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '24px 0' }}
          />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={segments}
            style={{ maxHeight: 400, overflowY: 'auto' }}
            renderItem={(item) => {
              const isEditing = editingId === item.id;
              const isActive =
                currentTime * 1000 >= item.startMs &&
                currentTime * 1000 <= item.endMs;

              return (
                <List.Item
                  style={{
                    background: isActive ? 'rgba(124, 58, 237, 0.08)' : undefined,
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 4,
                    transition: 'background 0.2s',
                  }}
                  actions={[
                    <Tooltip key="seek" title="跳到此位置">
                      <Button
                        type="text"
                        size="small"
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleSeek(item.startMs / 1000)}
                      />
                    </Tooltip>,
                    !isEditing && (
                      <Tooltip key="edit" title="编辑">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingText(item.text);
                          }}
                        />
                      </Tooltip>
                    ),
                    <Tooltip key="delete" title="删除">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteSegment(item.id)}
                      />
                    </Tooltip>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: '#7c3aed',
                          background: '#f3f0ff',
                          padding: '4px 8px',
                          borderRadius: 4,
                          minWidth: 70,
                          textAlign: 'center',
                          lineHeight: 1.4,
                          cursor: 'pointer',
                        }}
                        onClick={() => handleSeek(item.startMs / 1000)}
                        title="点击跳转"
                      >
                        <div>{msToDisplay(item.startMs)}</div>
                        <div style={{ color: '#a78bfa' }}>↓</div>
                        <div>{msToDisplay(item.endMs)}</div>
                      </div>
                    }
                    title={
                      isEditing ? (
                        <TextArea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          autoSize={{ minRows: 1, maxRows: 4 }}
                          style={{ fontSize: 14 }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: 14,
                            cursor: 'text',
                            color: isActive ? '#7c3aed' : undefined,
                            fontWeight: isActive ? 500 : 400,
                          }}
                        >
                          {item.text}
                        </span>
                      )
                    }
                    description={
                      isEditing ? (
                        <Space style={{ marginTop: 6 }}>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleSaveEdit(item.id)}
                          >
                            保存
                          </Button>
                          <Button size="small" onClick={() => setEditingId(null)}>
                            取消
                          </Button>
                        </Space>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {(item.endMs - item.startMs) / 1000.toFixed(1)}s ·{' '}
                          {item.text.length} 字符
                        </Text>
                      )
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default SubtitleEditor;
