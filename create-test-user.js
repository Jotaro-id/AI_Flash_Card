import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabaseテストユーザー作成スクリプト');
console.log('URL:', supabaseUrl);
console.log('Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestUser() {
    const testEmail = 'test@example.com';
    const testPassword = 'testpassword123';
    
    console.log('\n📧 テストユーザー作成:');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    
    try {
        // 既存ユーザーをサインアウト
        await supabase.auth.signOut();
        
        // 新規ユーザーを作成
        console.log('\n🔐 新規ユーザー作成中...');
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                emailRedirectTo: 'http://localhost:5173',
                data: {
                    name: 'Test User'
                }
            }
        });
        
        if (error) {
            console.error('\n❌ ユーザー作成エラー:', error.message);
            if (error.message.includes('already registered')) {
                console.log('\n💡 このユーザーは既に存在します。ログインを試みます...');
                
                // ログイン試行
                const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                    email: testEmail,
                    password: testPassword
                });
                
                if (loginError) {
                    console.error('❌ ログインエラー:', loginError.message);
                } else {
                    console.log('✅ ログイン成功！');
                    console.log('ユーザーID:', loginData.user.id);
                    console.log('メール:', loginData.user.email);
                }
            }
        } else {
            console.log('\n✅ ユーザー作成成功！');
            console.log('ユーザーID:', data.user?.id);
            console.log('メール:', data.user?.email);
            console.log('確認メール送信:', data.user?.email_confirmed_at ? '確認済み' : '未確認（確認メールを送信しました）');
            
            if (!data.user?.email_confirmed_at) {
                console.log('\n📧 メールボックスを確認してアカウントを有効化してください。');
                console.log('注意: Supabaseの設定によっては、メール確認が必要な場合があります。');
            }
        }
        
        // ログアウト
        await supabase.auth.signOut();
        console.log('\n🚪 ログアウトしました');
        
    } catch (err) {
        console.error('\n🔥 予期しないエラー:', err);
    }
}

createTestUser();