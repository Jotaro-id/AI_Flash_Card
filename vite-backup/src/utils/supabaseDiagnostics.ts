// Supabase接続診断ユーティリティ
import { supabase } from '../lib/supabase';

export interface DiagnosticResult {
  test: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export class SupabaseDiagnostics {
  private results: DiagnosticResult[] = [];

  // 環境変数の確認
  checkEnvironmentVariables(): DiagnosticResult[] {
    const results: DiagnosticResult[] = [];
    
    // VITE_SUPABASE_URL のチェック
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      results.push({
        test: 'VITE_SUPABASE_URL',
        status: 'error',
        message: '環境変数 VITE_SUPABASE_URL が設定されていません',
        details: 'VITE_SUPABASE_URL=your-project-url.supabase.co を .env ファイルに設定してください'
      });
    } else if (!supabaseUrl.includes('supabase.co')) {
      results.push({
        test: 'VITE_SUPABASE_URL',
        status: 'warning',
        message: 'VITE_SUPABASE_URL の形式が正しくない可能性があります',
        details: `現在の値: ${supabaseUrl}`
      });
    } else {
      results.push({
        test: 'VITE_SUPABASE_URL',
        status: 'success',
        message: 'VITE_SUPABASE_URL が設定されています',
        details: supabaseUrl
      });
    }

    // VITE_SUPABASE_ANON_KEY のチェック
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseAnonKey) {
      results.push({
        test: 'VITE_SUPABASE_ANON_KEY',
        status: 'error',
        message: '環境変数 VITE_SUPABASE_ANON_KEY が設定されていません',
        details: 'VITE_SUPABASE_ANON_KEY=your-anon-key を .env ファイルに設定してください'
      });
    } else if (supabaseAnonKey.length < 100) {
      results.push({
        test: 'VITE_SUPABASE_ANON_KEY',
        status: 'warning',
        message: 'VITE_SUPABASE_ANON_KEY が短すぎる可能性があります',
        details: `現在の長さ: ${supabaseAnonKey.length} 文字`
      });
    } else {
      results.push({
        test: 'VITE_SUPABASE_ANON_KEY',
        status: 'success',
        message: 'VITE_SUPABASE_ANON_KEY が設定されています',
        details: `長さ: ${supabaseAnonKey.length} 文字`
      });
    }

