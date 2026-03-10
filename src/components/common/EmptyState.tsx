/**
 * 空状态组件
 * 统一管理各页面的空数据展示
 */
import React from 'react';
import { Empty, Button, Typography } from 'antd';
import { FolderOutlined, FileTextOutlined, VideoCameraOutlined, InboxOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface EmptyStateProps {
  type?: 'project' | 'video' | 'file' | 'custom';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

const icons = {
  project: <FolderOutlined style={{ fontSize: 64, color: '#6366f1' }} />,
  video: <VideoCameraOutlined style={{ fontSize: 64, color: '#6366f1' }} />,
  file: <FileTextOutlined style={{ fontSize: 64, color: '#6366f1' }} />,
  custom: <InboxOutlined style={{ fontSize: 64, color: '#6366f1' }} />,
};

const defaultContent = {
  project: {
    title: '暂无项目',
    description: '创建您的第一个项目开始创作',
    actionText: '创建项目',
  },
  video: {
    title: '暂无视频',
    description: '上传视频开始编辑',
    actionText: '上传视频',
  },
  file: {
    title: '暂无文件',
    description: '上传文件继续操作',
    actionText: '上传文件',
  },
  custom: {
    title: '暂无内容',
    description: '开始添加内容',
    actionText: '添加',
  },
};

/**
 * 空状态组件
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'custom',
  title,
  description,
  actionText,
  onAction,
  icon,
}) => {
  const content = defaultContent[type];
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '60px 20px',
      textAlign: 'center',
    }}>
      {icon || icons[type]}
      <div style={{ marginTop: 16 }}>
        <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
          {title || content.title}
        </Text>
        <Text type="secondary">
          {description || content.description}
        </Text>
      </div>
      {onAction && (
        <Button 
          type="primary" 
          size="large"
          style={{ marginTop: 24 }}
          onClick={onAction}
        >
          {actionText || content.actionText}
        </Button>
      )}
    </div>
  );
};

/**
 * 项目空状态
 */
export const ProjectEmpty: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => (
  <EmptyState type="project" onAction={onCreate} />
);

/**
 * 视频空状态
 */
export const VideoEmpty: React.FC<{ onUpload?: () => void }> = ({ onUpload }) => (
  <EmptyState type="video" onAction={onUpload} />
);

/**
 * 文件空状态
 */
export const FileEmpty: React.FC<{ onUpload?: () => void }> = ({ onUpload }) => (
  <EmptyState type="file" onAction={onUpload} />
);

export default EmptyState;
