/**
 * 日志工具
 * 统一的日志记录
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

const shouldLog = (level: LogLevel): boolean => {
  if (isDev) return true;
  return level === 'warn' || level === 'error';
};

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: unknown;
}

const logs: LogEntry[] = [];
const MAX_LOGS = 1000;

const write = (level: LogLevel, message: string, context?: unknown) => {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  // 存储日志
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();

  // 输出
  const prefix = `[${level.toUpperCase()}]`;
  if (context) {
    console[level](prefix, message, context);
  } else {
    console[level](prefix, message);
  }
};

export const logger = {
  debug: (message: string, context?: unknown) => write('debug', message, context),
  info: (message: string, context?: unknown) => write('info', message, context),
  warn: (message: string, context?: unknown) => write('warn', message, context),
  error: (message: string, context?: unknown) => write('error', message, context),
  
  // 获取日志历史
  getLogs: (level?: LogLevel): LogEntry[] => {
    if (level) return logs.filter(l => l.level === level);
    return [...logs];
  },
  
  // 清空日志
  clear: () => { logs.length = 0; },
};

export default logger;
