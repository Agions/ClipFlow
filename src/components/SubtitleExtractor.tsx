/**
 * SubtitleExtractor — 字幕编辑器（重构版）
 *
 * 重构目标：成为真正的视频字幕编辑器
 * - 顶部：视频预览 + 播放控制
 * - 中部：字幕时间轴（可点击跳转）
 * - 底部：字幕列表（内联编辑）
 *
 * 设计风格：AI Cinema Studio Dark (#0C0D14)
 */
import React, { useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Edit,
  Download,
  Play,
  Pause,
  RefreshCw,
  Target,
  Mic,
} from 'lucide-react';
import { notify } from '@/shared';
import { subtitleService } from '@/core/services/subtitle.service';
import { useEditorStore } from '@/store/editorStore';
import type { SubtitleEntry } from '@/core/types';
import styles from './SubtitleExtractor.module.css';

interface SubtitleSegment {
  id: string;
  startTime: number;
  endTime: number;
  start: string;
  end: string;
  text: string;
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function formatDisplayTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const cs = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

interface SubtitleExtractorProps {
  projectId: string;
  videoUrl?: string;
  onExtracted?: (subtitles: SubtitleSegment[]) => void;
}

const SubtitleExtractor: React.FC<SubtitleExtractorProps> = ({ projectId, videoUrl, onExtracted }) => {
  const playheadMs = useEditorStore(state => state.playheadMs);
  const previewPlaying = useEditorStore(state => state.previewPlaying);
  const setPlayheadMs = useEditorStore(state => state.setPlayheadMs);
  const setPreviewPlaying = useEditorStore(state => state.setPreviewPlaying);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [format, setFormat] = useState<'srt' | 'vtt' | 'txt'>('srt');
  const [translate, setTranslate] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedSubtitles, setExtractedSubtitles] = useState<SubtitleSegment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);

  const totalDuration = videoDuration > 0 ? videoDuration : 1;
  const playheadSec = playheadMs / 1000;
  const currentSub = extractedSubtitles.find(s => playheadSec >= s.startTime && playheadSec <= s.endTime);

  const handleVideoTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setPlayheadMs(video.currentTime * 1000);
  }, []);

  const handleVideoEnded = useCallback(() => { setPreviewPlaying(false); }, []);

  const handleVideoMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setVideoDuration(video.duration);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (previewPlaying) {
      video.pause();
      setPreviewPlaying(false);
    } else {
      video.play().catch(() => {});
      setPreviewPlaying(true);
    }
  }, [previewPlaying]);

  const seekTo = useCallback((timeSec: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = timeSec;
    setPlayheadMs(timeSec * 1000);
    if (!previewPlaying) {
      setPreviewPlaying(true);
      video.play().catch(() => {});
    }
  }, [previewPlaying]);

  const handleExtract = useCallback(async () => {
    if (!videoUrl) { notify.error(null, '未检测到视频源'); return; }
    setIsExtracting(true);
    setProgress(0);
    setExtractedSubtitles([]);
    setActiveSubId(null);
    try {
      const interval = setInterval(() => { setProgress(prev => Math.min(prev + 8, 88)); }, 250);
      const result = await subtitleService.extractSubtitles(videoUrl, { language: 'zh-CN' });
      clearInterval(interval);
      setProgress(100);
      const subs: SubtitleSegment[] = result.entries.map((entry: SubtitleEntry) => ({
        id: entry.id ?? crypto.randomUUID(), startTime: entry.startTime, endTime: entry.endTime,
        start: formatSRTTime(entry.startTime), end: formatSRTTime(entry.endTime), text: entry.text,
      }));
      setExtractedSubtitles(subs);
      if (onExtracted) onExtracted(subs);
      notify.success(`成功提取 ${subs.length} 条字幕`);
    } catch (error) { notify.error(error as Parameters<typeof notify.error>[0], '字幕提取失败'); }
    finally { setIsExtracting(false); }
  }, [videoUrl, onExtracted]);

  const startEdit = useCallback((sub: SubtitleSegment) => { setEditingId(sub.id); setEditingText(sub.text); }, []);
  const saveEdit = useCallback(() => {
    if (!editingId) return;
    setExtractedSubtitles(prev => prev.map(s => s.id === editingId ? { ...s, text: editingText } : s));
    setEditingId(null);
    notify.success('字幕已保存');
  }, [editingId, editingText]);
  const cancelEdit = useCallback(() => { setEditingId(null); setEditingText(''); }, []);

  const exportSubtitle = useCallback(() => {
    if (extractedSubtitles.length === 0) { notify.warning('无字幕可导出'); return; }
    let content = '';
    if (format === 'srt') content = extractedSubtitles.map((sub, i) => `${i + 1}\n${sub.start} --> ${sub.end}\n${sub.text}\n`).join('\n');
    else if (format === 'vtt') content = 'WEBVTT\n\n' + extractedSubtitles.map((sub, i) => `${i + 1}\n${sub.start.replace(',', '.')} --> ${sub.end.replace(',', '.')}\n${sub.text}\n`).join('\n');
    else content = extractedSubtitles.map(sub => `[${sub.start} - ${sub.end}] ${sub.text}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitle_${projectId}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    notify.success(`已导出为 ${format.toUpperCase()} 格式`);
  }, [extractedSubtitles, format, projectId]);

  return (
    <TooltipProvider>
      <div className={styles.container} role="region" aria-label="字幕编辑器">
        {/* 视频预览 */}
        <div className={styles.playerSection}>
          <div className={styles.videoWrapper}>
            {videoUrl ? (
              <video ref={videoRef} src={videoUrl} className={styles.video}
                onTimeUpdate={handleVideoTimeUpdate} onEnded={handleVideoEnded} onLoadedMetadata={handleVideoMetadata} />
            ) : (
              <div className={styles.noVideo}>
                <FileText size={40} className="text-white/20" />
                <p className="text-muted-foreground text-sm">暂无视频</p>
              </div>
            )}
            {videoUrl && (
              <div className={styles.playerOverlay}>
                <button className={styles.playBtn} onClick={togglePlay} aria-label={previewPlaying ? '暂停' : '播放'}>
                  {previewPlaying ? <Pause size={40} /> : <Play size={40} />}
                </button>
              </div>
            )}
            {currentSub && <div className={styles.currentSubtitleHint}>{currentSub.text}</div>}
          </div>
          <div className={styles.timeDisplay}>
            <span className={styles.timeMain}>{formatDisplayTime(playheadSec)}</span>
            {videoDuration > 0 && <span className={styles.timeTotal}> / {formatDisplayTime(videoDuration)}</span>}
          </div>
        </div>

        {/* 字幕时间轴 */}
        {extractedSubtitles.length > 0 && (
          <div className={styles.timeline} role="slider" aria-label="字幕时间轴">
            <div className={styles.playhead} style={{ left: `${Math.min((playheadSec / totalDuration) * 100, 100)}%` }} />
            <div className={styles.track}>
              {extractedSubtitles.map(sub => {
                const left = (sub.startTime / totalDuration) * 100;
                const width = Math.max(((sub.endTime - sub.startTime) / totalDuration) * 100, 0.5);
                const isActive = activeSubId === sub.id || (playheadSec >= sub.startTime && playheadSec <= sub.endTime);
                return (
                  <Tooltip key={sub.id} title={`${formatDisplayTime(sub.startTime)} - ${sub.text.slice(0, 20)}${sub.text.length > 20 ? '…' : ''}`}>
                    <div className={`${styles.subBlock} ${isActive ? styles.subBlockActive : ''}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      onClick={() => { seekTo(sub.startTime); setActiveSubId(sub.id); }} />
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}

        {/* 控制栏 */}
        <div className={styles.controlBar}>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleExtract} disabled={!videoUrl || isExtracting}>
              <Mic size={14} className="mr-1" />
              {isExtracting ? '识别中…' : '提取字幕'}
            </Button>
            {isExtracting && <Progress value={progress} className="w-32" aria-label={`提取进度 ${progress}%`} />}
            <Select value={format} onValueChange={setFormat as any}>
              <SelectTrigger className="w-24"><span>{format.toUpperCase()}</span></SelectTrigger>
              <SelectContent>
                <SelectItem value="srt">SRT</SelectItem>
                <SelectItem value="vtt">VTT</SelectItem>
                <SelectItem value="txt">TXT</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportSubtitle} disabled={extractedSubtitles.length === 0}>
              <Download size={14} className="mr-1" />导出字幕
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">翻译</span>
              <Switch checked={translate} onCheckedChange={setTranslate} />
            </div>
          </div>
          {extractedSubtitles.length > 0 && (
            <span className="text-xs text-muted-foreground">共 {extractedSubtitles.length} 条字幕</span>
          )}
        </div>

        {/* 字幕列表 */}
        <div className={styles.subtitleList}>
          {extractedSubtitles.length === 0 && !isExtracting ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Target size={40} className="mb-3 opacity-30" />
              <p className="text-sm">点击「提取字幕」开始识别视频语音</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="flex flex-col gap-1 p-1">
                {extractedSubtitles.map(sub => {
                  const isEditing = editingId === sub.id;
                  const isCurrent = playheadSec >= sub.startTime && playheadSec <= sub.endTime;
                  return (
                    <div key={sub.id} className={`flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted/50 cursor-pointer ${isCurrent ? 'bg-primary/5 border-primary/30' : ''}`}
                      onClick={() => seekTo(sub.startTime)}>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <span className="text-xs font-mono text-muted-foreground">{formatDisplayTime(sub.startTime)}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-xs font-mono text-muted-foreground">{formatDisplayTime(sub.endTime)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <Input value={editingText} onChange={e => setEditingText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                            onBlur={saveEdit} autoFocus onClick={e => e.stopPropagation()} />
                        ) : (
                          <span className={`text-sm truncate ${isCurrent ? 'text-primary font-medium' : ''}`}>{sub.text}</span>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); startEdit(sub); }} aria-label="编辑字幕">
                        <Edit size={14} />
                      </Button>
                      {isCurrent && <Badge variant="default" className="shrink-0"><Target size={10} /></Badge>}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default SubtitleExtractor;
