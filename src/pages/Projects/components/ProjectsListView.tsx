import React from 'react';
import { List, Card, Tag, Space, Tooltip, Dropdown, Progress, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Button } from '@/components/ui/button';
import { PlayCircleOutlined, EllipsisOutlined, VideoCameraOutlined, FolderOpenOutlined } from '@ant-design/icons';
import type { ProjectUIStatus, ProjectView, ProjectUIStats } from '../types';

const { Text } = Typography;

interface ProjectsListViewProps {
  projects: ProjectView[];
  loading: boolean;
  statusConfig: Record<ProjectUIStatus, { color: string; text: string }>;
  getProjectUIStatus: (project: ProjectView) => ProjectUIStats;
  formatDate: (value: string) => string;
  onOpenProject: (projectId: string) => void;
  onOpenEditor: (projectId: string) => void;
  onPreloadProject: () => void;
  onPreloadEditor: () => void;
  projectActions: (project: ProjectView) => MenuProps;
}

const ProjectsListView: React.FC<ProjectsListViewProps> = ({
  projects,
  loading,
  statusConfig,
  getProjectUIStatus,
  formatDate,
  onOpenProject,
  onOpenEditor,
  onPreloadProject,
  onPreloadEditor,
  projectActions,
}) => {
  return (
    <List
      loading={loading}
      dataSource={projects}
      rowKey="id"
      pagination={{ pageSize: 10, size: 'small', showSizeChanger: false }}
      renderItem={(project) => {
        const uiStatus = getProjectUIStatus(project);

        return (
          <List.Item key={project.id} style={{ paddingLeft: 0, paddingRight: 0 }}>
            <Card
              hoverable
              style={{ width: '100%' }}
              onClick={() => onOpenProject(project.id)}
              onMouseEnter={onPreloadProject}
              bodyStyle={{ padding: '14px 16px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Space size={8} wrap>
                    <Tag color={statusConfig[uiStatus.status]?.color}>{statusConfig[uiStatus.status]?.text}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(project.updatedAt)}</Text>
                  </Space>
                  <div>
                    <Text strong>{project.name}</Text>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {project.description || '无项目描述'}
                    </Text>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Progress percent={uiStatus.progress} size="small" strokeColor={{ from: '#667eea', to: '#764ba2' }} />
                  </div>
                  <Space size={10} style={{ marginTop: 6 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}><VideoCameraOutlined /> {uiStatus.videoCount}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}><FolderOpenOutlined /> {uiStatus.scriptCount}</Text>
                  </Space>
                </div>
                <Space>
                  <Tooltip title="进入工作台">
                    <Button variant="ghost" size="icon-sm">
                      <PlayCircleOutlined />
                    </Button>
                  </Tooltip>
                  <Dropdown menu={projectActions(project)} trigger={['click']}>
                    <Button variant="ghost" size="icon-sm" />
                  </Dropdown>
                </Space>
              </div>
            </Card>
          </List.Item>
        );
      }}
    />
  );
};

export default ProjectsListView;
