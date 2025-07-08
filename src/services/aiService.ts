import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIWordInfo, SupportedLanguage } from '../types';
import { withExponentialBackoff } from '../utils/retry';
import { logger } from '../utils/logger';
import { geminiRateLimiter } from '../utils/rateLimiter';
import { aiWordInfoCache } from './aiCacheService';

// APIキーを環境変数から取得
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// APIキーの状態を管理
export const apiKeyStatus = {
  isConfigured: false,
  isValid: false,
  message: ''
};

// APIキーの検証
if (!apiKey) {
  apiKeyStatus.message = "VITE_GEMINI_API_KEY is not set in .env.local file";
  logger.warn(apiKeyStatus.message);
} else if (apiKey === 'your_api_key_here') {
  apiKeyStatus.message = "VITE_GEMINI_API_KEY is set to default value. Please update it with your actual API key.";
  logger.warn(apiKeyStatus.message);
} else {
  apiKeyStatus.isConfigured = true;
  apiKeyStatus.isValid = true;
  apiKeyStatus.message = "API key is configured";
  logger.info(apiKeyStatus.message);
}

// Google Generative AIクライアントの初期化
const genAI = apiKeyStatus.isValid
  ? new GoogleGenerativeAI(apiKey) 
  : null;

// Gemini 1.5 Flash-8bモデルを使用（高速・安定版）
const model = genAI?.getGenerativeModel({
  model: "gemini-1.5-flash-8b",
});

// Gemini APIを使用した単語情報生成サービス
export const generateWordInfo = async (word: string): Promise<AIWordInfo> => {
  // まずキャッシュをチェック
  const cachedInfo = aiWordInfoCache.get(word);
  if (cachedInfo) {
    logger.info(`キャッシュから単語情報を取得: ${word}`);
    return cachedInfo;
  }

  // APIキーが設定されていない場合はフォールバックを使用
  if (!model) {
    logger.warn('Gemini API is not configured. Using fallback data.');
    logger.info('API key status:', apiKeyStatus);
    const fallbackInfo = generateFallbackWordInfo(word);
    // フォールバックデータもキャッシュに保存
    aiWordInfoCache.set(word, fallbackInfo);
    return fallbackInfo;
  }

  try {
    const prompt = createWordAnalysisPrompt(word);
    
    // レート制限とリトライ処理付きでAPIを呼び出し
    const result = await geminiRateLimiter.execute(async () => {
      return await withExponentialBackoff(
        async () => {
          const res = await model.generateContent(prompt);
          return res;
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          onRetry: (attempt, error) => {
            logger.warn(`Gemini API retry attempt ${attempt}/3`, {
              error: error.message,
              word
            });
          }
        }
      );
    });
    
    const response = await result.response;
    const aiResponse = response.text();
    
    const wordInfo = parseAIResponse(aiResponse, word);
    logger.info('Successfully generated word info', { word });
    
    // 生成された情報をキャッシュに保存
    aiWordInfoCache.set(word, wordInfo);
    
    return wordInfo;

  } catch (error) {
    logger.error('Gemini API error:', error);
    
    // エラーの種類を判定してユーザーフレンドリーなメッセージを生成
    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw new Error('現在サーバーが混み合っています。しばらくしてからもう一度お試しください。');
      }
      if (error.message.includes('API_KEY_INVALID')) {
        throw new Error('AI機能の設定に問題があります。管理者にお問い合わせください。');
      }
      if (error.message.includes('fetch') || error.message.includes('network')) {
        throw new Error('ネットワーク接続を確認してください。');
      }
      if (error.message.includes('timeout')) {
        throw new Error('接続がタイムアウトしました。もう一度お試しください。');
      }
    }
    
    // その他のエラーの場合はフォールバックを使用
    logger.warn('Using fallback data due to unrecoverable API error');
    const fallbackInfo = generateFallbackWordInfo(word);
    // フォールバックデータもキャッシュに保存
    aiWordInfoCache.set(word, fallbackInfo);
    return fallbackInfo;
  }
};

// Gemini用のプロンプトを作成（最適化版）
const createWordAnalysisPrompt = (word: string): string => {
  return `単語「${word}」の解析。JSONのみで返答:
{
  "englishEquivalent": "英語意味",
  "japaneseEquivalent": "日本語意味",
  "pronunciation": "IPA発音",
  "exampleSentence": "英語例文",
  "japaneseExample": "日本語例文",
  "englishExample": "英語使用例",
  "usageNotes": "使用注意",
  "wordClass": "品詞(noun/verb/adjective/adverb/other)",
  "enhancedExample": {
    "originalLanguage": "言語コード(en/ja/es/fr/it/de/zh/ko)",
    "originalSentence": "原語例文",
    "japaneseTranslation": "日本語訳",
    "englishTranslation": "英語訳"
  },
  "translations": {
    "spanish": "スペイン語",
    "french": "フランス語",
    "german": "ドイツ語",
    "chinese": "中国語"
  }
}`;
};

