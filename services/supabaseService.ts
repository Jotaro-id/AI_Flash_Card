import { supabase } from '@/lib/supabase';
import { VocabularyFile, Word, SupportedLanguage } from '@/types';
import { withRetry, handleSupabaseError } from '@/utils/supabaseHelpers';
import { logger } from '@/utils/logger';

// 単語帳の取得
export const fetchVocabularyFiles = async (): Promise<VocabularyFile[]> => {
  logger.info('fetchVocabularyFiles: 開始');
  
  const { data: { user } } = await supabase.auth.getUser();
  logger.info('fetchVocabularyFiles: ユーザー情報', { hasUser: !!user, userId: user?.id });
  
  const userId = user?.id;
  
  if (!userId) {
    logger.warn('fetchVocabularyFiles: ユーザーIDが取得できません');
    return [];
  }

  try {
    logger.info('fetchVocabularyFiles: Supabaseクエリを実行中...');
    
    // 再試行ロジック付きでクエリを実行
    const result = await withRetry(
      async () => {
        // まず単純なクエリでデータが取得できるか確認
        const { data: simpleData, error: simpleError } = await supabase
          .from('word_books')
          .select('*')
          .eq('user_id', userId);
        
        logger.debug('fetchVocabularyFiles: 単純クエリ結果', { simpleData, simpleError });
        
        if (simpleError) throw simpleError;
        
        // 関連データを含む完全なクエリ
        const { data, error } = await supabase
          .from('word_books')
          .select(`
            *,
            word_book_cards (
              word_cards (*)
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        logger.debug('fetchVocabularyFiles: クエリ結果', { dataLength: data?.length, error });
        
        if (error) throw error;
        
        return data;
      },
      {
        maxRetries: 3,
        onRetry: (attempt, error) => {
          logger.warn(`fetchVocabularyFiles: 再試行 ${attempt}/3`, { message: error.message });
        }
      }
    );
    
    const data = result;

    logger.info('fetchVocabularyFiles: 取得したデータ数', { count: data ? data.length : 0 });
    if (data && data.length > 0) {
      logger.debug('fetchVocabularyFiles: 最初のデータサンプル', {
        id: data[0].id,
        name: data[0].name,
        target_language: data[0].target_language,
        word_book_cards_length: data[0].word_book_cards?.length
      });
    }

    // データ形式を変換
    const transformedResult = (data || []).map(book => {
    logger.debug('fetchVocabularyFiles: 変換中', {
      bookId: book.id,
      bookName: book.name,
      target_language: book.target_language,
      word_book_cards: book.word_book_cards?.length || 0
    });
    
    return {
      id: book.id,
      name: book.name,
      createdAt: new Date(book.created_at),
      targetLanguage: (book.target_language || 'en') as SupportedLanguage,
      words: book.word_book_cards?.map((wbc: { word_cards: { id: string; word: string; created_at: string; ai_generated_info: unknown } }) => ({
        id: wbc.word_cards.id,
        word: wbc.word_cards.word,
        createdAt: new Date(wbc.word_cards.created_at),
        aiGenerated: wbc.word_cards.ai_generated_info
      })) || []
    };
  });
  
    logger.info('fetchVocabularyFiles: 変換後のデータ数', { count: transformedResult.length });
    logger.debug('fetchVocabularyFiles: 完了', transformedResult);
    return transformedResult;
  } catch (error) {
    handleSupabaseError(error);
    logger.error('fetchVocabularyFiles: 最終的なエラー', error);
    throw new Error('単語帳の取得に失敗しました。ネットワーク接続を確認してください。');
  }
};

// 単語帳の作成
export const createVocabularyFile = async (
  name: string, 
  targetLanguage: SupportedLanguage
): Promise<VocabularyFile> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const userId = user?.id;
  
  if (!userId) {
    throw new Error('createVocabularyFile: ユーザーIDが取得できません。ログインが必要です。');
  }

  try {
    const { data, error } = await withRetry(
      async () => {
        const result = await supabase
          .from('word_books')
          .insert({
            name,
            user_id: userId,
            target_language: targetLanguage,
            description: `${name} - AI単語帳`
          })
          .select()
          .single();
        
        if (result.error) throw result.error;
        return result;
      },
      {
        maxRetries: 3,
        onRetry: (attempt, error) => {
          logger.warn(`createVocabularyFile: 再試行 ${attempt}/3`, { message: error.message });
        }
      }
    );

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      createdAt: new Date(data.created_at),
      targetLanguage: data.target_language as SupportedLanguage,
      words: []
    };
  } catch (error) {
    handleSupabaseError(error);
    logger.error('createVocabularyFile: エラー', error);
    throw new Error('単語帳の作成に失敗しました。ネットワーク接続を確認してください。');
  }
};

// 単語帳の削除（関連データを含む完全削除）
export const deleteVocabularyFile = async (fileId: string): Promise<void> => {
  logger.info('deleteVocabularyFile: 削除開始', { fileId });
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ユーザーが認証されていません');

  try {
    // 1. 単語帳に関連する word_book_cards を取得
    logger.info('deleteVocabularyFile: 関連するword_book_cardsを確認中...');
    const { data: wordBookCards, error: fetchError } = await supabase
      .from('word_book_cards')
      .select('word_card_id')
      .eq('word_book_id', fileId);

    if (fetchError) {
      logger.error('deleteVocabularyFile: word_book_cards取得エラー', fetchError);
      throw fetchError;
    }

    logger.debug('deleteVocabularyFile: 関連するword_book_cards', { count: wordBookCards?.length || 0 });

    // 2. word_book_cards から関連レコードを削除
    if (wordBookCards && wordBookCards.length > 0) {
      logger.info('deleteVocabularyFile: word_book_cardsを削除中...');
      const { error: deleteCardsError } = await supabase
        .from('word_book_cards')
        .delete()
        .eq('word_book_id', fileId);

      if (deleteCardsError) {
        logger.error('deleteVocabularyFile: word_book_cards削除エラー', deleteCardsError);
        throw deleteCardsError;
      }

      // 3. 関連する word_cards を削除（他の単語帳で使用されていない場合のみ）
      for (const wbc of wordBookCards) {
        logger.debug('deleteVocabularyFile: word_cardの削除を確認中...', { wordCardId: wbc.word_card_id });
        
        // 他の単語帳で使用されているかチェック
        const { data: otherUsage, error: checkError } = await supabase
          .from('word_book_cards')
          .select('id')
          .eq('word_card_id', wbc.word_card_id)
          .limit(1);

        if (checkError) {
          logger.error('deleteVocabularyFile: 他の使用状況チェックエラー', checkError);
          throw checkError;
        }

        // 他で使用されていない場合のみ削除
        if (!otherUsage || otherUsage.length === 0) {
          logger.info('deleteVocabularyFile: word_cardを削除中...', { wordCardId: wbc.word_card_id });
          const { error: deleteWordError } = await supabase
            .from('word_cards')
            .delete()
            .eq('id', wbc.word_card_id)
            .eq('user_id', user.id); // セキュリティのため、user_idも確認

          if (deleteWordError) {
            logger.error('deleteVocabularyFile: word_card削除エラー', deleteWordError);
            throw deleteWordError;
          }
        } else {
          logger.debug('deleteVocabularyFile: word_cardは他の単語帳で使用中のため保持', { wordCardId: wbc.word_card_id });
        }
      }
    }

    // 4. 最後に word_books を削除
    logger.info('deleteVocabularyFile: word_booksを削除中...');
    const { error: deleteBookError } = await supabase
      .from('word_books')
      .delete()
      .eq('id', fileId)
      .eq('user_id', user.id); // セキュリティのため、user_idも確認

    if (deleteBookError) {
      logger.error('deleteVocabularyFile: word_books削除エラー', deleteBookError);
      throw deleteBookError;
    }

    logger.info('deleteVocabularyFile: 削除完了', { fileId });
  } catch (error) {
    logger.error('deleteVocabularyFile: 削除処理でエラー発生', error);
    throw new Error(`ファイルの削除に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// 単語の追加
export const addWordToFile = async (
  fileId: string,
  word: Word
): Promise<Word> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ユーザーが認証されていません');

  // まず単語カードを作成
  const { data: wordCard, error: wordError } = await supabase
    .from('word_cards')
    .insert({
      word: word.word,
      user_id: user.id,
      ai_generated_info: word.aiGenerated,
      english_equivalent: word.aiGenerated?.englishEquivalent,
      japanese_equivalent: word.aiGenerated?.japaneseEquivalent,
      pronunciation: word.aiGenerated?.pronunciation,
      example_sentence: word.aiGenerated?.exampleSentence,
      usage_notes: word.aiGenerated?.usageNotes,
      word_class: word.aiGenerated?.wordClass
    })
    .select()
    .single();

  if (wordError) throw wordError;

  // 単語帳との関連を作成
  const { error: relationError } = await supabase
    .from('word_book_cards')
    .insert({
      word_book_id: fileId,
      word_card_id: wordCard.id
    });

  if (relationError) throw relationError;

  return {
    id: wordCard.id,
    word: wordCard.word,
    createdAt: new Date(wordCard.created_at),
    aiGenerated: wordCard.ai_generated_info
  };
};

// 単語の削除
export const deleteWordFromFile = async (
  fileId: string,
  wordId: string
): Promise<void> => {
  logger.info('deleteWordFromFile: 削除開始', { fileId, wordId });
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ユーザーが認証されていません');

  try {
    // 1. word_book_cards から関連レコードを削除
    logger.info('deleteWordFromFile: word_book_cardsからの関連削除中...');
    const { error: deleteRelationError } = await supabase
      .from('word_book_cards')
      .delete()
      .eq('word_book_id', fileId)
      .eq('word_card_id', wordId);

    if (deleteRelationError) {
      logger.error('deleteWordFromFile: word_book_cards削除エラー', deleteRelationError);
      throw deleteRelationError;
    }

    // 2. 他の単語帳で使用されているかチェック
    logger.info('deleteWordFromFile: 他の単語帳での使用確認中...');
    const { data: otherUsage, error: checkError } = await supabase
      .from('word_book_cards')
      .select('id')
      .eq('word_card_id', wordId)
      .limit(1);

    if (checkError) {
      logger.error('deleteWordFromFile: 使用状況チェックエラー', checkError);
      throw checkError;
    }

    // 3. 他で使用されていない場合のみword_cardsからも削除
    if (!otherUsage || otherUsage.length === 0) {
      logger.info('deleteWordFromFile: word_cardsからの削除中...', { wordId });
      const { error: deleteWordError } = await supabase
        .from('word_cards')
        .delete()
        .eq('id', wordId)
        .eq('user_id', user.id); // セキュリティのため、user_idも確認

      if (deleteWordError) {
        logger.error('deleteWordFromFile: word_card削除エラー', deleteWordError);
        throw deleteWordError;
      }
    } else {
      logger.debug('deleteWordFromFile: word_cardは他の単語帳で使用中のため保持', { wordId });
    }

    logger.info('deleteWordFromFile: 削除完了', { fileId, wordId });
  } catch (error) {
    logger.error('deleteWordFromFile: 削除処理でエラー発生', error);
    throw new Error(`単語の削除に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// 単語帳の更新（単語の追加/削除を含む）
export const updateVocabularyFile = async (
  file: VocabularyFile
): Promise<void> => {
  // 単語帳の基本情報を更新
  const { error: updateError } = await supabase
    .from('word_books')
    .update({
      name: file.name,
      target_language: file.targetLanguage,
      updated_at: new Date().toISOString()
    })
    .eq('id', file.id);

  if (updateError) throw updateError;
};

// ローカルストレージからSupabaseへのデータ移行
export const migrateFromLocalStorage = async (): Promise<void> => {
  const localData = localStorage.getItem('vocabulary-files');
  if (!localData) {
    logger.info('migrateFromLocalStorage: ローカルストレージにデータがありません');
    return;
  }

  logger.info('migrateFromLocalStorage: 移行開始');
  logger.debug('migrateFromLocalStorage: ローカルデータ（raw）', { dataLength: localData.length });

  try {
    const files: VocabularyFile[] = JSON.parse(localData);
    logger.info('migrateFromLocalStorage: パース後のファイル数', { count: files.length });
    logger.debug('migrateFromLocalStorage: パース後のデータ', files);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      logger.info(`migrateFromLocalStorage: ファイル${i + 1}/${files.length}を処理中`, {
        name: file.name,
        targetLanguage: file.targetLanguage,
        wordsCount: file.words?.length || 0
      });
      
      // 単語帳を作成
      logger.debug('migrateFromLocalStorage: createVocabularyFileを呼び出し中...');
      const newFile = await createVocabularyFile(
        file.name, 
        file.targetLanguage || 'en'
      );
      logger.info('migrateFromLocalStorage: 単語帳作成成功', { fileId: newFile.id });
      
      // 各単語を追加
      if (file.words && file.words.length > 0) {
        for (let j = 0; j < file.words.length; j++) {
          const word = file.words[j];
          logger.debug(`migrateFromLocalStorage: 単語${j + 1}/${file.words.length}を追加中`, {
            word: word.word,
            hasAiGenerated: !!word.aiGenerated
          });
          await addWordToFile(newFile.id, word);
        }
      }
    }
    
    // 移行成功後、ローカルストレージをクリア
    logger.info('migrateFromLocalStorage: 移行成功、ローカルストレージをクリア');
    localStorage.removeItem('vocabulary-files');
  } catch (error) {
    logger.error('データ移行エラー', error);
    logger.error('エラーの詳細', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      error: error
    });
    throw error;
  }
};

// 開発環境用のテストデータ作成
export const createDevTestData = async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    logger.warn('createDevTestData: 本番環境では実行できません');
    return;
  }
  
  logger.info('createDevTestData: 開発環境用テストデータを作成中...');
  
  try {
    // ダミーユーザーIDを使用して直接データを挿入
    const dummyUserId = '00000000-0000-0000-0000-000000000000';
    
    // 1. テスト単語帳を作成
    const { data: testBook, error: bookError } = await supabase.rpc('create_test_wordbook', {
      p_name: 'スペイン語テスト単語帳',
      p_description: '開発テスト用のスペイン語単語帳',
      p_target_language: 'es',
      p_user_id: dummyUserId
    });
    
    if (bookError) {
      logger.info('RPC関数が存在しないため、直接挿入を試行...');
      
      // RPC関数がない場合は直接挿入
      const { data: directBook, error: directError } = await supabase
        .from('word_books')
        .insert({
          name: 'スペイン語テスト単語帳',
          description: '開発テスト用のスペイン語単語帳',
          target_language: 'es',
          user_id: dummyUserId
        })
        .select()
        .single();
      
      if (directError) {
        logger.error('createDevTestData: 直接挿入エラー', directError);
        return;
      }
      
      logger.info('createDevTestData: テスト単語帳作成成功', directBook);
    } else {
      logger.info('createDevTestData: RPC関数でテスト単語帳作成成功', testBook);
    }
    
  } catch (error) {
    logger.error('createDevTestData: エラー', error);
  }
};

// デバッグ用：Supabaseのデータを直接確認
export const debugSupabaseData = async (): Promise<Record<string, unknown>> => {
  logger.info('debugSupabaseData: 開始');
  logger.info('debugSupabaseData: 環境変数確認', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL
  });
  
  const { data: { user } } = await supabase.auth.getUser();
  logger.info('debugSupabaseData: ユーザー情報', { hasUser: !!user, userId: user?.id });
  
  if (!user) {
    logger.warn('debugSupabaseData: ユーザーが認証されていません');
    return { error: 'ユーザーが認証されていません' };
  }
  
  // 単語帳テーブルを直接確認
  logger.info('debugSupabaseData: word_booksテーブルクエリ実行中...');
  const { data: wordBooks, error: wordBooksError } = await supabase
    .from('word_books')
    .select('*')
    .eq('user_id', user.id);
    
  logger.debug('debugSupabaseData: word_books', { count: wordBooks?.length, error: wordBooksError });
  
  // テーブルの存在確認
  logger.info('debugSupabaseData: テーブル存在確認...');
  const { error: tableCheckError } = await supabase
    .from('word_books')
    .select('*')
    .limit(0);
    
  logger.debug('debugSupabaseData: テーブル存在確認結果', { hasTable: !tableCheckError, error: tableCheckError });
  
  // 単語カードテーブルを直接確認
  logger.info('debugSupabaseData: word_cardsテーブルクエリ実行中...');
  const { data: wordCards, error: wordCardsError } = await supabase
    .from('word_cards')
    .select('*')
    .eq('user_id', user.id);
    
  logger.debug('debugSupabaseData: word_cards', { count: wordCards?.length, error: wordCardsError });
  
  // 関連テーブルを直接確認
  logger.info('debugSupabaseData: word_book_cardsテーブルクエリ実行中...');
  const { data: wordBookCards, error: wordBookCardsError } = await supabase
    .from('word_book_cards')
    .select('*');
    
  logger.debug('debugSupabaseData: word_book_cards', { count: wordBookCards?.length, error: wordBookCardsError });
  
  // 簡単なテストレコードの作成を試みる
  logger.info('debugSupabaseData: テストレコード作成試行...');
  const { data: testRecord, error: testError } = await supabase
    .from('word_books')
    .insert({
      name: 'デバッグテスト単語帳',
      description: 'デバッグ用の一時的なテストレコード',
      target_language: 'en',
      user_id: user.id
    })
    .select();
    
  logger.debug('debugSupabaseData: テストレコード作成結果', { success: !!testRecord, error: testError });
  
  // 作成したテストレコードを削除
  if (testRecord && testRecord.length > 0) {
    logger.info('debugSupabaseData: テストレコード削除中...');
    const { error: deleteError } = await supabase
      .from('word_books')
      .delete()
      .eq('id', testRecord[0].id);
    logger.debug('debugSupabaseData: テストレコード削除結果', { success: !deleteError, error: deleteError });
  }
  
  return {
    user,
    wordBooks,
    wordCards,
    wordBookCards,
    testRecord,
    errors: {
      wordBooksError,
      wordCardsError,
      wordBookCardsError,
      tableCheckError,
      testError
    }
  };
};

// ユーザーのサインアウト
export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};