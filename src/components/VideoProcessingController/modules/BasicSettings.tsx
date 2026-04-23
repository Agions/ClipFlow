/**
 * BasicSettings Component
 * Part of VideoProcessingController - handles quality and format settings
 */
import React from 'react';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { QUALITY_OPTIONS, FORMAT_OPTIONS, DEFAULT_CUSTOM_SETTINGS } from '../constants';
import type { QualityValue, FormatValue } from '../constants';
import type { CustomQualitySettings } from '../types';

interface BasicSettingsProps {
  videoQuality: QualityValue;
  exportFormat: FormatValue;
  customSettings: CustomQualitySettings;
  onQualityChange: (quality: QualityValue) => void;
  onFormatChange: (format: FormatValue) => void;
  onCustomSettingsChange: (settings: Partial<CustomQualitySettings>) => void;
}

export const BasicSettings: React.FC<BasicSettingsProps> = ({
  videoQuality,
  exportFormat,
  customSettings,
  onQualityChange,
  onFormatChange,
  onCustomSettingsChange,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="formItem">
          <div className="formLabel">视频质量</div>
          <Select value={videoQuality} onValueChange={onQualityChange as any}>
            <SelectTrigger className="w-full">
              <SelectContent>
                {QUALITY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div>{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectTrigger>
          </Select>
        </div>

        <div className="formItem">
          <div className="formLabel">导出格式</div>
          <Select value={exportFormat} onValueChange={onFormatChange as any}>
            <SelectTrigger className="w-full">
              <SelectContent>
                {FORMAT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div>{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectTrigger>
          </Select>
        </div>
      </div>

      {videoQuality === 'custom' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="formItem">
            <div className="formLabel">分辨率</div>
            <Select
              value={customSettings.resolution}
              onValueChange={(resolution: string | null) => onCustomSettingsChange({ resolution: resolution ?? '1920x1080' })}
            >
              <SelectTrigger className="w-full">
                <SelectContent>
                  <SelectItem value="1280x720">720p (1280x720)</SelectItem>
                  <SelectItem value="1920x1080">1080p (1920x1080)</SelectItem>
                  <SelectItem value="2560x1440">2K (2560x1440)</SelectItem>
                  <SelectItem value="3840x2160">4K (3840x2160)</SelectItem>
                </SelectContent>
              </SelectTrigger>
            </Select>
          </div>

          <div className="formItem">
            <div className="formLabel">比特率 (Kbps)</div>
            <div className="flex items-center gap-2">
              <Slider
                min={1000}
                max={20000}
                step={500}
                value={customSettings.bitrate}
                onValueChange={(bitrate) => onCustomSettingsChange({ bitrate: Array.isArray(bitrate) ? bitrate[0] : bitrate })}
                className="flex-1"
              />
              <Input
                type="number"
                value={customSettings.bitrate}
                onChange={e => onCustomSettingsChange({ bitrate: parseInt(e.target.value) || DEFAULT_CUSTOM_SETTINGS.bitrate })}
                min={1000}
                max={20000}
                step={500}
                className="w-24"
              />
            </div>
          </div>

          <div className="formItem">
            <div className="formLabel">帧率 (FPS)</div>
            <Select
              value={String(customSettings.framerate)}
              onValueChange={(framerate: string | null) => onCustomSettingsChange({ framerate: parseInt(framerate ?? '30') })}
            >
              <SelectTrigger className="w-full">
                <SelectContent>
                  <SelectItem value="24">24 FPS (电影)</SelectItem>
                  <SelectItem value="25">25 FPS (PAL)</SelectItem>
                  <SelectItem value="30">30 FPS (常用)</SelectItem>
                  <SelectItem value="50">50 FPS (流畅)</SelectItem>
                  <SelectItem value="60">60 FPS (高帧率)</SelectItem>
                </SelectContent>
              </SelectTrigger>
            </Select>
          </div>

          <div className="formItem">
            <div className="formLabel">启用硬件加速</div>
            <div className="flex items-center gap-2">
              <Switch
                checked={customSettings.useHardwareAcceleration}
                onCheckedChange={useHardwareAcceleration => onCustomSettingsChange({ useHardwareAcceleration })}
              />
              <span className="switchDescription text-xs text-muted-foreground">
                启用可加快处理速度，但可能影响兼容性
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BasicSettings;
