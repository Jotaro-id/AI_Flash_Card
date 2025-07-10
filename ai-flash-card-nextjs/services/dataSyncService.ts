import { supabase } from '@/lib/supabase';
import { localStorageService } from '@/services/localStorageService';
import { conjugationHistoryLocalService } from '@/services/conjugationHistoryLocalService';

interface SyncStatus {
  lastSyncTime: string | null;
  isSyncing: boolean;
  pendingChanges: number;
  errors: string[];
}

interface SyncResult {
  success: boolean;
  syncedItems: {
    wordBooks: number;
    wordCards: number;
    conjugationHistory: number;
    settings: number;
  };
  errors: string[];
}

class DataSyncService {
  private syncStatus: SyncStatus = {
    lastSyncTime: null,
    isSyncing: false,
    pendingChanges: 0,
    errors: []
  };

  private readonly SYNC_STATUS_KEY = 'ai-flashcard-sync-status';
  private readonly SYNC_INTERVAL = 30000; // 30秒ごとに同期
  private syncIntervalId: number | null = null;

  constructor() {
    this.loadSyncStatus();
  }

  private loadSyncStatus(): void {
    if (typeof window !== 'undefined') {
      const storedStatus = localStorage.getItem(this.SYNC_STATUS_KEY);
      if (storedStatus) {
        this.syncStatus = JSON.parse(storedStatus);
      }
    }
  }

