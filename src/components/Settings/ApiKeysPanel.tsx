/**
 * API 密钥设置面板
 */
import React, { useState, useCallback } from 'react';
import { Card, Form, Input, Space, Tag, Spin, Alert, Divider } from 'antd';
import { Button } from '@/components/ui/button';
import { KeyOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, EyeInvisibleOutlined, DeleteOutlined } from '@ant-design/icons';
import { validateApiKey } from '@/services/apiKey';
import { notify } from '@/shared';
import { ModelProvider, PROVIDER_NAMES } from '@/constants/models';
import { MODEL_PROVIDERS } from '@/core/config/models.config';

const Text = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => <span style={style}>{children}</span>;

interface ApiKeyConfig {
  key: string;
  isValid?: boolean;
}

interface ApiKeysPanelProps {
  apiKeys: Partial<Record<ModelProvider, ApiKeyConfig>>;
  onUpdateKey: (provider: ModelProvider, key: string) => void;
  onDeleteKey: (provider: ModelProvider) => void;
}

const ApiKeysPanel: React.FC<ApiKeysPanelProps> = ({ apiKeys, onUpdateKey, onDeleteKey }) => {
  const [testingProvider, setTestingProvider] = useState<ModelProvider | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<ModelProvider>>(new Set());

  const handleTest = useCallback(async (provider: ModelProvider, key: string) => {
    if (!key) {
      notify.warning('请先输入 API 密钥');
      return;
    }

    setTestingProvider(provider);
    try {
      const result = await validateApiKey(provider, key);
      if (result.isValid) {
        notify.success(`${PROVIDER_NAMES[provider]} API 密钥验证成功`);
      } else {
        notify.error(null, result.error || '验证失败');
      }
    } catch (error) {
      notify.error(error, '验证出错');
    } finally {
      setTestingProvider(null);
    }
  }, []);

  const toggleKeyVisibility = (provider: ModelProvider) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(provider)) {
        next.delete(provider);
      } else {
        next.add(provider);
      }
      return next;
    });
  };

  const providers: ModelProvider[] = Object.keys(MODEL_PROVIDERS) as ModelProvider[];

  return (
    <Card title="API 密钥管理" extra={<Tag color="blue">安全存储</Tag>}>
      <Alert
        message="API 密钥仅存储在本地，不会上传到服务器"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form layout="vertical">
        {providers.map(provider => {
          const config = apiKeys[provider];
          const isVisible = visibleKeys.has(provider);
          const isTesting = testingProvider === provider;

          return (
            <Form.Item key={provider} label={PROVIDER_NAMES[provider]}>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  type={isVisible ? 'text' : 'password'}
                  placeholder={`输入 ${PROVIDER_NAMES[provider]} API 密钥`}
                  value={config?.key || ''}
                  onChange={(e) => onUpdateKey(provider, e.target.value)}
                  aria-label={`${PROVIDER_NAMES[provider]} API 密钥输入框`}
                  suffix={
                    config?.isValid === true ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                    config?.isValid === false ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> :
                    null
                  }
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => toggleKeyVisibility(provider)}
                  aria-label={isVisible ? "隐藏密钥" : "显示密钥"}
                >
                  {isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </Button>
                <Button
                  className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white"
                  disabled={isTesting}
                  onClick={() => handleTest(provider, config?.key || '')}
                  aria-label={`验证 ${PROVIDER_NAMES[provider]} 密钥`}
                >
                  {isTesting ? '验证中...' : '验证'}
                </Button>
                {config?.key && (
                  <Button
                    variant="destructive"
                    onClick={() => onDeleteKey(provider)}
                    aria-label={`删除 ${PROVIDER_NAMES[provider]} 密钥`}
                  >
                    <DeleteOutlined />
                  </Button>
                )}
              </Space.Compact>
            </Form.Item>
          );
        })}
      </Form>
    </Card>
  );
};

export default ApiKeysPanel;
