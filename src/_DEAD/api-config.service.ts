/**
 * API 配置管理服务
 * 统一管理各 AI 服务的 API 密钥
 */

import { logger } from '@/utils/logger';

export type APIProvider = 'openai' | 'anthropic' | 'google' | 'azure' | 'custom';

export interface APIConfig {
  provider: APIProvider;
  apiKey: string;
  endpoint?: string;
  model?: string;
  enabled: boolean;
}

export interface APIStatus {
  provider: APIProvider;
  connected: boolean;
  error?: string;
  lastCheck?: Date;
}

/**
 * API 配置服务
 */
class APIConfigService {
  private configs: Map<APIProvider, APIConfig> = new Map();
  private status: Map<APIProvider, APIStatus> = new Map();

  /**
   * 配置 API
   */
  configure(config: APIConfig): void {
    this.configs.set(config.provider, {
      ...config,
      enabled: config.enabled ?? true,
    });
    logger.info('[APIConfig] 配置 API', { provider: config.provider });
  }

  /**
   * 获取 API 配置
   */
  getConfig(provider: APIProvider): APIConfig | undefined {
    return this.configs.get(provider);
  }

  /**
   * 获取所有配置
   */
  getAllConfigs(): APIConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * 检查是否已配置
   */
  isConfigured(provider: APIProvider): boolean {
    const config = this.configs.get(provider);
    return !!(config?.apiKey && config.enabled);
  }

  /**
   * 获取 API 密钥
   */
  getApiKey(provider: APIProvider): string | undefined {
    return this.configs.get(provider)?.apiKey;
  }

  /**
   * 删除 API 配置
   */
  removeConfig(provider: APIProvider): void {
    this.configs.delete(provider);
    this.status.delete(provider);
    logger.info('[APIConfig] 删除 API 配置', { provider });
  }

  /**
   * 更新状态
   */
  updateStatus(provider: APIProvider, status: Partial<APIStatus>): void {
    this.status.set(provider, {
      ...this.status.get(provider),
      ...status,
      provider,
    } as APIStatus);
  }

  /**
   * 获取状态
   */
  getStatus(provider: APIProvider): APIStatus | undefined {
    return this.status.get(provider);
  }

  /**
   * 获取所有状态
   */
  getAllStatus(): APIStatus[] {
    return Array.from(this.status.values());
  }

  /**
   * 验证 API 连接
   */
  async validate(provider: APIProvider): Promise<boolean> {
    const config = this.configs.get(provider);
    if (!config?.apiKey) {
      this.updateStatus(provider, { connected: false, error: '未配置 API Key' });
      return false;
    }

    try {
      // 简化的验证逻辑
      const response = await fetch(config.endpoint || this.getDefaultEndpoint(provider), {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
      });

      const connected = response.ok || response.status === 401; // 401 表示密钥有效但无权限
      this.updateStatus(provider, { connected, error: connected ? undefined : '连接失败' });
      return connected;
    } catch (error) {
      this.updateStatus(provider, { 
        connected: false, 
        error: error instanceof Error ? error.message : '验证失败' 
      });
      return false;
    }
  }

  /**
   * 获取默认端点
   */
  private getDefaultEndpoint(provider: APIProvider): string | undefined {
    const endpoints: Record<APIProvider, string> = {
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com',
      google: 'https://generativelanguage.googleapis.com',
      azure: 'https://api.openai.com',
      custom: undefined,
    };
    return endpoints[provider];
  }

  /**
   * 清除所有配置
   */
  clearAll(): void {
    this.configs.clear();
    this.status.clear();
    logger.info('[APIConfig] 清除所有 API 配置');
  }
}

export const apiConfigService = new APIConfigService();
export default apiConfigService;
