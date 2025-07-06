import { supabase } from '../lib/supabase';
import { VocabularyFile, Word, SupportedLanguage } from '../types';

// 単語帳の取得
export const fetchVocabularyFiles = async (): Promise<VocabularyFile[]> => {
  console.log('fetchVocabularyFiles: 開始');
  
  const { data: { user } } = await supabase.auth.getUser();
  console.log('fetchVocabularyFiles: ユーザー情報', user ? 'ユーザーあり' : 'ユーザーなし');
  if (!user) throw new Error('ユーザーが認証されていません');

  console.log('fetchVocabularyFiles: Supabaseクエリを実行中...');
  // まず単純なクエリでデータが取得できるか確認
  const { data: simpleData, error: simpleError } = await supabase
    .from('word_books')
    .select('*')
    .eq('user_id', user.id);
  
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
    .eq('user_id', user.id)
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
  if (!user) throw new Error('ユーザーが認証されていません');

  const { data, error } = await supabase
    .from('word_books')
    .insert({
      name,
      user_id: user.id,
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

// 単語帳の削除
export const deleteVocabularyFile = async (fileId: string): Promise<void> => {
  const { error } = await supabase
    .from('word_books')
    .delete()
    .eq('id', fileId);

  if (error) throw error;
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
export const debugSupabaseData = async (): Promise<any> => {
  console.log('debugSupabaseData: 開始');
  
  const { data: { user } } = await supabase.auth.getUser();
  console.log('debugSupabaseData: ユーザー情報', user);
  
  if (!user) {
    console.log('debugSupabaseData: ユーザーが認証されていません');
    return { error: 'ユーザーが認証されていません' };
  }
  
  // 単語帳テーブルを直接確認
  const { data: wordBooks, error: wordBooksError } = await supabase
    .from('word_books')
    .select('*')
    .eq('user_id', user.id);
    
  console.log('debugSupabaseData: word_books', { wordBooks, wordBooksError });
  
  // 単語カードテーブルを直接確認
  const { data: wordCards, error: wordCardsError } = await supabase
    .from('word_cards')
    .select('*')
    .eq('user_id', user.id);
    
  console.log('debugSupabaseData: word_cards', { wordCards, wordCardsError });
  
  // 関連テーブルを直接確認
  const { data: wordBookCards, error: wordBookCardsError } = await supabase
    .from('word_book_cards')
    .select('*');
    
  console.log('debugSupabaseData: word_book_cards', { wordBookCards, wordBookCardsError });
  
  return {
    user,
    wordBooks,
    wordCards,
    wordBookCards,
    errors: {
      wordBooksError,
      wordCardsError,
      wordBookCardsError
    }
  };
};

// ユーザーのサインアウト
export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};