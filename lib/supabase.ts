import { createClient } from '@supabase/supabase-js'

// 環境変数にデフォルト値を設定（ビルド時のエラーを回避）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// 開発環境でのみログを出力
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Supabase初期化: 環境変数確認中...');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');
}

// Supabaseクライアントを作成
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