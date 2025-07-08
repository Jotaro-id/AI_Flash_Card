interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // レート制限エラー以外は即座に失敗
      if (!isRetriableError(lastError)) {
        throw lastError;
      }

      // 最大リトライ回数に達した場合
      if (attempt === maxRetries) {
        throw lastError;
      }

      // 指数バックオフで待機時間を計算
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt),
        maxDelay
      );

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // 待機
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// リトライ可能なエラーかどうかを判定
function isRetriableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // レート制限エラー
  if (message.includes('rate limit') || message.includes('429')) {
    return true;
  }
  
  // 一時的なネットワークエラー
  if (message.includes('network') || message.includes('fetch')) {
    return true;
  }
  
  // タイムアウトエラー
  if (message.includes('timeout')) {
    return true;
  }
  
  // 500系のサーバーエラー
  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return true;
  }
  
  return false;
}