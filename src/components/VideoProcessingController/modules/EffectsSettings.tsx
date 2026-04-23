/**
 * EffectsSettings Component
 * Part of VideoProcessingController - handles transition and audio effects
 */
import React from 'react';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Volume2 } from 'lucide-react';
import { TRANSITION_OPTIONS, AUDIO_PROCESS_OPTIONS } from '../constants';
import type { TransitionValue, AudioProcessValue } from '../constants';

interface EffectsSettingsProps {
  transitionType: TransitionValue;
  transitionDuration: number;
  audioProcess: AudioProcessValue;
  audioVolume: number;
  useSubtitles: boolean;
  onTransitionChange: (transition: TransitionValue) => void;
  onTransitionDurationChange: (duration: number) => void;
  onAudioProcessChange: (process: AudioProcessValue) => void;
  onAudioVolumeChange: (volume: number) => void;
  onSubtitlesChange: (useSubtitles: boolean) => void;
}

export const EffectsSettings: React.FC<EffectsSettingsProps> = ({
  transitionType,
  transitionDuration,
  audioProcess,
  audioVolume,
  useSubtitles,
  onTransitionChange,
  onTransitionDurationChange,
  onAudioProcessChange,
  onAudioVolumeChange,
  onSubtitlesChange,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="formItem col-span-2">
          <div className="formLabel">转场效果</div>
          <Select value={transitionType} onValueChange={(v: string) => onTransitionChange(v as TransitionValue)}>
            <SelectTrigger className="w-full">
              <SelectContent>
                {TRANSITION_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectTrigger>
          </Select>
        </div>

        <div className="formItem">
          <div className="formLabel">转场时长 (秒)</div>
          <Input
            type="number"
            min={0.2}
            max={3}
            step={0.1}
            value={transitionDuration}
            onChange={e => onTransitionDurationChange(parseFloat(e.target.value) || 0.5)}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="formItem">
          <div className="formLabel">音频处理</div>
          <Select value={audioProcess} onValueChange={(v: string) => onAudioProcessChange(v as AudioProcessValue)}>
            <SelectTrigger className="w-full">
              <SelectContent>
                {AUDIO_PROCESS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectTrigger>
          </Select>
        </div>

        <div className="formItem">
          <div className="formLabel flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Volume2 size={14} />
              <span>音量调整</span>
            </div>
            <span className="valueDisplay">{audioVolume}%</span>
          </div>
          <Slider
            min={0}
            max={200}
            step={5}
            value={audioVolume}
            onValueChange={(v) => onAudioVolumeChange(Array.isArray(v) ? v[0] : v)}
            disabled={audioProcess === 'none'}
          />
        </div>
      </div>

      <div className="formItem">
        <div className="formLabel">添加字幕</div>
        <div className="flex items-center gap-2">
          <Switch
            checked={useSubtitles}
            onCheckedChange={onSubtitlesChange}
          />
          <span className="switchDescription text-xs text-muted-foreground">
            将脚本内容作为字幕添加到视频中
          </span>
        </div>
      </div>
    </div>
  );
};

export default EffectsSettings;
