import { AIWordInfo, SupportedLanguage } from '@/types';
import { withExponentialBackoff } from '@/utils/retry';
import { logger } from '@/utils/logger';
import { aiWordInfoCache } from './aiCacheService';

// DeepSeek APIの設定
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;

// DeepSeek APIを使用した単語情報生成サービス
export const generateWordInfoWithDeepSeek = async (word: string): Promise<AIWordInfo> => {
  // まずキャッシュをチェック
  const cachedInfo = aiWordInfoCache.get(word);
  if (cachedInfo) {
    logger.info(`キャッシュから単語情報を取得: ${word}`);
    return cachedInfo;
  }

  // APIキーが設定されていない場合はエラー
  if (!apiKey) {
    logger.warn('DeepSeek API key is not configured');
    throw new Error('DeepSeek API key is not configured');
  }

  try {
    const prompt = createWordAnalysisPrompt(word);
    
    // DeepSeek APIを呼び出し
    const response = await withExponentialBackoff(
      async () => {
        const res = await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: 'あなたは言語学の専門家です。単語の詳細な情報を日本語で提供してください。'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        if (!res.ok) {
          throw new Error(`DeepSeek API error: ${res.status} ${res.statusText}`);
        }

        return res.json();
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        onRetry: (attempt, error) => {
          logger.warn(`DeepSeek API retry attempt ${attempt}/3`, {
            error: error.message,
            word
          });
        }
      }
    );

    const aiResponse = response.choices[0].message.content;
    const wordInfo = parseAIResponse(aiResponse, word);
    
    logger.info('Successfully generated word info with DeepSeek', { word });
    
    // 生成された情報をキャッシュに保存
    aiWordInfoCache.set(word, wordInfo);
    
    return wordInfo;

  } catch (error) {
    logger.error('DeepSeek API error:', error);
    throw error;
  }
};

// プロンプトの作成（既存のaiService.tsから流用）
const createWordAnalysisPrompt = (word: string): string => {
  return `以下の単語について、詳細な情報を日本語で提供してください。必ず以下の形式で返答してください：

単語: ${word}

[英語]
[日本語]
[発音]
[例文（原語）]
[例文（日本語）]
[例文（英語）]
[使用上の注意]
[品詞]
[活用・変化]（動詞の場合は活用形、名詞の場合は複数形など）

JSON形式ではなく、上記の形式で自然な日本語で回答してください。`;
};

// AIレスポンスの解析（既存のaiService.tsと同様の実装）
const parseAIResponse = (response: string, word: string): AIWordInfo => {
  const lines = response.split('\n').filter(line => line.trim());
  const info: AIWordInfo = {
    englishEquivalent: '',
    japaneseEquivalent: '',
    pronunciation: '',
    exampleSentence: '',
    japaneseExample: '',
    englishExample: '',
    usageNotes: '',
    wordClass: 'noun',
    enhancedExample: {
      originalLanguage: 'en' as const,
      originalSentence: '',
      japaneseTranslation: '',
      englishTranslation: ''
    }
  };

  // レスポンスから情報を抽出
  lines.forEach(line => {
    if (line.includes('[英語]')) {
      info.englishEquivalent = line.replace('[英語]', '').trim();
    } else if (line.includes('[日本語]')) {
      info.japaneseEquivalent = line.replace('[日本語]', '').trim();
    } else if (line.includes('[発音]')) {
      info.pronunciation = line.replace('[発音]', '').trim();
    } else if (line.includes('[例文（原語）]')) {
      info.exampleSentence = line.replace('[例文（原語）]', '').trim();
    } else if (line.includes('[例文（日本語）]')) {
      info.japaneseExample = line.replace('[例文（日本語）]', '').trim();
    } else if (line.includes('[例文（英語）]')) {
      info.englishExample = line.replace('[例文（英語）]', '').trim();
    } else if (line.includes('[使用上の注意]')) {
      info.usageNotes = line.replace('[使用上の注意]', '').trim();
    } else if (line.includes('[品詞]')) {
      const wordClass = line.replace('[品詞]', '').trim().toLowerCase();
      info.wordClass = wordClass as AIWordInfo['wordClass'];
    }
  });

  // enhancedExampleの設定
  info.enhancedExample = {
    originalLanguage: 'en' as const,
    originalSentence: info.exampleSentence,
    japaneseTranslation: info.japaneseExample,
    englishTranslation: info.englishExample
  };

  return info;
};