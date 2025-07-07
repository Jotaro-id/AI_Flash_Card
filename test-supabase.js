import puppeteer from 'puppeteer';

async function testSupabase() {
  console.log('Puppeteerブラウザテストを開始します...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // コンソールログを収集
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    // エラーを収集
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.toString());
    });
    
    console.log('\n1. ページの読み込みテスト');
    const response = await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log(`  ✓ ステータスコード: ${response.status()}`);
    console.log(`  ✓ URL: ${page.url()}`);
    
    // ページのタイトルを確認
    const title = await page.title();
    console.log(`  ✓ ページタイトル: ${title}`);
    
    console.log('\n2. Supabase関連のコンソールログ確認');
    const supabaseLogs = consoleLogs.filter(log => 
      log.text.toLowerCase().includes('supabase') || 
      log.text.includes('環境変数')
    );
    
    if (supabaseLogs.length > 0) {
      console.log('  ✓ Supabase関連ログ:');
      supabaseLogs.forEach(log => {
        console.log(`    [${log.type}] ${log.text}`);
      });
    } else {
      console.log('  ⚠ Supabase関連のログが見つかりません');
    }
    
    console.log('\n3. window.supabaseの確認');
    const supabaseExists = await page.evaluate(() => {
      return typeof window.supabase !== 'undefined';
    });
    
    if (supabaseExists) {
      console.log('  ✓ window.supabaseが定義されています');
      
      // Supabaseオブジェクトの詳細を確認
      const supabaseInfo = await page.evaluate(() => {
        if (window.supabase) {
          return {
            hasAuth: typeof window.supabase.auth !== 'undefined',
            hasFrom: typeof window.supabase.from === 'function',
            hasStorage: typeof window.supabase.storage !== 'undefined',
            methods: Object.keys(window.supabase).filter(key => typeof window.supabase[key] === 'function')
          };
        }
        return null;
      });
      
      if (supabaseInfo) {
        console.log('  ✓ Supabaseオブジェクトの詳細:');
        console.log(`    - auth: ${supabaseInfo.hasAuth ? '有効' : '無効'}`);
        console.log(`    - from: ${supabaseInfo.hasFrom ? '有効' : '無効'}`);
        console.log(`    - storage: ${supabaseInfo.hasStorage ? '有効' : '無効'}`);
        console.log(`    - メソッド: ${supabaseInfo.methods.join(', ')}`);
      }
    } else {
      console.log('  ✗ window.supabaseがundefinedです');
    }
    
    console.log('\n4. window.debugSupabaseData()の確認');
    const hasDebugFunction = await page.evaluate(() => {
      return typeof window.debugSupabaseData === 'function';
    });
    
    if (hasDebugFunction) {
      console.log('  ✓ window.debugSupabaseData()が定義されています');
      
      // デバッグ関数を実行
      try {
        const debugResult = await page.evaluate(() => {
          return window.debugSupabaseData();
        });
        console.log('  ✓ デバッグ関数の実行結果:', JSON.stringify(debugResult, null, 2));
      } catch (error) {
        console.log('  ✗ デバッグ関数の実行エラー:', error.message);
      }
    } else {
      console.log('  ✗ window.debugSupabaseData()が定義されていません');
    }
    
    console.log('\n5. window.getSupabaseConfig()の確認');
    const hasConfigFunction = await page.evaluate(() => {
      return typeof window.getSupabaseConfig === 'function';
    });
    
    if (hasConfigFunction) {
      console.log('  ✓ window.getSupabaseConfig()が定義されています');
      
      // 設定を取得
      try {
        const config = await page.evaluate(() => {
          return window.getSupabaseConfig();
        });
        console.log('  ✓ Supabase設定:');
        console.log(`    - URL: ${config.url ? '設定済み' : '未設定'}`);
        console.log(`    - Anon Key: ${config.anonKey ? '設定済み' : '未設定'}`);
        if (config.url) {
          console.log(`    - URL長さ: ${config.url.length}文字`);
        }
        if (config.anonKey) {
          console.log(`    - Key長さ: ${config.anonKey.length}文字`);
        }
      } catch (error) {
        console.log('  ✗ 設定取得エラー:', error.message);
      }
    } else {
      console.log('  ✗ window.getSupabaseConfig()が定義されていません');
    }
    
    console.log('\n6. ページエラーの確認');
    if (pageErrors.length === 0) {
      console.log('  ✓ ページエラーはありません');
    } else {
      console.log('  ✗ ページエラーが検出されました:');
      pageErrors.forEach(error => {
        console.log(`    - ${error}`);
      });
    }
    
    console.log('\n7. 全コンソールログ');
    console.log(`  総ログ数: ${consoleLogs.length}`);
    if (consoleLogs.length > 0) {
      consoleLogs.forEach(log => {
        console.log(`  [${log.type}] ${log.text}`);
      });
    }
    
    // Supabaseクライアントの初期化状態を確認
    console.log('\n8. Supabaseクライアントの初期化状態');
    const initStatus = await page.evaluate(() => {
      if (window.supabase) {
        return {
          initialized: true,
          canQuery: typeof window.supabase.from === 'function',
          authAvailable: typeof window.supabase.auth !== 'undefined'
        };
      }
      return { initialized: false };
    });
    
    if (initStatus.initialized) {
      console.log('  ✓ Supabaseクライアントが初期化されています');
      console.log(`    - クエリ実行可能: ${initStatus.canQuery ? 'はい' : 'いいえ'}`);
      console.log(`    - 認証機能利用可能: ${initStatus.authAvailable ? 'はい' : 'いいえ'}`);
    } else {
      console.log('  ✗ Supabaseクライアントが初期化されていません');
    }
    
  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error);
  } finally {
    await browser.close();
    console.log('\nテスト完了');
  }
}

testSupabase().catch(console.error);