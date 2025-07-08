const puppeteer = require('puppeteer');

async function testLogin() {
    console.log('ブラウザを起動中...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // コンソールログをキャプチャ
        page.on('console', msg => {
            console.log('ブラウザコンソール:', msg.type(), msg.text());
        });

        // エラーをキャプチャ
        page.on('pageerror', error => {
            console.error('ページエラー:', error.message);
        });

        // ネットワークリクエストを監視
        page.on('request', request => {
            if (request.url().includes('supabase')) {
                console.log('Supabaseリクエスト:', request.method(), request.url());
            }
        });

        page.on('response', response => {
            if (response.url().includes('supabase')) {
                console.log('Supabaseレスポンス:', response.status(), response.url());
            }
        });

        console.log('ログインページにアクセス中...');
        await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });

        // スクリーンショット（ログイン前）
        await page.screenshot({ path: 'before-login.png' });
        console.log('ログイン前のスクリーンショットを保存しました: before-login.png');

        // ログインフォームに入力
        console.log('ログイン情報を入力中...');
        await page.type('input[type="email"]', 'ttttroyaanderson@gmail.com');
        await page.type('input[type="password"]', 'testtestuser');

        // ログインボタンをクリック
        console.log('ログインボタンをクリック...');
        await page.click('button[type="submit"]');

        // ログイン処理を待つ
        await page.waitForTimeout(5000);

        // スクリーンショット（ログイン後）
        await page.screenshot({ path: 'after-login.png' });
        console.log('ログイン後のスクリーンショットを保存しました: after-login.png');

        // ページのコンテンツを確認
        const content = await page.content();
        if (content.includes('ログアウト') || content.includes('Dashboard')) {
            console.log('✅ ログイン成功を確認しました！');
        } else {
            console.log('⚠️  ログイン後の画面遷移が確認できませんでした');
        }

        // コンソールログを取得
        const logs = await page.evaluate(() => {
            return window.localStorage.getItem('supabase.auth.token');
        });
        
        if (logs) {
            console.log('認証トークンが保存されています');
        }

    } catch (error) {
        console.error('テスト中にエラーが発生しました:', error);
    } finally {
        await browser.close();
        console.log('テスト完了');
    }
}

testLogin();