export interface VocabularyFile {
  id: string;
  name: string;
  createdAt: Date;
  words: Word[];
  targetLanguage?: SupportedLanguage; // 対象言語の設定（デフォルトは英語）
  isFiltered?: boolean; // フィルタリングされた状態かどうか
}

export interface Word {
  id: string;
  word: string;
  aiGenerated?: AIWordInfo;
  createdAt: Date;
  learningStatus?: LearningStatus;
}

export type LearningStatus = 'not_started' | 'learned' | 'uncertain' | 'forgot';

export interface WordBookCard {
  id: string;
  wordBookId: string;
  wordCardId: string;
  createdAt: Date;
  learningStatus: LearningStatus;
  lastReviewedAt?: Date;
  reviewCount: number;
}

export interface AIWordInfo {
  englishEquivalent: string;
  japaneseEquivalent: string;
  pronunciation: string;
  exampleSentence: string;
  japaneseExample: string;
  englishExample: string;
  usageNotes: string;
  wordClass: 'noun' | 'verb' | 'adjective' | 'adverb' | 'other';
  tenseInfo?: string;
  additionalInfo?: string;
  // 段階的表示のための新しい例文構造
  enhancedExample?: {
    originalLanguage: SupportedLanguage;
    originalSentence: string;
    japaneseTranslation: string;
    englishTranslation: string;
  };
  // 多言語対応のための新しいフィールド
  translations?: {
    spanish?: string;
    french?: string;
    italian?: string;
    german?: string;
    chinese?: string;
    korean?: string;
  };
  multilingualExamples?: {
    spanish?: string;
    french?: string;
    italian?: string;
    german?: string;
    chinese?: string;
    korean?: string;
  };
  // 文法変化情報
  grammaticalChanges?: {
    verbConjugations?: {
      present?: string | Record<string, string>;
      preterite?: string | Record<string, string>;
      imperfect?: string | Record<string, string>;
      past?: string | Record<string, string>;
      future?: string | Record<string, string>;
      presentPerfect?: string | Record<string, string>;
      pastPerfect?: string | Record<string, string>;
      futurePerfect?: string | Record<string, string>;
      continuous?: string | Record<string, string>;
      conditional?: string | Record<string, string>;
      conditionalPerfect?: string | Record<string, string>;
      subjunctive?: string | Record<string, string>;
      subjunctive_imperfect?: string | Record<string, string>;
      imperative?: string | Record<string, string>;
      gerund?: string;
      pastParticiple?: string;
      languageSpecific?: {
        [key: string]: string | undefined;
      };
      // スペイン語の追加の時制
      [key: string]: string | Record<string, string> | Record<string, string | undefined> | undefined;
    };
    genderNumberChanges?: {
      masculine?: {
        singular?: string;
        plural?: string;
      };
      feminine?: {
        singular?: string;
        plural?: string;
      };
      neuter?: {
        singular?: string;
        plural?: string;
      };
    };
    comparativeForms?: {
      comparative?: string;
      superlative?: string;
    };
    raw?: string | Record<string, unknown>;
  };
}

export interface FlashcardProps {
  word: Word;
  onNext: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  currentIndex: number;
  totalWords: number;
}

export interface ColorTheme {
  id: string;
  name: string;
  fileManager: string;
  wordManager: string;
  flashcard: string;
  loading: string;
}

export const colorThemes: ColorTheme[] = [
  {
    id: 'calm',
    name: '落ち着いた',
    fileManager: 'from-slate-600 via-slate-700 to-slate-800',
    wordManager: 'from-slate-700 via-slate-800 to-gray-800',
    flashcard: 'from-slate-800 via-gray-800 to-slate-900',
    loading: 'from-slate-600 via-slate-700 to-slate-800'
  },
  {
    id: 'vibrant',
    name: '鮮やか',
    fileManager: 'from-purple-400 via-pink-500 to-red-500',
    wordManager: 'from-blue-400 via-purple-500 to-pink-500',
    flashcard: 'from-indigo-400 via-purple-500 to-pink-500',
    loading: 'from-purple-400 via-pink-500 to-red-500'
  },
  {
    id: 'ocean',
    name: '海',
    fileManager: 'from-blue-600 via-blue-700 to-indigo-800',
    wordManager: 'from-cyan-600 via-blue-700 to-indigo-800',
    flashcard: 'from-indigo-700 via-blue-800 to-cyan-900',
    loading: 'from-blue-600 via-blue-700 to-indigo-800'
  },
  {
    id: 'forest',
    name: '森',
    fileManager: 'from-green-600 via-emerald-700 to-teal-800',
    wordManager: 'from-emerald-600 via-green-700 to-teal-800',
    flashcard: 'from-teal-700 via-emerald-800 to-green-900',
    loading: 'from-green-600 via-emerald-700 to-teal-800'
  },
  {
    id: 'sunset',
    name: '夕焼け',
    fileManager: 'from-orange-500 via-red-500 to-pink-600',
    wordManager: 'from-red-500 via-pink-500 to-purple-600',
    flashcard: 'from-purple-600 via-pink-600 to-orange-700',
    loading: 'from-orange-500 via-red-500 to-pink-600'
  },
  {
    id: 'night',
    name: '夜',
    fileManager: 'from-gray-800 via-gray-900 to-black',
    wordManager: 'from-gray-900 via-black to-gray-800',
    flashcard: 'from-black via-gray-900 to-gray-800',
    loading: 'from-gray-800 via-gray-900 to-black'
  }
];

// 言語コードと名前のマッピング
export const supportedLanguages = {
  'en': 'English',
  'ja': '日本語',
  'es': 'Español',
  'fr': 'Français',
  'it': 'Italiano',
  'de': 'Deutsch',
  'zh': '中文',
  'ko': '한국어'
} as const;

export type SupportedLanguage = keyof typeof supportedLanguages;