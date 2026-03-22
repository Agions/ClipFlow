import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import { 
  Tabs, 
  Button, 
  Upload, 
  Input, 
  Empty, 
  Tooltip, 
  Space,
  Dropdown,
  Tag
} from 'antd';
import type { UploadProps, MenuProps } from 'antd';
import { 
  UploadOutlined, 
  VideoCameraOutlined, 
  AudioOutlined, 
  FileImageOutlined,
  FileTextOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { formatDuration, formatFileSize } from '@/shared';
import styles from './AssetPanel.module.less';

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'video', label: '视频' },
  { key: 'audio', label: '音频' },
  { key: 'image', label: '图片' },
  { key: 'text', label: '文本' },
] as const;
const { Search } = Input;

interface Asset {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image' | 'text';
  src: string;
  thumbnail?: string;
  duration?: number;
  size: number;
  tags: string[];
}

type AssetTab = (typeof TABS)[number]['key'];

// AssetPanel - displays user uploaded assets
// Mock data removed - assets should come from user uploads or project data
const AssetPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AssetTab>('all');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 过滤显示的素材
  const filteredAssets = assets.filter(asset => {
    // 按类型过滤
    if (activeTab !== 'all' && asset.type !== activeTab) {
      return false;
    }
    
    // 按搜索词过滤
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  // 删除素材
  const handleDelete = (id: string) => {
    setAssets(prev => prev.filter(asset => asset.id !== id));
  };
  
  // 添加到时间轴
  const addToTimeline = (asset: Asset) => {
    logger.debug('添加到时间轴', { asset });
    // 这里将来会实现与Timeline组件的交互
  };
  
  // 渲染素材缩略图或图标
  const renderThumbnail = (asset: Asset) => {
    switch (asset.type) {
      case 'video':
        return asset.thumbnail ? (
          <img src={asset.thumbnail} className={styles.thumbnail} alt={asset.name} />
        ) : (
          <div className={styles.assetIconContainer}>
            <VideoCameraOutlined className={styles.assetIcon} />
          </div>
        );
      case 'audio':
        return (
          <div className={styles.assetIconContainer}>
            <AudioOutlined className={styles.assetIcon} />
          </div>
        );
      case 'image':
        return asset.thumbnail ? (
          <img src={asset.thumbnail} className={styles.thumbnail} alt={asset.name} />
        ) : (
          <div className={styles.assetIconContainer}>
            <FileImageOutlined className={styles.assetIcon} />
          </div>
        );
      case 'text':
        return (
          <div className={styles.assetIconContainer}>
            <FileTextOutlined className={styles.assetIcon} />
          </div>
        );
      default:
        return null;
    }
  };
  
  // 上传素材
  const handleUpload: UploadProps['customRequest'] = (options) => {
    logger.debug('上传文件', { options });
    options.onSuccess?.({}, new XMLHttpRequest());
    // 实际项目中会处理文件上传和转码
  };
  
  // 素材项操作菜单
  const assetMenu = (id: string): { items: MenuProps['items'] } => ({
    items: [
      {
        key: '1',
        label: '重命名',
        onClick: () => logger.debug('重命名', { id })
      },
      {
        key: '2',
        label: '下载',
        onClick: () => logger.debug('下载', { id })
      },
      {
        key: '3',
        label: '复制',
        onClick: () => logger.debug('复制', { id })
      },
      {
        type: 'divider' as const,
      },
      {
        key: '4',
        label: '删除',
        danger: true,
        onClick: () => handleDelete(id)
      }
    ],
  });
  
  return (
    <div className={styles.assetPanelContainer}>
      <div className={styles.assetSearch}>
        <Search
          placeholder="搜索素材..."
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />
      </div>
      
      <Tabs
        activeKey={activeTab} 
        onChange={(key) => setActiveTab(key as AssetTab)}
        className={styles.assetTabs}
        items={TABS.map((tab) => ({ key: tab.key, label: tab.label }))}
      />
      
      <div className={styles.uploadContainer}>
        <Upload
          multiple
          showUploadList={false}
          customRequest={handleUpload}
        >
          <Button 
            icon={<UploadOutlined />} 
            block
          >
            上传素材
          </Button>
        </Upload>
      </div>
      
      <div className={styles.assetList}>
        {filteredAssets.length > 0 ? (
          filteredAssets.map(asset => (
            <div key={asset.id} className={styles.assetItem}>
              <div 
                className={styles.assetContent}
                onClick={() => addToTimeline(asset)}
              >
                <div className={styles.assetPreview}>
                  {renderThumbnail(asset)}
                  {asset.duration && (
                    <div className={styles.assetDuration}>
                      {formatDuration(asset.duration)}
                    </div>
                  )}
                </div>
                <div className={styles.assetInfo}>
                  <Tooltip title={asset.name}>
                    <div className={styles.assetName}>{asset.name}</div>
                  </Tooltip>
                  <div className={styles.assetDetails}>
                    <span className={styles.assetSize}>{formatFileSize(asset.size)}</span>
                    {asset.tags.map(tag => (
                      <Tag key={tag} className={styles.assetTag}>{tag}</Tag>
                    ))}
                  </div>
                </div>
              </div>
              <Dropdown menu={assetMenu(asset.id)} trigger={['click']} placement="bottomRight">
                <Button 
                  type="text" 
                  className={styles.assetMenuButton}
                  icon={<MoreOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>
            </div>
          ))
        ) : (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                {searchQuery 
                  ? "没有找到匹配的素材" 
                  : activeTab === 'all' 
                    ? "没有素材" 
                    : `没有${activeTab === 'video' ? '视频' : activeTab === 'audio' ? '音频' : activeTab === 'image' ? '图片' : '文本'}素材`
                }
              </span>
            }
          />
        )}
      </div>
    </div>
  );
};

export default AssetPanel; 
