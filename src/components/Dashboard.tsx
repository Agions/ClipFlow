import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Row, Col, Button, Typography, Tooltip, Dropdown, Spin, Input, Modal, Form, Select, DatePicker } from 'antd';
import { 
  PlusOutlined, 
  MoreOutlined, 
  ClockCircleOutlined, 
  StarOutlined, 
  StarFilled,
  DeleteOutlined,
  CopyOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  VideoCameraOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { formatDuration, formatDate } from '@/shared';
import styles from './Dashboard.module.less';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ProjectType {
  id: string;
  title: string;
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
  duration: number;
  resolution: string;
  starred: boolean;
}

interface CreateProjectFormValues {
  title: string;
  resolution: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    // 从API获取项目数据
    setLoading(true);
    // TODO: 连接实际API获取项目数据
    setProjects([]);
    setLoading(false);
  }, []);

  // 使用 useCallback 缓存回调函数
  const handleCreateProject = useCallback((values: CreateProjectFormValues) => {
    console.log('创建新项目:', values);
    // 这里应该实现实际的项目创建逻辑
    setShowCreateModal(false);
    form.resetFields();
    
    // 模拟创建后添加到列表
    const newProject: ProjectType = {
      id: Date.now().toString(),
      title: values.title,
      thumbnail: 'https://picsum.photos/seed/new/300/200',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      duration: 0,
      resolution: values.resolution,
      starred: false
    };
    
    setProjects(prev => [newProject, ...prev]);
  }, [form]);

  const handleOpenProject = (projectId: string) => {
    navigate(`/editor/${projectId}`);
  };

  const handleStarProject = (projectId: string, isStarred: boolean) => {
    setProjects(projects.map(project => 
      project.id === projectId 
        ? { ...project, starred: !isStarred } 
        : project
    ));
  };

  const handleDeleteProject = (projectId: string) => {
    Modal.confirm({
      title: '确定要删除这个项目吗？',
      content: '删除后无法恢复',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setProjects(projects.filter(project => project.id !== projectId));
      }
    });
  };

  const handleDuplicateProject = (projectId: string) => {
    const projectToDuplicate = projects.find(p => p.id === projectId);
    if (projectToDuplicate) {
      const duplicatedProject: ProjectType = {
        ...projectToDuplicate,
        id: Date.now().toString(),
        title: `${projectToDuplicate.title} (副本)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        starred: false
      };
      setProjects([duplicatedProject, ...projects]);
    }
  };

  // 使用 useMemo 缓存过滤和排序结果
  const filteredProjects = useMemo(() => {
    return projects
      .filter(project => project.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const fieldA = sortBy === 'title' ? a[sortBy].toLowerCase() : new Date(a[sortBy]).getTime();
        const fieldB = sortBy === 'title' ? b[sortBy].toLowerCase() : new Date(b[sortBy]).getTime();
        
        if (sortOrder === 'asc') {
          return fieldA > fieldB ? 1 : -1;
        } else {
          return fieldA < fieldB ? 1 : -1;
        }
      });
  }, [projects, searchQuery, sortBy, sortOrder]);

  const sortOptions = [
    { label: '最近编辑', value: 'updatedAt' },
    { label: '创建时间', value: 'createdAt' },
    { label: '名称', value: 'title' }
  ];

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <Title level={3}>我的项目</Title>
        <div className={styles.dashboardActions}>
          <Input 
            placeholder="搜索项目..." 
            prefix={<SearchOutlined />} 
            className={styles.searchInput}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Dropdown 
            menu={{
              items: sortOptions.map(option => ({
                key: option.value,
                label: option.label,
                onClick: () => {
                  if (sortBy === option.value) {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy(option.value as 'updatedAt' | 'createdAt' | 'title');
                    setSortOrder('desc');
                  }
                }
              }))
            }}
            trigger={['click']}
          >
            <Button icon={<SortAscendingOutlined />}>
              {sortOptions.find(opt => opt.value === sortBy)?.label} {sortOrder === 'desc' ? '↓' : '↑'}
            </Button>
          </Dropdown>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setShowCreateModal(true)}
          >
            新建项目
          </Button>
        </div>
      </div>

      <div className={styles.projectsGrid}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Spin size="large" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <VideoCameraOutlined />
            </div>
            <h3 className={styles.emptyTitle}>还没有项目</h3>
            <p className={styles.emptyDescription}>
              {searchQuery 
                ? '没有找到匹配的项目，试试其他关键词'
                : '创建你的第一个视频项目，开始 AI 剪辑之旅'
              }
            </p>
            {!searchQuery && (
              <Button 
                type="primary" 
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setShowCreateModal(true)}
                className={styles.emptyButton}
              >
                创建第一个项目
              </Button>
            )}
          </div>
        ) : (
          <Row gutter={[24, 24]}>
            {filteredProjects.map(project => (
              <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
                <Card
                  className={styles.projectCard}
                  cover={
                    <div className={styles.thumbnailContainer} onClick={() => handleOpenProject(project.id)}>
                      <img 
                        alt={project.title} 
                        src={project.thumbnail} 
                        className={styles.projectThumbnail}
                      />
                      <div className={styles.thumbnailOverlay}>
                        <EyeOutlined className={styles.viewIcon} />
                      </div>
                    </div>
                  }
                  actions={[
                    <Tooltip title={project.starred ? '取消收藏' : '收藏'}>
                      {project.starred ? (
                        <StarFilled 
                          className={styles.starredIcon} 
                          onClick={() => handleStarProject(project.id, project.starred)} 
                        />
                      ) : (
                        <StarOutlined onClick={() => handleStarProject(project.id, project.starred)} />
                      )}
                    </Tooltip>,
                    <Tooltip title="编辑">
                      <EditOutlined onClick={() => handleOpenProject(project.id)} />
                    </Tooltip>,
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'duplicate',
                            label: '复制',
                            icon: <CopyOutlined />,
                            onClick: () => handleDuplicateProject(project.id)
                          },
                          {
                            key: 'delete',
                            label: '删除',
                            icon: <DeleteOutlined />,
                            danger: true,
                            onClick: () => handleDeleteProject(project.id)
                          }
                        ]
                      }}
                      trigger={['click']}
                    >
                      <MoreOutlined />
                    </Dropdown>
                  ]}
                >
                  <div className={styles.projectInfo}>
                    <Typography.Title level={5} ellipsis={{ tooltip: project.title }}>
                      {project.title}
                    </Typography.Title>
                    <div className={styles.projectMeta}>
                      <Text type="secondary">
                        <ClockCircleOutlined /> {formatDuration(project.duration)}
                      </Text>
                      <Text type="secondary">
                        {project.resolution}
                      </Text>
                    </div>
                    <Text type="secondary" className={styles.projectDate}>
                      修改于 {formatDate(project.updatedAt)}
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      <Modal
        title="创建新项目"
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
      >
        <Form 
          form={form}
          layout="vertical" 
          onFinish={handleCreateProject}
          initialValues={{
            aspectRatio: '16:9',
            resolution: '1080p'
          }}
        >
          <Form.Item
            name="title"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="输入项目名称..." />
          </Form.Item>
          
          <Form.Item
            name="aspectRatio"
            label="宽高比"
          >
            <Select>
              <Option value="16:9">16:9 - 横屏</Option>
              <Option value="9:16">9:16 - 竖屏</Option>
              <Option value="1:1">1:1 - 方形</Option>
              <Option value="4:3">4:3 - 传统</Option>
              <Option value="21:9">21:9 - 超宽</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="resolution"
            label="分辨率"
          >
            <Select>
              <Option value="720p">720p - HD</Option>
              <Option value="1080p">1080p - Full HD</Option>
              <Option value="2K">2K - 2560 x 1440</Option>
              <Option value="4K">4K - 3840 x 2160</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="template"
            label="模板"
          >
            <Select>
              <Option value="blank">空白项目</Option>
              <Option value="shortVideo">短视频模板</Option>
              <Option value="documentary">纪录片模板</Option>
              <Option value="vlog">Vlog模板</Option>
            </Select>
          </Form.Item>
          
          <Form.Item className={styles.formActions}>
            <Button onClick={() => setShowCreateModal(false)} style={{ marginRight: 16 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Dashboard; 
