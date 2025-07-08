// Node.jsでSupabase認証をテストするスクリプト
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 デバッグ情報:');
console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key (最初の20文字):', supabaseAnonKey?.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
    console.log('\n📧 ログインテスト開始...');
    console.log('Email: ttttroyaanderson@gmail.com');
    console.log('Password: ********');

    try {
        // 現在のセッションを確認
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error('❌ セッション確認エラー:', sessionError);
        } else {
            console.log('📍 現在のセッション:', sessionData.session ? 'あり' : 'なし');
        }

        // ログイン試行
        console.log('\n🔐 ログイン試行中...');
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'ttttroyaanderson@gmail.com',
            password: 'testtestuser'
        });

        if (error) {
            console.error('\n❌ ログインエラー:');
            console.error('メッセージ:', error.message);
            console.error('ステータス:', error.status);
            console.error('詳細:', JSON.stringify(error, null, 2));
            
            // エラーの種類に応じたヒント
            if (error.message.includes('Invalid login credentials')) {
                console.log('\n💡 ヒント: メールアドレスまたはパスワードが間違っています。');
                console.log('- ユーザーが存在することを確認してください');
                console.log('- パスワードが正しいことを確認してください');
            }
        } else {
            console.log('\n✅ ログイン成功！');
            console.log('ユーザーID:', data.user.id);
            console.log('メール:', data.user.email);
            console.log('作成日時:', data.user.created_at);
            console.log('アクセストークン (最初の20文字):', data.session.access_token.substring(0, 20) + '...');
            
            // データ取得テスト
            console.log('\n📚 単語帳データを取得中...');
            const { data: wordBooks, error: fetchError } = await supabase
                .from('word_books')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (fetchError) {
                console.error('❌ データ取得エラー:', fetchError.message);
            } else {
                console.log(`✅ ${wordBooks.length}個の単語帳を取得しました`);
                wordBooks.forEach((book, index) => {
                    console.log(`  ${index + 1}. ${book.title} (ID: ${book.id})`);
                });
            }
            
            // ログアウト
            console.log('\n🚪 ログアウト中...');
            const { error: logoutError } = await supabase.auth.signOut();
            if (logoutError) {
                console.error('❌ ログアウトエラー:', logoutError.message);
            } else {
                console.log('✅ ログアウト完了');
            }
        }
    } catch (err) {
        console.error('\n🔥 予期しないエラー:', err);
    }
}

// テスト実行
testLogin();