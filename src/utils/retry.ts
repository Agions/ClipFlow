/**
 * 重试工具函数
 * 支持自动重试 + 降级 fallback
 */

export interface RetryOptions {
  attempts: number;
  delayMs: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * 带重试的函数执行（指数退避）
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts: number,
  delayMs: number,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (i < attempts) {
        onRetry?.(i, lastError);
        await sleep(delayMs * Math.pow(2, i - 1));
      }
    }
  }

  throw lastError!;
}

/**
 * 带重试 + 降级 fallback
 */
export async function withRetryAndFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  options: RetryOptions
): Promise<T> {
  try {
    return await withRetry(fn, options.attempts, options.delayMs, options.onRetry);
  } catch {
    return fallback;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
