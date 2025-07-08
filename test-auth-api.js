// Supabase APIを直接テストするスクリプト
import axios from 'axios';

const SUPABASE_URL = 'https://cdltoqdsxdnyoorkhkan.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbHRvcWRzeGRueW9vcmtoa2FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MTMzMDIsImV4cCI6MjA2NzE4OTMwMn0.qpk4PdfKyEZ7dKzx6DHcmTtXsLmGEuXP7zN08PkjALY';

async function testSupabaseAuth() {
    console.log('🔧 Supabase認証テスト開始...\n');
    
    // 1. ヘルスチェック
    console.log('1️⃣ ヘルスチェック...');
    try {
        const healthResponse = await axios.get(`${SUPABASE_URL}/auth/v1/health`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY
            }
        });
        console.log('✅ ヘルスチェック成功:', healthResponse.data);
    } catch (error) {
        console.error('❌ ヘルスチェック失敗:', error.response?.data || error.message);
    }
    
    // 2. 現在のセッション確認
    console.log('\n2️⃣ 現在のセッション確認...');
    try {
        const sessionResponse = await axios.get(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        console.log('ℹ️ セッション情報:', sessionResponse.data);
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('ℹ️ 現在のセッションなし（正常）');
        } else {
            console.error('❌ セッション確認エラー:', error.response?.data || error.message);
        }
    }
    
    // 3. ログインテスト
    console.log('\n3️⃣ ログインテスト...');
    console.log('Email: ttttroyaanderson@gmail.com');
    console.log('Password: ********');
    
    try {
        const loginResponse = await axios.post(
            `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
            {
                email: 'ttttroyaanderson@gmail.com',
                password: 'testtestuser',
                gotrue_meta_security: {}
            },
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ ログイン成功！');
        console.log('User ID:', loginResponse.data.user.id);
        console.log('Email:', loginResponse.data.user.email);
        console.log('Access Token (最初の20文字):', loginResponse.data.access_token.substring(0, 20) + '...');
        
        // 4. データアクセステスト
        console.log('\n4️⃣ データアクセステスト...');
        const accessToken = loginResponse.data.access_token;
        
        try {
            const dataResponse = await axios.get(
                `${SUPABASE_URL}/rest/v1/word_books?select=*`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );
            
            console.log('✅ データアクセス成功！');
            console.log(`単語帳数: ${dataResponse.data.length}`);
            dataResponse.data.forEach((book, index) => {
                console.log(`  ${index + 1}. ${book.title} (ID: ${book.id})`);
            });
        } catch (error) {
            console.error('❌ データアクセスエラー:', error.response?.data || error.message);
        }
        
    } catch (error) {
        console.error('❌ ログインエラー:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
        } else {
            console.error('Error:', error.message);
        }
        
        console.log('\n💡 トラブルシューティング:');
        console.log('1. ユーザーが存在することを確認してください');
        console.log('2. パスワードが正しいことを確認してください');
        console.log('3. Supabaseダッシュボードで認証設定を確認してください');
    }
    
    // 5. 設定確認
    console.log('\n5️⃣ 設定確認...');
    console.log('SUPABASE_URL:', SUPABASE_URL);
    console.log('ANON_KEY (最初の20文字):', SUPABASE_ANON_KEY.substring(0, 20) + '...');
}

// テスト実行
testSupabaseAuth();