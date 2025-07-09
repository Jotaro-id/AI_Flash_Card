import { AIWordInfo, SupportedLanguage } from '@/types';
import { withExponentialBackoff } from '@/utils/retry';
import { logger } from '@/utils/logger';
import { aiWordInfoCache } from './aiCacheService';

// Groq APIクライアントを使用
async function callGroqAPI(action: string, data: Record<string, unknown>): Promise<unknown> {
  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...data }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Groq API request failed');
  }

  const result = await response.json();
  return result.data;
}

// Groq APIを使用した単語情報生成サービス
export const generateWordInfo = async (word: string): Promise<AIWordInfo> => {
  // まずキャッシュをチェック
  const cachedInfo = aiWordInfoCache.get(word);
  if (cachedInfo) {
    logger.info(`キャッシュから単語情報を取得: ${word}`);
    return cachedInfo;
  }

  try {
    // レート制限とリトライ処理付きでAPIを呼び出し
    const result = await withExponentialBackoff(
      async () => {
        return await callGroqAPI('generateFlashcard', { word });
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        onRetry: (attempt, error) => {
          logger.warn(`Groq API retry attempt ${attempt}/3`, {
            error: error.message,
            word
          });
        }
      }
    );
    
    const wordInfo = parseGroqResponse(result, word);
    logger.info('Successfully generated word info', { word });
    
    // 生成された情報をキャッシュに保存
    aiWordInfoCache.set(word, wordInfo);
    
    return wordInfo;

  } catch (error) {
    logger.error('Groq API error:', error);
    
    // エラーの種類を判定してユーザーフレンドリーなメッセージを生成
    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('rate limit') || error.message.includes('quota')) {
        logger.warn('Rate limit or quota exceeded, using fallback data', {
          message: '無料枠の制限（1日1000リクエスト）に達しました。基本的な単語情報を提供します。',
          word,
          error: error.message
        });
        const fallbackInfo = generateFallbackWordInfo(word);
        aiWordInfoCache.set(word, fallbackInfo);
        return fallbackInfo;
      }
      if (error.message.includes('API_KEY_INVALID')) {
        logger.error('API key issue detected, using fallback data');
        const fallbackInfo = generateFallbackWordInfo(word);
        aiWordInfoCache.set(word, fallbackInfo);
        return fallbackInfo;
      }
      if (error.message.includes('fetch') || error.message.includes('network')) {
        logger.error('Network error, using fallback data');
        const fallbackInfo = generateFallbackWordInfo(word);
        aiWordInfoCache.set(word, fallbackInfo);
        return fallbackInfo;
      }
      if (error.message.includes('timeout')) {
        logger.error('Timeout error, using fallback data');
        const fallbackInfo = generateFallbackWordInfo(word);
        aiWordInfoCache.set(word, fallbackInfo);
        return fallbackInfo;
      }
    }
    
    // その他のエラーの場合もフォールバックを使用
    logger.warn('Using fallback data due to unrecoverable API error');
    const fallbackInfo = generateFallbackWordInfo(word);
    aiWordInfoCache.set(word, fallbackInfo);
    return fallbackInfo;
  }
};

// Groqの回答をパースしてAIWordInfo形式に変換
const parseGroqResponse = (response: unknown, word: string): AIWordInfo => {
  try {
    const resp = response as {
      translations?: Record<string, string>;
      conjugations?: string | Record<string, unknown>;
      meaning?: string;
      pronunciation?: string;
      example?: string;
      example_translation?: string;
      notes?: string;
    };
    
    const translations = resp.translations || {};
    
    // 文法変化情報の抽出（Groqレスポンスから）
    let grammaticalChanges = undefined;
    if (resp.conjugations) {
      // レスポンスから文法変化情報を解析
      try {
        const conjugationData = typeof resp.conjugations === 'string' 
          ? JSON.parse(resp.conjugations) 
          : resp.conjugations;
        grammaticalChanges = conjugationData;
      } catch {
        // パースに失敗した場合はテキストとして扱う
        grammaticalChanges = { raw: resp.conjugations };
      }
    }
    
    return {
      englishEquivalent: translations.en || `English meaning of "${word}"`,
      japaneseEquivalent: translations.ja || resp.meaning || `${word}の日本語意味`,
      pronunciation: resp.pronunciation || `/${word.toLowerCase()}/`,
      exampleSentence: resp.example || `Example sentence with "${word}".`,
      japaneseExample: resp.example_translation || `「${word}」を使った例文です。`,
      englishExample: translations.en ? `Usage example for "${translations.en}".` : `Usage example for "${word}".`,
      usageNotes: resp.notes || `Usage notes for "${word}".`,
      wordClass: determineWordClass(word),
      grammaticalChanges,
      enhancedExample: {
        originalLanguage: 'en' as SupportedLanguage,
        originalSentence: resp.example || `Example sentence with "${word}".`,
        japaneseTranslation: resp.example_translation || `「${word}」を使った例文です。`,
        englishTranslation: resp.example || `Example sentence with "${word}".`
      },
      translations: {
        spanish: translations.es || `Significado en español de "${word}"`,
        french: translations.fr || `Signification française de "${word}"`,
        german: translations.de || `Deutsche Bedeutung von "${word}"`,
        chinese: translations.zh || `"${word}"的中文含义`,
        korean: translations.ko || `"${word}"의 한국어 의미`
      }
    };
  } catch (error) {
    console.error('Failed to parse Groq response:', error);
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

// スペルチェック機能
export const checkSpelling = async (word: string): Promise<string[]> => {
  try {
    const response = await callGroqAPI('generateInfo', { 
      word, 
      targetLanguage: 'en' 
    });
    
    // Groqの応答からスペル候補を抽出
    const responseText = String(response);
    const spellingMatch = responseText.match(/spelling suggestions?:?\s*(.+)/i);
    if (spellingMatch) {
      const suggestions = spellingMatch[1]
        .split(/[,、]/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && s.toLowerCase() !== word.toLowerCase())
        .slice(0, 3);
      
      if (suggestions.length > 0) {
        return suggestions;
      }
    }
    
    // スペル候補が見つからない場合はオフラインチェックを使用
    const { getSpellSuggestions } = await import('@/utils/spellChecker');
    const suggestions = await getSpellSuggestions(word);
    return suggestions.map(s => s.word);
  } catch (error) {
    console.error('Spell check error:', error);
    // エラー時はオフラインチェックを使用
    const { getSpellSuggestions } = await import('@/utils/spellChecker');
    const suggestions = await getSpellSuggestions(word);
    return suggestions.map(s => s.word);
  }
};

// APIステータス情報のエクスポート
export const apiKeyStatus = {
  isConfigured: !!process.env.GROQ_API_KEY,
  isValid: !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key',
  message: process.env.GROQ_API_KEY 
    ? 'Groq API key is configured' 
    : 'GROQ_API_KEY is not set in environment variables'
};