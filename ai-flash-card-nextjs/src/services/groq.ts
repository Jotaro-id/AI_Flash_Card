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
              content: `あなたは多言語の単語学習を支援する専門家です。必ずJSON形式のみで回答してください。追加の説明や前置きは一切不要です。

以下は期待される出力の例です：
{
  "word": "beautiful",
  "meaning": "美しい、きれいな",
  "pronunciation": "/ˈbjuːtɪfəl/",
  "example": "The sunset over the ocean was absolutely beautiful, painting the sky in shades of orange and pink.",
  "example_translation": "海に沈む夕日は本当に美しく、空をオレンジとピンクの色合いに染めていました。",
  "notes": "感情を表現する形容詞で、人・物・風景など幅広く使えます。"
}`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          model: "gemma2-9b-it",
          temperature: 0.5,
          max_tokens: 3000,
        });

        const content = completion.choices[0]?.message?.content || '';
        console.log('Groq response:', content);
        
        // レスポンスの検証
        const parsed = this.validateAndParseJSON(content);
        if (parsed && 'example' in parsed && 'example_translation' in parsed) {
          const example = parsed.example as string;
          const exampleTranslation = parsed.example_translation as string;
          if (!example || example.trim() === '' || !exampleTranslation || exampleTranslation.trim() === '') {
            console.warn('Empty example or translation detected, retrying with enhanced prompt...');
            return this.generateWordInfoWithRetry(word, targetLanguage);
          }
        }
        
        return content;
      } catch (error) {
        console.error(`Groq API attempt ${attempt + 1} failed:`, error);
        
        if (error instanceof Error) {
          // レート制限エラーのチェック
          if (('status' in error && (error as { status: number }).status === 429) ||
              error.message.includes('429') ||
              error.message.includes('rate_limit') ||
              error.message.includes('Rate limit')) {
            if (attempt < this.MAX_RETRIES - 1) {
              console.log(`Rate limit detected, retrying in ${this.RETRY_DELAY * (attempt + 1)}ms...`);
              await this.delay(this.RETRY_DELAY * (attempt + 1));
              continue;
            }
          }
          
          // APIキーエラーのチェック
          if (error.message.includes('401') || error.message.includes('authentication')) {
            throw new Error('GROQ_API_KEY is invalid. Please check your API key.');
          }
          
          // サービス不可のチェック
          if (error.message.includes('503') || error.message.includes('service unavailable')) {
            throw new Error('Groq service is temporarily unavailable. Please try again later.');
          }
        }
        
        // 最後の試行でない場合は再試行
        if (attempt < this.MAX_RETRIES - 1) {
          console.log(`Retrying in ${this.RETRY_DELAY * (attempt + 1)}ms...`);
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
    if (!this.isConfigured) {
      throw new Error('GROQ_API_KEY is not configured. Please set GROQ_API_KEY in your .env.local file.');
    }

    const prompt = this.createFlashcardPrompt(word, context, difficulty);
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const completion = await this.groq!.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `あなたは多言語の単語学習を支援する専門家です。必ずJSON形式のみで回答してください。追加の説明や前置きは一切不要です。

重要な注意事項：
1. conjugationsフィールドは必ずオブジェクト形式で返してください（文字列ではありません）
2. 動詞の場合は必ず"verbConjugations"として詳細な活用情報を含む
3. 形容詞・名詞の場合は必ず"genderNumberChanges"を含む（性数変化がない言語でも空のオブジェクトを返す）
4. その他の品詞の場合のみconjugationsフィールドにnullを設定
5. 性数変化がある言語（スペイン語、フランス語、ドイツ語、イタリア語など）では必ず実際の変化形を記載
6. 性数変化がない言語（英語、日本語、中国語、韓国語など）では空のgenderNumberChanges: {}を返す
7. スペイン語の動詞の場合は、必ずすべての人称（単数・複数）の活用形を含める

以下は期待される出力の例です（スペイン語の動詞「ser」）：
{
  "word": "ser",
  "wordClass": "verb",
  "meaning": "〜である（恒久的な状態を表す）",
  "pronunciation": "/ser/",
  "example": "Ella es profesora de español y trabaja en una universidad.",
  "example_translation": "彼女はスペイン語の先生で、大学で働いています。",
  "english_example": "She is a Spanish teacher and works at a university.",
  "notes": "スペイン語の最も重要な動詞の一つ。恒久的な状態や本質的な特徴を表す際に使用。",
  "conjugations": {
    "verbConjugations": {
      "present": {
        "yo": "soy",
        "tú": "eres",
        "él/ella/usted": "es",
        "nosotros/nosotras": "somos",
        "vosotros/vosotras": "sois",
        "ellos/ellas/ustedes": "son"
      },
      "preterite": {
        "yo": "fui",
        "tú": "fuiste",
        "él/ella/usted": "fue",
        "nosotros/nosotras": "fuimos",
        "vosotros/vosotras": "fuisteis",
        "ellos/ellas/ustedes": "fueron"
      }
    }
  }
}

以下は形容詞の例（スペイン語の形容詞「bonito」）：
{
  "word": "bonito",
  "wordClass": "adjective",
  "meaning": "美しい、きれいな",
  "pronunciation": "/boˈnito/",
  "example": "El jardín está muy bonito en primavera con todas las flores.",
  "example_translation": "庭は春になるとすべての花が咲いてとても美しいです。",
  "english_example": "The garden is very beautiful in spring with all the flowers.",
  "notes": "感情を表現する形容詞で、人・物・風景など幅広く使えます。",
  "conjugations": {
    "genderNumberChanges": {
      "masculine": {
        "singular": "bonito",
        "plural": "bonitos"
      },
      "feminine": {
        "singular": "bonita",
        "plural": "bonitas"
      }
    }
  }
}`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          model: "gemma2-9b-it",
          temperature: 0.5,
          max_tokens: 3000,
        });

        const content = completion.choices[0]?.message?.content || '';
        console.log('Groq generateFlashcard response:', content);
        
        // レスポンスの検証
        const parsed = this.validateAndParseJSON(content);
        if (parsed && 'example' in parsed && 'example_translation' in parsed) {
          const example = parsed.example as string;
          const exampleTranslation = parsed.example_translation as string;
          if (!example || example.trim() === '' || !exampleTranslation || exampleTranslation.trim() === '') {
            console.warn('Empty example or translation detected, retrying with enhanced prompt...');
            if (attempt < this.MAX_RETRIES - 1) {
              await this.delay(this.RETRY_DELAY * (attempt + 1));
              continue;
            }
          }
        }
        
        return this.parseFlashcardResponse(content, word);
      } catch (error) {
        console.error(`Groq API flashcard attempt ${attempt + 1} failed:`, error);
        
        if (error instanceof Error) {
          // レート制限エラーのチェック
          if (('status' in error && (error as { status: number }).status === 429) ||
              error.message.includes('429') ||
              error.message.includes('rate_limit') ||
              error.message.includes('Rate limit')) {
            if (attempt < this.MAX_RETRIES - 1) {
              console.log(`Rate limit detected, retrying in ${this.RETRY_DELAY * (attempt + 1)}ms...`);
              await this.delay(this.RETRY_DELAY * (attempt + 1));
              continue;
            }
          }
          
          // APIキーエラーのチェック
          if (error.message.includes('401') || error.message.includes('authentication')) {
            throw new Error('GROQ_API_KEY is invalid. Please check your API key.');
          }
          
          // サービス不可のチェック
          if (error.message.includes('503') || error.message.includes('service unavailable')) {
            throw new Error('Groq service is temporarily unavailable. Please try again later.');
          }
        }
        
        // 最後の試行でない場合は再試行
        if (attempt < this.MAX_RETRIES - 1) {
          console.log(`Retrying in ${this.RETRY_DELAY * (attempt + 1)}ms...`);
          await this.delay(this.RETRY_DELAY * (attempt + 1));
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  private createWordInfoPrompt(word: string, targetLanguage: string): string {
    return `単語「${word}」について、必ず以下のJSON形式で回答してください。他の形式での回答は受け付けません。

{
  "word": "${word}",
  "meaning": "${targetLanguage === 'ja' ? '日本語での意味' : 'meaning in ' + targetLanguage}",
  "pronunciation": "発音記号（IPA形式）",
  "example": "${word}を使った実用的で自然な例文を1つ作成してください。必ず10単語以上の完全な文で、日常会話や実際の文章で使われるような内容にしてください",
  "example_translation": "上記の例文を自然な${targetLanguage}に翻訳してください。意訳でも構いませんが、原文の意味を正確に伝えてください",
  "english_example": "${word}が英語以外の言語の場合、上記のexampleを英語に翻訳してください。${word}が英語の場合は、exampleと同じ内容を入れてください",
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
  "word": "${word}",
  "wordClass": "${word}の品詞を次から1つ選んでください: verb, noun, adjective, adverb, other",
  "meaning": "${word}の主要な意味を日本語で説明してください",
  "pronunciation": "${word}の発音記号をIPA形式で記載してください（例: /ˈbjuːtɪfəl/）",
  "example": "${word}を使った実用的で自然な例文を1つ作成してください。必ず10単語以上の完全な文で、日常会話や実際の文章で使われるような内容にしてください",
  "example_translation": "上記の例文を自然な日本語に翻詳してください。意訳でも構いませんが、原文の意址を正確に伝えてください",
  "english_example": "${word}が英語以外の言語の場合、上記のexampleを英語に翻訳してください。${word}が英語の場合は、exampleと同じ内容を入れてください",
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
  "conjugations": 品詞に応じて以下の形式で必ず返してください：
    - 動詞の場合: {
        "verbConjugations": {
          "present": {
            "yo": "活用形", "tú": "活用形", "él/ella/usted": "活用形",
            "nosotros/nosotras": "活用形", "vosotros/vosotras": "活用形", "ellos/ellas/ustedes": "活用形"
          },
          "preterite": {
            "yo": "活用形", "tú": "活用形", "él/ella/usted": "活用形",
            "nosotros/nosotras": "活用形", "vosotros/vosotras": "活用形", "ellos/ellas/ustedes": "活用形"
          },
          // その他の時制も同様に全人称を含める
        }
      }
    - 形容詞・名詞: {"genderNumberChanges": {...}} 形式で性数変化を含む（変化がない場合も空のオブジェクト{}を返す）
    - その他: null

重要：スペイン語・フランス語・イタリア語などの動詞では、必ずすべての人称（1人称単数・複数、2人称単数・複数、3人称単数・複数）の活用形を含めてください。
}`;
    
    return prompt;
  }

  private parseFlashcardResponse(response: string, word: string): {
    word: string;
    meaning: string;
    pronunciation: string;
    example: string;
    example_translation?: string;
    english_example?: string;
    notes: string;
    translations: Record<string, string>;
    conjugations?: string;
    wordClass?: string;
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
        example_translation: parsed.example_translation,
        english_example: parsed.english_example,
        notes,
        translations: parsed.translations || {},
        conjugations: parsed.conjugations,
        wordClass: parsed.wordClass
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
      example_translation: undefined,
      english_example: undefined,
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

  private validateAndParseJSON(content: string): Record<string, unknown> | null {
    try {
      // まずJSONをパース
      return JSON.parse(content.trim());
    } catch {
      // JSONブロックを抽出して再試行
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          console.error('Failed to parse extracted JSON');
        }
      }
      return null;
    }
  }

  private async generateWordInfoWithRetry(word: string, targetLanguage: string = 'ja'): Promise<string> {
    const enhancedPrompt = this.createEnhancedWordInfoPrompt(word, targetLanguage);
    
    try {
      const completion = await this.groq!.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `あなたは単語学習の専門家です。重要：必ず完全な例文とその翻訳を含むJSONを返してください。例文は10単語以上の完全な文である必要があります。`
          },
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        model: "gemma2-9b-it",
        temperature: 0.2, // さらに低い温度で再試行
        max_tokens: 2048,
      });

      return completion.choices[0]?.message?.content || this.generateFallbackWordInfo(word);
    } catch (error) {
      console.error('Retry failed:', error);
      return this.generateFallbackWordInfo(word);
    }
  }

  private createEnhancedWordInfoPrompt(word: string, targetLanguage: string): string {
    return `単語「${word}」について、以下のJSON形式で回答してください。

重要な注意事項：
1. "example"フィールドには必ず10単語以上の完全な英語の文を入れてください
2. "example_translation"フィールドにはその日本語訳を入れてください
3. 空文字列や省略は禁止です

{
  "word": "${word}",
  "meaning": "${targetLanguage === 'ja' ? '日本語での意味' : 'meaning in ' + targetLanguage}",
  "pronunciation": "発音記号（IPA形式、例: /ˈbjuːtɪfəl/）",
  "example": "${word}を使った10単語以上の完全な文。単語の元の言語で書いてください。日常生活で使える実用的な内容にしてください。",
  "example_translation": "上記exampleの自然な${targetLanguage}訳。意味が正確に伝わるようにしてください。",
  "english_example": "${word}が英語以外の言語の場合、exampleを英語に翻訳してください。${word}が英語の場合は、exampleと同じ内容を入れてください",
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

必ずJSON形式のみで回答し、説明文や追加のテキストは含めないでください。`;
  }
}