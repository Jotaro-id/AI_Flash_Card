import { supabase } from '@/lib/supabase';
import { localStorageService } from '@/services/localStorageService';
import { conjugationHistoryLocalService } from '@/services/conjugationHistoryLocalService';
import { idMappingService } from '@/services/idMappingService';

interface SyncStatus {
  lastSyncTime: string | null;
  isSyncing: boolean;
  pendingChanges: number;
  errors: string[];
}

interface SyncResult {
  success: boolean;
  errors: string[];
  syncedItems: {
    wordBooks: number;
    wordCards: number;
    relations: number;
    history: number;
  };
}

class DataSyncService {
  private syncStatus: SyncStatus = {
    lastSyncTime: null,
    isSyncing: false,
    pendingChanges: 0,
    errors: []
  };
  
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5分間隔

  /**
   * 同期ステータスを取得
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * LocalStorageからSupabaseにデータを同期
   */
  async syncToSupabase(): Promise<SyncResult> {
    if (this.syncStatus.isSyncing) {
      return {
        success: false,
        errors: ['すでに同期処理が実行中です'],
        syncedItems: { wordBooks: 0, wordCards: 0, relations: 0, history: 0 }
      };
    }

    this.syncStatus.isSyncing = true;
    this.syncStatus.errors = [];
    
    const result: SyncResult = {
      success: true,
      errors: [],
      syncedItems: { wordBooks: 0, wordCards: 0, relations: 0, history: 0 }
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      // IDマッピングをクリア
      idMappingService.clear();

      // 1. 単語帳を同期
      const wordBookResult = await this.syncWordBooks(user.id);
      result.syncedItems.wordBooks = wordBookResult.count;
      result.errors.push(...wordBookResult.errors);

      // 2. 単語カードを同期
      const wordCardResult = await this.syncWordCards(user.id);
      result.syncedItems.wordCards = wordCardResult.count;
      result.errors.push(...wordCardResult.errors);

      // 単語カードの同期が完了したかどうかを確認
      if (wordCardResult.errors.length === 0) {
        // 3. 単語帳と単語カードの関連を同期
        const relationResult = await this.syncWordBookCards(user.id);
        result.syncedItems.relations = relationResult.count;
        result.errors.push(...relationResult.errors);

        // 4. 動詞活用履歴を同期
        try {
          const historyResult = await this.syncConjugationHistory(user.id);
          result.syncedItems.history = historyResult.count;
          result.errors.push(...historyResult.errors);
        } catch (error) {
          console.log('[DataSync] 動詞活用履歴テーブルは存在しません（スキップ）');
        }
      } else {
        console.warn('[DataSync] 単語カードの同期エラーのため、関連データの同期をスキップします');
      }

      this.syncStatus.lastSyncTime = new Date().toISOString();
      this.syncStatus.pendingChanges = 0;
      
      if (result.errors.length > 0) {
        result.success = false;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`同期エラー: ${error}`);
    } finally {
      this.syncStatus.isSyncing = false;
      this.syncStatus.errors = result.errors;
    }

    return result;
  }

  /**
   * 単語帳をSupabaseに同期
   */
  private async syncWordBooks(userId: string): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      const localData = localStorageService.getAllData();
      
      if (!localData.vocabularyFiles || localData.vocabularyFiles.length === 0) {
        return { count: 0, errors: [] };
      }

      // すべての単語帳名を取得
      const localFileNames = localData.vocabularyFiles.map(f => f.name);
      
      // 既存の単語帳を名前で一括取得
      const { data: existingBooks, error: fetchError } = await supabase
        .from('word_books')
        .select('id, name')
        .eq('user_id', userId)
        .in('name', localFileNames);

      if (fetchError) throw fetchError;

      const existingMap = new Map((existingBooks || []).map(b => [b.name, b.id]));
      const toInsert: any[] = [];
      const toUpdate: any[] = [];

      // 挿入と更新を分類
      for (const file of localData.vocabularyFiles) {
        const existingId = existingMap.get(file.name);
        const data = {
          name: file.name,
          description: `${file.words?.length || 0}個の単語を含む`,
          target_language: file.targetLanguage || 'en',
          user_id: userId,
          updated_at: new Date().toISOString()
        };

        if (existingId) {
          toUpdate.push({ ...data, id: existingId });
        } else {
          toInsert.push({ 
            ...data, 
            created_at: file.createdAt instanceof Date ? 
              file.createdAt.toISOString() : 
              new Date().toISOString()
          });
        }
      }