  private saveSyncStatus(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(this.syncStatus));
    }
  }

  /**
   * 単語帳データをSupabaseに同期
   */
  private async syncWordBooks(userId: string): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      const localData = localStorageService.getAllData();
      
      for (const file of localData.vocabularyFiles || []) {
        try {
          // 単語帳が存在するか確認
          const { data: existingBook } = await supabase
            .from('word_books')
            .select('id')
            .eq('id', file.id)
            .eq('user_id', userId)
            .single();

          if (existingBook) {
            // 更新
            const { error } = await supabase
              .from('word_books')
              .update({
                name: file.name,
                target_language: file.targetLanguage,
                updated_at: new Date().toISOString()
              })
              .eq('id', file.id)
              .eq('user_id', userId);

            if (error) throw error;
          } else {
            // 新規作成
            const { error } = await supabase
              .from('word_books')
              .insert({
                id: file.id,
                name: file.name,
                target_language: file.targetLanguage,
                user_id: userId,
                created_at: file.createdAt,
                updated_at: new Date().toISOString()
              });

            if (error) throw error;
          }

          syncedCount++;
        } catch (error) {
          errors.push(`単語帳「${file.name}」の同期エラー: ${error}`);
        }
      }
    } catch (error) {
      errors.push(`単語帳同期の全体エラー: ${error}`);
    }

    return { count: syncedCount, errors };
  }

  /**
   * 単語カードデータをSupabaseに同期
   */
  private async syncWordCards(userId: string): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      const localData = localStorageService.getAllData();
      
      for (const file of localData.vocabularyFiles || []) {
        for (const word of file.words || []) {
          try {
            // 単語カードが存在するか確認
            const { data: existingCard, error: selectError } = await supabase
              .from('word_cards')
              .select('id')
              .eq('word', word.word)
              .eq('user_id', userId)
              .maybeSingle();

            if (selectError) {
              console.error('word_cards SELECT error:', {
                error: selectError,
                code: selectError.code,
                details: selectError.details,
                hint: selectError.hint,
                message: selectError.message,
                word: word.word,
                userId
              });
              throw selectError;
            }

            const wordCardId = existingCard?.id || word.id;

            if (existingCard) {
              // 更新
              const { error } = await supabase
                .from('word_cards')
                .update({
                  ai_generated_info: word.aiGenerated,
                  english_equivalent: word.aiGenerated?.englishEquivalent || null,
                  japanese_equivalent: word.aiGenerated?.japaneseEquivalent || null,
                  pronunciation: word.aiGenerated?.pronunciation || null,
                  example_sentence: word.aiGenerated?.exampleSentence || null,
                  usage_notes: word.aiGenerated?.usageNotes || null,
                  word_class: word.aiGenerated?.wordClass || null,
                  gender_variations: null,
                  tense_variations: null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', wordCardId)
                .eq('user_id', userId);

              if (error) {
                console.error('word_cards UPDATE error:', {
                  error,
                  code: error.code,
                  details: error.details,
                  hint: error.hint,
                  message: error.message,
                  wordCardId,
                  userId
                });
                throw error;
              }
            } else {
              // 新規作成
              const insertData = {
                id: wordCardId,
                word: word.word,
                user_id: userId,
                ai_generated_info: word.aiGenerated,
                english_equivalent: word.aiGenerated?.englishEquivalent || null,
                japanese_equivalent: word.aiGenerated?.japaneseEquivalent || null,
                pronunciation: word.aiGenerated?.pronunciation || null,
                example_sentence: word.aiGenerated?.exampleSentence || null,
                usage_notes: word.aiGenerated?.usageNotes || null,
                word_class: word.aiGenerated?.wordClass || null,
                gender_variations: null,
                tense_variations: null,
                created_at: word.createdAt || new Date().toISOString()
              };

              console.log('Attempting to insert word_card:', insertData);

              const { error } = await supabase
                .from('word_cards')
                .insert(insertData)
                .select()
                .single();

              if (error) {
                console.error('word_cards INSERT error:', {
                  error: error,
                  errorString: JSON.stringify(error),
                  code: error?.code || 'unknown',
                  details: error?.details || 'no details',
                  hint: error?.hint || 'no hint',
                  message: error?.message || 'no message',
                  insertData
                });
                
                // Supabaseの認証状態を確認
                const { data: { user } } = await supabase.auth.getUser();
                console.error('Current auth state:', {
                  userId: user?.id,
                  userEmail: user?.email,
                  insertUserId: userId
                });
                
                throw error;
              }
            }

            // 単語帳と単語の関連を作成
            const { error: linkError } = await supabase
              .from('word_book_cards')
              .upsert({
                word_book_id: file.id,
                word_card_id: wordCardId,
                learning_status: word.learningStatus || 'not_started'
              }, {
                onConflict: 'word_book_id,word_card_id'
              });

            if (linkError) throw linkError;

            syncedCount++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`単語「${word.word}」の同期エラー:`, error);
            errors.push(`単語「${word.word}」の同期エラー: ${errorMessage}`);
          }
        }
      }
    } catch (error) {
      errors.push(`単語カード同期の全体エラー: ${error}`);
    }

    return { count: syncedCount, errors };
  }

  /**
   * 動詞活用履歴をSupabaseに同期
   */
  private async syncConjugationHistory(userId: string): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      // まずテーブルの存在を確認
      const { error: tableCheckError } = await supabase
        .from('verb_conjugation_history')
        .select('id')
        .limit(1);

      if (tableCheckError) {
        if (tableCheckError.message.includes('relation') && tableCheckError.message.includes('does not exist')) {
          throw new Error('verb_conjugation_historyテーブルが存在しません');
        }
        throw tableCheckError;
      }

      const history = conjugationHistoryLocalService.getHistory();
      
      for (const entry of history) {
        try {
          // 履歴が存在するか確認
          const { data: existing, error: selectError } = await supabase
            .from('verb_conjugation_history')
            .select('id')
            .eq('id', entry.id)
            .eq('user_id', userId)
            .maybeSingle();

          if (selectError) {
            errors.push(`履歴確認エラー: ${selectError.message}`);
            continue;
          }

          if (!existing) {
            // 新規作成のみ（履歴は更新しない）
            const { error } = await supabase
              .from('verb_conjugation_history')
              .insert({
                id: entry.id,
                user_id: userId,
                word_card_id: entry.word_card_id,
                practice_type: entry.practice_type,
                tense: entry.tense,
                mood: entry.mood,
                person: entry.person,
                correct_answer: entry.correct_answer,
                user_answer: entry.user_answer,
                is_correct: entry.is_correct,
                created_at: entry.created_at
              });

            if (error) {
              errors.push(`履歴挿入エラー: ${error.message}`);
              continue;
            }
            syncedCount++;
          }
        } catch (error) {
          errors.push(`活用履歴の同期エラー: ${error instanceof Error ? error.message : error}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('verb_conjugation_historyテーブルが存在しません')) {
        throw error; // 上位でキャッチして適切に処理
      }
      errors.push(`活用履歴同期の全体エラー: ${errorMessage}`);
    }

    return { count: syncedCount, errors };
  }

  /**
   * すべてのデータを同期
   */
  async syncAllData(): Promise<SyncResult> {
    console.log('[DataSync] syncAllData が呼ばれました', new Date().toISOString());
    
    if (this.syncStatus.isSyncing) {
      console.log('[DataSync] 同期処理が既に実行中のためスキップ');
      return {
        success: false,
        syncedItems: { wordBooks: 0, wordCards: 0, conjugationHistory: 0, settings: 0 },
        errors: ['同期処理が既に実行中です']
      };
    }

    console.log('[DataSync] 同期処理を開始します');
    this.syncStatus.isSyncing = true;
    this.syncStatus.errors = [];
    this.saveSyncStatus();

    const result: SyncResult = {
      success: true,
      syncedItems: {
        wordBooks: 0,
        wordCards: 0,
        conjugationHistory: 0,
        settings: 0
      },
      errors: []
    };

    try {
      // ログイン中のユーザーIDを取得
      console.log('[DataSync] Supabaseへの接続を確認中...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('[DataSync] Supabase認証エラー:', authError);
        throw new Error(`ユーザー認証エラー: ${authError.message}`);
      }
      
      if (!user) {
        console.log('[DataSync] ユーザーがログインしていません');
        throw new Error('ユーザー認証エラー: ログインしてください');
      }
      
      console.log('[DataSync] Supabase接続成功 - ユーザーID:', user.id);

      // 各データを同期
      console.log('[DataSync] 単語帳の同期を開始...');
      const wordBooksResult = await this.syncWordBooks(user.id);
      result.syncedItems.wordBooks = wordBooksResult.count;
      result.errors.push(...wordBooksResult.errors);
      console.log('[DataSync] 単語帳の同期完了:', wordBooksResult.count, '件');

      console.log('[DataSync] 単語カードの同期を開始...');
      const wordCardsResult = await this.syncWordCards(user.id);
      result.syncedItems.wordCards = wordCardsResult.count;
      result.errors.push(...wordCardsResult.errors);
      console.log('[DataSync] 単語カードの同期完了:', wordCardsResult.count, '件');

      // 動詞活用履歴の同期は一時的に無効化（テーブル作成後に有効化）
      try {
        console.log('[DataSync] 動詞活用履歴の同期を開始...');
        const historyResult = await this.syncConjugationHistory(user.id);
        result.syncedItems.conjugationHistory = historyResult.count;
        result.errors.push(...historyResult.errors);
        console.log('[DataSync] 動詞活用履歴の同期完了:', historyResult.count, '件');
      } catch (error) {
        console.warn('[DataSync] 動詞活用履歴テーブルが存在しません。マイグレーションを実行してください。');
        result.syncedItems.conjugationHistory = 0;
        result.errors.push('動詞活用履歴テーブルが見つかりません（マイグレーション未実行）');
      }

      // 同期成功
      this.syncStatus.lastSyncTime = new Date().toISOString();
      this.syncStatus.pendingChanges = 0;

      if (result.errors.length > 0) {
        result.success = false;
        this.syncStatus.errors = result.errors;
        console.log('[DataSync] 同期完了（エラーあり）:', result.errors.length, '件のエラー');
      } else {
        console.log('[DataSync] 同期が正常に完了しました');
      }
    } catch (error) {
      console.error('[DataSync] 同期処理でエラーが発生:', error);
      result.success = false;
      result.errors.push(`同期エラー: ${error}`);
      this.syncStatus.errors = result.errors;
    } finally {
      this.syncStatus.isSyncing = false;
      this.saveSyncStatus();
      console.log('[DataSync] 同期処理終了 - 結果:', {
        success: result.success,
        syncedItems: result.syncedItems,
        errorCount: result.errors.length
      });
    }

    return result;
  }

  /**
   * 定期同期を開始
   */
  startPeriodicSync(): void {
    console.log('[DataSync] startPeriodicSync が呼ばれました');
    
    if (this.syncIntervalId) {
      console.log('[DataSync] 定期同期は既に実行中です（IntervalID:', this.syncIntervalId, '）');
      return; // 既に実行中
    }

    console.log('[DataSync] 定期同期を開始します（間隔:', this.SYNC_INTERVAL, 'ms）');
    
    // 初回同期
    console.log('[DataSync] 初回同期を実行します');
    this.syncAllData();

    // 定期実行
    this.syncIntervalId = window.setInterval(() => {
      console.log('[DataSync] 定期同期タイマーが発火しました');
      this.syncAllData();
    }, this.SYNC_INTERVAL);
    
    console.log('[DataSync] 定期同期が設定されました（IntervalID:', this.syncIntervalId, '）');
  }

  /**
   * 定期同期を停止
   */
  stopPeriodicSync(): void {
    console.log('[DataSync] stopPeriodicSync が呼ばれました');
    
    if (this.syncIntervalId) {
      console.log('[DataSync] 定期同期を停止します（IntervalID:', this.syncIntervalId, '）');
      window.clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    } else {
      console.log('[DataSync] 定期同期は実行されていません');
    }
  }

  /**
   * 同期状態を取得
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * 保留中の変更数を増やす
   */
  incrementPendingChanges(): void {
    this.syncStatus.pendingChanges++;
    this.saveSyncStatus();
  }

  /**
   * エラーをクリア
   */
  clearErrors(): void {
    this.syncStatus.errors = [];
    this.saveSyncStatus();
  }
}

export const dataSyncService = new DataSyncService();