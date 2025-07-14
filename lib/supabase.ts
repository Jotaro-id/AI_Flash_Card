import { createClient } from '@supabase/supabase-js'

// 環境変数の存在チェック（ビルド時ではなく実行時に評価される）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 開発環境でのみログを出力
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Supabase初期化: 環境変数確認中...');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Not set');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Not set');
}

// ダミーのSupabaseクライアント（環境変数がない場合用）
const createDummyClient = () => {
  const dummyClient = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    }
  };
  // 型アサーションを使用してSupabaseClientとして扱う
  return dummyClient as ReturnType<typeof createClient>;
};

// Supabaseクライアントを作成（環境変数がない場合はダミークライアント）
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : createDummyClient();

// 開発環境でのみデバッグ用にグローバルスコープに公開
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // @ts-expect-error デバッグ目的でwindowオブジェクトにSupabaseクライアントを追加
  window.supabase = supabase;
}