      // バッチ挿入
      if (toInsert.length > 0) {
        const { data: insertedBooks, error } = await supabase
          .from('word_books')
          .insert(toInsert)
          .select('id, name');
        
        if (error) {
          errors.push(`単語帳の一括挿入エラー: ${error.message}`);
        } else {
          syncedCount += toInsert.length;
          // 挿入された単語帳のIDをマップに追加
          if (insertedBooks) {
            insertedBooks.forEach(book => {
              existingMap.set(book.name, book.id);
            });
          }
        }
      }

      // LocalStorage ID -> Supabase UUID のマッピングを保存
      localData.vocabularyFiles.forEach(file => {
        const supabaseId = existingMap.get(file.name);
        if (supabaseId) {
          idMappingService.setWordBookMapping(file.id, supabaseId);
        }
      });

      // 個別更新（Supabaseはバッチ更新が制限されているため）
      for (const updateData of toUpdate) {
        try {
          const { error } = await supabase
            .from('word_books')
            .update({
              name: updateData.name,
              description: updateData.description,
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
          const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
          const errorStack = error instanceof Error ? error.stack : 'スタックトレースなし';
          console.error(`[DataSync] 単語カードバッチ同期エラー (${i}-${i + batch.length}):`, {
            message: errorMessage,
            stack: errorStack,
            error: error
          });
          errors.push(`単語カードバッチ同期エラー (${i}-${i + batch.length}): ${errorMessage}`);
          // エラーでも処理を継続（部分的な同期を許可）
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
    // ファイル情報を一度だけ取得
    const localData = localStorageService.getAllData();
    const fileLanguageMap = new Map<string, string>();
    
    // バッチ内のファイルIDごとに言語を取得
    const uniqueFileIds = [...new Set(batch.map(item => item.fileId))];
    for (const fileId of uniqueFileIds) {
      const vocabularyFile = localData.vocabularyFiles?.find(f => f.id === fileId);
      const language = vocabularyFile?.targetLanguage || 'en';
      fileLanguageMap.set(fileId, language);
    }
    // 既存の単語カードを一括で確認
    const wordTexts = batch.map(item => item.word.word);
    const { data: existingCards, error: fetchError } = await supabase
      .from('word_cards')
      .select('id, word, user_id')
      .eq('user_id', userId)
      .in('word', wordTexts);

    if (fetchError) throw fetchError;

    // 単語とユーザーIDの組み合わせでマップを作成
    const existingMap = new Map((existingCards || []).map(c => [`${c.word}_${c.user_id}`, c.id]));
    const toInsert: any[] = [];
    const toUpdate: any[] = [];

    for (const { word, fileId } of batch) {
      const mapKey = `${word.word}_${userId}`;
      const existingId = existingMap.get(mapKey);
      const localCardId = idMappingService.generateWordCardLocalId(fileId, word.id);
      
      // ファイルの言語を取得
      const language = fileLanguageMap.get(fileId) || 'en';

      const cardData = {
        word: word.word,
        user_id: userId,
        language: language, // 必須フィールドを追加
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
        toUpdate.push({ ...cardData, id: existingId });
        idMappingService.setWordCardMapping(localCardId, existingId);
      } else {
        // created_atの形式を確認してISO文字列に変換
        let createdAt: string;
        if (word.createdAt) {
          if (word.createdAt instanceof Date) {
            createdAt = word.createdAt.toISOString();
          } else if (typeof word.createdAt === 'string') {
            // 既にISO文字列の場合はそのまま使用
            createdAt = word.createdAt;
          } else {
            // その他の場合は新しい日時を生成
            createdAt = new Date().toISOString();
          }
        } else {
          createdAt = new Date().toISOString();
        }
        
        toInsert.push({ ...cardData, created_at: createdAt, _localId: localCardId });
      }
    }

    // 個別挿入（デバッグのため）
    if (toInsert.length > 0) {
      console.log('[DataSync] 単語カード挿入開始:', toInsert.length, '件');
      
      for (let i = 0; i < toInsert.length; i++) {
        const item = toInsert[i];
        const { _localId, ...insertData } = item;
        
        try {
          console.log(`[DataSync] 挿入試行 ${i + 1}/${toInsert.length}:`, insertData.word);
          
          // データ検証
          console.log('- データ検証:');
          console.log('  - word:', typeof insertData.word, insertData.word);
          console.log('  - user_id:', typeof insertData.user_id, insertData.user_id);
          console.log('  - language:', typeof insertData.language, insertData.language);
          console.log('  - created_at:', typeof insertData.created_at, insertData.created_at);
          console.log('  - updated_at:', typeof insertData.updated_at, insertData.updated_at);
          
          // null/undefined値をチェック
          const problematicFields = Object.entries(insertData).filter(([key, value]) => {
            return value === undefined || (typeof value === 'string' && value.includes('undefined'));
          });
          
          if (problematicFields.length > 0) {
            console.warn('- 問題のあるフィールド:', problematicFields);
          }
          
          // データサイズをチェック
          const fieldSizes = {
            word: insertData.word?.length || 0,
            usage_notes: insertData.usage_notes?.length || 0,
            example_sentence: insertData.example_sentence?.length || 0,
            ai_generated_info_size: JSON.stringify(insertData.ai_generated_info || {}).length
          };
          
          console.log('- フィールドサイズ:', fieldSizes);
          
          // 長すぎるフィールドを警告
          if (fieldSizes.word > 255) console.warn('- word フィールドが長すぎます:', fieldSizes.word);
          if (fieldSizes.usage_notes > 1000) console.warn('- usage_notes フィールドが長すぎます:', fieldSizes.usage_notes);
          if (fieldSizes.ai_generated_info_size > 10000) console.warn('- ai_generated_info が大きすぎます:', fieldSizes.ai_generated_info_size);
          
          // 重複チェック（デバッグ用）
          const { data: existingWord, error: checkError } = await supabase
            .from('word_cards')
            .select('id, word')
            .eq('word', insertData.word)
            .eq('user_id', insertData.user_id)
            .maybeSingle();
            
          if (checkError) {
            console.warn('- 重複チェックエラー:', checkError);
          } else if (existingWord) {
            console.warn('- 重複データ検出:', existingWord);
          }
          
          let insertResult;
          let supabaseError = null;
          
          try {
            insertResult = await supabase
              .from('word_cards')
              .insert(insertData)
              .select('id, word, user_id')
              .single();
              
            supabaseError = insertResult.error;
          } catch (networkError) {
            console.error(`[DataSync] ネットワークエラー (${insertData.word}):`, networkError);
            throw networkError;
          }
          
          if (supabaseError) {
            console.error(`[DataSync] Supabaseエラー (${insertData.word}):`);
            
            // エラーオブジェクトを文字列として出力
            console.error('- エラー全体:', String(supabaseError));
            console.error('- エラーJSON:', JSON.stringify(supabaseError));
            
            // 個別プロパティを確認
            console.error('- message:', supabaseError?.message);
            console.error('- code:', supabaseError?.code);
            console.error('- details:', supabaseError?.details);
            console.error('- hint:', supabaseError?.hint);
            
            // PostgreSQLエラーの場合
            if (supabaseError?.code) {
              console.error('- PostgreSQLエラーコード:', supabaseError.code);
            }
            
            
            throw new Error(`Supabaseエラー: ${supabaseError?.message || 'Unknown error'}`);
          }
          
          const insertedCard = insertResult?.data;
          
          if (insertedCard) {
            console.log(`[DataSync] 挿入成功 (${insertData.word}):`, insertedCard.id);
            // 挿入されたカードのIDマッピングを保存
            if (_localId) {
              idMappingService.setWordCardMapping(_localId, insertedCard.id);
            }
          }
        } catch (error) {
          console.error(`[DataSync] 個別挿入エラー (${insertData.word}):`);
          console.error('- エラー型:', typeof error);
          console.error('- エラーコンストラクタ:', error?.constructor?.name);
          
          if (error instanceof Error) {
            console.error('- message:', error.message);
            console.error('- stack:', error.stack);
          } else {
            console.error('- エラー内容:', error);
            console.error('- エラーキー:', Object.keys(error || {}));
            
            // エラーオブジェクトのプロパティを個別に確認
            if (error && typeof error === 'object') {
              const errorObj = error as Record<string, any>;
              for (const key of Object.keys(errorObj)) {
                console.error(`- ${key}:`, errorObj[key]);
              }
            }
          }
          
          console.error('- 挿入データ:', JSON.stringify(insertData, null, 2));
          throw error;
        }
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
        // エラーでも処理を継続
        console.error(`[DataSync] 単語カード「${updateData.word}」の更新エラー:`, error);
      }
    }
  }

  /**
   * 単語帳と単語カードの関連をSupabaseに同期
   */
  private async syncWordBookCards(userId: string): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      const localData = localStorageService.getAllData();
      
      // 全ての関連を収集
      const relations: any[] = [];
      for (const file of localData.vocabularyFiles || []) {
        const wordBookId = idMappingService.getWordBookSupabaseId(file.id);
        if (!wordBookId) {
          console.warn(`[DataSync] 単語帳IDマッピングが見つかりません: ${file.id}`);
          continue;
        }
        
        for (const word of file.words || []) {
          const localCardId = idMappingService.generateWordCardLocalId(file.id, word.id);
          const wordCardId = idMappingService.getWordCardSupabaseId(localCardId);
          
          if (!wordCardId) {
            console.warn(`[DataSync] 単語カードIDマッピングが見つかりません: ${localCardId}`);
            continue;
          }
          
          relations.push({
            word_book_id: wordBookId,
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
          console.log('[DataSync] verb_conjugation_historyテーブルが存在しません（スキップ）');
          return { count: 0, errors: [] };
        }
        if (tableCheckError.message.includes('permission denied')) {
          console.log('[DataSync] verb_conjugation_historyテーブルへのアクセス権限がありません（スキップ）');
          return { count: 0, errors: [] };
        }
        throw tableCheckError;
      }

      const history = conjugationHistoryLocalService.getHistory();
      
      if (history.length === 0) {
        return { count: 0, errors: [] };
      }

      for (const entry of history) {
        try {
          // LocalStorageのword_card_idをSupabaseのUUIDに変換
          const wordCardId = idMappingService.getWordCardSupabaseId(entry.word_card_id);
          if (!wordCardId) {
            console.warn(`[DataSync] 単語カードIDマッピングが見つかりません: ${entry.word_card_id}`);
            continue;
          }

          // 履歴が存在するか確認（idがUUIDでない場合はスキップ）
          if (!entry.id || typeof entry.id !== 'string') {
            console.warn(`[DataSync] 無効な履歴ID: ${entry.id}`);
            continue;
          }

          const { data: existing, error: selectError } = await supabase
            .from('verb_conjugation_history')
            .select('id')
            .eq('user_id', userId)
            .eq('word_card_id', wordCardId)
            .eq('practice_type', entry.practice_type)
            .eq('tense', entry.tense)
            .eq('mood', entry.mood)
            .eq('person', entry.person)
            .eq('created_at', entry.created_at)
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
                user_id: userId,
                word_card_id: wordCardId,
                practice_type: entry.practice_type,
                tense: entry.tense,
                mood: entry.mood,
                person: entry.person,
                correct_answer: entry.correct_answer,
                user_answer: entry.user_answer,
                is_correct: entry.is_correct,
                response_time_ms: entry.response_time_ms,
                attempts: entry.attempts,
                created_at: entry.created_at
              });

            if (error) {
              errors.push(`履歴挿入エラー: ${error.message}`);
            } else {
              syncedCount++;
            }
          }
        } catch (error) {
          errors.push(`履歴処理エラー: ${error}`);
        }
      }
    } catch (error) {
      console.log(`[DataSync] 動詞活用履歴同期をスキップします: ${error}`);
      return { count: 0, errors: [] };
    }

    return { count: syncedCount, errors };
  }

