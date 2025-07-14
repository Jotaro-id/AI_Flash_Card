import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 開発環境でのみログを出力
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase初期化: 環境変数確認中...');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Not set');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Not set');
}

// Supabaseクライアントを作成（シンプルな設定）
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 開発環境でのみデバッグ用にグローバルスコープに公開
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // @ts-expect-error デバッグ目的でwindowオブジェクトにSupabaseクライアントを追加
  window.supabase = supabase;
}