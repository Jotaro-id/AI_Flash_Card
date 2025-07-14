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
        // 起動時に同期中フラグをリセット（前回異常終了の場合の対策）
        if (this.syncStatus.isSyncing) {
          console.warn('[DataSync] 前回の同期が異常終了した可能性があります。フラグをリセットします。');
          this.syncStatus.isSyncing = false;
          this.saveSyncStatus();
        }
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
      if (!localData.vocabularyFiles || localData.vocabularyFiles.length === 0) {
        return { count: 0, errors: [] };
      }

      // すべての単語帳IDを取得
      const localFileIds = localData.vocabularyFiles.map(f => f.id);
      
      // 既存の単語帳を一括で取得
      const { data: existingBooks, error: fetchError } = await supabase
        .from('word_books')
        .select('id')
        .eq('user_id', userId)
        .in('id', localFileIds);

      if (fetchError) throw fetchError;

      const existingIds = new Set((existingBooks || []).map(b => b.id));
      const toInsert: any[] = [];
      const toUpdate: any[] = [];

      // 挿入と更新を分類
      for (const file of localData.vocabularyFiles) {
        const data = {
          id: file.id,
          name: file.name,
          target_language: file.targetLanguage || 'en',
          user_id: userId,
          updated_at: new Date().toISOString()
        };

        if (existingIds.has(file.id)) {
          toUpdate.push(data);
        } else {
          toInsert.push({ ...data, created_at: file.createdAt });
        }
      }

      // バッチ挿入
      if (toInsert.length > 0) {
        const { error } = await supabase
          .from('word_books')
          .insert(toInsert);
        
        if (error) {
          errors.push(`単語帳の一括挿入エラー: ${error.message}`);
        } else {
          syncedCount += toInsert.length;
        }
      }

      // 個別更新（Supabaseはバッチ更新が制限されているため）
      for (const updateData of toUpdate) {
        try {
          const { error } = await supabase
            .from('word_books')
            .update({
              name: updateData.name,
              target_language: updateData.target_language,
              updated_at: updateData.updated_at
            })
            .eq('id', updateData.id)
            .eq('user_id', userId);

          if (error) throw error;
          syncedCount++;
        } catch (error) {
          errors.push(`単語帳「${updateData.name}」の更新エラー: ${error}`);
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
      
      // 全ての単語を収集
      const allWords: Array<{word: any, fileId: string}> = [];
      for (const file of localData.vocabularyFiles || []) {
        for (const word of file.words || []) {
          allWords.push({ word, fileId: file.id });
        }
      }

      if (allWords.length === 0) {
        return { count: 0, errors: [] };
      }

      // 処理を小さなバッチに分割（50件ずつ）
      const batchSize = 50;
      for (let i = 0; i < allWords.length; i += batchSize) {
        const batch = allWords.slice(i, i + batchSize);
        
        try {
          await this.syncWordCardBatch(batch, userId);
          syncedCount += batch.length;
        } catch (error) {
          errors.push(`単語カードバッチ同期エラー (${i}-${i + batch.length}): ${error}`);
        }
      }
    } catch (error) {
      errors.push(`単語カード同期の全体エラー: ${error}`);
    }

    return { count: syncedCount, errors };
  }

  /**
   * 単語カードをバッチで同期
   */
  private async syncWordCardBatch(
    batch: Array<{word: any, fileId: string}>, 
    userId: string
  ): Promise<void> {
    // 既存の単語カードを一括で確認
    const wordTexts = batch.map(item => item.word.word);
    const { data: existingCards, error: fetchError } = await supabase
      .from('word_cards')
      .select('id, word')
      .eq('user_id', userId)
      .in('word', wordTexts);

    if (fetchError) throw fetchError;

    const existingMap = new Map((existingCards || []).map(c => [c.word, c.id]));
    const toInsert: any[] = [];
    const toUpdate: any[] = [];

    for (const { word, fileId } of batch) {
      const existingId = existingMap.get(word.word);
      
      // ユニークなIDを生成（fileIdを含めることで重複を防ぐ）
      const wordCardId = existingId || `${fileId}_${word.id}`;

      const cardData = {
        id: wordCardId,
        word: word.word,
        user_id: userId,
        ai_generated_info: word.aiGenerated,
        english_equivalent: word.aiGenerated?.englishEquivalent || null,
        japanese_equivalent: word.aiGenerated?.japaneseEquivalent || null,
        pronunciation: word.aiGenerated?.pronunciation || null,
        example_sentence: word.aiGenerated?.exampleSentence || null,
        example_sentence_japanese: word.aiGenerated?.japaneseExample || null,
        example_sentence_english: word.aiGenerated?.englishExample || null,
        usage_notes: word.aiGenerated?.usageNotes || null,
        word_class: word.aiGenerated?.wordClass || null,
        gender_variations: word.aiGenerated?.grammaticalChanges?.genderNumberChanges || null,
        tense_variations: word.aiGenerated?.grammaticalChanges?.verbConjugations || null,
        updated_at: new Date().toISOString()
      };

      if (existingId) {
        toUpdate.push(cardData);
      } else {
        toInsert.push({ ...cardData, created_at: word.createdAt || new Date().toISOString() });
      }
    }

    // バッチ挿入
    if (toInsert.length > 0) {
      console.log('[DataSync] 単語カードバッチ挿入開始:', toInsert.length, '件');
      console.log('[DataSync] 挿入データサンプル:', toInsert[0]);
      
      const { error } = await supabase
        .from('word_cards')
        .insert(toInsert);
      
      if (error) {
        console.error('word_cards バッチ挿入エラー詳細:', {
          error,
          errorMessage: error?.message || 'No message',
          errorCode: error?.code || 'No code',
          errorDetails: error?.details || 'No details',
          errorHint: error?.hint || 'No hint',
          dataCount: toInsert.length,
          sampleData: toInsert[0]
        });
        throw new Error(`word_cards挿入エラー: ${error?.message || JSON.stringify(error)}`);
      }
    }

    // 個別更新
    for (const updateData of toUpdate) {
      try {
        const { error } = await supabase
          .from('word_cards')
          .update(updateData)
          .eq('id', updateData.id)
          .eq('user_id', userId);

        if (error) throw error;
      } catch (error) {
        console.error(`単語「${updateData.word}」の更新エラー:`, error);
        // エラーはログに記録するが、処理は継続
      }
    }
  }

  /**
   * 単語帳と単語カードの関連を同期
   */
  private async syncWordBookCards(userId: string): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      const localData = localStorageService.getAllData();
      
      // 全ての関連を収集
      const relations: any[] = [];
      for (const file of localData.vocabularyFiles || []) {
        for (const word of file.words || []) {
          // 単語カードIDを同じ形式で生成
          const wordCardId = `${file.id}_${word.id}`;
          relations.push({
            word_book_id: file.id,
            word_card_id: wordCardId,
            learning_status: 'not_started'
          });
        }
      }

      if (relations.length === 0) {
        return { count: 0, errors: [] };
      }

      // バッチでupsert（50件ずつ）
      const batchSize = 50;
      for (let i = 0; i < relations.length; i += batchSize) {
        const batch = relations.slice(i, i + batchSize);
        
        try {
          const { error } = await supabase
            .from('word_book_cards')
            .upsert(batch, {
              onConflict: 'word_book_id,word_card_id'
            });

          if (error) throw error;
          syncedCount += batch.length;
        } catch (error) {
          errors.push(`関連バッチ同期エラー (${i}-${i + batch.length}): ${error}`);
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

      // 同期処理にタイムアウトを設定（30秒）
      const syncTimeout = 30000;
      const syncPromise = (async () => {
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

        // 単語帳と単語カードの関連を同期
        console.log('[DataSync] 単語帳と単語カードの関連を同期...');
        const relationsResult = await this.syncWordBookCards(user.id);
        console.log('[DataSync] 関連の同期完了:', relationsResult.count, '件');
      })();

      // タイムアウトを設定
      await Promise.race([
        syncPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('同期処理がタイムアウトしました')), syncTimeout)
        )
      ]);

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