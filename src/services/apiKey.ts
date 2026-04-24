/**
 * API 密钥验证服务
 */
import axios from 'axios';
import { logger } from '../utils/logger';

export interface ApiKeyValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * 验证 API 密钥
 */
export const validateApiKey = async (provider: string, apiKey: string): Promise<ApiKeyValidationResult> => {
  if (!apiKey || apiKey.trim().length < 10) {
    return { isValid: false, error: 'API 密钥格式无效' };
  }

  try {
    switch (provider) {
      case 'openai':
        await axios.get('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 10000,
        });
        break;

      case 'deepseek':
        await axios.get('https://api.deepseek.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 10000,
        });
        break;

      case 'anthropic':
        // Anthropic 使用 Messages API 进行验证
        await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-sonnet-4.6',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'ping' }],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            timeout: 10000,
          }
        );
        break;

      case 'google':
        // Google AI Studio API 验证
        await axios.get('https://generativelanguage.googleapis.com/v1/models?key=' + apiKey, {
          timeout: 10000,
        });
        break;

      case 'baidu':
        // 百度文心 - 验证 access_token
        await axios.post(
          'https://aip.baidubce.com/oauth/2.0/token',
          null,
          {
            params: {
              grant_type: 'client_credentials',
              client_id: apiKey.split(':')[0] || apiKey,
              client_secret: apiKey.split(':')[1] || '',
            },
            timeout: 10000,
          }
        );
        break;

      case 'alibaba':
        // 阿里通义千问 - 使用 chat/completions 验证
        await axios.post(
          'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
          { model: 'qwen2.5-max', messages: [{ role: 'user', content: 'hi' }] },
          {
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            timeout: 10000,
          }
        );
        break;

      case 'iflytek':
        // 讯飞星火 - 验证 app_id 和 api_key 格式
        if (!apiKey.includes(',') || apiKey.split(',').length < 3) {
          return { isValid: false, error: '讯飞星火 API 密钥格式无效（应为 app_id,api_key,api_secret）' };
        }
        // 讯飞验证需要额外参数，暂时检查格式
        break;

      case 'zhipu':
        // 智谱清言 - 使用 chat/completions 验证
        await axios.post(
          'https://open.bigmodel.cn/api/paas/v4/chat/completions',
          { model: 'glm-4', messages: [{ role: 'user', content: 'hi' }] },
          {
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            timeout: 10000,
          }
        );
        break;

      case 'moonshot':
        // Moonshot Kimi - 使用 chat/completions 验证
        await axios.post(
          'https://api.moonshot.cn/v1/chat/completions',
          { model: 'moonshot-v1-8k', messages: [{ role: 'user', content: 'hi' }] },
          {
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            timeout: 10000,
          }
        );
        break;

      default:
        // 未知提供商，跳过验证但记录警告
        logger.warn(`[ApiKeyService] 未知的 AI 提供商: ${provider}，跳过验证`);
        return { isValid: true };
    }

    return { isValid: true };
  } catch (error: unknown) {
    let errorMessage = 'API 密钥验证失败';

    if (axios.isAxiosError(error)) {
      const axiosError = error;
      if (axiosError.response?.data) {
        const data = axiosError.response.data as { error?: { message?: string }; error_msg?: string; header?: { message?: string } };
        errorMessage = data.error?.message || data.error_msg || data.header?.message || errorMessage;
      } else if (axiosError.code === 'ECONNABORTED') {
        errorMessage = 'API 密钥验证超时，请检查网络连接';
      } else if (axiosError.response?.status === 401) {
        errorMessage = 'API 密钥无效或已过期';
      } else if (axiosError.response?.status === 403) {
        errorMessage = 'API 密钥没有访问权限';
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return { isValid: false, error: errorMessage };
  }
};

/**
 * 测试 API 连接
 */
export const testApiConnection = async (provider: string, apiKey: string): Promise<boolean> => {
  const result = await validateApiKey(provider, apiKey);
  return result.isValid;
};
