#!/usr/bin/env node

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 環境変数を読み込む
try {
  const envFile = fs.readFileSync('.env', 'utf8');
  envFile.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
} catch (e) {
  console.log('⚠️ .envファイルが見つかりません');
}

console.log('=== AI単語帳 デバッグチェック ===\n');

// 1. 環境変数チェック
console.log('1. 環境変数チェック:');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl) {
  console.log('✅ VITE_SUPABASE_URL:', supabaseUrl);
} else {
  console.log('❌ VITE_SUPABASE_URL: 未設定');
}

if (supabaseAnonKey) {
  console.log(`✅ VITE_SUPABASE_ANON_KEY: 設定済み (${supabaseAnonKey.length}文字)`);
} else {
  console.log('❌ VITE_SUPABASE_ANON_KEY: 未設定');
}

// 2. 開発サーバーチェック
console.log('\n2. 開発サーバーチェック:');
http.get('http://localhost:5173', (res) => {
  if (res.statusCode === 200) {
    console.log('✅ 開発サーバーは稼働中です (http://localhost:5173)');
  } else {
    console.log(`⚠️ 開発サーバーが異常なステータスを返しています: ${res.statusCode}`);
  }
}).on('error', (err) => {
  console.log('❌ 開発サーバーに接続できません。npm run dev を実行してください。');
  console.log('   エラー:', err.message);
});

// 3. Supabase接続チェック（環境変数が設定されている場合）
if (supabaseUrl && supabaseAnonKey) {
  console.log('\n3. Supabase API接続チェック:');
  
  const url = new URL(supabaseUrl);
  const options = {
    hostname: url.hostname,
    port: 443,
    path: '/rest/v1/',
    method: 'GET',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  };

  https.get(options, (res) => {
    if (res.statusCode === 200 || res.statusCode === 401) {
      console.log('✅ Supabase APIに接続できました');
    } else {
      console.log(`⚠️ Supabase APIが異常なステータスを返しています: ${res.statusCode}`);
    }
    
    // レスポンスボディを読み取る
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.message) {
            console.log('   メッセージ:', parsed.message);
          }
        } catch (e) {
          // JSON解析エラーは無視
        }
      }
    });
  }).on('error', (err) => {
    console.log('❌ Supabase APIに接続できません');
    console.log('   エラー:', err.message);
  });
}

// 4. プロジェクトファイルチェック
console.log('\n4. プロジェクトファイルチェック:');
const requiredFiles = [
  'src/lib/supabase.ts',
  'src/services/supabaseService.ts',
  'src/components/Auth.tsx',
  'database_schema.sql',
  '.env'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} が見つかりません`);
  }
});

console.log('\n=== チェック完了 ===');
console.log('\nデバッグ手順:');
console.log('1. 上記のエラーを修正してください');
console.log('2. npm run dev で開発サーバーを起動してください');
console.log('3. ブラウザで http://localhost:5173 にアクセスしてください');
console.log('4. ブラウザの開発者ツール（F12）でコンソールログを確認してください');
console.log('5. test-debug.html をブラウザで開いて詳細な診断を実行できます');