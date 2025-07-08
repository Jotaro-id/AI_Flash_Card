const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // コンソールログを収集
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  // ページエラーを収集
  page.on('pageerror', error => {
    console.error('Page error:', error);
  });

  try {
    // ページを開く
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    // 少し待つ
    await page.waitForTimeout(3000);

    // 開発者ツールを開く（Chromeのみ）
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('Runtime.enable');

    // Supabase認証の状態を確認
    const sessionResult = await page.evaluate(async () => {
      try {
        if (!window.supabase) {
          return { error: 'window.supabase is not defined' };
        }
        const session = await window.supabase.auth.getSession();
        return { session };
      } catch (error) {
        return { error: error.message };
      }
    });

    const userResult = await page.evaluate(async () => {
      try {
        if (!window.supabase) {
          return { error: 'window.supabase is not defined' };
        }
        const user = await window.supabase.auth.getUser();
        return { user };
      } catch (error) {
        return { error: error.message };
      }
    });

    // スクリーンショットを撮影
    await page.screenshot({ path: 'auth-test-screenshot.png', fullPage: true });

    // 結果を出力
    console.log('\n=== Supabase認証テスト結果 ===\n');
    console.log('Session Result:', JSON.stringify(sessionResult, null, 2));
    console.log('\nUser Result:', JSON.stringify(userResult, null, 2));
    console.log('\n=== コンソールログ ===\n');
    consoleLogs.forEach(log => {
      console.log(`[${log.type}] ${log.text}`);
    });

    // ブラウザは開いたまま
    console.log('\n開発者ツールで確認する場合は、ブラウザウィンドウで F12 を押してください。');
    console.log('終了するには Ctrl+C を押してください。');
    
    // 無限ループで維持
    await new Promise(() => {});
    
  } catch (error) {
    console.error('テストエラー:', error);
    await browser.close();
  }
})();