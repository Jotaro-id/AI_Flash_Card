import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIWordInfo, SupportedLanguage, supportedLanguages } from '../types';

// APIキーを環境変数から取得
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey || apiKey === 'your_api_key_here') {
  console.warn("VITE_GEMINI_API_KEY is not properly configured in .env.local file");
}

// Google Generative AIクライアントの初期化
const genAI = apiKey && apiKey !== 'your_api_key_here' 
  ? new GoogleGenerativeAI(apiKey) 
  : null;

// Gemini 1.5 Flashモデルを使用（高速・無料）
const model = genAI?.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
});

// Gemini APIを使用した単語情報生成サービス
export const generateWordInfo = async (word: string): Promise<AIWordInfo> => {
  // APIキーが設定されていない場合はフォールバックを使用
  if (!model) {
    console.warn('Gemini API is not configured. Using fallback data.');
    return generateFallbackWordInfo(word);
  }

  try {
    const prompt = createWordAnalysisPrompt(word);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text();
    
    const wordInfo = parseAIResponse(aiResponse, word);
    return wordInfo;

  } catch (error) {
    console.error('Gemini API error:', error);
    // レート制限やエラーの詳細をログ出力
    if (error.response?.status === 429) {
      console.error('Rate limit exceeded. Please try again later.');
    }
    return generateFallbackWordInfo(word);
  }
};

// Gemini用のプロンプトを作成（簡略化版で高速化）
const createWordAnalysisPrompt = (word: string): string => {
  return `単語「${word}」について、以下の情報をJSON形式で提供してください：

{
  "englishEquivalent": "英語での意味・定義",
  "japaneseEquivalent": "日本語での意味・定義",
  "pronunciation": "発音記号（IPA形式）",
  "exampleSentence": "英語での例文",
  "japaneseExample": "日本語での例文",
  "englishExample": "英語での使用例",
  "usageNotes": "使用上の注意・コツ",
  "wordClass": "品詞（noun/verb/adjective/adverb/other）",
  "tenseInfo": "時制情報（該当する場合）",
  "additionalInfo": "追加の文法情報",
  "translations": {
    "spanish": "スペイン語での意味",
    "french": "フランス語での意味",
    "italian": "イタリア語での意味",
    "german": "ドイツ語での意味",
    "chinese": "中国語での意味",
    "korean": "韓国語での意味"
  },
  "multilingualExamples": {
    "spanish": "スペイン語での例文",
    "french": "フランス語での例文",
    "italian": "イタリア語での例文",
    "german": "ドイツ語での例文",
    "chinese": "中国語での例文",
    "korean": "韓国語での例文"
  }
}

正確で教育的な内容を提供し、学習者に役立つ情報を含めてください。JSON形式で回答してください。`;
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

// 単語のサジェスチョン（翻訳・補完）を取得
export const getWordSuggestions = async (
  text: string, 
  targetLanguage: SupportedLanguage
): Promise<string[]> => {
  // 入力が空の場合は空配列を返す
  if (!text.trim()) return [];
  
  // APIキーが設定されていない場合はフォールバックを使用
  if (!model) {
    return getFallbackSuggestions(text, targetLanguage);
  }
  
  try {
    const targetLangName = supportedLanguages[targetLanguage];
    
    // Gemini用のプロンプトを作成
    const prompt = `次の単語またはフレーズを${targetLangName}に翻訳または補完してください：
"${text}"

要求：
1. もし入力が${targetLangName}でない場合は、${targetLangName}に翻訳してください
2. もし入力が既に${targetLangName}の場合は、関連する単語や同義語を提案してください
3. 最大3つの提案を提供してください
4. カンマ区切りで回答してください（説明は不要）
5. 単語のみを返してください

例：
- 入力: "hello" → 出力: "hola, buenos días, qué tal" (スペイン語の場合)
- 入力: "こんにちは" → 出力: "hello, hi, good afternoon" (英語の場合)

回答:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const suggestionsText = response.text();

    // レスポンスを解析してサジェスチョンのリストを作成
    const suggestions = suggestionsText
      .trim()
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, 3); // 最大3つまで

    return suggestions;
  } catch (error) {
    console.error('Suggestion generation error:', error);
    // エラー時はフォールバックのサジェスチョンを返す
    return getFallbackSuggestions(text, targetLanguage);
  }
};

// フォールバックのサジェスチョン
const getFallbackSuggestions = (text: string, targetLanguage: SupportedLanguage): string[] => {
  const lowerText = text.toLowerCase();
  
  // 簡単な翻訳の例（実際の使用では拡張が必要）
  const translations: Record<string, Record<SupportedLanguage, string[]>> = {
    'hello': {
      'es': ['hola', 'buenos días', 'qué tal'],
      'fr': ['bonjour', 'salut', 'allô'],
      'de': ['hallo', 'guten Tag', 'servus'],
      'it': ['ciao', 'buongiorno', 'salve'],
      'ja': ['こんにちは', 'やあ', 'どうも'],
      'zh': ['你好', '您好', '哈罗'],
      'ko': ['안녕하세요', '안녕', '여보세요'],
      'en': ['hi', 'hey', 'greetings']
    },
    'thank you': {
      'es': ['gracias', 'muchas gracias', 'te agradezco'],
      'fr': ['merci', 'merci beaucoup', 'je vous remercie'],
      'de': ['danke', 'vielen Dank', 'danke schön'],
      'it': ['grazie', 'grazie mille', 'ti ringrazio'],
      'ja': ['ありがとう', 'ありがとうございます', 'どうも'],
      'zh': ['谢谢', '感谢', '多谢'],
      'ko': ['감사합니다', '고맙습니다', '고마워요'],
      'en': ['thanks', 'thanks a lot', 'appreciate it']
    }
  };
  
  // 翻訳が見つかった場合
  if (translations[lowerText] && translations[lowerText][targetLanguage]) {
    return translations[lowerText][targetLanguage];
  }
  
  // デフォルトのサジェスチョン
  return [`${text} (${supportedLanguages[targetLanguage]})`];
};