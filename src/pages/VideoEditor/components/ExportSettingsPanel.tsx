import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import styles from '../index.module.less';

interface ExportSettingsPanelProps {
  outputFormat: string;
  videoQuality: string;
  onFormatChange: (format: string) => void;
  onQualityChange: (quality: string) => void;
}

const formatOptions = [
  { key: 'mp4', label: 'MP4' },
  { key: 'mov', label: 'MOV' },
  { key: 'webm', label: 'WebM' },
];

const qualityOptions = [
  { key: 'low', label: '低 (720p)' },
  { key: 'medium', label: '中 (1080p)' },
  { key: 'high', label: '高 (原始分辨率)' },
];

const getQualityLabel = (quality: string) => {
  switch (quality) {
    case 'low':
      return '低 (720p)';
    case 'medium':
      return '中 (1080p)';
    case 'high':
      return '高 (原始分辨率)';
    default:
      return quality;
  }
};

const ExportSettingsPanel: React.FC<ExportSettingsPanelProps> = ({
  outputFormat,
  videoQuality,
  onFormatChange,
  onQualityChange,
}) => {
  return (
    <div className={styles.settingsPanel}>
      <h5 className={styles.sectionTitle}>导出设置</h5>

      <Card className={styles.settingCard}>
        <CardContent className="flex flex-col gap-4">
          <div className={styles.settingItem}>
            <span className="font-semibold">输出格式</span>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button>
                  {outputFormat.toUpperCase()} <Download size={14} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {formatOptions.map(opt => (
                  <DropdownMenuItem key={opt.key} onClick={() => onFormatChange(opt.key)}>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className={styles.settingItem}>
            <span className="font-semibold">视频质量</span>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button>
                  {getQualityLabel(videoQuality)} <Download size={14} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {qualityOptions.map(opt => (
                  <DropdownMenuItem key={opt.key} onClick={() => onQualityChange(opt.key)}>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(ExportSettingsPanel);
