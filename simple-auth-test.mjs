import { chromium } from 'playwright';

(async () => {
  console.log('開発サーバーが起動していることを確認してください...');
  console.log('別のターミナルで npm run dev を実行してください。');
  console.log('5秒後にテストを開始します...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  // コンソールログを収集
  const consoleLogs = [];
  page.on('console', async msg => {
    const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => arg.toString())));
    consoleLogs.push({
      type: msg.type(),
      text: args.join(' ')
    });
  });

  try {
    console.log('ページを開いています...');
    await page.goto('http://localhost:5173/', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    console.log('ページの読み込みを待機中...');
    await page.waitForTimeout(5000);

    // window.supabaseが存在するか確認
    const supabaseExists = await page.evaluate(() => {
      return typeof window.supabase !== 'undefined';
    });

    console.log(`\nwindow.supabase exists: ${supabaseExists}`);

    if (supabaseExists) {
      // Supabase認証の状態を確認
      console.log('\n認証状態を確認中...');
      
      const sessionResult = await page.evaluate(async () => {
        try {
          const result = await window.supabase.auth.getSession();
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Error: ${error.message}`;
        }
      });

      const userResult = await page.evaluate(async () => {
        try {
          const result = await window.supabase.auth.getUser();
          return JSON.stringify(result, null, 2);
        } catch (error) {
          return `Error: ${error.message}`;
        }
      });

      console.log('\n=== getSession() 結果 ===');
      console.log(sessionResult);
      
      console.log('\n=== getUser() 結果 ===');
      console.log(userResult);
    }

    // スクリーンショットを撮影
    await page.screenshot({ path: 'auth-test-screenshot.png', fullPage: true });
    console.log('\nスクリーンショットを auth-test-screenshot.png に保存しました。');

    // コンソールログを表示
    console.log('\n=== コンソールログ ===');
    consoleLogs.forEach(log => {
      console.log(`[${log.type}] ${log.text}`);
    });

    console.log('\n\nブラウザウィンドウで開発者ツールが開いています。');
    console.log('手動でコンソールでコマンドを実行できます。');
    console.log('終了するには Ctrl+C を押してください。');
    
    // ブラウザを開いたままにする
    await new Promise(() => {});
    
  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('エラー時のスクリーンショットを error-screenshot.png に保存しました。');
  } finally {
    // Ctrl+Cで終了した場合
    process.on('SIGINT', async () => {
      console.log('\n終了中...');
      await browser.close();
      process.exit(0);
    });
  }
})();