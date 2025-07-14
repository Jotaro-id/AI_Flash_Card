import { PostgrestError } from '@supabase/supabase-js';

// 再試行オプション
interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

// エクスポネンシャルバックオフ付き再試行
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry = () => {},
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw error;
      }

      // 再試行可能なエラーかチェック
      if (!isRetryableError(error)) {
        throw error;
      }

      // エクスポネンシャルバックオフ
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      
      onRetry(attempt + 1, lastError);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// 再試行可能なエラーか判定
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // ネットワークエラー
    if (message.includes('network') || 
        message.includes('fetch') || 
        message.includes('aborted') ||
        message.includes('timeout')) {
      return true;
    }
    
    // Supabaseのエラー
    if ('code' in error) {
      const code = (error as PostgrestError).code;
      // 一時的なエラーコード
      if (code === 'PGRST301' || // Too many requests
          code === '500' ||       // Internal server error
          code === '502' ||       // Bad gateway
          code === '503' ||       // Service unavailable
          code === '504') {       // Gateway timeout
        return true;
      }
    }
  }
  
  return false;
}

// 接続状態をチェック
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // シンプルなヘルスチェッククエリ
    await withRetry(
      async () => {
        const result = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
        });
        
        if (!result.ok) {
          throw new Error(`HTTP ${result.status}`);
        }
        
        return result;
      },
      { maxRetries: 2, baseDelay: 500 }
    );
    
    const latency = Date.now() - startTime;
    
    return {
      connected: true,
      latency,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// デバウンス付きエラーハンドラー
let errorCount = 0;
let lastErrorTime = 0;
const ERROR_THRESHOLD = 5;
const ERROR_WINDOW = 60000; // 1分

export function handleSupabaseError(error: unknown): void {
  const now = Date.now();
  
  // エラーウィンドウをリセット
  if (now - lastErrorTime > ERROR_WINDOW) {
    errorCount = 0;
  }
  
  errorCount++;
  lastErrorTime = now;
  
  // エラーが頻発している場合は警告
  if (errorCount >= ERROR_THRESHOLD) {
    console.error('Supabase接続エラーが頻発しています。ネットワーク接続を確認してください。');
    
    // ユーザーに通知（開発中のみ）
    if (process.env.DEV) {
      alert('データベース接続に問題が発生しています。しばらく待ってから再度お試しください。');
    }
  }
  
  console.error('Supabase error:', error);
}