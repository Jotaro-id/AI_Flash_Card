import { supabase } from '../lib/supabase';

export interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'success' | 'error';
  error?: string;
  details?: Record<string, unknown>;
}

export class PerformanceDiagnostics {
  private metrics: PerformanceMetric[] = [];

  async measureOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    details?: Record<string, unknown>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.metrics.push({
        operation,
        startTime,
        endTime,
        duration,
        status: 'success',
        details
      });
      
      console.log(`[Performance] ${operation}: ${duration.toFixed(2)}ms`, details);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.metrics.push({
        operation,
        startTime,
        endTime,
        duration,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        details
      });
      
      console.error(`[Performance] ${operation}: ${duration.toFixed(2)}ms (ERROR)`, error);
      throw error;
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getSummary(): {
    totalOperations: number;
    successCount: number;
    errorCount: number;
    averageDuration: number;
    slowestOperation: PerformanceMetric | null;
    operations: Record<string, { count: number; avgDuration: number }>;
  } {
    const totalOperations = this.metrics.length;
    const successCount = this.metrics.filter(m => m.status === 'success').length;
    const errorCount = this.metrics.filter(m => m.status === 'error').length;
    
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalOperations > 0 ? totalDuration / totalOperations : 0;
    
    const slowestOperation = this.metrics.reduce((slowest, current) => 
      !slowest || current.duration > slowest.duration ? current : slowest, 
      null as PerformanceMetric | null
    );
    
    // 操作ごとの統計
    const operations: Record<string, { count: number; totalDuration: number }> = {};
    this.metrics.forEach(m => {
      if (!operations[m.operation]) {
        operations[m.operation] = { count: 0, totalDuration: 0 };
      }
      operations[m.operation].count++;
      operations[m.operation].totalDuration += m.duration;
    });
    
    const operationSummary: Record<string, { count: number; avgDuration: number }> = {};
    Object.entries(operations).forEach(([op, data]) => {
      operationSummary[op] = {
        count: data.count,
        avgDuration: data.totalDuration / data.count
      };
    });
    
    return {
      totalOperations,
      successCount,
      errorCount,
      averageDuration,
      slowestOperation,
      operations: operationSummary
    };
  }

  clear(): void {
    this.metrics = [];
  }
}

// Supabase接続の詳細診断
export const runDetailedSupabaseDiagnostics = async (): Promise<{
  region?: string;
  latency: Record<string, number>;
  summary: string;
}> => {
  const diagnostics = new PerformanceDiagnostics();
  const results: Record<string, number> = {};
  
  console.log('=== Supabase パフォーマンス診断開始 ===');
  
  // 1. 基本的な接続テスト
  try {
    await diagnostics.measureOperation(
      'Supabase Health Check',
      async () => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
          }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
      }
    );
  } catch (error) {
    console.error('Health check failed:', error);
  }
  
  // 2. 認証エンドポイントのテスト
  try {
    await diagnostics.measureOperation(
      'Auth Status Check',
      async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data;
      }
    );
  } catch (error) {
    console.error('Auth check failed:', error);
  }
  
  // 3. データベースクエリのテスト（単純なクエリ）
  try {
    await diagnostics.measureOperation(
      'Simple DB Query (COUNT)',
      async () => {
        const { count, error } = await supabase
          .from('word_books')
          .select('*', { count: 'exact', head: true });
        if (error) throw error;
        return count;
      }
    );
  } catch (error) {
    console.error('Simple query failed:', error);
  }
  
  // 4. データベースクエリのテスト（RLS付き）
  try {
    await diagnostics.measureOperation(
      'DB Query with RLS',
      async () => {
        const { data, error } = await supabase
          .from('word_books')
          .select('*')
          .limit(1);
        if (error) throw error;
        return data;
      }
    );
  } catch (error) {
    console.error('RLS query failed:', error);
  }
  
  // 5. 複雑なクエリのテスト（JOIN）
  try {
    await diagnostics.measureOperation(
      'Complex Query with JOIN',
      async () => {
        const { data, error } = await supabase
          .from('word_books')
          .select(`
            *,
            word_book_cards (
              word_cards (*)
            )
          `)
          .limit(1);
        if (error) throw error;
        return data;
      }
    );
  } catch (error) {
    console.error('Complex query failed:', error);
  }
  
  // サマリー作成
  const summary = diagnostics.getSummary();
  console.log('=== パフォーマンス診断結果 ===');
  console.log('総操作数:', summary.totalOperations);
  console.log('成功:', summary.successCount);
  console.log('エラー:', summary.errorCount);
  console.log('平均実行時間:', summary.averageDuration.toFixed(2), 'ms');
  
  if (summary.slowestOperation) {
    console.log('最も遅い操作:', 
      summary.slowestOperation.operation, 
      summary.slowestOperation.duration.toFixed(2), 'ms'
    );
  }
  
  console.log('\n操作別統計:');
  Object.entries(summary.operations).forEach(([op, stats]) => {
    console.log(`  ${op}: 平均 ${stats.avgDuration.toFixed(2)}ms (${stats.count}回)`);
    results[op] = stats.avgDuration;
  });
  
  // リージョン情報の取得を試みる
  let region: string | undefined;
  try {
    // Supabase URLからリージョンを推測
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    const hostname = url.hostname;
    // リージョンコードは通常URLに含まれている
    if (hostname.includes('ap-northeast-1')) {
      region = 'Asia Pacific (Tokyo)';
    } else if (hostname.includes('us-east-1')) {
      region = 'US East (N. Virginia)';
    } else if (hostname.includes('eu-west-1')) {
      region = 'Europe (Ireland)';
    } else if (hostname.includes('ap-southeast-1')) {
      region = 'Asia Pacific (Singapore)';
    }
  } catch (error) {
    console.error('Region detection failed:', error);
  }
  
  const summaryText = `
診断結果サマリー:
- 推定リージョン: ${region || '不明'}
- 平均レスポンスタイム: ${summary.averageDuration.toFixed(2)}ms
- 最も遅い操作: ${summary.slowestOperation?.operation || 'N/A'} (${summary.slowestOperation?.duration.toFixed(2) || 0}ms)
- Health Check: ${results['Supabase Health Check']?.toFixed(2) || 'N/A'}ms
- 認証チェック: ${results['Auth Status Check']?.toFixed(2) || 'N/A'}ms
- DBクエリ（RLS）: ${results['DB Query with RLS']?.toFixed(2) || 'N/A'}ms
- 複雑なクエリ: ${results['Complex Query with JOIN']?.toFixed(2) || 'N/A'}ms

${summary.averageDuration > 1000 ? '⚠️ 平均レスポンスタイムが1秒を超えています。リージョンの確認を推奨します。' : ''}
${results['Complex Query with JOIN'] > 2000 ? '⚠️ 複雑なクエリが遅いです。クエリ最適化を検討してください。' : ''}
  `.trim();
  
  return {
    region,
    latency: results,
    summary: summaryText
  };
};

// グローバルに公開
if (typeof window !== 'undefined') {
  // @ts-expect-error デバッグ目的
  window.runDetailedSupabaseDiagnostics = runDetailedSupabaseDiagnostics;
}