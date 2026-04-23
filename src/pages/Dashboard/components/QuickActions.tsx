/**
 * 快捷操作组件
 */
import React, { useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  FolderOpen,
  Flame,
  BarChart3,
} from 'lucide-react';
import {
  preloadAIVideoEditorPage,
  preloadProjectsPage,
  preloadSettingsPage,
} from '@/core/utils/route-preload';
import styles from '../index.module.less';

const QuickActions: React.FC = React.memo(() => {
  const navigate = useNavigate();

  const tools = useMemo(() => [
    {
      key: 'templates',
      icon: <Video size={20} className={styles.toolIcon} />,
      title: '模板库',
      desc: '使用专业模板快速创建',
      path: '/workflow',
      preloadFn: preloadAIVideoEditorPage,
    },
    {
      key: 'materials',
      icon: <FolderOpen size={20} className={styles.toolIcon} />,
      title: '素材库',
      desc: '管理您的视频素材',
      path: '/projects',
      preloadFn: preloadProjectsPage,
    },
    {
      key: 'ai',
      icon: <Flame size={20} className={styles.toolIcon} />,
      title: 'AI 助手',
      desc: '智能生成内容与剪辑',
      path: '/ai-editor',
      preloadFn: preloadAIVideoEditorPage,
    },
    {
      key: 'analytics',
      icon: <BarChart3 size={20} className={styles.toolIcon} />,
      title: '数据分析',
      desc: '查看您的创作数据',
      path: '/settings',
      preloadFn: preloadSettingsPage,
    },
  ], []);

  const handleCardClick = useCallback((path: string, preloadFn?: () => void) => {
    if (preloadFn) {
      void preloadFn();
    }
    navigate(path);
  }, [navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, path: string, preloadFn?: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(path, preloadFn);
    }
  }, [handleCardClick]);

  return (
    <div className={styles.quickTools}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tools.map((tool) => (
          <Card
            key={tool.key}
            className={styles.toolCard}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, tool.path, tool.preloadFn)}
            onMouseEnter={() => {
              if (tool.preloadFn) {
                void tool.preloadFn();
              }
            }}
            onClick={() => handleCardClick(tool.path, tool.preloadFn)}
            aria-label={`${tool.title}: ${tool.desc}`}
          >
            <div className="flex flex-col items-center gap-2 py-2">
              {tool.icon}
              <div className={styles.toolTitle}>{tool.title}</div>
              <div className={styles.toolDesc}>{tool.desc}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
});

export default QuickActions;
QuickActions.displayName = 'QuickActions';
