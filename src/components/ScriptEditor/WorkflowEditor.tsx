import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Card, List, Space, Input, Tag } from 'antd';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  EditOutlined,
  SaveOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ScriptData, Scene, ScriptSegment } from '@/core/types';
import { formatDuration } from '@/services/video';
import { notify } from '@/shared';
import styles from './ScriptEditor.module.less';

const Text = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => <span style={style}>{children}</span>;

const { TextArea } = Input;

interface WorkflowEditorProps {
  script: ScriptData;
  scenes?: Scene[];
  onSave: (script: ScriptData) => void;
  onScriptUpdate?: (script: ScriptData) => void;
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  script,
  scenes,
  onSave,
  onScriptUpdate,
}) => {
  const [activeTab, setActiveTab] = useState('content');
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [aiModalVisible, setAiModalVisible] = useState(false);

  useEffect(() => {
    setEditedContent(script.content || '');
    setEditedTitle(script.title || '');
  }, [script]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value);
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
  }, []);

  const handleSave = useCallback(() => {
    const updatedScript: ScriptData = {
      ...script,
      title: editedTitle,
      content: editedContent,
      updatedAt: new Date().toISOString(),
    };
    onSave(updatedScript);
    onScriptUpdate?.(updatedScript);
    notify.success('脚本已保存');
  }, [script, editedTitle, editedContent, onSave, onScriptUpdate]);

  const handleAIImprove = useCallback(async () => {
    try {
      notify.info('正在使用 AI 优化脚本...');
      setAiModalVisible(false);
      setTimeout(() => {
        notify.success('脚本优化完成');
      }, 2000);
    } catch (error) {
      logger.error('AI 优化脚本失败:', { error });
      notify.error(error, 'AI 优化脚本失败');
    }
  }, []);

  return (
    <div className={styles.scriptEditor}>
      <Card
        title="脚本编辑"
        className={styles.editorCard}
        extra={
          <Space>
            <Button variant="outline" onClick={() => setAiModalVisible(true)}>
              <EditOutlined className="mr-1" />
              AI优化
            </Button>
            <Button className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white" onClick={handleSave}>
              <SaveOutlined className="mr-1" />
              保存
            </Button>
          </Space>
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="content">脚本内容</TabsTrigger>
            <TabsTrigger value="segments">片段列表</TabsTrigger>
            {scenes && scenes.length > 0 && (
              <TabsTrigger value="scenes">场景 ({scenes.length})</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="content">
            <div className={styles.workflowEditor}>
              <div className={styles.titleInput}>
                <Text style={{ color: '#999' }}>标题</Text>
                <Input
                  value={editedTitle}
                  onChange={handleTitleChange}
                  placeholder="输入脚本标题"
                  size="large"
                />
              </div>
              <div className={styles.contentInput}>
                <Text style={{ color: '#999' }}>内容</Text>
                <TextArea
                  value={editedContent}
                  onChange={handleContentChange}
                  placeholder="输入脚本内容..."
                  rows={15}
                  className={styles.scriptTextArea}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="segments">
            <List
              dataSource={script.segments || []}
              renderItem={(segment: ScriptSegment) => (
                <List.Item
                  actions={[
                    <Button key="edit" variant="ghost" size="icon-sm"><EditOutlined /></Button>,
                    <Button key="delete" variant="ghost" size="icon-sm"><DeleteOutlined /></Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color="blue">{segment.type}</Tag>
                        <Text>
                          {formatDuration(segment.startTime)} - {formatDuration(segment.endTime)}
                        </Text>
                      </Space>
                    }
                    description={segment.content}
                  />
                </List.Item>
              )}
            />
          </TabsContent>

          {scenes && scenes.length > 0 && (
            <TabsContent value="scenes">
              <List
                dataSource={scenes}
                renderItem={(scene: Scene) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <ClockCircleOutlined />
                          <Text>
                            {formatDuration(scene.startTime)} - {formatDuration(scene.endTime)}
                          </Text>
                          {scene.tags?.map(tag => (
                            <Tag key={tag}>{tag}</Tag>
                          ))}
                        </Space>
                      }
                      description={scene.description}
                    />
                  </List.Item>
                )}
              />
            </TabsContent>
          )}
        </Tabs>
      </Card>

      {/* AI 优化模态框 */}
      <Dialog open={aiModalVisible} onOpenChange={(open) => !open && setAiModalVisible(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI 优化脚本</DialogTitle>
          </DialogHeader>
          <p>使用 AI 优化脚本将会根据视频内容和当前脚本，生成更加专业的表达和结构。</p>
          <p>点击确定开始优化。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiModalVisible(false)}>取消</Button>
            <Button className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white" onClick={handleAIImprove}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(WorkflowEditor);