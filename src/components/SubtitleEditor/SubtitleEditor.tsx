/**
 * SubtitleEditor — Redesigned for AI Cinema Studio
 *
 * Features:
 * - Dark waveform visualization (Canvas)
 * - Draggable timeline handles to adjust subtitle timing
 * - Inline subtitle text editing
 * - Amber highlight for currently playing subtitle
 *
 * @design-system AI Cinema Studio
 *   bg-base: #0C0D14 | accent: #FF9F43 | cyan: #00D4FF
 *   font: Outfit + Figtree + JetBrains Mono
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import {
  Button,
  Space,
  Select,
  Progress,
  Input,
  message,
  Empty,
  Tag,
  Dropdown,
} from 'antd';
import {
  ThunderboltOutlined,
  SaveOutlined,
  DownloadOutlined,
  DeleteOutlined,
  PlusOutlined,
  CloudDownloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { motion } from '@/components/common/motion-shim';
import { whisperService } from '@/core/services/subtitle.service';
import type { WhisperProgress, WhisperResult } from '@/core/services/subtitle.service';
import styles from './SubtitleEditor.module.scss';

const { TextArea } = Input;
const { Option } = Select;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EditorSegment {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
}

export interface SubtitleEditorProps {
  mediaPath?: string;
  duration?: number;
  initialSegments?: EditorSegment[];
  onSeek?: (timeSeconds: number) => void;
  currentTime?: number;
  isPlaying?: boolean;
  trackId?: string;
  language?: string;
  onChange?: (segments: EditorSegment[]) => void;
  projectId?: string;
}

const MODEL_SIZES = [
  { value: 'tiny',            label: 'Tiny (39M) — 最快',      recommended: false },
  { value: 'base',            label: 'Base (74M) — 推荐',      recommended: true  },
  { value: 'small',           label: 'Small (244M)',           recommended: false },
  { value: 'medium',          label: 'Medium (769M)',          recommended: false },
  { value: 'large-v2',        label: 'Large v2 (1550M)',       recommended: false },
  { value: 'large-v3',        label: 'Large v3 (1550M)',       recommended: false },
  { value: 'distil-large-v2', label: 'Distil Large v2 (820M)',  recommended: false },
];

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: '自动检测' },
  { value: 'zh',   label: '中文'    },
  { value: 'en',   label: '英语'    },
  { value: 'ja',   label: '日语'    },
  { value: 'ko',   label: '韩语'    },
  { value: 'fr',   label: '法语'    },
  { value: 'de',   label: '德语'    },
  { value: 'es',   label: '西班牙语'},
  { value: 'pt',   label: '葡萄牙语'},
  { value: 'ru',   label: '俄语'    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function msToSRTTime(ms: number): string {
  const h     = Math.floor(ms / 3600000);
  const m     = Math.floor((ms % 3600000) / 60000);
  const s     = Math.floor((ms % 60000) / 1000);
  const msRem = ms % 1000;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${msRem.toString().padStart(3, '0')}`;
}

function msToDisplay(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function parseSRT(content: string): EditorSegment[] {
  const blocks  = content.trim().split(/\n\n+/);
  const segments: EditorSegment[] = [];
  for (const block of blocks) {
    const lines     = block.split('\n');
    if (lines.length < 3) continue;
    const timeLine  = lines[1];
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
    if (!timeMatch) continue;
    const srtToMs = (t: string) => {
      const m = t.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
      if (!m) return 0;
      return parseInt(m[1]) * 3600000 + parseInt(m[2]) * 60000 + parseInt(m[3]) * 1000 + parseInt(m[4]);
    };
    const startMs = srtToMs(timeMatch[1]);
    const endMs   = srtToMs(timeMatch[2]);
    const text    = lines.slice(2).join('\n').replace(/<[^>]+>/g, '');
    segments.push({ id: crypto.randomUUID(), startMs, endMs, text });
  }
  return segments;
}

function generateSRT(segments: EditorSegment[]): string {
  return segments.map((seg, i) =>
    `${i + 1}\n${msToSRTTime(seg.startMs)} --> ${msToSRTTime(seg.endMs)}\n${seg.text}`
  ).join('\n\n');
}

function generateVTT(segments: EditorSegment[]): string {
  const body = segments.map((seg) => {
    const start = msToSRTTime(seg.startMs).replace(',', '.');
    const end   = msToSRTTime(seg.endMs).replace(',', '.');
    return `${start} --> ${end}\n${seg.text}`;
  }).join('\n\n');
  return `WEBVTT\n\n${body}`;
}

function generateASS(segments: EditorSegment[]): string {
  const body = segments.map((seg) => {
    const start = msToSRTTime(seg.startMs).replace(',', '.');
    const end   = msToSRTTime(seg.endMs).replace(',', '.');
    const text  = seg.text.replace(/\n/g, '\\N');
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
  }).join('\n');
  return `[Script Info]
Title: Generated by CutDeck
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${body}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Waveform Canvas
// ─────────────────────────────────────────────────────────────────────────────

interface WaveformCanvasProps {
  duration: number;
  segments: EditorSegment[];
  currentTime: number;
  onSeek: (timeSeconds: number) => void;
  activeSegmentId: string | null;
}

const WaveformCanvas: React.FC<WaveformCanvasProps> = React.memo(
  ({ duration, segments, currentTime, onSeek, activeSegmentId }) => {
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const canvas    = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr    = window.devicePixelRatio || 1;
      const width  = container.clientWidth;
      const height = 72;

      canvas.width  = width  * dpr;
      canvas.height = height * dpr;
      canvas.style.width  = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      // Background — deep void
      ctx.fillStyle = '#0e0f1a';
      ctx.fillRect(0, 0, width, height);

      if (duration <= 0) return;

      const pps = width / duration;

      // Simulated waveform bars
      const barWidth = 2;
      const barGap   = 1;
      const numBars  = Math.floor(width / (barWidth + barGap));

      for (let i = 0; i < numBars; i++) {
        const t        = (i / numBars) * duration;
        const amp      = 0.2 + 0.6 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.3));
        const barH     = amp * (height * 0.72);
        const x        = i * (barWidth + barGap);
        const y        = (height - barH) / 2;
        const segAtT   = segments.find((s) => t * 1000 >= s.startMs && t * 1000 <= s.endMs);
        const isActive = segAtT && activeSegmentId === segAtT.id;

        if (segAtT) {
          ctx.fillStyle  = isActive ? '#FF9F43' : '#3a3a5c';
          ctx.globalAlpha = isActive ? 0.85 : 0.55;
        } else {
          ctx.fillStyle  = '#2a2a4a';
          ctx.globalAlpha = 0.6;
        }
        ctx.fillRect(x, y, barWidth, barH);
      }
      ctx.globalAlpha = 1.0;

      // Subtitle region overlays
      for (const seg of segments) {
        const x1       = (seg.startMs / 1000) * pps;
        const x2       = (seg.endMs   / 1000) * pps;
        const isActive = activeSegmentId === seg.id;
        ctx.fillStyle  = isActive ? 'rgba(255, 159, 67, 0.18)' : 'rgba(90, 90, 160, 0.12)';
        ctx.fillRect(x1, 0, x2 - x1, height);
      }

      // Playhead
      const playheadX = currentTime * pps;
      ctx.fillStyle = '#FF9F43';
      ctx.fillRect(playheadX - 1, 0, 2, height);

      // Playhead top marker (triangle)
      ctx.beginPath();
      ctx.moveTo(playheadX - 5, 0);
      ctx.lineTo(playheadX + 5, 0);
      ctx.lineTo(playheadX, 7);
      ctx.closePath();
      ctx.fill();

      // Time labels
      ctx.fillStyle = '#55556A';
      ctx.font = '9px "JetBrains Mono", monospace';
      const step = duration > 300 ? 60 : duration > 60 ? 10 : 5;
      for (let t = 0; t <= duration; t += step) {
        const x = t * pps;
        ctx.fillText(msToDisplay(t * 1000), x + 2, height - 3);
      }
    }, [duration, segments, currentTime, activeSegmentId]);

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!containerRef.current || duration <= 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x    = e.clientX - rect.left;
        const t    = (x / rect.width) * duration;
        onSeek(Math.max(0, Math.min(t, duration)));
      },
      [duration, onSeek]
    );

    return (
      <div
        ref={containerRef}
        className={styles.waveformContainer}
        onClick={handleClick}
        role="img"
        aria-label="波形图，点击跳转"
      >
        <canvas ref={canvasRef} className={styles.waveformCanvas} />
      </div>
    );
  }
);
WaveformCanvas.displayName = 'WaveformCanvas';

// ─────────────────────────────────────────────────────────────────────────────
// Timeline segment (draggable handles)
// ─────────────────────────────────────────────────────────────────────────────

interface TimelineSegmentProps {
  segment: EditorSegment;
  duration: number;
  isActive: boolean;
  isEditing: boolean;
  editingText: string;
  onSegmentClick: (seg: EditorSegment) => void;
  onEditText: (id: string, text: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string, edge: 'start' | 'end') => void;
  isDragging: boolean;
  dragSegmentId: string | null;
  dragEdge: 'start' | 'end' | null;
}

const TimelineSegment: React.FC<TimelineSegmentProps> = ({
  segment,
  duration,
  isActive,
  isEditing,
  editingText,
  onSegmentClick,
  onEditText,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onDragStart,
  isDragging,
  dragSegmentId,
  dragEdge,
}) => {
  const msToX = (ms: number) =>
    duration > 0 ? (ms / 1000 / duration) * 100 : 0;

  const leftPct  = msToX(segment.startMs);
  const rightPct = msToX(segment.endMs);
  const widthPct = rightPct - leftPct;
  const isBeingDragged = isDragging && dragSegmentId === segment.id;

  return (
    <div
      className={`
        ${styles.timelineSegment}
        ${isActive    ? styles.segmentActive    : ''}
        ${isEditing   ? styles.segmentEditing   : ''}
        ${isBeingDragged ? styles.segmentDragging : ''}
      `}
      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      onClick={() => !isDragging && onSegmentClick(segment)}
      role="listitem"
      aria-selected={isActive}
    >
      {/* Left drag handle */}
      <div
        className={`${styles.dragHandle} ${styles.dragHandleLeft}`}
        onMouseDown={(e) => { e.stopPropagation(); onDragStart(segment.id, 'start'); }}
        role="slider"
        aria-label="拖拽调整开始时间"
        tabIndex={0}
      />

      {/* Content */}
      <div className={styles.segmentContent}>
        {isEditing ? (
          <div className={styles.editForm} onClick={(e) => e.stopPropagation()}>
            <TextArea
              value={editingText}
              onChange={(e) => onEditText(segment.id, e.target.value)}
              autoSize={{ minRows: 1, maxRows: 3 }}
              className={styles.editTextarea}
              autoFocus
            />
            <div className={styles.editActions}>
              <Button
                type="primary"
                size="small"
                icon={<SaveOutlined />}
                onClick={() => onSaveEdit(segment.id)}
                className={styles.saveBtn}
              >
                保存
              </Button>
              <Button size="small" onClick={onCancelEdit}>
                取消
              </Button>
            </div>
          </div>
        ) : (
          <span
            className={styles.segmentText}
            onDoubleClick={(e) => { e.stopPropagation(); onEditText(segment.id, segment.text); onSegmentClick(segment); }}
            title="双击编辑"
          >
            {segment.text}
          </span>
        )}
      </div>

      {/* Right drag handle */}
      <div
        className={`${styles.dragHandle} ${styles.dragHandleRight}`}
        onMouseDown={(e) => { e.stopPropagation(); onDragStart(segment.id, 'end'); }}
        role="slider"
        aria-label="拖拽调整结束时间"
        tabIndex={0}
      />

      {/* Delete */}
      {!isEditing && (
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={(e) => { e.stopPropagation(); onDelete(segment.id); }}
          aria-label="删除字幕"
        >
          ✕
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SubtitleTimeline
// ─────────────────────────────────────────────────────────────────────────────

interface SubtitleTimelineProps {
  segments: EditorSegment[];
  currentTime: number;
  duration: number;
  activeSegmentId: string | null;
  editingId: string | null;
  editingText: string;
  onSeek: (t: number) => void;
  onSegmentClick: (seg: EditorSegment) => void;
  onEditText: (id: string, text: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string, edge: 'start' | 'end') => void;
  onDragMove: (e: React.MouseEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  dragSegmentId: string | null;
  dragEdge: 'start' | 'end' | null;
}

const SubtitleTimeline: React.FC<SubtitleTimelineProps> = ({
  segments,
  currentTime,
  duration,
  activeSegmentId,
  editingId,
  editingText,
  onSeek,
  onSegmentClick,
  onEditText,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging,
  dragSegmentId,
  dragEdge,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const msToX = (ms: number) =>
    duration > 0 ? (ms / 1000 / duration) * 100 : 0;

  return (
    <div
      ref={trackRef}
      className={`${styles.timeline} ${isDragging ? styles.timelineDragging : ''}`}
      onMouseMove={isDragging ? onDragMove : undefined}
      onMouseUp={isDragging ? onDragEnd : undefined}
      onMouseLeave={isDragging ? onDragEnd : undefined}
      role="list"
      aria-label="字幕时间轴"
    >
      {/* Playhead */}
      <div
        className={styles.playhead}
        style={{ left: `${msToX(currentTime * 1000)}%` }}
        aria-hidden="true"
      />

      {segments.map((seg) => (
        <TimelineSegment
          key={seg.id}
          segment={seg}
          duration={duration}
          isActive={activeSegmentId === seg.id}
          isEditing={editingId === seg.id}
          editingText={editingText}
          onSegmentClick={onSegmentClick}
          onEditText={onEditText}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onDelete={onDelete}
          onDragStart={onDragStart}
          isDragging={isDragging}
          dragSegmentId={dragSegmentId}
          dragEdge={dragEdge}
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  mediaPath,
  duration: propDuration,
  initialSegments = [],
  onSeek,
  currentTime = 0,
  isPlaying = false,
  language = 'auto',
  onChange,
  projectId = 'subtitle',
}) => {
  const [segments, setSegments]           = useState<EditorSegment[]>(initialSegments);
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [editingText, setEditingText]       = useState('');
  const [exportFormat, setExportFormat]     = useState<'srt' | 'vtt' | 'ass'>('srt');

  // Drag state
  const [isDragging, setIsDragging]         = useState(false);
  const [dragSegmentId, setDragSegmentId]   = useState<string | null>(null);
  const [dragEdge, setDragEdge]             = useState<'start' | 'end' | null>(null);

  // Whisper state
  const [isTranscribing, setIsTranscribing]               = useState(false);
  const [progress, setProgress]                           = useState(0);
  const [progressStage, setProgressStage]                 = useState('');
  const [fasterWhisperAvailable, setFasterWhisperAvailable] = useState<boolean | null>(null);
  const [selectedModel, setSelectedModel]                 = useState('base');
  const [selectedLanguage, setSelectedLanguage]           = useState(language);
  const [whisperResult, setWhisperResult]                 = useState<WhisperResult | null>(null);

  const duration = propDuration ?? 0;

  // Check faster-whisper availability
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

  // Active segment
  const activeSegmentId = useMemo(() => {
    const ctMs = currentTime * 1000;
    const active = segments.find((s) => ctMs >= s.startMs && ctMs <= s.endMs);
    return active?.id ?? null;
  }, [segments, currentTime]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSeek = useCallback(
    (timeSeconds: number) => { onSeek?.(timeSeconds); },
    [onSeek]
  );

  const handleSegmentClick = useCallback((seg: EditorSegment) => {
    onSeek?.(seg.startMs / 1000);
  }, [onSeek]);

  const handleEditText = useCallback((id: string, text: string) => {
    setEditingId(id);
    setEditingText(text);
  }, []);

  const handleSaveEdit = useCallback((id: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text: editingText } : s))
    );
    setEditingId(null);
    message.success('字幕已保存');
  }, [editingText]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleDeleteSegment = useCallback((id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
    message.info('字幕片段已删除');
  }, []);

  const handleAddSegment = useCallback(() => {
    const insertMs = currentTime * 1000;
    const newSeg: EditorSegment = {
      id: crypto.randomUUID(),
      startMs: insertMs,
      endMs:   insertMs + 3000,
      text:    '新字幕文本',
    };
    setSegments((prev) => [...prev, newSeg].sort((a, b) => a.startMs - b.startMs));
    setEditingId(newSeg.id);
    setEditingText(newSeg.text);
    onSeek?.(insertMs / 1000);
  }, [currentTime, onSeek]);

  // Drag handlers
  const handleDragStart = useCallback((id: string, edge: 'start' | 'end') => {
    setIsDragging(true);
    setDragSegmentId(id);
    setDragEdge(edge);
  }, []);

  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragSegmentId || !dragEdge) return;
    const track = e.currentTarget as HTMLElement;
    const rect  = track.getBoundingClientRect();
    const xPct   = ((e.clientX - rect.left) / rect.width) * 100;
    const newMs  = Math.max(0, Math.min((xPct / 100) * duration * 1000));

    setSegments((prev) =>
      prev.map((s) => {
        if (s.id !== dragSegmentId) return s;
        if (dragEdge === 'start') {
          return { ...s, startMs: Math.min(newMs, s.endMs - 200) };
        } else {
          return { ...s, endMs: Math.max(newMs, s.startMs + 200) };
        }
      })
    );
  }, [isDragging, dragSegmentId, dragEdge, duration]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragSegmentId(null);
    setDragEdge(null);
  }, []);

  // Whisper
  const handleWhisperTranscribe = useCallback(async () => {
    if (!mediaPath) { message.error('未提供媒体文件路径'); return; }

    if (fasterWhisperAvailable === false) {
      import('antd').then(({ Modal }) => {
        Modal.confirm({
          title: 'faster-whisper 未安装',
          content: (
            <div>
              <p>请先安装 faster-whisper Python 包：</p>
              <code style={{ display: 'block', padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                pip install faster-whisper
              </code>
            </div>
          ),
          okText: '知道了',
        });
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
        endMs:   seg.end_ms,
        text:    seg.text,
      }));
      setSegments(newSegments);
      message.success(
        `Whisper 转录完成！语言: ${result.language} (${(result.language_probability * 100).toFixed(1)}%), ${result.segments.length} 条字幕`
      );
    } catch (error: any) {
      message.error(`Whisper 转录失败: ${error?.message ?? error}`);
    } finally {
      setIsTranscribing(false);
    }
  }, [mediaPath, fasterWhisperAvailable, selectedModel, selectedLanguage]);

  const handleImportSRT = useCallback(() => {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = '.srt,.vtt,.ass,.txt';
    input.onchange = async (e) => {
      const file   = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text   = await file.text();
      const parsed = parseSRT(text);
      if (parsed.length === 0) { message.warning('未能解析任何字幕条目'); return; }
      setSegments(parsed);
      message.success(`成功导入 ${parsed.length} 条字幕`);
    };
    input.click();
  }, []);

  const handleExport = useCallback(() => {
    if (segments.length === 0) { message.warning('没有字幕可导出'); return; }
    let content  = '';
    let filename = '';
    switch (exportFormat) {
      case 'srt': content  = generateSRT(segments); filename = `${projectId}.srt`; break;
      case 'vtt': content  = generateVTT(segments); filename = `${projectId}.vtt`; break;
      case 'ass': content  = generateASS(segments); filename = `${projectId}.ass`; break;
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success(`已导出为 ${exportFormat.toUpperCase()} 格式`);
  }, [segments, exportFormat, projectId]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.editor} role="region" aria-label="字幕编辑器">

      {/* ── Waveform ──────────────────────────────────────────── */}
      {duration > 0 && (
        <section className={styles.waveformSection} aria-label="波形预览">
          <WaveformCanvas
            duration={duration}
            segments={segments}
            currentTime={currentTime}
            onSeek={handleSeek}
            activeSegmentId={activeSegmentId}
          />
        </section>
      )}

      {/* ── Timeline ─────────────────────────────────────────── */}
      {duration > 0 && (
        <section className={styles.timelineSection} aria-label="字幕时间轴">
          <SubtitleTimeline
            segments={segments}
            currentTime={currentTime}
            duration={duration}
            activeSegmentId={activeSegmentId}
            editingId={editingId}
            editingText={editingText}
            onSeek={handleSeek}
            onSegmentClick={handleSegmentClick}
            onEditText={handleEditText}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onDelete={handleDeleteSegment}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            isDragging={isDragging}
            dragSegmentId={dragSegmentId}
            dragEdge={dragEdge}
          />
        </section>
      )}

      {/* ── Whisper control bar ───────────────────────────────── */}
      <section className={styles.whisperBar} aria-label="Whisper AI 转录控制">
        <div className={styles.whisperBarLeft}>
          <span className={styles.whisperIcon} aria-hidden="true">⚡</span>
          <span className={styles.whisperTitle}>Whisper AI 字幕转录</span>
          {fasterWhisperAvailable === true && (
            <Tag color="green" icon={<CheckCircleOutlined />} className={styles.whisperTag}>
              faster-whisper 就绪
            </Tag>
          )}
          {fasterWhisperAvailable === false && (
            <Tag color="orange" icon={<WarningOutlined />} className={styles.whisperTag}>
              未检测到 faster-whisper
            </Tag>
          )}
          {fasterWhisperAvailable === null && (
            <Tag className={styles.whisperTag}>检测中…</Tag>
          )}
        </div>
        <div className={styles.whisperBarRight}>
          <Select
            value={selectedModel}
            onChange={setSelectedModel}
            className={styles.modelSelect}
            size="small"
          >
            {MODEL_SIZES.map((m) => (
              <Option key={m.value} value={m.value}>{m.label}</Option>
            ))}
          </Select>
          <Select
            value={selectedLanguage}
            onChange={setSelectedLanguage}
            className={styles.langSelect}
            size="small"
          >
            {LANGUAGE_OPTIONS.map((l) => (
              <Option key={l.value} value={l.value}>{l.label}</Option>
            ))}
          </Select>
          <Button
            type="primary"
            icon={<CloudDownloadOutlined />}
            onClick={handleWhisperTranscribe}
            loading={isTranscribing}
            disabled={!mediaPath || fasterWhisperAvailable === null}
            className={styles.transcribeBtn}
          >
            {isTranscribing ? '转录中…' : '开始转录'}
          </Button>
        </div>
      </section>

      {/* Progress */}
      {isTranscribing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={styles.progressArea}
        >
          <span className={styles.progressStage}>{progressStage}</span>
          <Progress
            percent={Math.round(progress)}
            strokeColor={{ '0%': '#FF9F43', '100%': '#FFBE76' }}
            trailColor="#2A2D42"
            status="active"
          />
        </motion.div>
      )}

      {/* ── Subtitle list + actions ───────────────────────────── */}
      <section className={styles.subtitleSection} aria-label="字幕轨道">
        <div className={styles.subtitleHeader}>
          <div className={styles.subtitleHeaderLeft}>
            <span className={styles.subtitleHeaderTitle}>字幕轨道</span>
            <Tag className={styles.countTag}>{segments.length} 条</Tag>
            {whisperResult && (
              <Tag color="purple" className={styles.countTag}>
                {whisperResult.language} ({(whisperResult.language_probability * 100).toFixed(0)}%)
              </Tag>
            )}
          </div>
          <div className={styles.subtitleHeaderRight}>
            <Button size="small" icon={<PlusOutlined />} onClick={handleAddSegment} className={styles.actionBtn}>
              添加片段
            </Button>
            <Button size="small" icon={<DownloadOutlined />} onClick={handleImportSRT} className={styles.actionBtn}>
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
              <Button size="small" icon={<SaveOutlined />} className={styles.actionBtn}>
                导出
              </Button>
            </Dropdown>
          </div>
        </div>

        {segments.length === 0 ? (
          <Empty
            description="暂无字幕"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            className={styles.emptyState}
          />
        ) : (
          <ul className={styles.subtitleList} role="list">
            {segments.map((item, i) => {
              const isEditing = editingId === item.id;
              const isActive  = activeSegmentId === item.id;
              const durSec     = ((item.endMs - item.startMs) / 1000).toFixed(1);

              return (
                <li
                  key={item.id}
                  className={`
                    ${styles.subtitleItem}
                    ${isActive  ? styles.subtitleItemActive  : ''}
                    ${isEditing ? styles.subtitleItemEditing : ''}
                  `}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {/* Timecode badge */}
                  <button
                    type="button"
                    className={styles.timecodeBtn}
                    onClick={() => handleSeek(item.startMs / 1000)}
                  aria-label={`跳转至 ${msToDisplay(item.startMs)}`}>
                    <span className={styles.timecodeStart}>{msToDisplay(item.startMs)}</span>
                    <span className={styles.timecodeArrow}>↓</span>
                    <span className={styles.timecodeEnd}>{msToDisplay(item.endMs)}</span>
                  </button>

                  {/* Text content */}
                  <div className={styles.subtitleTextArea}>
                    {isEditing ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <TextArea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          autoSize={{ minRows: 1, maxRows: 4 }}
                          className={styles.inlineTextarea}
                          autoFocus
                        />
                        <Space style={{ marginTop: 6 }}>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleSaveEdit(item.id)}
                            className={styles.saveBtn}
                          >
                            保存
                          </Button>
                          <Button size="small" onClick={handleCancelEdit}>
                            取消
                          </Button>
                        </Space>
                      </div>
                    ) : (
                      <span
                        className={`${styles.subtitleText} ${isActive ? styles.subtitleTextActive : ''}`}
                        onDoubleClick={() => { handleEditText(item.id, item.text); }}
                        title="双击编辑字幕"
                      >
                        {item.text}
                      </span>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className={styles.subtitleMeta}>
                    <span className={styles.subtitleDur}>{durSec}s</span>
                    <span className={styles.subtitleChars}>{item.text.length}字</span>
                  </div>

                  {/* Actions */}
                  <div className={styles.subtitleActions}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={(e) => { e.stopPropagation(); handleSeek(item.startMs / 1000); }}
                      aria-label="定位"
                    >
                      ▶
                    </button>
                    {!isEditing && (
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={(e) => { e.stopPropagation(); handleEditText(item.id, item.text); }}
                        aria-label="编辑"
                      >
                        ✎
                      </button>
                    )}
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      onClick={(e) => { e.stopPropagation(); handleDeleteSegment(item.id); }}
                      aria-label="删除"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default SubtitleEditor;