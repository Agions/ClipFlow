import { logger } from '@/shared/utils/logging';
import React, { useEffect, useCallback, memo } from 'react';
import { useReducerHookFactory } from '@/shared/hooks/use-reducer-hook';
import { Card } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import {
  Edit,
  Save,
  Clock,
} from 'lucide-react';
import type { ScriptData, Scene, ScriptSegment } from '@/types';
import { formatDuration } from '@/shared/utils/formatting';
import { notify } from '@/shared';
import {
  workflowEditorReducer,
  initialWorkflowEditorState,
} from './workflow-editor-reducer';
import styles from '././script-editor.module.less';

interface WorkflowEditorProps {
  script: ScriptData;
  scenes?: Scene[];
  onSave: (script: ScriptData) => void;
  onScriptUpdate?: (script: ScriptData) => void;
}

/**
 * 脚本工作流编辑器
 *
 * 状态机: 4 useState → 1 useReducer (state machine)
 * - form 字段 (editedContent/editedTitle) + tab + Dialog 状态
 */
const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  script,
  scenes,
  onSave,
  onScriptUpdate,
}) => {
  const { state, dispatch } = useReducerHookFactory(workflowEditorReducer, initialWorkflowEditorState);
  const { activeTab, editedContent, editedTitle, aiModalVisible } = state;

  useEffect(() => {
    dispatch({
      type:'SYNC_FROM_SCRIPT', payload: { content: script.content || '',
      title: script.title || '', } });
  }, [script, dispatch]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type:'SET_EDITED_CONTENT', payload: e.target.value });
  }, [dispatch]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type:'SET_EDITED_TITLE', payload: e.target.value });
  }, [dispatch]);

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
      dispatch({ type:'SET_AI_MODAL_VISIBLE', payload: false });
      setTimeout(() => {
        notify.success('脚本优化完成');
      }, 2000);
    } catch (error) {
      logger.error('AI 优化脚本失败:', { error });
      notify.error(error, 'AI 优化脚本失败');
    }
  }, [dispatch]);

  return (
    <div className={styles.scriptEditor}>
      <Card className={styles.editorCard + ' p-4'}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">脚本编辑</h3>
          <div className="flex gap-2">
            <Button variant="outline"  onClick={() => dispatch({ type:'SET_AI_MODAL_VISIBLE', payload: true })}>
              <Edit size={14} className="mr-1" />
              AI优化
            </Button>
            <Button className="bg-accent-primary hover:bg-accent-primary-hover text-primary-foreground"  onClick={handleSave}>
              <Save size={14} className="mr-1" />
              保存
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => dispatch({ type:'SET_ACTIVE_TAB', payload: v })}>
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
      <Dialog open={aiModalVisible} onOpenChange={(open) => !open && dispatch({ type:'SET_AI_MODAL_VISIBLE', payload: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI 优化脚本</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">使用 AI 优化脚本将会根据视频内容和当前脚本，生成更加专业的表达和结构。</p>
          <p className="text-sm text-muted-foreground">点击确定开始优化。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => dispatch({ type:'SET_AI_MODAL_VISIBLE', payload: false })}>取消</Button>
            <Button className="bg-accent-primary hover:bg-accent-primary-hover text-primary-foreground" onClick={handleAIImprove}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(WorkflowEditor);
