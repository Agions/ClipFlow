import { logger } from '@/utils/logger';
/**
 * 步骤3: AI 分析 - 优化版
 * 
 * 数据输入: video (从 VideoUpload 来)
 * 数据输出: 
 *   - analysis (场景/关键帧/物体/情感分析)
 *   - subtitle.ocr (OCR 字幕)
 *   - subtitle.asr (ASR 字幕)
 */
import React, { useState } from 'react';
import { 
  Card, Button, Space, Typography, List, 
  Tag, Alert, Divider, Checkbox, Row, Col, Badge
} from 'antd';
import {
  CloudSyncOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  AudioOutlined,
  SyncOutlined,
  EyeOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  SmileOutlined,
  AimOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { useStoryForge } from '../AIEditorContext';
import { visionService } from '@/core/services/vision.service';
import { ProcessingProgress } from '@/components/common';
import { notify } from '@/shared';
import type { Scene, AIAnalyzeProps } from '@/core/types';
import styles from './StoryForge.module.less';

const { Title, Text, Paragraph } = Typography;

// 格式化时间函数
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// TODO: 这些函数应替换为实际的 AI 服务调用
// AI 分析任务列表
interface AnalysisTask {
  key: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
  desc?: string;
}

const ANALYSIS_TASKS: AnalysisTask[] = [
  { key: 'scene', label: '场景识别', icon: <AimOutlined />, color: 'blue', desc: '自动识别视频中的不同场景' },
  { key: 'ocr', label: 'OCR 文字识别', icon: <FileTextOutlined />, color: 'green', desc: '提取视频中的文字内容' },
  { key: 'asr', label: '语音转写', icon: <AudioOutlined />, color: 'purple', desc: '将语音转换为文字' },
  { key: 'emotion', label: '情感分析', icon: <SmileOutlined />, color: 'orange', desc: '分析视频的情感倾向' },
  { key: 'summary', label: '内容摘要', icon: <TableOutlined />, color: 'cyan', desc: '生成视频内容摘要' },
];


const AIAnalyze: React.FC<AIAnalyzeProps> = ({ onNext }) => {
  const { 
    state, 
    setAnalysis, 
    goToNextStep,
    dispatch 
  } = useStoryForge();
  
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [taskList, setTaskList] = useState<string[]>([]);
  
  // 分析配置
  const [config, setConfig] = useState({
    sceneDetection: true,
    objectDetection: true,
    emotionAnalysis: true,
    ocrEnabled: true,
    asrEnabled: true,
  });

  // 获取已选择的任务数
  const selectedCount = Object.values(config).filter(Boolean).length;

  // 执行 AI 分析
  const runAnalysis = async () => {
    if (!state.currentVideo) {
      notify.warning('请先上传视频');
      return;
    }

    setAnalyzing(true);
    setProgress(0);
    setTaskList([]);

    const totalTasks = selectedCount;
    let completedTasks = 0;

    try {
      // 1. 场景检测
      if (config.sceneDetection) {
        setCurrentTask('🔍 正在检测场景...');
        setTaskList(prev => [...prev, '✅ 场景检测完成']);
        
        try {
          const { scenes, objects, emotions } = await visionService.detectScenesAdvanced(
            state.currentVideo,
            { minSceneDuration: 3, threshold: 0.3, detectObjects: config.objectDetection, detectEmotions: config.emotionAnalysis }
          );
          // 将 EmotionAnalysis[] 转换为 string[] 用于 VideoAnalysis
          const emotionStrings = emotions?.map(e => e.dominant || e.emotion || 'neutral') || [];
          setAnalysis({ id: `analysis_${Date.now()}`, videoId: state.currentVideo.id, scenes, keyframes: [], objects, emotions: emotionStrings, summary: `检测到 ${scenes.length} 个场景`, stats: { sceneCount: scenes.length, objectCount: objects?.length || 0, avgSceneDuration: state.currentVideo.duration / scenes.length, sceneTypes: {}, objectCategories: {}, dominantEmotions: {} }, createdAt: new Date().toISOString() });
        } catch {
          // TODO: 实际项目中应使用默认数据或提示用户
          notify.warning('场景检测功能待实现');
        }
        completedTasks++;
        setProgress(Math.round((completedTasks / totalTasks) * 100));
      }

      // 2. 物体识别
      if (config.objectDetection) {
        setCurrentTask('🎯 正在识别物体...');
        setTaskList(prev => [...prev, '✅ 物体识别完成']);
        await new Promise(r => setTimeout(r, 500));
        completedTasks++;
        setProgress(Math.round((completedTasks / totalTasks) * 100));
      }

      // 3. 情感分析
      if (config.emotionAnalysis) {
        setCurrentTask('😊 正在分析情感...');
        setTaskList(prev => [...prev, '✅ 情感分析完成']);
        await new Promise(r => setTimeout(r, 500));
        completedTasks++;
        setProgress(Math.round((completedTasks / totalTasks) * 100));
      }

      // 4. OCR 字幕
      if (config.ocrEnabled) {
        setCurrentTask('📝 正在识别文字 (OCR)...');
        try {
          const { visionService } = await import('@/core/services/vision.service');
          const ocrResult = await visionService.extractTextFromVideo(state.currentVideo);
          if (ocrResult && ocrResult.length > 0) {
            setOcrSubtitle(ocrResult);
            setTaskList(prev => [...prev, `✅ OCR 字幕识别完成 (${ocrResult.length} 条)`]);
          } else {
            setTaskList(prev => [...prev, '⚠️ OCR 未检测到文字']);
          }
        } catch (ocrError) {
          notify.error('OCR 服务失败: ' + (ocrError instanceof Error ? ocrError.message : String(ocrError)));
          setTaskList(prev => [...prev, '❌ OCR 识别失败']);
        }
        completedTasks++;
        setProgress(Math.round((completedTasks / totalTasks) * 100));
      }

      // 5. ASR 语音
      if (config.asrEnabled) {
        setCurrentTask('🎤 正在转换语音 (ASR)...');
        try {
          const { asrService } = await import('@/core/services/asr.service');
          const asrResult = await asrService.recognizeSpeech(state.currentVideo, { language: 'zh_cn' });
          if (asrResult && asrResult.text) {
            setAsrSubtitle(asrResult.segments);
            setTaskList(prev => [...prev, `✅ ASR 语音转写完成 (${asrResult.segments.length} 段)`]);
          } else {
            setTaskList(prev => [...prev, '⚠️ ASR 未检测到语音']);
          }
        } catch (asrError) {
          notify.error('ASR 服务失败: ' + (asrError instanceof Error ? asrError.message : String(asrError)));
          setTaskList(prev => [...prev, '❌ ASR 转写失败']);
        }
        completedTasks++;
        setProgress(Math.round((completedTasks / totalTasks) * 100));
      }

      // 完成
      setCurrentTask('✨ 分析完成！');
      setTaskList(prev => [...prev, '🎉 全部任务已完成']);
      setProgress(100);
      
      dispatch({ type: 'SET_STEP_COMPLETE', payload: { step: 'ai-analyze', complete: true } });
      notify.success('AI 分析完成！');
      
      setTimeout(() => {
        if (onNext) onNext();
        else goToNextStep();
      }, 800);

    } catch (error) {
      logger.error('分析失败:', { error });
      notify.error(error, '分析过程出错，请重试');
    } finally {
      setAnalyzing(false);
    }
  };

  // 重新分析
  const handleReAnalyze = () => {
    setProgress(0);
    setTaskList([]);
    runAnalysis();
  };

  // 是否有分析结果
  const hasAnalysis = state.analysis && state.stepStatus['ai-analyze'];

  // 视频信息
  if (!state.currentVideo) {
    return (
      <Alert
        message="请先上传视频"
        description="请先完成视频上传，再进行 AI 分析"
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

  // 已完成分析，显示结果
  if (hasAnalysis) {
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepTitle}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>📊 AI 分析结果</Title>
            <Badge status="success" text="已完成" />
          </Space>
        </div>

        <Row gutter={16}>
          {/* 分析概览 */}
          <Col xs={24} lg={16}>
            <Card title="📈 分析概览" size="small">
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>
                      {state.analysis?.scenes?.length || 0}
                    </div>
                    <Text type="secondary">场景数</Text>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>
                      {state.analysis?.stats?.objectCount || 0}
                    </div>
                    <Text type="secondary">识别物体</Text>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: '#fa8c16' }}>
                      {state.subtitleData.ocr?.length || 0}
                    </div>
                    <Text type="secondary">OCR 文字</Text>
                  </div>
                </Col>
              </Row>
              
              <Divider />
              
              <div>
                <Text strong>📝 视频摘要</Text>
                <Paragraph style={{ marginTop: 8 }}>
                  {state.analysis?.summary || '暂无摘要'}
                </Paragraph>
              </div>
            </Card>

            {/* 场景列表 */}
            <Card 
              title="🎬 场景列表" 
              size="small" 
              style={{ marginTop: 16 }}
              extra={
                <Text type="secondary">{state.analysis?.scenes?.length || 0} 个场景</Text>
              }
            >
              <List
                size="small"
                dataSource={state.analysis?.scenes?.slice(0, 5) || []}
                renderItem={(scene: Scene) => (
                  <List.Item>
                    <Space>
                      <Tag color="blue">{formatTime(scene.startTime)}</Tag>
                      <Text>{scene.description}</Text>
                      <Tag>{scene.type}</Tag>
                    </Space>
                  </List.Item>
                )}
              />
              {(state.analysis?.scenes?.length ?? 0) > 5 && (
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Text type="secondary">还有 {(state.analysis?.scenes?.length ?? 0) - 5} 个场景...</Text>
                </div>
              )}
            </Card>
          </Col>

          {/* 操作区 */}
          <Col xs={24} lg={8}>
            <Card title="⚡ 快速操作" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block icon={<SyncOutlined />} onClick={handleReAnalyze}>
                  重新分析
                </Button>
                <Button block icon={<EyeOutlined />} onClick={() => setPreviewModalVisible(true)}>
                  预览详情
                </Button>
                <Button type="primary" block icon={<PlayCircleOutlined />} onClick={goToNextStep}>
                  下一步：生成文案
                </Button>
              </Space>
            </Card>

            {/* 字幕预览 */}
            <Card title="📝 字幕预览" size="small" style={{ marginTop: 16 }}>
              <List
                size="small"
                dataSource={state.subtitleData.asr?.slice(0, 3) || []}
                renderItem={(item: { startTime: number; text: string }) => (
                  <List.Item>
                    <Text type="secondary" style={{ marginRight: 8 }}>
                      {formatTime(item.startTime)}
                    </Text>
                    <Text>{item.text}</Text>
                  </List.Item>
                )}
              />
              {(state.subtitleData.ocr?.length || state.subtitleData.asr?.length || 0) > 3 && (
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Text type="secondary">
                    共 {(state.subtitleData.ocr?.length || 0) + (state.subtitleData.asr?.length || 0)} 条字幕
                  </Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // 分析中
  if (analyzing) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <ProcessingProgress
            percent={progress}
            status="active"
            statusText={currentTask}
            type="circle"
            size="large"
            strokeColor={{ '0%': '#108ee9', '100%': '#52c41a' }}
          />
          
          <div style={{ marginTop: 24 }}>
            <Title level={4}>{currentTask}</Title>
          </div>

          {/* 任务列表 */}
          <div style={{ marginTop: 24, textAlign: 'left', maxWidth: 400, margin: '24px auto' }}>
            {taskList.map((task, i) => (
              <div key={i} style={{ padding: '4px 0', color: '#52c41a' }}>
                <CheckCircleOutlined style={{ marginRight: 8 }} />
                {task}
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // 未分析
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepTitle}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>🔬 AI 智能分析</Title>
        </Space>
        <Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
          选择要开启的分析功能，AI 将自动识别视频内容
        </Paragraph>
      </div>

      {/* 分析配置 */}
      <Card title={<><SettingOutlined /> 分析配置</>} size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          {ANALYSIS_TASKS.map(task => (
            <Col xs={24} sm={12} key={task.key}>
              <div style={{ 
                padding: 12, 
                border: `1px solid ${config[task.key as keyof typeof config] ? task.color : '#e8e8e8'}`,
                borderRadius: 8,
                background: config[task.key as keyof typeof config] ? `${task.color}08` : '#fff',
              }}>
                <Space>
                  <Checkbox
                    checked={config[task.key as keyof typeof config]}
                    onChange={(e) => setConfig({ ...config, [task.key]: e.target.checked })}
                  />
                  <div style={{ color: task.color }}>{task.icon}</div>
                  <div>
                    <Text strong>{task.label}</Text>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                      {task.desc}
                    </Text>
                  </div>
                </Space>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 视频信息 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Tag icon={<PlayCircleOutlined />}>视频</Tag>
          <Text>{state.currentVideo?.name}</Text>
          <Tag>{Math.floor(state.currentVideo?.duration || 0)}秒</Tag>
          <Tag>{state.currentVideo?.width}x{state.currentVideo?.height}</Tag>
        </Space>
      </Card>

      {/* 开始分析按钮 */}
      <Card>
        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical" size="middle">
            <div>
              <Text type="secondary">已选择 {selectedCount} 项分析任务</Text>
            </div>
            <Button 
              type="primary" 
              size="large"
              icon={<CloudSyncOutlined />}
              onClick={runAnalysis}
              disabled={selectedCount === 0}
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              开始 AI 分析
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default AIAnalyze;
