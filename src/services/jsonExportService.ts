import { Word, VocabularyFile } from '../types';

// 単語情報をJSONファイルとしてエクスポート
export const exportWordToJSON = (word: Word, fileName?: string): void => {
  const jsonData = {
    word: word.word,
    id: word.id,
    createdAt: word.createdAt,
    aiGenerated: word.aiGenerated
  };

  const jsonString = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `word_${word.word}_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 単語帳全体をJSONファイルとしてエクスポート
export const exportVocabularyFileToJSON = (vocabularyFile: VocabularyFile): void => {
  const jsonData = {
    vocabularyFile: {
      id: vocabularyFile.id,
      name: vocabularyFile.name,
      createdAt: vocabularyFile.createdAt,
      words: vocabularyFile.words.map(word => ({
        word: word.word,
        id: word.id,
        createdAt: word.createdAt,
        aiGenerated: word.aiGenerated
      }))
    },
    exportedAt: new Date().toISOString(),
    format: 'AI_Flash_Card_JSON_v1.0'
  };

  const jsonString = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `vocabulary_${vocabularyFile.name}_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 複数の単語をバッチでJSONファイルとしてエクスポート
export const exportMultipleWordsToJSON = (words: Word[], fileName?: string): void => {
  const jsonData = {
    words: words.map(word => ({
      word: word.word,
      id: word.id,
      createdAt: word.createdAt,
      aiGenerated: word.aiGenerated
    })),
    exportedAt: new Date().toISOString(),
    format: 'AI_Flash_Card_Words_JSON_v1.0',
    count: words.length
  };

  const jsonString = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `words_batch_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// JSONファイルから単語データをインポート
export const importWordsFromJSON = (file: File): Promise<Word[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const jsonData = JSON.parse(jsonString);
        
        let words: Word[] = [];
        
        // 単一単語の場合
        if (jsonData.word && jsonData.id) {
          words = [jsonData];
        }
        // バッチ単語の場合
        else if (jsonData.words && Array.isArray(jsonData.words)) {
          words = jsonData.words;
        }
        // 単語帳ファイルの場合
        else if (jsonData.vocabularyFile && jsonData.vocabularyFile.words) {
          words = jsonData.vocabularyFile.words;
        }
        else {
          throw new Error('Invalid JSON format');
        }
        
        resolve(words);
      } catch (error) {
        reject(new Error('Failed to parse JSON file: ' + error));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

// Gemma 3nが生成した単語情報をきれいにフォーマットしたJSONで保存
export const exportAIGeneratedWordInfo = (word: Word, fileName?: string): void => {
  if (!word.aiGenerated) {
    throw new Error('Word does not have AI generated information');
  }

  const formattedData = {
    metadata: {
      word: word.word,
      generatedAt: word.createdAt,
      generator: 'Gemma 3n via Ollama',
      version: '1.0'
    },
    content: {
      basic: {
        englishEquivalent: word.aiGenerated.englishEquivalent,
        japaneseEquivalent: word.aiGenerated.japaneseEquivalent,
        pronunciation: word.aiGenerated.pronunciation,
        wordClass: word.aiGenerated.wordClass
      },
      examples: {
        english: word.aiGenerated.exampleSentence,
        japanese: word.aiGenerated.japaneseExample,
        englishUsage: word.aiGenerated.englishExample
      },
      advanced: {
        usageNotes: word.aiGenerated.usageNotes,
        tenseInfo: word.aiGenerated.tenseInfo,
        additionalInfo: word.aiGenerated.additionalInfo
      },
      multilingual: {
        translations: word.aiGenerated.translations,
        examples: word.aiGenerated.multilingualExamples
      }
    }
  };

  const jsonString = JSON.stringify(formattedData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `ai_word_${word.word}_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};