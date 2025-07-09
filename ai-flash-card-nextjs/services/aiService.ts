import { AIWordInfo, SupportedLanguage } from '@/types';
import { withExponentialBackoff } from '@/utils/retry';
import { logger } from '@/utils/logger';
import { aiWordInfoCache } from './aiCacheService';
import { speechService } from './speechService';

// Groq APIクライアントを使用
async function callGroqAPI(action: string, data: Record<string, unknown>): Promise<unknown> {
  try {
    // タイムアウト付きfetch（60秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒タイムアウト
    
    const response = await fetch('/api/groq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...data }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    // レスポンスのコンテンツタイプを確認
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error('Server returned non-JSON response. API route may not be found.');
    }

    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse error response:', jsonError);
        error = { error: 'Failed to parse error response', message: await response.text() };
      }
      
      console.error('API Error Response:', error);
      console.error('Response status:', response.status);
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      
      // APIキー未設定の場合のメッセージを表示
      if (error.fallbackMode) {
        console.warn('🔐 GROQ API key not configured. To enable AI features:');
        console.warn('1. Get your API key from:', error.setupUrl);
        console.warn('2. Create a .env.local file in the project root');
        console.warn('3. Add: GROQ_API_KEY=your_api_key_here');
      }
      
      // レート制限の場合
      if (response.status === 429 || error.error === 'Rate limit exceeded') {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(error.message || error.error || `API request failed with status ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('CallGroqAPI error:', error);
    
    // タイムアウトエラーの場合
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out.');
    }
    
    throw error;
  }
}

// Groq APIを使用した単語情報生成サービス
export const generateWordInfo = async (word: string): Promise<AIWordInfo> => {
  console.log('[generateWordInfo] Starting for word:', word);
  // まずキャッシュをチェック
  const cachedInfo = aiWordInfoCache.get(word);
  if (cachedInfo) {
    logger.info(`キャッシュから単語情報を取得: ${word}`);
    console.log('[generateWordInfo] Using cached data');
    return cachedInfo;
  }

  try {
    console.log('[generateWordInfo] Calling Groq API...');
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
    
    console.log('[generateWordInfo] Groq API result:', result);
    console.log('[generateWordInfo] Result type:', typeof result);
    console.log('[generateWordInfo] Result keys:', result ? Object.keys(result) : 'null');
    
    const wordInfo = parseGroqResponse(result, word);
    logger.info('Successfully generated word info', { word });
    console.log('[generateWordInfo] Parsed word info:', wordInfo);
    console.log('[generateWordInfo] WordInfo keys:', Object.keys(wordInfo));
    
    // 生成された情報をキャッシュに保存
    aiWordInfoCache.set(word, wordInfo);
    
    return wordInfo;

  } catch (error) {
    logger.error('Groq API error:', error);
    
    // エラーの種類を判定してユーザーフレンドリーなメッセージを生成
    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('rate limit') || error.message.includes('Rate limit') || error.message.includes('quota')) {
        logger.warn('Rate limit or quota exceeded, using fallback data', {
          message: '無料枠の制限に達しました。基本的な単語情報を提供します。',
          word,
          error: error.message
        });
        const fallbackInfo = generateFallbackWordInfo(word);
        // レート制限の場合は使用上の注意を更新
        fallbackInfo.usageNotes = '⚠️ API制限により簡易情報を表示しています。1分後に再度お試しください。';
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
  console.log('[aiService] Parsing Groq response for word:', word);
  console.log('[aiService] Raw response:', response);
  try {
    // responseが文字列の場合はパース
    let resp: any;
    if (typeof response === 'string') {
      console.log('[aiService] Response is string, parsing JSON...');
      resp = JSON.parse(response);
    } else {
      resp = response;
    }
    
    console.log('[aiService] Parsed response type:', typeof resp);
    console.log('[aiService] Parsed response keys:', resp ? Object.keys(resp) : 'null');
    
    // multilingualExamplesの型定義
    interface MultilingualExamples {
      spanish?: string;
      french?: string;
      german?: string;
      italian?: string;
      chinese?: string;
      korean?: string;
      es?: string;
      fr?: string;
      de?: string;
      it?: string;
      zh?: string;
      ko?: string;
    }
    
    const translations = resp.translations || {};
    
    // 文法変化情報の抽出（Groqレスポンスから）
    let grammaticalChanges = undefined;
    if (resp.conjugations) {
      console.log('[aiService] Processing conjugations:', resp.conjugations);
      // レスポンスから文法変化情報を解析
      try {
        if (typeof resp.conjugations === 'string') {
          // 文字列の場合はJSONとしてパース
          grammaticalChanges = JSON.parse(resp.conjugations);
        } else if (typeof resp.conjugations === 'object') {
          // オブジェクトの場合はそのまま使用
          grammaticalChanges = resp.conjugations;
        }
        console.log('[aiService] Parsed grammaticalChanges:', grammaticalChanges);
      } catch (error) {
        console.error('[aiService] Failed to parse conjugations:', error);
        // パースに失敗した場合はテキストとして扱う
        grammaticalChanges = { raw: resp.conjugations };
      }
    }
    
    // 言語を判定（翻訳情報から推測）
    let detectedLanguage: SupportedLanguage = 'en';
    if (translations.en && translations.en !== word) {
      // 英語訳が存在し、元の単語と異なる場合は英語以外
      if (translations.es === word) detectedLanguage = 'es';
      else if (translations.fr === word) detectedLanguage = 'fr';
      else if (translations.de === word) detectedLanguage = 'de';
      else if (translations.zh === word) detectedLanguage = 'zh';
      else if (translations.ko === word) detectedLanguage = 'ko';
      else if (translations.ja === word) detectedLanguage = 'ja';
      else detectedLanguage = speechService.detectLanguage(word) as SupportedLanguage;
    }
    
    console.log('[aiService] Detected language for', word, ':', detectedLanguage);
    console.log('[aiService] example:', resp.example);
    console.log('[aiService] example_translation:', resp.example_translation);
    console.log('[aiService] english_example:', resp.english_example);
    
    const enhancedExample = {
      originalLanguage: detectedLanguage,
      originalSentence: resp.example || `Example sentence with "${word}".`,
      japaneseTranslation: resp.example_translation || `「${word}」を使った例文です。`,
      englishTranslation: resp.english_example || (detectedLanguage !== 'en' && resp.example ? `[Translation needed] ${resp.example}` : resp.example) || `Example sentence with "${word}".`
    };
    
    console.log('[aiService] Created enhancedExample:', enhancedExample);
    
    // 値が文字列であることを確認する関数
    const ensureString = (value: unknown, fallback: string): string => {
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value !== null) {
        // オブジェクトの場合はJSON文字列化
        console.warn('[aiService] Object found where string expected:', value);
        return JSON.stringify(value);
      }
      return fallback;
    };
    
    const result = {
      englishEquivalent: ensureString(translations.en || resp.meaning, `English meaning of "${word}"`),
      japaneseEquivalent: ensureString(translations.ja || resp.meaning, `${word}の日本語意味`),
      pronunciation: ensureString(resp.pronunciation, `/${word.toLowerCase()}/`),
      exampleSentence: ensureString(resp.example, `Example sentence with "${word}".`),
      japaneseExample: ensureString(resp.example_translation, `「${word}」を使った例文です。`),
      englishExample: ensureString(resp.english_example || (translations.en ? `Usage example for "${translations.en}".` : null), `Usage example for "${word}".`),
      usageNotes: ensureString(resp.notes, `Usage notes for "${word}".`),
      wordClass: resp.wordClass as AIWordInfo['wordClass'] || determineWordClass(word),
      grammaticalChanges,
      enhancedExample: {
        originalLanguage: enhancedExample.originalLanguage,
        originalSentence: ensureString(enhancedExample.originalSentence, ''),
        japaneseTranslation: ensureString(enhancedExample.japaneseTranslation, ''),
        englishTranslation: ensureString(enhancedExample.englishTranslation, '')
      },
      translations: {
        spanish: ensureString(translations.es || translations.spanish, `Significado en español de "${word}"`),
        french: ensureString(translations.fr || translations.french, `Signification française de "${word}"`),
        german: ensureString(translations.de || translations.german, `Deutsche Bedeutung von "${word}"`),
        chinese: ensureString(translations.zh || translations.chinese, `"${word}"的中文含义`),
        korean: ensureString(translations.ko || translations.korean, `"${word}"의 한국어 의미`),
        italian: ensureString(translations.it || translations.italian, '')
      },
      multilingualExamples: resp.multilingualExamples ? {
        spanish: ensureString(resp.multilingualExamples.spanish || resp.multilingualExamples.es, ''),
        french: ensureString(resp.multilingualExamples.french || resp.multilingualExamples.fr, ''),
        german: ensureString(resp.multilingualExamples.german || resp.multilingualExamples.de, ''),
        chinese: ensureString(resp.multilingualExamples.chinese || resp.multilingualExamples.zh, ''),
        korean: ensureString(resp.multilingualExamples.korean || resp.multilingualExamples.ko, ''),
        italian: ensureString(resp.multilingualExamples.italian || resp.multilingualExamples.it, '')
      } : undefined
    };
    
    console.log('[aiService] Final result:', result);
    return result;
  } catch (error) {
    console.error('Failed to parse Groq response:', error);
    return generateFallbackWordInfo(word);
  }
};

// フォールバック用のモックデータ生成（レート制限時も使用）
const generateFallbackWordInfo = (word: string): AIWordInfo => {
  // 単語の言語を推測
  const detectedLang = speechService.detectLanguage(word) as SupportedLanguage;
  
  // 基本的な単語情報を生成
  const wordInfo: AIWordInfo = {
    englishEquivalent: detectedLang === 'en' ? word : `[翻訳取得中] ${word}`,
    japaneseEquivalent: detectedLang === 'ja' ? word : `[翻訳取得中] ${word}`,
    pronunciation: `/${word.toLowerCase()}/`,
    exampleSentence: generateExampleSentence(word, detectedLang),
    japaneseExample: `「${word}」を使った例文`,
    englishExample: `Example with "${word}"`,
    usageNotes: 'API制限により詳細情報は取得できませんでした。後でもう一度お試しください。',
    wordClass: determineWordClass(word),
    enhancedExample: {
      originalLanguage: detectedLang,
      originalSentence: generateExampleSentence(word, detectedLang),
      japaneseTranslation: `「${word}」を使った例文`,
      englishTranslation: `Example with "${word}"`
    },
    translations: {
      spanish: detectedLang === 'es' ? word : `[${word}]`,
      french: detectedLang === 'fr' ? word : `[${word}]`,
      italian: detectedLang === 'it' ? word : `[${word}]`,
      german: detectedLang === 'de' ? word : `[${word}]`,
      chinese: detectedLang === 'zh' ? word : `[${word}]`,
      korean: detectedLang === 'ko' ? word : `[${word}]`
    }
  };
  
  // 品詞に応じた文法情報を追加
  if (wordInfo.wordClass === 'verb') {
    wordInfo.grammaticalChanges = {
      verbConjugations: {
        present: word,
        past: word.endsWith('e') ? word + 'd' : word + 'ed',
        future: 'will ' + word,
        gerund: word.endsWith('e') ? word.slice(0, -1) + 'ing' : word + 'ing',
        pastParticiple: word.endsWith('e') ? word + 'd' : word + 'ed'
      }
    };
  } else if (wordInfo.wordClass === 'noun' || wordInfo.wordClass === 'adjective') {
    wordInfo.grammaticalChanges = {};
  }
  
  return wordInfo;
};

// 言語に応じた例文を生成
const generateExampleSentence = (word: string, language: SupportedLanguage): string => {
  switch (language) {
    case 'es':
      return `Ejemplo con la palabra "${word}".`;
    case 'fr':
      return `Exemple avec le mot "${word}".`;
    case 'de':
      return `Beispiel mit dem Wort "${word}".`;
    case 'ja':
      return `「${word}」を使用した例文です。`;
    case 'zh':
      return `使用"${word}"的例句。`;
    case 'ko':
      return `"${word}"를 사용한 예문입니다.`;
    default:
      return `This is an example sentence using "${word}".`;
  }
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