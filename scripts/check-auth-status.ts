// 認証状態と同期状況を確認するスクリプト
// ブラウザのコンソールで実行できます

import { supabase } from '../lib/supabase';
import { dataSyncService } from '../services/dataSyncService';

export async function checkAuthAndSyncStatus() {
  console.log('=== 認証・同期状態の確認 ===');
  
  // 1. Supabase認証状態を確認
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('認証エラー:', error);
  }
  
  if (user) {
    console.log('✅ Supabaseユーザーとしてログイン中');
    console.log('ユーザーID:', user.id);
    console.log('メールアドレス:', user.email);
  } else {
    console.log('❌ Supabaseユーザーとしてログインしていません');
    console.log('ローカルストレージモードで動作中');
  }
  
  // 2. 同期状態を確認
  const syncStatus = dataSyncService.getSyncStatus();
  console.log('\n同期状態:', {
    最終同期時刻: syncStatus.lastSyncTime || '未同期',
    同期中: syncStatus.isSyncing,
    保留中の変更: syncStatus.pendingChanges,
    エラー数: syncStatus.errors.length
  });
  
  if (syncStatus.errors.length > 0) {
    console.log('同期エラー:', syncStatus.errors);
  }
  
  // 3. ローカルストレージの確認
  const currentUser = localStorage.getItem('ai-flashcard-current-user');
  console.log('\nローカルストレージのユーザー:', currentUser);
  
  console.log('\n=== 確認終了 ===');
  
  return { user, syncStatus, currentUser };
}

// 手動で同期を開始する関数
export async function manualStartSync() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('Supabaseユーザーとしてログインしていません。同期にはSupabaseログインが必要です。');
    return;
  }
  
  console.log('手動で同期を開始します...');
  dataSyncService.startPeriodicSync();
  
  // 即座に一度同期を実行
  const result = await dataSyncService.syncAllData();
  console.log('同期結果:', result);
}

// コンソールから実行できるようにグローバルに公開
if (typeof window !== 'undefined') {
  (window as any).checkAuthAndSyncStatus = checkAuthAndSyncStatus;
  (window as any).manualStartSync = manualStartSync;
}