// AIの回答をパースしてAIWordInfo形式に変換
const parseAIResponse = (aiResponse: string, word: string): AIWordInfo => {
  try {
    // JSONを抽出（AIの回答から）
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON not found in AI response');
    }
    
    const parsedData = JSON.parse(jsonMatch[0]);
    
    // 必要なフィールドを検証し、デフォルト値を設定
    return {
      englishEquivalent: parsedData.englishEquivalent || `English meaning of "${word}"`,
      japaneseEquivalent: parsedData.japaneseEquivalent || `${word}の日本語意味`,
      pronunciation: parsedData.pronunciation || `/${word.toLowerCase()}/`,
      exampleSentence: parsedData.exampleSentence || `Example sentence with "${word}".`,
      japaneseExample: parsedData.japaneseExample || `「${word}」を使った例文です。`,
      englishExample: parsedData.englishExample || `Usage example for "${word}".`,
      usageNotes: parsedData.usageNotes || `Usage notes for "${word}".`,
      wordClass: parsedData.wordClass || determineWordClass(word),
      tenseInfo: parsedData.tenseInfo,
      additionalInfo: parsedData.additionalInfo,
      enhancedExample: parsedData.enhancedExample || {
        originalLanguage: 'en' as SupportedLanguage,
        originalSentence: `Example sentence with "${word}".`,
        japaneseTranslation: `「${word}」を使った例文です。`,
        englishTranslation: `Example sentence with "${word}".`
      },
      translations: parsedData.translations || {},
      multilingualExamples: parsedData.multilingualExamples || {}
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return generateFallbackWordInfo(word);
  }
};

// フォールバック用のモックデータ生成
const generateFallbackWordInfo = (word: string): AIWordInfo => {
  return {
    englishEquivalent: `English meaning of "${word}"`,
    japaneseEquivalent: `${word}の日本語意味`,
    pronunciation: `/${word.toLowerCase().replace(/[aeiou]/g, 'ɑ')}/`,
    exampleSentence: `This is an example sentence using "${word}".`,
    japaneseExample: `これは「${word}」を使った例文です。`,
    englishExample: `Here's how to use "${word}" in English.`,
    usageNotes: `Common usage patterns and notes for "${word}".`,
    wordClass: determineWordClass(word),
    tenseInfo: word.endsWith('ed') ? 'Past tense form' : undefined,
    additionalInfo: `Additional grammatical information about "${word}".`,
    enhancedExample: {
      originalLanguage: 'en' as SupportedLanguage,
      originalSentence: `This is an example sentence using "${word}".`,
      japaneseTranslation: `これは「${word}」を使った例文です。`,
      englishTranslation: `This is an example sentence using "${word}".`
    },
    translations: {
      spanish: `Significado en español de "${word}"`,
      french: `Signification française de "${word}"`,
      italian: `Significato italiano di "${word}"`,
      german: `Deutsche Bedeutung von "${word}"`,
      chinese: `"${word}"的中文含义`,
      korean: `"${word}"의 한국어 의미`
    },
    multilingualExamples: {
      spanish: `Esta es una oración de ejemplo usando "${word}" en español.`,
      french: `Ceci est un exemple de phrase utilisant "${word}" en français.`,
      italian: `Questo è un esempio di frase usando "${word}" in italiano.`,
      german: `Dies ist ein Beispielsatz mit "${word}" auf Deutsch.`,
      chinese: `这是一个使用"${word}"的中文例句。`,
      korean: `이것은 "${word}"를 사용한 한국어 예문입니다.`
    }
  };
};

const determineWordClass = (word: string): AIWordInfo['wordClass'] => {
  if (word.endsWith('ing') || word.endsWith('ed')) return 'verb';
  if (word.endsWith('ly')) return 'adverb';
  if (word.endsWith('ful') || word.endsWith('less')) return 'adjective';
  return 'noun';
};

// 注意: getWordSuggestions機能は wordSuggestionService.ts に移行しました

// スペルチェック機能
export const checkSpelling = async (word: string): Promise<string[]> => {
  // APIキーが設定されていない場合はオフラインチェックのみ
  if (!model) {
    const { getSpellSuggestions } = await import('../utils/spellChecker');
    const suggestions = await getSpellSuggestions(word, false);
    return suggestions.map(s => s.word);
  }
  
  try {
    const prompt = `Check the spelling of "${word}" and provide corrections if needed.
Requirements:
1. If the word is misspelled, provide up to 3 correct spelling suggestions
2. If the word is correct, return the word itself
3. Return only the words, separated by commas
4. No explanations or additional text
5. Consider common spelling mistakes like: recieve→receive, definately→definitely

Response:`;

    // レート制限付きでAPIを呼び出し
    const result = await geminiRateLimiter.execute(async () => {
      return await model.generateContent(prompt);
    });
    const response = await result.response;
    const suggestionsText = response.text();

    const suggestions = suggestionsText
      .trim()
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, 3);

    return suggestions;
  } catch (error) {
    console.error('Spell check error:', error);
    // エラー時はオフラインチェックを使用
    const { getSpellSuggestions } = await import('../utils/spellChecker');
    const suggestions = await getSpellSuggestions(word, false);
    return suggestions.map(s => s.word);
  }
};

