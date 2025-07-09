import Groq from 'groq-sdk';

export class GroqService {
  private groq: Groq | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1秒
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey && apiKey !== 'your_groq_api_key_here') {
      this.groq = new Groq({ apiKey });
      this.isConfigured = true;
    } else {
      console.warn('GROQ_API_KEY is not configured. Using fallback mode.');
      console.warn('To enable AI features, please set GROQ_API_KEY in your .env.local file.');
      console.warn('Get your API key from: https://console.groq.com/keys');
    }
  }

  async generateWordInfo(word: string, targetLanguage: string = 'ja'): Promise<string> {
    if (!this.isConfigured) {
      return this.generateFallbackWordInfo(word);
    }

    const prompt = this.createWordInfoPrompt(word, targetLanguage);
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const completion = await this.groq!.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "あなたは多言語の単語学習を支援する専門家です。必ずJSON形式のみで回答してください。追加の説明や前置きは一切不要です。"
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

        const content = completion.choices[0]?.message?.content || '';
        console.log('Groq response:', content);
        return content;
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
    return `単語「${word}」について、必ず以下のJSON形式で回答してください。他の形式での回答は受け付けません。

{
  "word": "${word}",
  "meaning": "${targetLanguage === 'ja' ? '日本語での意味' : 'meaning in ' + targetLanguage}",
  "pronunciation": "発音記号（IPA形式）",
  "example": "例文（原文）",
  "example_translation": "例文の${targetLanguage}訳",
  "etymology": "語源や覚え方のヒント",
  "synonyms": ["類義語1", "類義語2"],
  "antonyms": ["反意語1", "反意語2"],
  "translations": {
    "en": "英語訳",
    "ja": "日本語訳",
    "es": "スペイン語訳",
    "fr": "フランス語訳",
    "de": "ドイツ語訳",
    "zh": "中国語訳（簡体字）",
    "ko": "韓国語訳"
  },
  "conjugations": "動詞の活用形、名詞・形容詞の性数変化（該当する場合のみ）"
}

重要：必ずJSON形式のみで回答し、説明文や追加のテキストは含めないでください。`;
  }

  private createFlashcardPrompt(
    word: string, 
    context?: string,
    difficulty?: string
  ): string {
    let prompt = `単語「${word}」のフラッシュカード情報を、必ず以下のJSON形式のみで回答してください。`;
    
    if (context) {
      prompt += `\n文脈: ${context}`;
    }
    
    if (difficulty) {
      prompt += `\n難易度: ${difficulty}`;
    }
    
    prompt += `

必ず以下の形式のJSONで回答してください。他の形式や説明文は含めないでください：

{
  "meaning": "${word}の主要な意味（日本語）",
  "pronunciation": "${word}の発音記号（IPA形式）",
  "example": "${word}を使った例文（原文）",
  "example_translation": "例文の日本語訳",
  "notes": "学習のヒントや注意点",
  "translations": {
    "en": "${word}の英語訳（もし${word}が英語の場合は同じ）",
    "ja": "${word}の日本語訳",
    "es": "${word}のスペイン語訳",
    "fr": "${word}のフランス語訳",
    "de": "${word}のドイツ語訳",
    "zh": "${word}の中国語訳（簡体字）",
    "ko": "${word}の韓国語訳"
  },
  "conjugations": "動詞の活用形や名詞・形容詞の性数変化（該当する場合のみ）"
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
      // レスポンス全体をJSONとしてパース
      const parsed = JSON.parse(response.trim());
      
      // `notes`フィールドが存在しない場合は、etymology、synonyms、antonymsから作成
      let notes = parsed.notes || '';
      if (!notes && (parsed.etymology || parsed.synonyms || parsed.antonyms)) {
        const noteParts = [];
        if (parsed.etymology) noteParts.push(`語源: ${parsed.etymology}`);
        if (parsed.synonyms?.length) noteParts.push(`類義語: ${parsed.synonyms.join(', ')}`);
        if (parsed.antonyms?.length) noteParts.push(`反意語: ${parsed.antonyms.join(', ')}`);
        notes = noteParts.join('\n');
      }
      
      return {
        word: parsed.word || word,
        meaning: parsed.meaning || '',
        pronunciation: parsed.pronunciation || '',
        example: parsed.example || '',
        notes,
        translations: parsed.translations || {},
        conjugations: parsed.conjugations
      };
    } catch (error) {
      console.error('Failed to parse Groq response:', error);
      console.error('Response was:', response);
      
      // JSONブロックを抽出して再試行
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return this.parseFlashcardResponse(jsonMatch[0], word);
        }
      } catch (secondError) {
        console.error('Second parse attempt failed:', secondError);
      }
    }
    
    // パースに失敗した場合のフォールバック
    return {
      word,
      meaning: 'エラー: 単語情報の取得に失敗しました',
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

  private generateFallbackWordInfo(word: string): string {
    const fallbackData = {
      word: word,
      meaning: `${word}の意味（API未設定のため簡易表示）`,
      pronunciation: `/${word.toLowerCase()}/`,
      example: `Example sentence with "${word}".`,
      example_translation: `「${word}」を使った例文です。`,
      etymology: "語源情報は利用できません",
      synonyms: [],
      antonyms: [],
      translations: {
        en: word,
        ja: `${word}（日本語訳）`,
        es: `${word} (español)`,
        fr: `${word} (français)`,
        de: `${word} (Deutsch)`,
        zh: `${word}（中文）`,
        ko: `${word}（한국어）`
      },
      conjugations: "活用形情報は利用できません",
      notes: "GROQ APIキーが設定されていないため、AI生成機能は利用できません。.env.localファイルにGROQ_API_KEYを設定してください。"
    };
    return JSON.stringify(fallbackData, null, 2);
  }

  public isApiConfigured(): boolean {
    return this.isConfigured;
  }
}