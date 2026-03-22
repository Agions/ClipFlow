import React, { useState, useCallback } from 'react';
import { Card, Typography, Button, Space, Select, Progress, List, Input, Empty, Switch } from 'antd';
import { AudioOutlined, FileTextOutlined, EditOutlined, DownloadOutlined, SyncOutlined } from '@ant-design/icons';
import { motion } from '@/components/common/motion-shim';
import { notify } from '@/shared';
import { subtitleService as _subtitleService } from '@/core/services';

const { Text } = Typography;
const { Option } = Select;

interface SubtitleSegment {
  id: string;
  start: string;
  end: string;
  text: string;
}

interface SubtitleExtractorProps {
  projectId: string;
  videoUrl?: string;
  onExtracted?: (subtitles: SubtitleSegment[]) => void;
}

const SubtitleExtractor: React.FC<SubtitleExtractorProps> = ({ projectId, videoUrl, onExtracted }) => {
  const [format, setFormat] = useState('srt');
  const [translate, setTranslate] = useState(false);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedSubtitles, setExtractedSubtitles] = useState<SubtitleSegment[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // 提取字幕
  const handleExtract = useCallback(async () => {
    if (!videoUrl) {
      notify.error(null, '未检测到视频源');
      return;
    }
    
    setIsExtracting(true);
    setProgress(0);
    setExtractedSubtitles([]);
    
    try {
      // 模拟进度更新 - TODO: Replace with actual subtitle service call
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      // TODO: 调用实际的字幕服务 (subtitleService.recognizeSpeech)
      // 需要获取视频的音频轨道并传给 ASR
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // TODO: 替换为实际字幕结果
      // const result = await subtitleService.recognizeSpeech(audioBuffer, options);
      
      notify.success('字幕提取功能待实现');
      
    } catch (error) {
      notify.error(error, '字幕提取失败，请重试');
    } finally {
      setIsExtracting(false);
    }
  }, [videoUrl, onExtracted]);

  const handleSaveEdit = (id: string) => {
    setExtractedSubtitles(prev => prev.map(s => s.id === id ? { ...s, text: editingText } : s));
    setEditingId(null);
    notify.success('字幕修改已保存');
  };

  const exportSubtitle = () => {
    if (extractedSubtitles.length === 0) {
      notify.warning('无字幕可导出');
      return;
    }
    
    let content = '';
    if (format === 'srt') {
      content = extractedSubtitles.map((sub, index) => `${index + 1}\n${sub.start} --> ${sub.end}\n${sub.text}\n\n`).join('');
    } else if (format === 'vtt') {
      content = 'WEBVTT\n\n' + extractedSubtitles.map((sub, index) => `${index + 1}\n${sub.start.replace(',', '.')} --> ${sub.end.replace(',', '.')}\n${sub.text}\n\n`).join('');
    } else {
      content = extractedSubtitles.map(sub => `[${sub.start} - ${sub.end}] ${sub.text}`).join('\n');
    }
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitle_${projectId}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify.success(`已导出为 ${format.toUpperCase()} 格式`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} role="region" aria-label="字幕提取器">
      <Card title={<><AudioOutlined /> 智能语音识别设置</>} bordered={false} style={{ borderRadius: 10 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large" role="group" aria-label="字幕提取设置">
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>识别语言</Text>
              <Input value="中文（固定）" disabled style={{ width: 180 }} aria-label="识别语言" />
            </div>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>导出格式</Text>
              <Select value={format} onChange={setFormat} style={{ width: 140 }} aria-label="导出格式选择">
                <Option value="srt">SRT</Option>
                <Option value="vtt">VTT</Option>
                <Option value="txt">纯文本</Option>
              </Select>
            </div>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>同步翻译(实验性)</Text>
              <Switch checked={translate} onChange={setTranslate} checkedChildren="开启" unCheckedChildren="关闭" aria-label="同步翻译开关" />
            </div>
          </div>
          
          {isExtracting && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <Text strong>正在分析音频轨道并提取文本...</Text>
              <Progress percent={progress} strokeColor={{ from: '#667eea', to: '#764ba2' }} status="active" />
            </motion.div>
          )}

          {!isExtracting && (
            <Button 
              type="primary" 
              icon={<SyncOutlined />} 
              onClick={handleExtract}
              size="large"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', borderRadius: 8 }}
              aria-label="开始提取字幕"
            >
              开始提取字幕
            </Button>
          )}
        </Space>
      </Card>

      {extractedSubtitles.length > 0 && (
        <Card 
          title={<><FileTextOutlined /> 提取结果</>} 
          bordered={false} 
          style={{ borderRadius: 10 }}
          extra={
            <Button icon={<DownloadOutlined />} onClick={exportSubtitle}>
              导出字幕文件
            </Button>
          }
        >
          <List
            itemLayout="horizontal"
            dataSource={extractedSubtitles}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button 
                    type="text" 
                    icon={<EditOutlined />} 
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingText(item.text);
                    }}
                  >
                    编辑
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<div style={{ padding: '4px 8px', background: '#f0f2f5', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>{item.start}<br/>↓<br/>{item.end}</div>}
                  title={
                    editingId === item.id ? (
                      <Input.TextArea 
                        value={editingText} 
                        onChange={(e) => setEditingText(e.target.value)} 
                        autoSize={{ minRows: 2, maxRows: 4 }}
                      />
                    ) : (
                      <span style={{ fontSize: 15 }}>{item.text}</span>
                    )
                  }
                  description={
                    editingId === item.id ? (
                      <Space style={{ marginTop: 8 }}>
                        <Button size="small" type="primary" onClick={() => handleSaveEdit(item.id)}>保存</Button>
                        <Button size="small" onClick={() => setEditingId(null)}>取消</Button>
                      </Space>
                    ) : (
                      translate && <span style={{ color: '#8c8c8c', fontStyle: 'italic' }}>{item.text.replace(/./g, '-')} (翻译生成中)</span>
                    )
                  }
                />
              </List.Item>
            )}
            style={{ maxHeight: 400, overflowY: 'auto' }}
          />
        </Card>
      )}

      {!isExtracting && extractedSubtitles.length === 0 && (
        <Empty 
          description="尚未提取字幕" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: '40px 0', background: '#fafafa', borderRadius: 10 }}
        />
      )}
    </div>
  );
};

export default SubtitleExtractor;
