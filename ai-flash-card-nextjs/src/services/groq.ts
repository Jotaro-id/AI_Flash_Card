import Groq from 'groq-sdk';

export class GroqService {
  private groq: Groq;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1秒

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set in environment variables');
    }
    this.groq = new Groq({ apiKey });
  }

  async generateWordInfo(word: string, targetLanguage: string = 'ja'): Promise<string> {
    const prompt = this.createWordInfoPrompt(word, targetLanguage);
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const completion = await this.groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "あなたは多言語の単語学習を支援する専門家です。単語の詳細な情報を提供してください。"
            },
            {
              role: "user",
              content: prompt
            }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
          max_tokens: 2048,
        });

        return completion.choices[0]?.message?.content || '';
      } catch (error) {
        if (error instanceof Error && 'status' in error && (error as { status: number }).status === 429 && attempt < this.MAX_RETRIES - 1) {
          // レート制限エラーの場合、リトライ
          await this.delay(this.RETRY_DELAY * (attempt + 1));
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  async generateFlashcardContent(
    word: string,
    context?: string,
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<{
    word: string;
    meaning: string;
    pronunciation: string;
    example: string;
    notes: string;
    translations: Record<string, string>;
    conjugations?: string;
  }> {
    const prompt = this.createFlashcardPrompt(word, context, difficulty);
    
    const response = await this.generateWordInfo(prompt);
    return this.parseFlashcardResponse(response, word);
  }

  private createWordInfoPrompt(word: string, targetLanguage: string): string {
    return `単語「${word}」について、以下の情報を提供してください：

1. 意味（${targetLanguage}）
2. 発音記号
3. 例文（原文と${targetLanguage}訳）
4. 語源や覚え方のヒント
5. 類義語・反意語
6. 各言語での翻訳：
   - 英語
   - 日本語
   - スペイン語
   - フランス語
   - ドイツ語
   - 中国語（簡体字）
   - 韓国語
7. 動詞の場合は活用形、名詞・形容詞の場合は性数変化（該当する場合）

JSON形式で回答してください。`;
  }

  private createFlashcardPrompt(
    word: string, 
    context?: string,
    difficulty?: string
  ): string {
    let prompt = `単語「${word}」のフラッシュカード情報を生成してください。`;
    
    if (context) {
      prompt += `\n文脈: ${context}`;
    }
    
    if (difficulty) {
      prompt += `\n難易度: ${difficulty}`;
    }
    
    prompt += `\n\n以下のJSON形式で回答してください：
{
  "meaning": "主要な意味",
  "pronunciation": "発音記号",
  "example": "例文",
  "example_translation": "例文の日本語訳",
  "notes": "学習のヒントや注意点",
  "translations": {
    "en": "英語",
    "ja": "日本語",
    "es": "スペイン語",
    "fr": "フランス語",
    "de": "ドイツ語",
    "zh": "中国語",
    "ko": "韓国語"
  },
  "conjugations": "活用形や性数変化（該当する場合）"
}`;
    
    return prompt;
  }

  private parseFlashcardResponse(response: string, word: string): {
    word: string;
    meaning: string;
    pronunciation: string;
    example: string;
    notes: string;
    translations: Record<string, string>;
    conjugations?: string;
  } {
    try {
      // JSONブロックを抽出
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          word,
          meaning: parsed.meaning || '',
          pronunciation: parsed.pronunciation || '',
          example: parsed.example || '',
          notes: parsed.notes || '',
          translations: parsed.translations || {},
          conjugations: parsed.conjugations
        };
      }
    } catch (error) {
      console.error('Failed to parse Groq response:', error);
    }
    
    // パースに失敗した場合のフォールバック
    return {
      word,
      meaning: response,
      pronunciation: '',
      example: '',
      notes: '',
      translations: {},
      conjugations: undefined
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}