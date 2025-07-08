import puppeteer from 'puppeteer';

async function debugApp() {
    console.log('AI Flash Card アプリケーションのデバッグを開始します...\n');
    
    let browser;
    try {
        // Puppeteerがインストールされているか確認
        browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // コンソールログを収集
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push({
                type: msg.type(),
                text: msg.text()
            });
        });
        
        // ネットワークエラーを収集
        const networkErrors = [];
        page.on('response', response => {
            if (response.status() >= 400) {
                networkErrors.push({
                    url: response.url(),
                    status: response.status(),
                    statusText: response.statusText()
                });
            }
        });
        
        console.log('ページを読み込んでいます...');
        await page.goto('http://localhost:5173', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // 3秒待機
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n=== デバッグ結果 ===\n');
        
        // 1. アプリケーションログを取得
        console.log('1. アプリケーションログ:');
        try {
            const appLogs = await page.evaluate(() => {
                return window.aiFlashcardLogger?.getLogs() || null;
            });
            console.log(appLogs ? JSON.stringify(appLogs, null, 2) : 'ロガーが見つかりません');
        } catch (e) {
            console.log('エラー:', e.message);
        }
        
        // 2. ローカルストレージを確認
        console.log('\n2. ローカルストレージ (vocabulary-files):');
        try {
            const localStorage = await page.evaluate(() => {
                return localStorage.getItem('vocabulary-files');
            });
            console.log(localStorage || 'データなし');
        } catch (e) {
            console.log('エラー:', e.message);
        }
        
        // 3. Supabaseセッションを確認
        console.log('\n3. Supabaseセッション:');
        try {
            const session = await page.evaluate(async () => {
                if (window.supabase?.auth?.getSession) {
                    const { data, error } = await window.supabase.auth.getSession();
                    return { data, error };
                }
                return null;
            });
            console.log(session ? JSON.stringify(session, null, 2) : 'Supabaseが見つかりません');
        } catch (e) {
            console.log('エラー:', e.message);
        }
        
        // 4. ネットワークエラー
        console.log('\n4. ネットワークエラー (400番台):');
        if (networkErrors.length > 0) {
            networkErrors.forEach(error => {
                console.log(`- ${error.status} ${error.statusText}: ${error.url}`);
            });
        } else {
            console.log('ネットワークエラーはありません');
        }
        
        // 5. コンソールログ
        console.log('\n5. コンソールログ:');
        if (consoleLogs.length > 0) {
            consoleLogs.forEach(log => {
                console.log(`[${log.type}] ${log.text}`);
            });
        } else {
            console.log('コンソールログはありません');
        }
        
        // 6. スクリーンショット
        console.log('\n6. スクリーンショットを保存しています...');
        await page.screenshot({ 
            path: 'debug-screenshot.png',
            fullPage: true 
        });
        console.log('スクリーンショットを debug-screenshot.png として保存しました');
        
    } catch (error) {
        console.error('デバッグ中にエラーが発生しました:', error.message);
        console.log('\nPuppeteerがインストールされていない可能性があります。');
        console.log('以下のコマンドでインストールしてください:');
        console.log('npm install --save-dev puppeteer');
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 直接実行
debugApp().catch(error => {
    console.error('エラー:', error.message);
    if (error.message.includes('Cannot find module')) {
        console.log('\nPuppeteerがインストールされていません。');
        console.log('以下のコマンドでインストールしてください:');
        console.log('\nnpm install --save-dev puppeteer\n');
    }
});