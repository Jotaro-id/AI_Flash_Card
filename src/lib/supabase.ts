import { createClient } from '@supabase/supabase-js'

console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key are required. Make sure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  console.error('Current values:', { supabaseUrl, supabaseAnonKey });
  
  // 開発環境での一時的な対処として、ダミーの値を使用
  if (import.meta.env.DEV) {
    console.warn('Using dummy Supabase credentials for development. Authentication will not work!');
    // この値では実際の認証は動作しません
    const dummyUrl = 'https://dummy.supabase.co';
    const dummyKey = 'dummy-key';
    supabaseClient = createClient(dummyUrl, dummyKey);
  } else {
    throw new Error('Supabase URL and Anon Key are required')
  }
} else {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseClient;
console.log('Supabase client created:', supabase);