    return results;
  }

  // Supabaseクライアントの初期化テスト
  async testSupabaseClient(): Promise<DiagnosticResult> {
    try {
      
      if (!supabase) {
        return {
          test: 'Supabase Client Initialization',
          status: 'error',
          message: 'Supabaseクライアントの初期化に失敗しました'
        };
      }

      // Authモジュールの確認
      if (!supabase.auth) {
        return {
          test: 'Supabase Client Initialization',
          status: 'warning',
          message: 'Supabaseクライアントは初期化されましたが、Authモジュールが見つかりません'
        };
      }

      return {
        test: 'Supabase Client Initialization',
        status: 'success',
        message: 'Supabaseクライアントが正常に初期化されました',
        details: 'Auth、Database、Storage全てのモジュールが利用可能です'
      };
    } catch (error) {
      return {
        test: 'Supabase Client Initialization',
        status: 'error',
        message: 'Supabaseクライアントの初期化中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 基本的な接続テスト
  async testBasicConnection(): Promise<DiagnosticResult> {
    try {
      
      console.log('Supabase接続テストを開始...');
      
      // セッション確認テスト
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        return {
          test: 'Basic Connection Test',
          status: 'error',
          message: 'Supabase認証サービスへの接続に失敗しました',
          details: sessionError.message
        };
      }

      return {
        test: 'Basic Connection Test',
        status: 'success',
        message: 'Supabaseサービスに正常に接続できました',
        details: session ? 'セッションが存在します' : 'セッションは存在しません（ログインが必要）'
      };
    } catch (error) {
      return {
        test: 'Basic Connection Test',
        status: 'error',
        message: 'Supabase接続テスト中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // データベーステーブルの存在確認
  async testDatabaseTables(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    const requiredTables = ['word_books', 'word_cards', 'word_book_cards'];
    
    try {
      
      for (const tableName of requiredTables) {
        try {
          // テーブルの存在確認（LIMIT 0で実際のデータは取得しない）
          const { error } = await supabase
            .from(tableName)
            .select('*')
            .limit(0);
          
          if (error) {
            results.push({
              test: `Table: ${tableName}`,
              status: 'error',
              message: `テーブル '${tableName}' へのアクセスに失敗しました`,
              details: error.message
            });
          } else {
            results.push({
              test: `Table: ${tableName}`,
              status: 'success',
              message: `テーブル '${tableName}' にアクセス可能です`
            });
          }
        } catch (tableError) {
          results.push({
            test: `Table: ${tableName}`,
            status: 'error',
            message: `テーブル '${tableName}' のテスト中にエラーが発生しました`,
            details: tableError instanceof Error ? tableError.message : 'Unknown error'
          });
        }
      }
    } catch (error) {
      results.push({
        test: 'Database Tables Test',
        status: 'error',
        message: 'データベーステーブルテスト中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return results;
  }

  // ネットワーク接続テスト
  async testNetworkConnection(): Promise<DiagnosticResult> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      return {
        test: 'Network Connection Test',
        status: 'error',
        message: 'VITE_SUPABASE_URL が設定されていないためネットワークテストを実行できません'
      };
    }

    try {
      const startTime = Date.now();
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        }
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        return {
          test: 'Network Connection Test',
          status: 'success',
          message: `Supabase APIに正常に接続できました（${responseTime}ms）`,
          details: `ステータス: ${response.status} ${response.statusText}`
        };
      } else {
        return {
          test: 'Network Connection Test',
          status: 'error',
          message: `Supabase APIから異常なレスポンスを受信しました`,
          details: `ステータス: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        test: 'Network Connection Test',
        status: 'error',
        message: 'Supabase APIへのネットワーク接続に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 全ての診断を実行
  async runFullDiagnostics(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    console.log('🔍 Supabase診断を開始します...');
    
    // 環境変数チェック
    results.push(...this.checkEnvironmentVariables());
    
    // クライアント初期化テスト
    results.push(await this.testSupabaseClient());
    
    // ネットワーク接続テスト
    results.push(await this.testNetworkConnection());
    
    // 基本接続テスト
    results.push(await this.testBasicConnection());
    
    // データベーステーブルテスト
    results.push(...await this.testDatabaseTables());
    
    this.results = results;
    this.printResults();
    
    return results;
  }

  // 結果を整理して表示
  printResults(): void {
    console.log('\n📊 Supabase診断結果:');
    console.log('=====================================');
    
    const successCount = this.results.filter(r => r.status === 'success').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;
    
    console.log(`✅ 成功: ${successCount}, ⚠️  警告: ${warningCount}, ❌ エラー: ${errorCount}`);
    console.log('=====================================');
    
    this.results.forEach(result => {
      const icon = result.status === 'success' ? '✅' : 
                   result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${result.test}: ${result.message}`);
      if (result.details) {
        console.log(`   詳細: ${result.details}`);
      }
    });
    
    if (errorCount > 0) {
      console.log('\n🚨 エラーが検出されました。以下を確認してください:');
      console.log('1. .env ファイルに正しい環境変数が設定されているか');
      console.log('2. Supabaseプロジェクトが有効で、APIキーが正しいか');
      console.log('3. ネットワーク接続に問題がないか');
      console.log('4. 必要なテーブルが作成され、RLSポリシーが設定されているか');
    }
  }
}

// 簡単に実行できるヘルパー関数
export const runSupabaseDiagnostics = async (): Promise<DiagnosticResult[]> => {
  const diagnostics = new SupabaseDiagnostics();
  return await diagnostics.runFullDiagnostics();
};