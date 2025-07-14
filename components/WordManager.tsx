import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Search, BookOpen, Download, FileText, Brain, Loader2, Languages, Trash2, Settings, EyeOff, RefreshCw } from 'lucide-react';
import { VocabularyFile, Word, ColorTheme, supportedLanguages, LearningStatus } from '@/types';
import { UserMenu } from './UserMenu';
import { generateWordInfo, checkSpelling } from '@/services/aiService';
import { aiWordInfoCache } from '@/services/aiCacheService';
import { getWordSuggestions } from '@/services/wordSuggestionService';
import { addWordToFile, deleteWordFromFile, updateVocabularyFile } from '@/services/localStorageService';
import { ThemeSelector } from './ThemeSelector';
import { SpeechButton } from './SpeechButton';
import { 
  exportWordToJSON, 
  exportVocabularyFileToJSON, 
  exportMultipleWordsToJSON, 
  exportAIGeneratedWordInfo 
} from '@/services/jsonExportService';
import { useDebounce } from '@/hooks/useDebounce';
import { WordDetailModal } from './WordDetailModal';
import { SpellingSuggestions } from './SpellingSuggestions';
import { useSettings } from '@/hooks/useSettings';
import { LearningStatusFilter } from './LearningStatusFilter';

interface WordManagerProps {
  file: VocabularyFile;
  onBack: () => void;
  onUpdateFile: (file: VocabularyFile) => void;
  onStartFlashcards: () => void;
  onStartVerbConjugation?: () => void;
  currentTheme: ColorTheme;
  availableThemes: ColorTheme[];
  onThemeChange: (themeId: string) => void;
  currentUser?: { email?: string; id: string } | null;
  onSignOut?: () => void;
}

// 動的ローディングメッセージ定数
const LOADING_MESSAGES = [
  'AIが思考中...',
  '情報を整理中...',
  '詳細な分析中...',
  'もう少しお待ちください...'
];

