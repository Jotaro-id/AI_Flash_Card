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
Generate comprehensive language learning information for the word "${word}".
${targetLanguage ? `IMPORTANT: 
- This word is being studied in the context of ${this.getLanguageName(targetLanguage)} language learning
- Consider "${word}" as a ${this.getLanguageName(targetLanguage)} word first, unless it's clearly from another language
- Generate the example sentences in ${this.getLanguageName(targetLanguage)} language` : ''}

Return a JSON object with the following structure:
{
  "meaning": "the meaning/definition of the word${targetLanguage ? ` (treating it as a ${this.getLanguageName(targetLanguage)} word)` : ' in the original language'}",
  "pronunciation": "phonetic pronunciation guide",
  "example": "example sentence using the word${targetLanguage ? ` in ${this.getLanguageName(targetLanguage)}` : ' in its original language'}",
  "example_translation": "その例文の日本語訳（必ず日本語で翻訳してください）",
  "english_example": "English translation of the example sentence",
  "notes": "usage notes, common mistakes, or cultural context",
  "wordClass": "noun/verb/adjective/adverb/other",
  "translations": {
    "en": "English translation",
    "ja": "日本語訳（必ず日本語で翻訳してください）",
    "es": "Spanish translation",
    "fr": "French translation",
    "de": "German translation",
    "zh": "Chinese translation",
    "ko": "Korean translation",
    "it": "Italian translation"
  },
  "multilingualExamples": {
    "es": "Spanish example sentence${targetLanguage === 'es' ? ' (MUST be in Spanish)' : ''}",
    "fr": "French example sentence${targetLanguage === 'fr' ? ' (MUST be in French)' : ''}",
    "de": "German example sentence${targetLanguage === 'de' ? ' (MUST be in German)' : ''}",
    "zh": "Chinese example sentence${targetLanguage === 'zh' ? ' (MUST be in Chinese)' : ''}",
    "ko": "Korean example sentence${targetLanguage === 'ko' ? ' (MUST be in Korean)' : ''}",
    "it": "Italian example sentence${targetLanguage === 'it' ? ' (MUST be in Italian)' : ''}"
  },
  "conjugations": {
    // For verbs, include detailed conjugation information based on the language:
    // Spanish example:
    "present": { "yo": "hablo", "tú": "hablas", "él/ella/usted": "habla", "nosotros/nosotras": "hablamos", "vosotros/vosotras": "habláis", "ellos/ellas/ustedes": "hablan" },
    "preterite": { "yo": "hablé", "tú": "hablaste", "él/ella/usted": "habló", "nosotros/nosotras": "hablamos", "vosotros/vosotras": "hablasteis", "ellos/ellas/ustedes": "hablaron" },
    "imperfect": { "yo": "hablaba", "tú": "hablabas", "él/ella/usted": "hablaba", "nosotros/nosotras": "hablábamos", "vosotros/vosotras": "hablabais", "ellos/ellas/ustedes": "hablaban" },
    "future": { "yo": "hablaré", "tú": "hablarás", "él/ella/usted": "hablará", "nosotros/nosotras": "hablaremos", "vosotros/vosotras": "hablaréis", "ellos/ellas/ustedes": "hablarán" },
    "conditional": { "yo": "hablaría", "tú": "hablarías", "él/ella/usted": "hablaría", "nosotros/nosotras": "hablaríamos", "vosotros/vosotras": "hablaríais", "ellos/ellas/ustedes": "hablarían" },
    "subjunctive": { "yo": "hable", "tú": "hables", "él/ella/usted": "hable", "nosotros/nosotras": "hablemos", "vosotros/vosotras": "habléis", "ellos/ellas/ustedes": "hablen" },
    "subjunctive_imperfect": { "yo": "hablara/hablase", "tú": "hablaras/hablases", "él/ella/usted": "hablara/hablase", "nosotros/nosotras": "habláramos/hablásemos", "vosotros/vosotras": "hablarais/hablaseis", "ellos/ellas/ustedes": "hablaran/hablasen" },
    "imperative": { "tú": "habla", "usted": "hable", "nosotros/nosotras": "hablemos", "vosotros/vosotras": "hablad", "ustedes": "hablen" },
    "gerund": "hablando",
    "pastParticiple": "hablado",
    // For English verbs:
    "present": "speak",
    "past": "spoke",
    "pastParticiple": "spoken",
    "gerund": "speaking",
    "presentThirdPerson": "speaks"
  },
  "genderNumberChanges": {
    // REQUIRED for nouns and adjectives in gendered languages
    "masculine": {
      "singular": "example: alto (tall - masculine singular)",
      "plural": "example: altos (tall - masculine plural)"
    },
    "feminine": {
      "singular": "example: alta (tall - feminine singular)",
      "plural": "example: altas (tall - feminine plural)"
    },
    "neuter": {
      // Only for languages with neuter gender like German
      "singular": "example: das Kind (the child - neuter)",
      "plural": "example: die Kinder (the children)"
    }
  }
}

IMPORTANT: 
${targetLanguage ? `- Assume "${word}" is a ${this.getLanguageName(targetLanguage)} word unless clearly from another language` : '- Detect the language of "${word}"'}
- All translations must be accurate
${targetLanguage ? `- The "example" field MUST be in ${this.getLanguageName(targetLanguage)}` : ''}
- For nouns/adjectives: ALWAYS fill "genderNumberChanges" with appropriate forms (include articles)
- For verbs: Fill "conjugations" with all relevant tenses and forms
- Never leave genderNumberChanges empty - always provide forms
- Return valid JSON only
`;

      const response = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a multilingual language learning assistant. Always respond with valid JSON containing comprehensive word information. IMPORTANT: For the "ja" field in translations and "example_translation" field, you MUST provide actual Japanese translations (in hiragana, katakana, or kanji as appropriate), NOT English text. 例: "hello" -> "こんにちは", "run" -> "走る"',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'gemma2-9b-it',
        temperature: 0.3,
        max_tokens: 2500,
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