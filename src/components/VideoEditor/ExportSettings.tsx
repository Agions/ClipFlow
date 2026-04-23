import React, { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


export type TransitionType = 'none' | 'fade' | 'dissolve' | 'wipe' | 'slide';

export interface ExportSettingsState {
  videoQuality: string;
  exportFormat: string;
  transitionType: TransitionType;
  transitionDuration: number;
  audioVolume: number;
  useSubtitles: boolean;
}

interface ExportSettingsProps {
  open: boolean;
  settings: ExportSettingsState;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSettingsChange: (settings: Partial<ExportSettingsState>) => void;
  onOk: () => void;
  onCancel: () => void;
}

const transitionOptions = [
  { value: 'none', label: '无转场' },
  { value: 'fade', label: '淡入淡出' },
  { value: 'dissolve', label: '交叉溶解' },
  { value: 'wipe', label: '擦除效果' },
  { value: 'slide', label: '滑动效果' },
];

const ExportSettings: React.FC<ExportSettingsProps> = ({
  open,
  settings,
  activeTab,
  onTabChange,
  onSettingsChange,
  onOk,
  onCancel,
}) => {
  const {
    videoQuality,
    exportFormat,
    transitionType,
    transitionDuration,
    audioVolume,
    useSubtitles,
  } = settings;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>视频导出设置</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList>
            <TabsTrigger value="general">基本设置</TabsTrigger>
            <TabsTrigger value="advanced">高级设置</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold w-24">视频质量:</span>
                <Select
                  value={videoQuality ?? undefined}
                  onValueChange={((value: string) => { if (value) onSettingsChange({ videoQuality: value as any }); }) as any}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低质量 (720p)</SelectItem>
                    <SelectItem value="medium">中等质量 (1080p)</SelectItem>
                    <SelectItem value="high">高质量 (原始分辨率)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold w-24">导出格式:</span>
                <Select
                  value={exportFormat ?? undefined}
                  onValueChange={((value: string) => { if (value) onSettingsChange({ exportFormat: value as any }); }) as any}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp4">MP4 格式</SelectItem>
                    <SelectItem value="mov">MOV 格式</SelectItem>
                    <SelectItem value="mkv">MKV 格式</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold w-24">添加字幕:</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      checked={useSubtitles === true}
                      onChange={() => onSettingsChange({ useSubtitles: true })}
                    />
                    是
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      checked={useSubtitles === false}
                      onChange={() => onSettingsChange({ useSubtitles: false })}
                    />
                    否
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="advanced">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold w-24">转场效果:</span>
                <Select
                  value={transitionType}
                  onValueChange={((value: string) => { if (value) onSettingsChange({ transitionType: value as any }); }) as any}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transitionOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold w-24">转场时长(秒):</span>
                <input
                  type="number"
                  value={transitionDuration}
                  onChange={(e) => onSettingsChange({ transitionDuration: parseFloat(e.target.value) || 0 })}
                  min={0.2}
                  max={3}
                  step={0.1}
                  className="border rounded px-2 py-1 w-[200px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold w-24">音频音量:</span>
                <div className="flex items-center gap-2 w-[300px]">
                  <Slider
                    value={audioVolume}
                    onValueChange={(val) => {
                      const v = Array.isArray(val) ? val[0] : val;
                      onSettingsChange({ audioVolume: v });
                    }}
                    min={0}
                    max={150}
                    step={5}
                    className="flex-1"
                  />
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={audioVolume}
                      onChange={(e) => onSettingsChange({ audioVolume: parseInt(e.target.value) || 0 })}
                      min={0}
                      max={150}
                      step={5}
                      className="border rounded px-2 py-1 w-[70px]"
                    />
                    <span className="ml-1">%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-accent-primary/30 bg-accent-primary/5 px-4 py-3 text-sm">
              <p className="font-medium text-accent-primary mb-1">高级设置说明</p>
              <p className="text-muted-foreground text-xs">转场效果会在片段之间添加流畅过渡，可能会稍微增加处理时间。音频音量调整可以让您控制整个视频的音量大小，100%表示保持原音量不变。</p>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button variant="primary" onClick={onOk}>
            开始导出
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default memo(ExportSettings);
