/**
 * BasicSettings Component
 * Part of VideoProcessingController - handles quality and format settings
 */
import React from 'react';
import { Row, Col, Select, Slider, InputNumber, Switch } from 'antd';
import { QUALITY_OPTIONS, FORMAT_OPTIONS, DEFAULT_CUSTOM_SETTINGS } from '../constants';
import type { QualityValue, FormatValue } from '../constants';
import type { CustomQualitySettings } from '../types';

const { Option } = Select;

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
    <>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <div className="formItem">
            <div className="formLabel">视频质量</div>
            <Select
              value={videoQuality}
              onChange={onQualityChange}
              style={{ width: '100%' }}
            >
              {QUALITY_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  <div>
                    <div>{option.label}</div>
                    <div className="optionDescription">
                      {option.description}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </div>
        </Col>

        <Col span={12}>
          <div className="formItem">
            <div className="formLabel">导出格式</div>
            <Select
              value={exportFormat}
              onChange={onFormatChange}
              style={{ width: '100%' }}
            >
              {FORMAT_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  <div>
                    <div>{option.label}</div>
                    <div className="optionDescription">
                      {option.description}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </div>
        </Col>
      </Row>

      {videoQuality === 'custom' && (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <div className="formItem">
              <div className="formLabel">分辨率</div>
              <Select
                value={customSettings.resolution}
                onChange={resolution => onCustomSettingsChange({ resolution })}
                style={{ width: '100%' }}
              >
                <Option value="1280x720">720p (1280x720)</Option>
                <Option value="1920x1080">1080p (1920x1080)</Option>
                <Option value="2560x1440">2K (2560x1440)</Option>
                <Option value="3840x2160">4K (3840x2160)</Option>
              </Select>
            </div>
          </Col>

          <Col span={12}>
            <div className="formItem">
              <div className="formLabel">比特率 (Kbps)</div>
              <Row>
                <Col span={18}>
                  <Slider
                    min={1000}
                    max={20000}
                    step={500}
                    value={customSettings.bitrate}
                    onChange={(bitrate: number) => onCustomSettingsChange({ bitrate })}
                  />
                </Col>
                <Col span={6}>
                  <InputNumber
                    min={1000}
                    max={20000}
                    step={500}
                    value={customSettings.bitrate}
                    onChange={bitrate => onCustomSettingsChange({ bitrate: bitrate ?? DEFAULT_CUSTOM_SETTINGS.bitrate })}
                    style={{ marginLeft: 8 }}
                  />
                </Col>
              </Row>
            </div>
          </Col>

          <Col span={12}>
            <div className="formItem">
              <div className="formLabel">帧率 (FPS)</div>
              <Select
                value={customSettings.framerate}
                onChange={framerate => onCustomSettingsChange({ framerate })}
                style={{ width: '100%' }}
              >
                <Option value={24}>24 FPS (电影)</Option>
                <Option value={25}>25 FPS (PAL)</Option>
                <Option value={30}>30 FPS (常用)</Option>
                <Option value={50}>50 FPS (流畅)</Option>
                <Option value={60}>60 FPS (高帧率)</Option>
              </Select>
            </div>
          </Col>

          <Col span={12}>
            <div className="formItem">
              <div className="formLabel">启用硬件加速</div>
              <Switch
                checked={customSettings.useHardwareAcceleration}
                onChange={useHardwareAcceleration => onCustomSettingsChange({ useHardwareAcceleration })}
              />
              <span className="switchDescription">
                启用可加快处理速度，但可能影响兼容性
              </span>
            </div>
          </Col>
        </Row>
      )}
    </>
  );
};

export default BasicSettings;
