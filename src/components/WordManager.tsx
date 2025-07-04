import React, { useState } from 'react';
import { ArrowLeft, Plus, Search, BookOpen, Download, FileText } from 'lucide-react';
import { VocabularyFile, Word, ColorTheme } from '../types';
import { generateWordInfo } from '../services/aiService';
import { ThemeSelector } from './ThemeSelector';
import { SpeechButton } from './SpeechButton';
import { 
  exportWordToJSON, 
  exportVocabularyFileToJSON, 
  exportMultipleWordsToJSON, 
  exportAIGeneratedWordInfo 
} from '../services/jsonExportService';

interface WordManagerProps {
  file: VocabularyFile;
  onBack: () => void;
  onUpdateFile: (file: VocabularyFile) => void;
  onStartFlashcards: () => void;
  currentTheme: ColorTheme;
  availableThemes: ColorTheme[];
  onThemeChange: (themeId: string) => void;
}

export const WordManager: React.FC<WordManagerProps> = ({
  file,
  onBack,
  onUpdateFile,
  onStartFlashcards,
  currentTheme,
  availableThemes,
  onThemeChange
}) => {
  const [newWord, setNewWord] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingWords, setLoadingWords] = useState<Set<string>>(new Set());
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleAddWord = async () => {
    if (!newWord.trim()) return;

    const word: Word = {
      id: Date.now().toString(),
      word: newWord.trim(),
      createdAt: new Date()
    };

    setLoadingWords(prev => new Set([...prev, word.id]));
    
    try {
      const aiInfo = await generateWordInfo(newWord.trim());
      word.aiGenerated = aiInfo;
    } catch (error) {
      console.error('Failed to generate AI info:', error);
    }

    setLoadingWords(prev => {
      const newSet = new Set(prev);
      newSet.delete(word.id);
      return newSet;
    });

    const updatedFile = {
      ...file,
      words: [...file.words, word]
    };

    onUpdateFile(updatedFile);
    setNewWord('');
    setIsAdding(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddWord();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewWord('');
    }
  };

  const filteredWords = file.words.filter(word =>
    word.word.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getWordClassColor = (wordClass: string) => {
    switch (wordClass) {
      case 'noun': return 'bg-blue-100 text-blue-800';
      case 'verb': return 'bg-green-100 text-green-800';
      case 'adjective': return 'bg-purple-100 text-purple-800';
      case 'adverb': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExportAll = () => {
    exportVocabularyFileToJSON(file);
    setIsExportMenuOpen(false);
  };

  const handleExportSelected = () => {
    const wordsToExport = file.words.filter(word => selectedWords.has(word.id));
    if (wordsToExport.length > 0) {
      exportMultipleWordsToJSON(wordsToExport);
    }
    setIsExportMenuOpen(false);
  };

  const handleExportSingleWord = (word: Word) => {
    if (word.aiGenerated) {
      exportAIGeneratedWordInfo(word);
    } else {
      exportWordToJSON(word);
    }
  };

  const toggleWordSelection = (wordId: string) => {
    setSelectedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  const selectAllWords = () => {
    setSelectedWords(new Set(filteredWords.map(word => word.id)));
  };

  const deselectAllWords = () => {
    setSelectedWords(new Set());
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.wordManager} p-4`}>
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-3xl font-bold text-white">{file.name}</h1>
              <span className="text-white/70">({file.words.length} 単語)</span>
            </div>
            <div className="flex gap-3">
              <ThemeSelector
                currentTheme={currentTheme}
                availableThemes={availableThemes}
                onThemeChange={onThemeChange}
                isOpen={isThemeSelectorOpen}
                onToggle={() => setIsThemeSelectorOpen(!isThemeSelectorOpen)}
              />
              
              {/* JSONエクスポートメニュー */}
              <div className="relative">
                <button
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  disabled={file.words.length === 0}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed"
                >
                  <Download size={20} />
                  JSONエクスポート
                </button>
                
                {isExportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
                    <div className="p-2">
                      <button
                        onClick={handleExportAll}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg flex items-center gap-2 text-gray-700"
                      >
                        <FileText size={16} />
                        全単語帳をエクスポート
                      </button>
                      <button
                        onClick={handleExportSelected}
                        disabled={selectedWords.size === 0}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg flex items-center gap-2 text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <FileText size={16} />
                        選択した単語をエクスポート ({selectedWords.size})
                      </button>
                      <hr className="my-2" />
                      <button
                        onClick={selectAllWords}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-700 text-sm"
                      >
                        全て選択
                      </button>
                      <button
                        onClick={deselectAllWords}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-700 text-sm"
                      >
                        選択解除
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={onStartFlashcards}
                disabled={file.words.length === 0}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed"
              >
                <BookOpen size={20} />
                学習開始
              </button>
              <button
                onClick={() => setIsAdding(true)}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 hover:scale-105"
              >
                <Plus size={20} />
                単語追加
              </button>
            </div>
          </div>

          {isAdding && (
            <div className="mb-6 p-4 bg-white/20 rounded-lg backdrop-blur-sm">
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="新しい単語を入力..."
                className="w-full p-3 bg-white/20 text-white placeholder-white/70 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                autoFocus
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAddWord}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  追加
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewWord('');
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="単語を検索..."
                className="w-full pl-10 p-3 bg-white/20 text-white placeholder-white/70 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredWords.map((word) => (
              <div
                key={word.id}
                className={`bg-white/20 backdrop-blur-sm rounded-xl p-6 hover:bg-white/30 transition-all duration-200 hover:scale-105 ${
                  selectedWords.has(word.id) ? 'ring-2 ring-blue-400' : ''
                }`}
              >
                {loadingWords.has(word.id) ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    <span className="ml-2 text-white">AI分析中...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedWords.has(word.id)}
                          onChange={() => toggleWordSelection(word.id)}
                          className="w-4 h-4 text-blue-600 bg-white/20 border-white/40 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <h3 className="text-white font-bold text-xl">{word.word}</h3>
                        <SpeechButton text={word.word} language="en" size={18} />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleExportSingleWord(word)}
                          className="bg-white/20 hover:bg-white/30 text-white p-1 rounded-lg transition-all duration-200 hover:scale-105"
                          title="この単語をJSONでエクスポート"
                        >
                          <Download size={16} />
                        </button>
                        {word.aiGenerated && (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getWordClassColor(word.aiGenerated.wordClass)}`}>
                            {word.aiGenerated.wordClass}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {word.aiGenerated && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-white/90 text-sm flex-1">
                            <span className="font-semibold">英語:</span> {word.aiGenerated.englishEquivalent}
                          </p>
                          <SpeechButton text={word.aiGenerated.englishEquivalent} language="en" size={14} />
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-white/90 text-sm flex-1">
                            <span className="font-semibold">日本語:</span> {word.aiGenerated.japaneseEquivalent}
                          </p>
                          <SpeechButton text={word.aiGenerated.japaneseEquivalent} language="ja" size={14} />
                        </div>
                        <p className="text-white/70 text-sm">
                          <span className="font-semibold">発音:</span> {word.aiGenerated.pronunciation}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {filteredWords.length === 0 && !isAdding && (
            <div className="text-center py-12">
              <BookOpen className="mx-auto text-white/60 mb-4" size={48} />
              <p className="text-white/80 text-lg">
                {searchTerm ? '検索結果が見つかりません' : 'まだ単語がありません'}
              </p>
              <p className="text-white/60">
                {searchTerm ? '別のキーワードで検索してください' : '単語追加ボタンから始めましょう'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};