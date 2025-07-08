import { VocabularyFile, Word, SupportedLanguage } from '@/types';
import { logger } from '@/utils/logger';

const STORAGE_KEY = 'ai-flashcard-data';
const USER_KEY = 'ai-flashcard-user';

interface LocalStorageData {
  vocabularyFiles: VocabularyFile[];
  lastUpdated: string;
}

interface LocalUser {
  id: string;
  email: string;
  lastLogin: string;
}

// ローカルストレージからデータを取得
const getData = (): LocalStorageData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error('Failed to parse localStorage data', error);
  }
  return { vocabularyFiles: [], lastUpdated: new Date().toISOString() };
};

// ローカルストレージにデータを保存
const saveData = (data: LocalStorageData): void => {
  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    logger.info('Data saved to localStorage');
  } catch (error) {
    logger.error('Failed to save to localStorage', error);
    throw new Error('データの保存に失敗しました');
  }
};

// ユーザー情報の取得
export const getCurrentUser = (): LocalUser | null => {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      return JSON.parse(userStr);
    }
  } catch (error) {
    logger.error('Failed to get user from localStorage', error);
  }
  return null;
};

// ユーザー情報の保存
export const setCurrentUser = (email: string): LocalUser => {
  const user: LocalUser = {
    id: `user_${Date.now()}`,
    email,
    lastLogin: new Date().toISOString()
  };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
};

// ログアウト
export const logout = (): void => {
  localStorage.removeItem(USER_KEY);
};

// 単語帳の取得
export const fetchVocabularyFiles = async (): Promise<VocabularyFile[]> => {
  logger.info('fetchVocabularyFiles (localStorage): 開始');
  
  // 少し遅延を入れて非同期処理をシミュレート
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const data = getData();
  logger.info('fetchVocabularyFiles (localStorage): 完了', { count: data.vocabularyFiles.length });
  
  return data.vocabularyFiles;
};

// 単語帳の作成
export const createVocabularyFile = async (
  name: string, 
  targetLanguage: SupportedLanguage
): Promise<VocabularyFile> => {
  logger.info('createVocabularyFile (localStorage): 開始', { name, targetLanguage });
  
  const data = getData();
  const newFile: VocabularyFile = {
    id: `file_${Date.now()}`,
    name,
    createdAt: new Date(),
    targetLanguage,
    words: []
  };
  
  data.vocabularyFiles.push(newFile);
  saveData(data);
  
  logger.info('createVocabularyFile (localStorage): 完了', { id: newFile.id });
  return newFile;
};

// 単語帳の削除
export const deleteVocabularyFile = async (fileId: string): Promise<void> => {
  logger.info('deleteVocabularyFile (localStorage): 開始', { fileId });
  
  const data = getData();
  data.vocabularyFiles = data.vocabularyFiles.filter(file => file.id !== fileId);
  saveData(data);
  
  logger.info('deleteVocabularyFile (localStorage): 完了');
};

