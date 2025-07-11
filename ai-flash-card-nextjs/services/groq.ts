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
        model: 'llama3-8b-8192',
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

  async generateFlashcardContent(word: string, context?: string, difficulty?: string) {
    try {
      const prompt = `
Generate comprehensive language learning information for the word "${word}".

Return a JSON object with the following structure:
{
  "meaning": "the meaning/definition of the word",
  "pronunciation": "phonetic pronunciation guide",
  "example": "example sentence using the word",
  "example_translation": "Japanese translation of the example sentence",
  "english_example": "English translation of the example sentence",
  "notes": "usage notes, common mistakes, or cultural context",
  "wordClass": "noun/verb/adjective/adverb/other",
  "translations": {
    "en": "English translation",
    "ja": "Japanese translation",
    "es": "Spanish translation",
    "fr": "French translation",
    "de": "German translation",
    "zh": "Chinese translation",
    "ko": "Korean translation",
    "it": "Italian translation"
  },
  "multilingualExamples": {
    "es": "Spanish example sentence",
    "fr": "French example sentence",
    "de": "German example sentence",
    "zh": "Chinese example sentence",
    "ko": "Korean example sentence",
    "it": "Italian example sentence"
  },
  "conjugations": {} // if it's a verb, include conjugation information
}

IMPORTANT: 
- Detect the source language of "${word}" automatically
- Provide accurate translations in all languages
- If the word is a verb, include conjugation information
- Make example sentences natural and educational
- Ensure all JSON fields are properly filled
`;

      const response = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a multilingual language learning assistant. Always respond with valid JSON containing comprehensive word information.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama3-8b-8192',
        temperature: 0.3,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from Groq API');
      }

      console.log('[Groq Service] Raw response:', content);

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

        const parsedContent = JSON.parse(cleanContent);
        console.log('[Groq Service] Parsed response:', parsedContent);
        return parsedContent;
      } catch (parseError) {
        console.error('Failed to parse JSON response:', content);
        console.error('Parse error:', parseError);
        
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/); 
        if (jsonMatch) {
          try {
            const extracted = JSON.parse(jsonMatch[0]);
            console.log('[Groq Service] Extracted JSON:', extracted);
            return extracted;
          } catch (e) {
            console.error('Failed to parse extracted JSON:', e);
          }
        }
        
        throw new Error('Invalid JSON response from AI service');
      }
    } catch (error) {
      console.error('Error generating flashcard content:', error);
      throw error;
    }
  }
}