  /**
   * SupabaseからLocalStorageにデータを同期
   */
  async syncFromSupabase(): Promise<SyncResult> {
    console.log('[DataSync] SupabaseからLocalStorageへの同期を開始');
    const errors: string[] = [];
    const syncedItems = {
      wordBooks: 0,
      wordCards: 0,
      relations: 0,
      history: 0
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        return {
          success: false,
          errors: ['ユーザーがログインしていません'],
          syncedItems
        };
      }

      // 1. Supabaseから単語帳を取得
      const { data: supabaseBooks, error: booksError } = await supabase
        .from('word_books')
        .select('*')
        .eq('user_id', userId);

      if (booksError) {
        errors.push(`単語帳の取得エラー: ${booksError.message}`);
      } else if (supabaseBooks) {
        console.log(`[DataSync] Supabaseから${supabaseBooks.length}個の単語帳を取得`);

        // 2. Supabaseから単語カードを取得
        const { data: supabaseCards, error: cardsError } = await supabase
          .from('word_cards')
          .select('*')
          .eq('user_id', userId);

        if (cardsError) {
          errors.push(`単語カードの取得エラー: ${cardsError.message}`);
        } else if (supabaseCards) {
          console.log(`[DataSync] Supabaseから${supabaseCards.length}個の単語カードを取得`);

          // 3. Supabaseから関連情報を取得
          const { data: supabaseRelations, error: relationsError } = await supabase
            .from('word_book_cards')
            .select('*')
            .in('word_book_id', supabaseBooks.map(b => b.id));

          if (relationsError) {
            errors.push(`関連情報の取得エラー: ${relationsError.message}`);
          } else if (supabaseRelations) {
            console.log(`[DataSync] Supabaseから${supabaseRelations.length}個の関連情報を取得`);

            // LocalStorageのデータを取得
            const localData = localStorageService.getAllData();
            const localFiles = localData.vocabularyFiles || [];

            // Supabaseのデータを統合
            for (const book of supabaseBooks) {
              // 対応するローカルファイルを探す
              let localFile = localFiles.find(f => f.id === book.id);
              
              if (!localFile) {
                // ローカルに存在しない場合は新規作成
                localFile = {
                  id: book.id,
                  name: book.name,
                  createdAt: new Date(book.created_at),
                  words: [],
                  targetLanguage: book.target_language || 'en'
                };
                localFiles.push(localFile);
                syncedItems.wordBooks++;
              }

              // この単語帳に関連する単語カードを取得
              const bookRelations = supabaseRelations.filter(r => r.word_book_id === book.id);
              const bookCardIds = bookRelations.map(r => r.word_card_id);
              const bookCards = supabaseCards.filter(c => bookCardIds.includes(c.id));

              // 単語カードをローカル形式に変換
              for (const card of bookCards) {
                const relation = bookRelations.find(r => r.word_card_id === card.id);
                const existingWord = localFile.words.find(w => w.id === card.id);
                
                if (!existingWord) {
                  const word = {
                    id: card.id,
                    word: card.word,
                    createdAt: new Date(card.created_at),
                    learningStatus: relation?.learning_status || 'not_started',
                    aiGenerated: card.ai_generated_info ? {
                      englishEquivalent: card.english_equivalent || '',
                      japaneseEquivalent: card.japanese_equivalent || '',
                      pronunciation: card.pronunciation || '',
                      exampleSentence: card.example_sentence || '',
                      japaneseExample: card.example_sentence_japanese || '',
                      englishExample: card.example_sentence_english || '',
                      usageNotes: card.usage_notes || '',
                      wordClass: card.word_class || 'other',
                      tenseInfo: card.ai_generated_info?.tenseInfo,
                      additionalInfo: card.ai_generated_info?.additionalInfo,
                      enhancedExample: card.ai_generated_info?.enhancedExample,
                      translations: card.ai_generated_info?.translations,
                      multilingualExamples: card.ai_generated_info?.multilingualExamples,
                      grammaticalChanges: card.ai_generated_info?.grammaticalChanges
                    } : undefined
                  };
                  localFile.words.push(word);
                  syncedItems.wordCards++;
                } else {
                  // 既存の単語の学習状況を更新
                  existingWord.learningStatus = relation?.learning_status || existingWord.learningStatus;
                  syncedItems.relations++;
                }
              }
            }

            // LocalStorageに保存
            localStorageService.saveAllData({ 
              vocabularyFiles: localFiles,
              lastUpdated: new Date().toISOString()
            });
            console.log('[DataSync] LocalStorageへの保存が完了');
          }
        }
      }

      return {
        success: errors.length === 0,
        errors,
        syncedItems
      };
    } catch (error) {
      console.error('[DataSync] 同期中にエラーが発生:', error);
      errors.push(`同期エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      return {
        success: false,
        errors,
        syncedItems
      };
    }
  }

  /**
   * 全データを同期（useDataSyncで使用）
   */
  async syncAllData(): Promise<SyncResult> {
    return await this.syncToSupabase();
  }

  /**
   * 定期同期を開始
   */
  startPeriodicSync(): void {
    if (this.syncInterval) {
      console.log('[DataSync] 定期同期は既に開始されています');
      return;
    }

    console.log('[DataSync] 定期同期を開始します (間隔:', this.SYNC_INTERVAL_MS / 1000, '秒)');
    
    this.syncInterval = setInterval(async () => {
      try {
        console.log('[DataSync] 定期同期を実行します');
        await this.syncToSupabase();
      } catch (error) {
        console.error('[DataSync] 定期同期エラー:', error);
      }
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * 定期同期を停止
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      console.log('[DataSync] 定期同期を停止します');
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * エラーをクリア
   */
  clearErrors(): void {
    this.syncStatus.errors = [];
  }

  /**
   * 保留中の変更数を増やす
   */
  incrementPendingChanges(): void {
    this.syncStatus.pendingChanges++;
  }

  /**
   * 保留中の変更数を減らす
   */
  decrementPendingChanges(): void {
    if (this.syncStatus.pendingChanges > 0) {
      this.syncStatus.pendingChanges--;
    }
  }

  /**
   * 保留中の変更数をリセット
   */
  resetPendingChanges(): void {
    this.syncStatus.pendingChanges = 0;
  }
}

export const dataSyncService = new DataSyncService();