export const WordManager: React.FC<WordManagerProps> = ({
  file,
  onBack,
  onUpdateFile,
  onStartFlashcards,
  onStartVerbConjugation,
  currentTheme,
  availableThemes,
  onThemeChange,
  currentUser,
  onSignOut
}) => {
  const [newWord, setNewWord] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingWords, setLoadingWords] = useState<Set<string>>(new Set());
  const [loadingTexts, setLoadingTexts] = useState<Record<string, string>>({});
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<LearningStatus[]>(['not_started', 'uncertain', 'forgot']);
  
  // ファイルの状態をログに出力
  useEffect(() => {
    console.log('[DEBUG WordManager] File prop updated:', {
      fileId: file.id,
      fileName: file.name,
      wordCount: file.words.length,
      words: file.words.map(w => ({ id: w.id, word: w.word }))
    });
  }, [file]);
  
  // 設定メニューの外側をクリックしたときに閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.settings-menu') && !target.closest('button[title="設定"]')) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isSettingsOpen]);
  
  // 設定フックを使用
  const { settings, setSetting } = useSettings();
  
  // サジェスチョン機能の状態
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  // スペルチェック機能の状態
  const [spellingSuggestions, setSpellingSuggestions] = useState<string[]>([]);
  const [showSpellingSuggestions, setShowSpellingSuggestions] = useState(false);
  
  // Refs
  const suggestionListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // デバウンスされた入力値
  const debouncedWord = useDebounce(newWord, 300);
  
  // 詳細モーダルの状態
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // 削除確認ダイアログの状態
  const [wordToDelete, setWordToDelete] = useState<Word | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 動的ローディングテキスト管理
  useEffect(() => {
    const intervals: Record<string, NodeJS.Timeout> = {};
    
    loadingWords.forEach((wordId) => {
      if (!intervals[wordId]) {
        let messageIndex = 0;
        setLoadingTexts(prev => ({ ...prev, [wordId]: LOADING_MESSAGES[0] }));
        
        intervals[wordId] = setInterval(() => {
          messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
          setLoadingTexts(prev => ({ ...prev, [wordId]: LOADING_MESSAGES[messageIndex] }));
        }, 2000);
      }
    });

    // クリーンアップ：ローディング完了した単語のインターバルを削除
    Object.keys(intervals).forEach(wordId => {
      if (!loadingWords.has(wordId)) {
        clearInterval(intervals[wordId]);
        delete intervals[wordId];
        setLoadingTexts(prev => {
          const newTexts = { ...prev };
          delete newTexts[wordId];
          return newTexts;
        });
      }
    });

    return () => {
      Object.values(intervals).forEach(clearInterval);
    };
  }, [loadingWords]);

  // サジェスチョンの取得
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedWord.trim() || !file.targetLanguage || !settings.showSuggestions) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoadingSuggestions(true);
      setShowSuggestions(true);
      
      try {
        const suggestionList = await getWordSuggestions(debouncedWord, file.targetLanguage);
        setSuggestions(suggestionList);
        setSelectedSuggestionIndex(-1);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [debouncedWord, file.targetLanguage, settings.showSuggestions]);
  
  // スペルチェック機能
  useEffect(() => {
    const checkSpellingAsync = async () => {
      if (!debouncedWord.trim() || debouncedWord.length < 3 || !settings.showSpellingSuggestions) {
        setSpellingSuggestions([]);
        setShowSpellingSuggestions(false);
        return;
      }

      // 日本語、中国語、韓国語の場合はスペルチェックをスキップ
      if (file.targetLanguage && ['ja', 'zh', 'ko'].includes(file.targetLanguage)) {
        return;
      }

      try {
        const spellingResults = await checkSpelling(debouncedWord);
        // 現在の単語と異なる提案のみ表示
        const filteredSuggestions = spellingResults.filter(
          s => s.toLowerCase() !== debouncedWord.toLowerCase()
        );
        setSpellingSuggestions(filteredSuggestions);
        setShowSpellingSuggestions(filteredSuggestions.length > 0);
      } catch (error) {
        console.error('Failed to check spelling:', error);
        setSpellingSuggestions([]);
        setShowSpellingSuggestions(false);
      }
    };

    checkSpellingAsync();
  }, [debouncedWord, file.targetLanguage, settings.showSpellingSuggestions]);

  const handleStatusToggle = (status: LearningStatus) => {
    setSelectedStatuses(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  const getFilteredWords = (): Word[] => {
    if (selectedStatuses.length === 0) return [];
    
    return file.words.filter(word => {
      const status = word.learningStatus || 'not_started';
      return selectedStatuses.includes(status);
    });
  };

  const getStatusCount = (status: LearningStatus): number => {
    return file.words.filter(word => (word.learningStatus || 'not_started') === status).length;
  };

  const handleStartFilteredFlashcards = () => {
    if (selectedStatuses.length === 0) {
      alert('少なくとも1つの学習状況を選択してください');
      return;
    }
    
    const filteredWords = getFilteredWords();
    if (filteredWords.length === 0) {
      alert('選択した条件に該当する単語がありません');
      return;
    }
    
    // フィルタリングされた単語でフラッシュカードを開始
    // 一時的にfileオブジェクトを更新してフィルタリングされた単語だけを含むようにする
    const filteredFile = {
      ...file,
      words: filteredWords,
      isFiltered: true, // フィルタリングされていることを示すフラグ
    };
    
    // フィルタリングされたファイルを更新
    onUpdateFile(filteredFile);
    
    setShowFilterDialog(false);
    // 少し遅延を入れてからフラッシュカードを開始（状態更新を待つため）
    setTimeout(() => {
      onStartFlashcards();
    }, 100);
  };

  const handleAddWord = async () => {
    if (!newWord.trim()) return;

    console.log('[DEBUG] handleAddWord started with word:', newWord.trim());

    const wordToAdd = newWord.trim();
    const tempId = Date.now().toString();
    const tempWord: Word = {
      id: tempId,
      word: wordToAdd,
      createdAt: new Date()
    };

    console.log('[DEBUG] Created temp word with ID:', tempId);

    // すぐにinputをクリア
    setNewWord('');
    setIsAdding(false);

    // まず単語をリストに追加（ローディング状態で表示）
    const updatedFileWithLoading = {
      ...file,
      words: [...file.words, tempWord]
    };
    onUpdateFile(updatedFileWithLoading);

    // ローディング状態を設定
    setLoadingWords(prev => new Set([...prev, tempId]));
    console.log('[DEBUG] Set loading state for word ID:', tempId);
    
    try {
      // AI情報を生成
      console.log('[DEBUG] Generating AI info...');
      const aiInfo = await generateWordInfo(wordToAdd, file.targetLanguage);
      console.log('[DEBUG] AI info generated:', aiInfo);
      tempWord.aiGenerated = aiInfo;
      
      // LocalStorageに保存
      console.log('[DEBUG] Saving to LocalStorage...');
      const savedWord = await addWordToFile(file.id, tempWord);
      console.log('[DEBUG] Saved word with new ID:', savedWord.id, 'original tempId:', tempId);
      
      // 保存された単語で更新（tempIdではなく、新しく追加された単語として扱う）
      const updatedFileWithAI = {
        ...file,
        words: file.words.filter(w => w.id !== tempId).concat(savedWord)
      };
      console.log('[DEBUG] Updated words list, total words:', updatedFileWithAI.words.length);
      onUpdateFile(updatedFileWithAI);
    } catch (error) {
      console.error('[DEBUG] Failed to add word:', error);
      // エラー時は一時的な単語を削除
      const revertedFile = {
        ...file,
        words: file.words.filter(w => w.id !== tempId)
      };
      onUpdateFile(revertedFile);
      
      // エラーメッセージを表示（aiServiceから返されるユーザーフレンドリーなメッセージを使用）
      let errorMessage = '単語の追加に失敗しました。';
      if (error instanceof Error) {
        // aiServiceから返されるエラーメッセージをそのまま使用
        errorMessage = error.message;
      }
      alert(errorMessage);
    }

    // ローディング状態を解除
    setLoadingWords(prev => {
      const newSet = new Set(prev);
      newSet.delete(tempId);
      console.log('[DEBUG] Removed loading state for word ID:', tempId);
      return newSet;
    });
    console.log('[DEBUG] handleAddWord completed');
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setNewWord(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedSuggestionIndex >= 0) {
            handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
          } else {
            handleAddWord();
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          break;
        default:
          break;
      }
    } else {
      if (e.key === 'Enter') {
        handleAddWord();
      } else if (e.key === 'Escape') {
        setIsAdding(false);
        setNewWord('');
      }
    }
  };

  console.log('[DEBUG WordManager] Current file words:', file.words.length, file.words);
  const filteredWords = file.words.filter(word =>
    word.word.toLowerCase().includes(searchTerm.toLowerCase())
  );
  console.log('[DEBUG WordManager] Filtered words:', filteredWords.length);

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

  const handleShowWordDetail = (word: Word) => {
    setSelectedWord(word);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedWord(null);
  };

  const handleDeleteWord = (word: Word) => {
    setWordToDelete(word);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteWord = async () => {
    if (!wordToDelete) return;

    setIsDeleting(true);
    try {
      await deleteWordFromFile(file.id, wordToDelete.id);
      
      // UIからも削除
      const updatedFile = {
        ...file,
        words: file.words.filter(w => w.id !== wordToDelete.id)
      };
      onUpdateFile(updatedFile);
      
      setIsDeleteDialogOpen(false);
      setWordToDelete(null);
    } catch (error) {
      console.error('Failed to delete word:', error);
      alert('単語の削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteWord = () => {
    setIsDeleteDialogOpen(false);
    setWordToDelete(null);
  };

  // 単語情報を再生成
  const handleRegenerateWordInfo = async (word: Word) => {
    console.log('[DEBUG] Regenerating word info for:', word.word);
    console.log('[DEBUG] Word object:', word);
    console.log('[DEBUG] Current loadingWords:', loadingWords);
    
    // ローディング状態を設定
    setLoadingWords(prev => new Set([...prev, word.id]));
    setLoadingTexts(prev => ({ ...prev, [word.id]: 'AI情報を再生成中...' }));
    
    try {
      // キャッシュから削除して強制的に再生成
      console.log('[DEBUG] Clearing cache for word:', word.word);
      aiWordInfoCache.delete(word.word);
      
      console.log('[DEBUG] Calling generateWordInfo...');
      // AI情報を再生成
      const aiInfo = await generateWordInfo(word.word, file.targetLanguage);
      console.log('[DEBUG] Regenerated AI info:', aiInfo);
      
      // 単語情報を更新
      const updatedWord = { ...word, aiGenerated: aiInfo };
      const updatedFile = {
        ...file,
        words: file.words.map(w => w.id === word.id ? updatedWord : w)
      };
      
      console.log('[DEBUG] Updating file...');
      // ファイルを更新
      await updateVocabularyFile(updatedFile);
      onUpdateFile(updatedFile);
      
      console.log('[DEBUG] Word info regenerated successfully');
    } catch (error) {
      console.error('[DEBUG] Failed to regenerate word info:', error);
      let errorMessage = '単語情報の再生成に失敗しました。';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(errorMessage);
    } finally {
      // ローディング状態を解除
      setLoadingWords(prev => {
        const newSet = new Set(prev);
        newSet.delete(word.id);
        console.log('[DEBUG] Updated loadingWords after removal:', newSet);
        return newSet;
      });
      setLoadingTexts(prev => {
        const newTexts = { ...prev };
        delete newTexts[word.id];
        return newTexts;
      });
    }
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
              {/* 設定メニュー */}
              <div className="relative">
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-all duration-200 hover:scale-105"
                  title="設定"
                >
                  <Settings size={20} />
                </button>
                
                {isSettingsOpen && (
                  <div className="settings-menu absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-4">入力補助設定</h3>
                      
                      <div className="space-y-3">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-gray-700">変換候補を表示</span>
                          <button
                            onClick={() => setSetting('showSuggestions', !settings.showSuggestions)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.showSuggestions ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.showSuggestions ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </label>
                        
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-gray-700">スペル補正を表示</span>
                          <button
                            onClick={() => setSetting('showSpellingSuggestions', !settings.showSpellingSuggestions)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings.showSpellingSuggestions ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.showSpellingSuggestions ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </label>
                      </div>
                      
                      <div className="mt-4 text-sm text-gray-500">
                        <p>• 変換候補: 単語を入力中に類似の単語を表示</p>
                        <p>• スペル補正: スペルミスの可能性がある場合に修正候補を表示</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <ThemeSelector
                currentTheme={currentTheme}
                availableThemes={availableThemes}
                onThemeChange={onThemeChange}
                isOpen={isThemeSelectorOpen}
                onToggle={() => setIsThemeSelectorOpen(!isThemeSelectorOpen)}
              />
              
              {currentUser && onSignOut && (
                <UserMenu user={currentUser} onSignOut={onSignOut} />
              )}
              
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
                onClick={() => setShowFilterDialog(true)}
                disabled={file.words.length === 0}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed"
              >
                <BookOpen size={20} />
                学習開始
              </button>
              
              {onStartVerbConjugation && (
                <button
                  onClick={onStartVerbConjugation}
                  disabled={!file.words.some(w => w.aiGenerated?.wordClass === 'verb')}
                  className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed"
                  title="動詞の活用形を集中的に練習"
                >
                  <Brain size={20} />
                  動詞活用練習
                </button>
              )}
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
              <div className="relative">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onFocus={() => debouncedWord && setShowSuggestions(true)}
                    placeholder="新しい単語を入力..."
                    className="flex-1 p-3 bg-white/20 text-white placeholder-white/70 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                    autoFocus
                  />
                  {file.targetLanguage && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
                      <Languages className="text-white/70" size={18} />
                      <span className="text-white/80 text-sm font-medium">
                        {supportedLanguages[file.targetLanguage]}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* 設定状態の表示 */}
                {!settings.showSuggestions && !settings.showSpellingSuggestions && (
                  <div className="mt-2 text-white/60 text-sm flex items-center gap-2">
                    <EyeOff size={14} />
                    <span>入力補助がオフになっています</span>
                  </div>
                )}
                
                {/* スペル補完 */}
                <SpellingSuggestions
                  suggestions={spellingSuggestions}
                  onSelectSuggestion={(suggestion) => {
                    setNewWord(suggestion);
                    setShowSpellingSuggestions(false);
                    inputRef.current?.focus();
                  }}
                  isVisible={showSpellingSuggestions && !showSuggestions}
                  currentWord={newWord}
                />
                
                {/* サジェスチョンドロップダウン */}
                {showSuggestions && (
                  <div
                    ref={suggestionListRef}
                    className="absolute z-10 right-0 w-72 max-w-sm mt-2 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-white/20 overflow-hidden max-h-96 overflow-y-auto"
                  >
                    {isLoadingSuggestions ? (
                      <div className="p-4 flex items-center justify-center text-gray-600">
                        <Loader2 className="animate-spin mr-2" size={16} />
                        <span>翻訳・補完候補を取得中...</span>
                      </div>
                    ) : suggestions.length > 0 ? (
                      <ul className="py-2">
                        {suggestions.map((suggestion, index) => (
                          <li
                            key={index}
                            className={`px-4 py-2 cursor-pointer transition-colors ${
                              index === selectedSuggestionIndex
                                ? 'bg-blue-500 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            onMouseEnter={() => setSelectedSuggestionIndex(index)}
                          >
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        候補が見つかりませんでした
                      </div>
                    )}
                  </div>
                )}
              </div>
              
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
                    setShowSuggestions(false);
                    setSuggestions([]);
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
                className={`bg-white/20 backdrop-blur-sm rounded-xl p-6 hover:bg-white/30 transition-all duration-200 hover:scale-105 cursor-pointer ${
                  selectedWords.has(word.id) ? 'ring-2 ring-blue-400' : ''
                }`}
                onClick={(e) => {
                  // チェックボックスやボタンをクリックした場合は詳細表示しない
                  const target = e.target as HTMLElement;
                  if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) {
                    return;
                  }
                  handleShowWordDetail(word);
                }}
              >
                {loadingWords.has(word.id) ? (
                  <div className="flex flex-col items-center justify-center h-32 bg-gradient-to-br from-purple-400/20 to-blue-500/20 rounded-lg backdrop-blur-sm">
                    <div className="relative mb-3">
                      <Brain className="h-10 w-10 text-white animate-pulse" />
                      <div className="absolute inset-0 h-10 w-10">
                        <Brain className="h-10 w-10 text-blue-300 animate-ping opacity-30" />
                      </div>
                    </div>
                    <span className="text-white font-medium text-sm animate-pulse">
                      {loadingTexts[word.id] || 'AIが思考中...'}
                    </span>
                    <div className="mt-2 w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                    </div>
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
                        <SpeechButton text={word.word} language={file.targetLanguage} size={18} />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWord(word);
                          }}
                          className="bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-lg transition-all duration-200 hover:scale-105"
                          title="この単語を削除"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportSingleWord(word);
                          }}
                          className="bg-white/20 hover:bg-white/30 text-white p-1 rounded-lg transition-all duration-200 hover:scale-105"
                          title="この単語をJSONでエクスポート"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            console.log('[DEBUG] Regenerate button clicked!');
                            console.log('[DEBUG] Event:', e);
                            console.log('[DEBUG] Word:', word);
                            e.stopPropagation();
                            e.preventDefault();
                            handleRegenerateWordInfo(word);
                          }}
                          className="bg-blue-500/80 hover:bg-blue-600 text-white p-1 rounded-lg transition-all duration-200 hover:scale-105"
                          title="AI情報を再生成"
                          disabled={loadingWords.has(word.id)}
                        >
                          <RefreshCw size={16} className={loadingWords.has(word.id) ? 'animate-spin' : ''} />
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
      
      {/* 単語詳細モーダル */}
      {selectedWord && (
        <WordDetailModal
          word={selectedWord}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          onRegenerate={() => handleRegenerateWordInfo(selectedWord)}
          isRegenerating={loadingWords.has(selectedWord.id)}
          targetLanguage={file.targetLanguage}
          onUpdateWord={async (updatedWord) => {
            // 単語情報を更新
            const updatedFile = {
              ...file,
              words: file.words.map(w => w.id === updatedWord.id ? updatedWord : w)
            };
            
            // ローカルストレージに保存
            await updateVocabularyFile(updatedFile);
            onUpdateFile(updatedFile);
          }}
        />
      )}
      
      {/* 削除確認ダイアログ */}
      {isDeleteDialogOpen && wordToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">単語の削除確認</h3>
            <p className="text-gray-700 mb-6">
              「<span className="font-semibold text-red-600">{wordToDelete.word}</span>」を削除してもよろしいですか？
              <br />
              この操作は取り消せません。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDeleteWord}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={confirmDeleteWord}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    削除中...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    削除する
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 学習フィルタリングダイアログ */}
      {showFilterDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">学習する単語を選択</h2>
            
            <LearningStatusFilter
              selectedStatuses={selectedStatuses}
              onStatusToggle={handleStatusToggle}
              getStatusCount={getStatusCount}
            />
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowFilterDialog(false)}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-lg transition-all duration-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleStartFilteredFlashcards}
                disabled={selectedStatuses.length === 0}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 disabled:cursor-not-allowed"
              >
                <BookOpen size={20} />
                学習開始（{getFilteredWords().length}単語）
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* APIステータスインジケーター */}
    </div>
  );
};