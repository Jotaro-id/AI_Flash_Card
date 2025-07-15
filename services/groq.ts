import Groq from 'groq-sdk';

export class GroqService {
  private groq: Groq;

  constructor() {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set in environment variables');
    }
    
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async generateWordInfo(word: string, targetLanguage: string = 'ja') {
    try {
      const prompt = `
You are a language learning assistant. Generate comprehensive information about the word "${word}" in the target language "${targetLanguage}".

Return the information in the following JSON format:
{
  "English": "English translation",
  "Japanese": "Japanese translation",
  "Pronunciation": "pronunciation guide",
  "ExampleSentence": "example sentence in the target language",
  "ExampleSentenceJapanese": "Japanese translation of example sentence",
  "ExampleSentenceEnglish": "English translation of example sentence",
  "Notes": "usage notes and context",
  "WordClass": "part of speech",
  "GenderVariations": "gender variations if applicable",
  "TenseVariations": "tense variations if applicable"
}

Make sure to provide accurate and helpful information for language learners.
`;

      const response = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful language learning assistant that provides accurate translations and language information.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'gemma2-9b-it',
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from Groq API');
      }

      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', content);
        throw new Error('Invalid JSON response from AI service');
      }
    } catch (error) {
      console.error('Error generating word info:', error);
      throw error;
    }
  }

  async generateFlashcardContent(word: string, context?: string, difficulty?: string, targetLanguage?: string) {
    try {
      const prompt = `
あなたは語学学習アシスタントです。
単語: ${word}
${targetLanguage ? `対象言語: ${this.getLanguageName(targetLanguage)}` : ''}

以下の情報を簡潔にJSON形式で生成してください：
{
  "meaning": "単語の意味（日本語で）",
  "pronunciation": "発音ガイド",
  "example": "例文（原語で1文）",
  "example_translation": "例文の日本語訳",
  "english_example": "例文の英語訳",
  "notes": "使用上の注意点",
  "wordClass": "品詞（noun/verb/adjective/adverb/other）",
  "translations": {
    "en": "英語訳",
    "ja": "日本語訳"
  },
  "conjugations": {
    // 動詞の場合のみ記入。動詞でない場合は空のオブジェクト{}にする
    "present": "現在形",
    "past": "過去形",
    "pastParticiple": "過去分詞形",
    "gerund": "動名詞形",
    "presentThirdPerson": "3人称単数現在"
  },
  "genderNumberChanges": {}
}

重要：
- 動詞の場合は必ずconjugationsを記入
- 動詞でない場合はconjugationsを空のオブジェクト{}にする
- シンプルで正確な情報のみを提供
- 有効なJSONのみを返す
`;

      const response = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'あなたは語学学習アシスタントです。指定された形式のJSONのみを返してください。余計な説明は不要です。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'gemma2-9b-it',
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from Groq API');
      }

      console.log('[Groq Service] Raw response length:', content.length);
      console.log('[Groq Service] Raw response preview:', content.substring(0, 500) + '...');

      try {
        // Clean up the response if it contains markdown code blocks
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.substring(7);
        }
        if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.substring(3);
        }
        if (cleanContent.endsWith('```')) {
          cleanContent = cleanContent.substring(0, cleanContent.length - 3);
        }
        cleanContent = cleanContent.trim();

        // 応答が途中で切れている可能性をチェック
        if (!cleanContent.endsWith('}')) {
          console.warn('[Groq Service] Response appears to be truncated. Attempting to fix...');
          // 最後の完全なオブジェクトを探す
          const lastBrace = cleanContent.lastIndexOf('}');
          if (lastBrace > 0) {
            cleanContent = cleanContent.substring(0, lastBrace + 1);
          }
        }

        const parsedContent = JSON.parse(cleanContent);
        console.log('[Groq Service] Successfully parsed response');
        return parsedContent;
      } catch (parseError) {
        console.error('Failed to parse JSON response');
        console.error('Parse error:', parseError);
        console.error('Content that failed to parse:', content);
        
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/); 
        if (jsonMatch) {
          try {
            const extracted = JSON.parse(jsonMatch[0]);
            console.log('[Groq Service] Successfully extracted JSON from response');
            return extracted;
          } catch (e) {
            console.error('Failed to parse extracted JSON:', e);
            console.error('Extracted content:', jsonMatch[0]);
          }
        }
        
        throw new Error('Invalid JSON response from AI service - check logs for details');
      }
    } catch (error) {
      console.error('Error generating flashcard content:', error);
      throw error;
    }
  }

  private getLanguageName(code: string): string {
    const languageNames: Record<string, string> = {
      'en': 'English',
      'ja': 'Japanese',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'zh': 'Chinese',
      'ko': 'Korean',
      'it': 'Italian'
    };
    return languageNames[code] || code;
  }
}