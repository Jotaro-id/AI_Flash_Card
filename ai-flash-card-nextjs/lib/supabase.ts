import { createClient } from '@supabase/supabase-js'

// 環境変数の確認ログ
console.log('Supabase初期化: 環境変数確認中...');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key are required. Make sure you have a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('Current values:', { 
    supabaseUrl, 
    supabaseAnonKey: supabaseAnonKey ? 'Set' : 'Not set' 
  });
  throw new Error('Supabase URL and Anon Key are required')
}

// Supabaseクライアントを作成（シンプルな設定）
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 初期化完了ログ
console.log('Supabase client created successfully with enhanced options');

// グローバルスコープに公開（デバッグ用）
if (typeof window !== 'undefined') {
  // @ts-expect-error デバッグ目的でwindowオブジェクトにSupabaseクライアントを追加
  window.supabase = supabase;
  console.log('Supabaseクライアントをwindow.supabaseとしてグローバルに公開しました');
}