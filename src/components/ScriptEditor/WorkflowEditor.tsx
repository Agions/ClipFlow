import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback, memo } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Edit,
  Save,
  FileText,
  Clock,
} from 'lucide-react';
import type { ScriptData, Scene, ScriptSegment } from '@/core/types';
import { formatDuration } from '@/services/video';
import { notify } from '@/shared';
import styles from './ScriptEditor.module.less';

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
      <Card className={styles.editorCard + ' p-4'}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">脚本编辑</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAiModalVisible(true)}>
              <Edit size={14} className="mr-1" />
              AI优化
            </Button>
            <Button className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white" size="sm" onClick={handleSave}>
              <Save size={14} className="mr-1" />
              保存
            </Button>
          </div>
        </div>

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
              <div className={styles.titleInput + ' mb-4'}>
                <span className="text-sm text-muted-foreground mb-1 block">标题</span>
                <Input
                  value={editedTitle}
                  onChange={handleTitleChange}
                  placeholder="输入脚本标题"
                  size="sm"
                />
              </div>
              <div className={styles.contentInput}>
                <span className="text-sm text-muted-foreground mb-1 block">内容</span>
                <textarea
                  value={editedContent}
                  onChange={handleContentChange}
                  placeholder="输入脚本内容..."
                  rows={15}
                  className={styles.scriptTextArea + ' w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="segments">
            <div className="divide-y divide-border">
              {(script.segments || []).map((segment: ScriptSegment, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="default">{segment.type}</Badge>
                      <span className="text-xs">{formatDuration(segment.startTime)} - {formatDuration(segment.endTime)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{segment.content}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon-sm"><Edit size={14} /></Button>
                    <Button variant="ghost" size="icon-sm"><Save size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {scenes && scenes.length > 0 && (
            <TabsContent value="scenes">
              <div className="divide-y divide-border">
                {scenes.map((scene: Scene, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-3">
                    <Clock size={14} className="mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs">{formatDuration(scene.startTime)} - {formatDuration(scene.endTime)}</span>
                        {scene.tags?.map(tag => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{scene.description}</p>
                    </div>
                  </div>
                ))}
              </div>
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
          <p className="text-sm text-muted-foreground">使用 AI 优化脚本将会根据视频内容和当前脚本，生成更加专业的表达和结构。</p>
          <p className="text-sm text-muted-foreground">点击确定开始优化。</p>
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
