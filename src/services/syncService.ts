import { VocabularyFile, Word } from '../types';
import * as localStorageService from './localStorageService';
import * as supabaseService from './supabaseService';
import { logger } from '../utils/logger';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingChanges: number;
  syncError: string | null;
}

export interface SyncConflict {
  type: 'word_book' | 'word_card';
  localData: VocabularyFile | Word;
  remoteData: VocabularyFile | Word;
  resolution?: 'local' | 'remote' | 'merge';
}

// 同期状態の管理
let syncStatus: SyncStatus = {
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncedAt: localStorage.getItem('lastSyncedAt'),
  pendingChanges: 0,
  syncError: null
};

// 同期状態のリスナー
const syncListeners: ((status: SyncStatus) => void)[] = [];

export const addSyncListener = (listener: (status: SyncStatus) => void) => {
  syncListeners.push(listener);
  return () => {
    const index = syncListeners.indexOf(listener);
    if (index > -1) {
      syncListeners.splice(index, 1);
    }
  };
};

const updateSyncStatus = (updates: Partial<SyncStatus>) => {
  syncStatus = { ...syncStatus, ...updates };
  syncListeners.forEach(listener => listener(syncStatus));
};

// オンライン状態の監視
window.addEventListener('online', () => {
  updateSyncStatus({ isOnline: true });
  // オンラインに復帰したら自動同期
  syncAll();
});

window.addEventListener('offline', () => {
  updateSyncStatus({ isOnline: false });
});

// LocalStorageからSupabaseへの同期
export const syncLocalToSupabase = async (): Promise<void> => {
  logger.info('LocalStorage → Supabase 同期開始');
  
  try {
    updateSyncStatus({ isSyncing: true, syncError: null });
    
    // ローカルの単語帳を取得
    const localFiles = await localStorageService.fetchVocabularyFiles();
    
    for (const localFile of localFiles) {
      try {
        // Supabaseで対応する単語帳を検索
        const remoteFiles = await supabaseService.fetchVocabularyFiles();
        const remoteFile = remoteFiles.find(f => f.name === localFile.name);
        
        if (!remoteFile) {
          // Supabaseに存在しない場合は新規作成
          const createdBook = await supabaseService.createVocabularyFile(
            localFile.name,
            localFile.targetLanguage || 'en'
          );
          
          // 単語を追加
          for (const word of localFile.words) {
            await supabaseService.addWordToFile(createdBook.id, word);
          }
        } else {
          // 既存の単語帳の場合は単語を同期
          for (const localWord of localFile.words) {
            const remoteWordExists = remoteFile.words.some(
              w => w.word === localWord.word
            );
            
            if (!remoteWordExists) {
              await supabaseService.addWordToFile(remoteFile.id, localWord);
            }
          }
        }
      } catch (error) {
        logger.error(`単語帳「${localFile.name}」の同期エラー:`, error);
      }
    }
    
    const now = new Date().toISOString();
    localStorage.setItem('lastSyncedAt', now);
    updateSyncStatus({ 
      lastSyncedAt: now,
      isSyncing: false 
    });
    
    logger.info('LocalStorage → Supabase 同期完了');
  } catch (error) {
    logger.error('同期エラー:', error);
    updateSyncStatus({ 
      isSyncing: false,
      syncError: error instanceof Error ? error.message : '同期に失敗しました'
    });
    throw error;
  }
};

// SupabaseからLocalStorageへの同期
export const syncSupabaseToLocal = async (): Promise<void> => {
  logger.info('Supabase → LocalStorage 同期開始');
  
  try {
    updateSyncStatus({ isSyncing: true, syncError: null });
    
    // Supabaseから単語帳を取得
    const remoteFiles = await supabaseService.fetchVocabularyFiles();
    
    // ローカルの単語帳を取得
    const localFiles = await localStorageService.fetchVocabularyFiles();
    
    for (const remoteFile of remoteFiles) {
      const localFile = localFiles.find(f => f.name === remoteFile.name);
      
      if (!localFile) {
        // ローカルに存在しない場合は新規作成
        const createdFile = await localStorageService.createVocabularyFile(
          remoteFile.name,
          remoteFile.targetLanguage || 'en'
        );
        
        // 単語を追加
        for (const word of remoteFile.words) {
          await localStorageService.addWordToFile(createdFile.id, word);
        }
      } else {
        // 既存の単語帳の場合は単語をマージ
        for (const remoteWord of remoteFile.words) {
          const localWordExists = localFile.words.some(
            w => w.word === remoteWord.word
          );
          
          if (!localWordExists) {
            await localStorageService.addWordToFile(localFile.id, remoteWord);
          }
        }
      }
    }
    
    const now = new Date().toISOString();
    localStorage.setItem('lastSyncedAt', now);
    updateSyncStatus({ 
      lastSyncedAt: now,
      isSyncing: false 
    });
    
    logger.info('Supabase → LocalStorage 同期完了');
  } catch (error) {
    logger.error('同期エラー:', error);
    updateSyncStatus({ 
      isSyncing: false,
      syncError: error instanceof Error ? error.message : '同期に失敗しました'
    });
    throw error;
  }
};

// 双方向同期
export const syncAll = async (): Promise<void> => {
  if (!syncStatus.isOnline) {
    logger.info('オフラインのため同期をスキップ');
    return;
  }
  
  if (syncStatus.isSyncing) {
    logger.info('既に同期中のためスキップ');
    return;
  }
  
  try {
    logger.info('双方向同期開始');
    
    // まずSupabaseからローカルへ同期（最新データを取得）
    await syncSupabaseToLocal();
    
    // 次にローカルからSupabaseへ同期（ローカルの変更を反映）
    await syncLocalToSupabase();
    
    logger.info('双方向同期完了');
  } catch (error) {
    logger.error('双方向同期エラー:', error);
    throw error;
  }
};

// 同期状態の取得
export const getSyncStatus = (): SyncStatus => {
  return { ...syncStatus };
};

// 競合解決
export const resolveConflict = async (
  conflict: SyncConflict,
  resolution: 'local' | 'remote' | 'merge'
): Promise<void> => {
  logger.info('競合解決:', { type: conflict.type, resolution });
  
  switch (resolution) {
    case 'local':
      // ローカルデータを優先
      if (conflict.type === 'word_book') {
        await supabaseService.updateVocabularyFile(conflict.localData as VocabularyFile);
      }
      break;
      
    case 'remote':
      // リモートデータを優先
      if (conflict.type === 'word_book') {
        await localStorageService.updateVocabularyFile(conflict.remoteData as VocabularyFile);
      }
      break;
      
    case 'merge':
      // マージロジックの実装
      // TODO: より複雑なマージロジックの実装
      logger.info('マージ解決は現在未実装です');
      break;
  }
};

// 初期化時の同期
export const initializeSync = async (): Promise<void> => {
  logger.info('同期サービスの初期化');
  
  // オンラインの場合は初回同期を実行
  if (navigator.onLine) {
    try {
      await syncAll();
    } catch (error) {
      logger.error('初期同期エラー:', error);
    }
  }
  
  // 定期的な同期の設定（5分ごと）
  setInterval(() => {
    if (syncStatus.isOnline && !syncStatus.isSyncing) {
      syncAll().catch(error => {
        logger.error('定期同期エラー:', error);
      });
    }
  }, 5 * 60 * 1000);
};