// 単語の追加
export const addWordToFile = async (
  fileId: string,
  word: Word
): Promise<Word> => {
  logger.info('addWordToFile (localStorage): 開始', { fileId, word: word.word });
  console.log('[DEBUG LocalStorage] Adding word to file:', fileId, word);
  
  const data = getData();
  const file = data.vocabularyFiles.find(f => f.id === fileId);
  
  if (!file) {
    console.error('[DEBUG LocalStorage] File not found:', fileId);
    throw new Error('単語帳が見つかりません');
  }
  
  // 新しいIDを生成（既存のIDがあればそれを使用）
  const newWord: Word = {
    ...word,
    id: word.id || `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  
  console.log('[DEBUG LocalStorage] Generated new word with ID:', newWord.id);
  console.log('[DEBUG LocalStorage] Words before adding:', file.words.length);
  
  file.words.push(newWord);
  saveData(data);
  
  console.log('[DEBUG LocalStorage] Words after adding:', file.words.length);
  console.log('[DEBUG LocalStorage] Successfully saved word to localStorage');
  
  logger.info('addWordToFile (localStorage): 完了', { wordId: newWord.id });
  return newWord;
};

// 単語の削除
export const deleteWordFromFile = async (
  fileId: string,
  wordId: string
): Promise<void> => {
  logger.info('deleteWordFromFile (localStorage): 開始', { fileId, wordId });
  
  const data = getData();
  const file = data.vocabularyFiles.find(f => f.id === fileId);
  
  if (!file) {
    throw new Error('単語帳が見つかりません');
  }
  
  file.words = file.words.filter(w => w.id !== wordId);
  saveData(data);
  
  logger.info('deleteWordFromFile (localStorage): 完了');
};

// 単語帳の更新
export const updateVocabularyFile = async (
  file: VocabularyFile
): Promise<VocabularyFile> => {
  logger.info('updateVocabularyFile (localStorage): 開始', { fileId: file.id });
  console.log('[DEBUG LocalStorage] updateVocabularyFile called with:', {
    fileId: file.id,
    fileName: file.name,
    wordCount: file.words.length,
    words: file.words.map(w => ({ id: w.id, word: w.word, hasAI: !!w.aiGenerated }))
  });
  
  const data = getData();
  const index = data.vocabularyFiles.findIndex(f => f.id === file.id);
  
  if (index === -1) {
    console.error('[DEBUG LocalStorage] File not found in storage:', file.id);
    throw new Error('単語帳が見つかりません');
  }
  
  console.log('[DEBUG LocalStorage] Found file at index:', index);
  console.log('[DEBUG LocalStorage] Current words in storage:', data.vocabularyFiles[index].words.length);
  
  data.vocabularyFiles[index] = file;
  saveData(data);
  
  console.log('[DEBUG LocalStorage] File updated successfully');
  console.log('[DEBUG LocalStorage] New words count:', file.words.length);
  
  logger.info('updateVocabularyFile (localStorage): 完了');
  return file;
};

// デバッグ用：ローカルストレージのデータを確認
export const debugLocalStorageData = async (): Promise<Record<string, unknown>> => {
  logger.info('debugLocalStorageData: 開始');
  
  const data = getData();
  const user = getCurrentUser();
  
  return {
    user,
    vocabularyFiles: data.vocabularyFiles,
    totalFiles: data.vocabularyFiles.length,
    totalWords: data.vocabularyFiles.reduce((sum, file) => sum + file.words.length, 0),
    lastUpdated: data.lastUpdated
  };
};

// 初期データの作成（開発用）
export const createSampleData = async (): Promise<void> => {
  logger.info('createSampleData: サンプルデータを作成中...');
  
  const data = getData();
  
  // すでにデータがある場合はスキップ
  if (data.vocabularyFiles.length > 0) {
    logger.info('createSampleData: 既存のデータがあるためスキップ');
    return;
  }
  
  // サンプル単語帳を作成
  const sampleFile: VocabularyFile = {
    id: 'sample_file_1',
    name: 'スペイン語基礎単語',
    createdAt: new Date(),
    targetLanguage: 'es',
    words: [
      {
        id: 'sample_word_1',
        word: 'hola',
        createdAt: new Date(),
        aiGenerated: {
          englishEquivalent: 'hello',
          japaneseEquivalent: 'こんにちは',
          pronunciation: '/ˈo.la/',
          exampleSentence: 'Hola, ¿cómo estás?',
          japaneseExample: 'こんにちは、元気ですか？',
          englishExample: 'Hello, how are you?',
          usageNotes: 'スペイン語の最も一般的な挨拶',
          wordClass: 'interjection',
          enhancedExample: {
            originalLanguage: 'es',
            originalSentence: 'Hola, ¿cómo estás?',
            japaneseTranslation: 'こんにちは、元気ですか？',
            englishTranslation: 'Hello, how are you?'
          }
        }
      },
      {
        id: 'sample_word_2',
        word: 'gracias',
        createdAt: new Date(),
        aiGenerated: {
          englishEquivalent: 'thank you',
          japaneseEquivalent: 'ありがとう',
          pronunciation: '/ˈɡɾa.sjas/',
          exampleSentence: 'Muchas gracias por tu ayuda.',
          japaneseExample: '助けてくれて本当にありがとう。',
          englishExample: 'Thank you very much for your help.',
          usageNotes: '感謝を表す基本的な表現',
          wordClass: 'interjection',
          enhancedExample: {
            originalLanguage: 'es',
            originalSentence: 'Muchas gracias por tu ayuda.',
            japaneseTranslation: '助けてくれて本当にありがとう。',
            englishTranslation: 'Thank you very much for your help.'
          }
        }
      }
    ]
  };
  
  data.vocabularyFiles = [sampleFile];
  saveData(data);
  
  logger.info('createSampleData: サンプルデータ作成完了');
};