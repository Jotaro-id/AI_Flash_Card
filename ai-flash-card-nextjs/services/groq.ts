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
Create a flashcard for the word "${word}"${context ? ` in the context of: ${context}` : ''}${difficulty ? ` at ${difficulty} difficulty level` : ''}.

Return the flashcard content in JSON format:
{
  "front": "front side content",
  "back": "back side content",
  "hints": ["hint1", "hint2"],
  "difficulty": "beginner/intermediate/advanced",
  "category": "word category"
}

Make the flashcard engaging and educational for language learners.
`;

      const response = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful language learning assistant that creates effective flashcards.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama3-8b-8192',
        temperature: 0.3,
        max_tokens: 800,
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
      console.error('Error generating flashcard content:', error);
      throw error;
    }
  }
}