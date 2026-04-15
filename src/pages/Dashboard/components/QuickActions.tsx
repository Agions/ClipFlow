/**
 * 快捷操作组件
 */
import React from 'react';
import { Card, Row, Col } from 'antd';
import {
  VideoCameraOutlined,
  FolderOutlined,
  FireOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  preloadAIVideoEditorPage,
  preloadProjectsPage,
  preloadSettingsPage,
} from '@/core/utils/route-preload';
import styles from '../index.module.less';

const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const tools = [
    {
      key: 'templates',
      icon: <VideoCameraOutlined className={styles.toolIcon} />,
      title: '模板库',
      desc: '使用专业模板快速创建',
      path: '/workflow',
      preloadFn: preloadAIVideoEditorPage,
    },
    {
      key: 'materials',
      icon: <FolderOutlined className={styles.toolIcon} />,
      title: '素材库',
      desc: '管理您的视频素材',
      path: '/projects',
      preloadFn: preloadProjectsPage,
    },
    {
      key: 'ai',
      icon: <FireOutlined className={styles.toolIcon} />,
      title: 'AI 助手',
      desc: '智能生成内容与剪辑',
      path: '/ai-editor',
      preloadFn: preloadAIVideoEditorPage,
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined className={styles.toolIcon} />,
      title: '数据分析',
      desc: '查看您的创作数据',
      path: '/settings',
      preloadFn: preloadSettingsPage,
    },
  ];

  const handleCardClick = (path: string, preloadFn?: () => void) => {
    if (preloadFn) {
      void preloadFn();
    }
    navigate(path);
  };

  const handleKeyDown = (e: React.KeyboardEvent, path: string, preloadFn?: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(path, preloadFn);
    }
  };

  return (
    <Card className={styles.quickTools}>
      <Row gutter={[16, 16]} className={styles.toolGrid}>
        {tools.map((tool) => (
          <Col xs={24} sm={8} md={6} key={tool.key}>
            <Card
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
              {tool.icon}
              <div className={styles.toolTitle}>{tool.title}</div>
              <div className={styles.toolDesc}>{tool.desc}</div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default QuickActions;
