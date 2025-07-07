import { supabase } from '../lib/supabase';
import { VocabularyFile, Word, SupportedLanguage } from '../types';

// 単語帳の取得
export const fetchVocabularyFiles = async (): Promise<VocabularyFile[]> => {
  console.log('fetchVocabularyFiles: 開始');
  
  const { data: { user } } = await supabase.auth.getUser();
  console.log('fetchVocabularyFiles: ユーザー情報', user ? 'ユーザーあり' : 'ユーザーなし');
  
  // 開発時はユーザー認証をスキップ
  let userId = user?.id;
  if (!userId && import.meta.env.DEV) {
    console.warn('Development mode: using dummy user ID');
    userId = '00000000-0000-0000-0000-000000000000';
  }
  
  if (!userId) throw new Error('ユーザーが認証されていません');

  console.log('fetchVocabularyFiles: Supabaseクエリを実行中...');
  // まず単純なクエリでデータが取得できるか確認
  const { data: simpleData, error: simpleError } = await supabase
    .from('word_books')
    .select('*')
    .eq('user_id', userId);
  
  console.log('fetchVocabularyFiles: 単純クエリ結果', { simpleData, simpleError });
  
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

  console.log('fetchVocabularyFiles: クエリ結果', { data, error });
  if (error) {
    console.error('fetchVocabularyFiles: エラー発生', error);
    throw error;
  }

  console.log('fetchVocabularyFiles: 取得したデータ数', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log('fetchVocabularyFiles: 最初のデータサンプル', {
      id: data[0].id,
      name: data[0].name,
      target_language: data[0].target_language,
      word_book_cards: data[0].word_book_cards,
      word_book_cards_length: data[0].word_book_cards?.length
    });
  }

  // データ形式を変換
  const result = (data || []).map(book => {
    console.log('fetchVocabularyFiles: 変換中', {
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
  
  console.log('fetchVocabularyFiles: 変換後のデータ数', result.length);
  console.log('fetchVocabularyFiles: 完了', result);
  return result;
};

// 単語帳の作成
export const createVocabularyFile = async (
  name: string, 
  targetLanguage: SupportedLanguage
): Promise<VocabularyFile> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  // 開発時はユーザー認証をスキップ
  let userId = user?.id;
  if (!userId && import.meta.env.DEV) {
    console.warn('Development mode: using dummy user ID');
    userId = '00000000-0000-0000-0000-000000000000';
  }
  
  if (!userId) throw new Error('ユーザーが認証されていません');

  const { data, error } = await supabase
    .from('word_books')
    .insert({
      name,
      user_id: userId,
      target_language: targetLanguage,
      description: `${name} - AI単語帳`
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    createdAt: new Date(data.created_at),
    targetLanguage: data.target_language as SupportedLanguage,
    words: []
  };
};

// 単語帳の削除（関連データを含む完全削除）
export const deleteVocabularyFile = async (fileId: string): Promise<void> => {
  console.log('deleteVocabularyFile: 削除開始', fileId);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ユーザーが認証されていません');

  try {
    // 1. 単語帳に関連する word_book_cards を取得
    console.log('deleteVocabularyFile: 関連するword_book_cardsを確認中...');
    const { data: wordBookCards, error: fetchError } = await supabase
      .from('word_book_cards')
      .select('word_card_id')
      .eq('word_book_id', fileId);

    if (fetchError) {
      console.error('deleteVocabularyFile: word_book_cards取得エラー', fetchError);
      throw fetchError;
    }

    console.log('deleteVocabularyFile: 関連するword_book_cards', wordBookCards);

    // 2. word_book_cards から関連レコードを削除
    if (wordBookCards && wordBookCards.length > 0) {
      console.log('deleteVocabularyFile: word_book_cardsを削除中...');
      const { error: deleteCardsError } = await supabase
        .from('word_book_cards')
        .delete()
        .eq('word_book_id', fileId);

      if (deleteCardsError) {
        console.error('deleteVocabularyFile: word_book_cards削除エラー', deleteCardsError);
        throw deleteCardsError;
      }

      // 3. 関連する word_cards を削除（他の単語帳で使用されていない場合のみ）
      for (const wbc of wordBookCards) {
        console.log('deleteVocabularyFile: word_cardの削除を確認中...', wbc.word_card_id);
        
        // 他の単語帳で使用されているかチェック
        const { data: otherUsage, error: checkError } = await supabase
          .from('word_book_cards')
          .select('id')
          .eq('word_card_id', wbc.word_card_id)
          .limit(1);

        if (checkError) {
          console.error('deleteVocabularyFile: 他の使用状況チェックエラー', checkError);
          throw checkError;
        }

        // 他で使用されていない場合のみ削除
        if (!otherUsage || otherUsage.length === 0) {
          console.log('deleteVocabularyFile: word_cardを削除中...', wbc.word_card_id);
          const { error: deleteWordError } = await supabase
            .from('word_cards')
            .delete()
            .eq('id', wbc.word_card_id)
            .eq('user_id', user.id); // セキュリティのため、user_idも確認

          if (deleteWordError) {
            console.error('deleteVocabularyFile: word_card削除エラー', deleteWordError);
            throw deleteWordError;
          }
        } else {
          console.log('deleteVocabularyFile: word_cardは他の単語帳で使用中のため保持', wbc.word_card_id);
        }
      }
    }

    // 4. 最後に word_books を削除
    console.log('deleteVocabularyFile: word_booksを削除中...');
    const { error: deleteBookError } = await supabase
      .from('word_books')
      .delete()
      .eq('id', fileId)
      .eq('user_id', user.id); // セキュリティのため、user_idも確認

    if (deleteBookError) {
      console.error('deleteVocabularyFile: word_books削除エラー', deleteBookError);
      throw deleteBookError;
    }

    console.log('deleteVocabularyFile: 削除完了', fileId);
  } catch (error) {
    console.error('deleteVocabularyFile: 削除処理でエラー発生', error);
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
  console.log('deleteWordFromFile: 削除開始', { fileId, wordId });
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ユーザーが認証されていません');

  try {
    // 1. word_book_cards から関連レコードを削除
    console.log('deleteWordFromFile: word_book_cardsからの関連削除中...');
    const { error: deleteRelationError } = await supabase
      .from('word_book_cards')
      .delete()
      .eq('word_book_id', fileId)
      .eq('word_card_id', wordId);

    if (deleteRelationError) {
      console.error('deleteWordFromFile: word_book_cards削除エラー', deleteRelationError);
      throw deleteRelationError;
    }

    // 2. 他の単語帳で使用されているかチェック
    console.log('deleteWordFromFile: 他の単語帳での使用確認中...');
    const { data: otherUsage, error: checkError } = await supabase
      .from('word_book_cards')
      .select('id')
      .eq('word_card_id', wordId)
      .limit(1);

    if (checkError) {
      console.error('deleteWordFromFile: 使用状況チェックエラー', checkError);
      throw checkError;
    }

    // 3. 他で使用されていない場合のみword_cardsからも削除
    if (!otherUsage || otherUsage.length === 0) {
      console.log('deleteWordFromFile: word_cardsからの削除中...', wordId);
      const { error: deleteWordError } = await supabase
        .from('word_cards')
        .delete()
        .eq('id', wordId)
        .eq('user_id', user.id); // セキュリティのため、user_idも確認

      if (deleteWordError) {
        console.error('deleteWordFromFile: word_card削除エラー', deleteWordError);
        throw deleteWordError;
      }
    } else {
      console.log('deleteWordFromFile: word_cardは他の単語帳で使用中のため保持', wordId);
    }

    console.log('deleteWordFromFile: 削除完了', { fileId, wordId });
  } catch (error) {
    console.error('deleteWordFromFile: 削除処理でエラー発生', error);
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
  if (!localData) return;

  try {
    const files: VocabularyFile[] = JSON.parse(localData);
    
    for (const file of files) {
      // 単語帳を作成
      const newFile = await createVocabularyFile(
        file.name, 
        file.targetLanguage || 'en'
      );
      
      // 各単語を追加
      for (const word of file.words) {
        await addWordToFile(newFile.id, word);
      }
    }
    
    // 移行成功後、ローカルストレージをクリア
    localStorage.removeItem('vocabulary-files');
  } catch (error) {
    console.error('データ移行エラー:', error);
    throw error;
  }
};

// デバッグ用：Supabaseのデータを直接確認
export const debugSupabaseData = async (): Promise<Record<string, unknown>> => {
  console.log('debugSupabaseData: 開始');
  console.log('debugSupabaseData: 環境変数確認', {
    hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    url: import.meta.env.VITE_SUPABASE_URL
  });
  
  const { data: { user } } = await supabase.auth.getUser();
  console.log('debugSupabaseData: ユーザー情報', user);
  
  if (!user) {
    console.log('debugSupabaseData: ユーザーが認証されていません');
    return { error: 'ユーザーが認証されていません' };
  }
  
  // 単語帳テーブルを直接確認
  console.log('debugSupabaseData: word_booksテーブルクエリ実行中...');
  const { data: wordBooks, error: wordBooksError } = await supabase
    .from('word_books')
    .select('*')
    .eq('user_id', user.id);
    
  console.log('debugSupabaseData: word_books', { wordBooks, wordBooksError });
  
  // テーブルの存在確認
  console.log('debugSupabaseData: テーブル存在確認...');
  const { data: tableCheck, error: tableCheckError } = await supabase
    .from('word_books')
    .select('*')
    .limit(0);
    
  console.log('debugSupabaseData: テーブル存在確認結果', { tableCheck, tableCheckError });
  
  // 単語カードテーブルを直接確認
  console.log('debugSupabaseData: word_cardsテーブルクエリ実行中...');
  const { data: wordCards, error: wordCardsError } = await supabase
    .from('word_cards')
    .select('*')
    .eq('user_id', user.id);
    
  console.log('debugSupabaseData: word_cards', { wordCards, wordCardsError });
  
  // 関連テーブルを直接確認
  console.log('debugSupabaseData: word_book_cardsテーブルクエリ実行中...');
  const { data: wordBookCards, error: wordBookCardsError } = await supabase
    .from('word_book_cards')
    .select('*');
    
  console.log('debugSupabaseData: word_book_cards', { wordBookCards, wordBookCardsError });
  
  // 簡単なテストレコードの作成を試みる
  console.log('debugSupabaseData: テストレコード作成試行...');
  const { data: testRecord, error: testError } = await supabase
    .from('word_books')
    .insert({
      name: 'デバッグテスト単語帳',
      description: 'デバッグ用の一時的なテストレコード',
      target_language: 'en',
      user_id: user.id
    })
    .select();
    
  console.log('debugSupabaseData: テストレコード作成結果', { testRecord, testError });
  
  // 作成したテストレコードを削除
  if (testRecord && testRecord.length > 0) {
    console.log('debugSupabaseData: テストレコード削除中...');
    const { error: deleteError } = await supabase
      .from('word_books')
      .delete()
      .eq('id', testRecord[0].id);
    console.log('debugSupabaseData: テストレコード削除結果', { deleteError });
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