import { message } from 'antd';


export const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    const text = error.message.trim();
    return text || fallback;
  }
  if (typeof error === 'string') {
    const text = error.trim();
    return text || fallback;
  }
  return fallback;
};

// 消息持续时间
const MESSAGE_DURATION = 3; // 3秒

export const notify = {
  success: (content: string, key?: string) => {
    const options = { 
      content, 
      key,
      duration: MESSAGE_DURATION,
    };
    message.success(options);
  },
  
  error: (error: unknown, fallback: string, key?: string) => {
    const options = { 
      content: toErrorMessage(error, fallback), 
      key,
      duration: MESSAGE_DURATION * 2, // 错误消息显示更久
    };
    message.error(options);
  },
  
  warning: (content: string, key?: string) => {
    const options = { 
      content, 
      key,
      duration: MESSAGE_DURATION,
    };
    message.warning(options);
  },
  
  info: (content: string, key?: string) => {
    const options = { 
      content, 
      key,
      duration: MESSAGE_DURATION,
    };
    message.info(options);
  },
  
  loading: (content: string, key: string) => {
    message.loading({ content, key, duration: 0 });
  },
  
  // 销毁指定消息
  destroy: (key?: string) => {
    if (key) {
      message.destroy(key);
    } else {
      message.destroy();
    }
  },
};
