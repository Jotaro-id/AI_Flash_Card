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
            const { data: existingCard } = await supabase
              .from('word_cards')
              .select('id')
              .eq('word', word.word)
              .eq('user_id', userId)
              .single();

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

              if (error) throw error;
            } else {
              // 新規作成
              const { error } = await supabase
                .from('word_cards')
                .insert({
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
                })
                .select()
                .single();

              if (error) throw error;
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
            errors.push(`単語「${word.word}」の同期エラー: ${error}`);
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
      const history = conjugationHistoryLocalService.getHistory();
      
      for (const entry of history) {
        try {
          // 履歴が存在するか確認
          const { data: existing } = await supabase
            .from('verb_conjugation_history')
            .select('id')
            .eq('id', entry.id)
            .eq('user_id', userId)
            .single();

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

            if (error) throw error;
            syncedCount++;
          }
        } catch (error) {
          errors.push(`活用履歴の同期エラー: ${error}`);
        }
      }
    } catch (error) {
      errors.push(`活用履歴同期の全体エラー: ${error}`);
    }

    return { count: syncedCount, errors };
  }

  /**
   * すべてのデータを同期
   */
  async syncAllData(): Promise<SyncResult> {
    if (this.syncStatus.isSyncing) {
      return {
        success: false,
        syncedItems: { wordBooks: 0, wordCards: 0, conjugationHistory: 0, settings: 0 },
        errors: ['同期処理が既に実行中です']
      };
    }

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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('ユーザー認証エラー: ログインしてください');
      }

      // 各データを同期
      const wordBooksResult = await this.syncWordBooks(user.id);
      result.syncedItems.wordBooks = wordBooksResult.count;
      result.errors.push(...wordBooksResult.errors);

      const wordCardsResult = await this.syncWordCards(user.id);
      result.syncedItems.wordCards = wordCardsResult.count;
      result.errors.push(...wordCardsResult.errors);

      const historyResult = await this.syncConjugationHistory(user.id);
      result.syncedItems.conjugationHistory = historyResult.count;
      result.errors.push(...historyResult.errors);

      // 同期成功
      this.syncStatus.lastSyncTime = new Date().toISOString();
      this.syncStatus.pendingChanges = 0;

      if (result.errors.length > 0) {
        result.success = false;
        this.syncStatus.errors = result.errors;
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`同期エラー: ${error}`);
      this.syncStatus.errors = result.errors;
    } finally {
      this.syncStatus.isSyncing = false;
      this.saveSyncStatus();
    }

    return result;
  }

  /**
   * 定期同期を開始
   */
  startPeriodicSync(): void {
    if (this.syncIntervalId) {
      return; // 既に実行中
    }

    // 初回同期
    this.syncAllData();

    // 定期実行
    this.syncIntervalId = window.setInterval(() => {
      this.syncAllData();
    }, this.SYNC_INTERVAL);
  }

  /**
   * 定期同期を停止
   */
  stopPeriodicSync(): void {
    if (this.syncIntervalId) {
      window.clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
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