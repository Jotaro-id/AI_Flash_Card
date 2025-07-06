import React, { useState, useEffect } from 'react';
import { FileManager } from './components/FileManager';
import { WordManager } from './components/WordManager';
import { Flashcard } from './components/Flashcard';
import { Auth } from './components/Auth';
import { VocabularyFile, SupportedLanguage } from './types';
import { useTheme } from './hooks/useTheme';
import { supabase } from './lib/supabase';
import { 
  fetchVocabularyFiles, 
  createVocabularyFile, 
  deleteVocabularyFile, 
  updateVocabularyFile,
  migrateFromLocalStorage,
  signOut 
} from './services/supabaseService';

type AppState = 'file-manager' | 'word-manager' | 'flashcards';

function App() {
  console.log('App component rendering...');
  console.log('Environment check - VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Not set');
  console.log('Environment check - VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set');
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<VocabularyFile[]>([]);
  const [currentFile, setCurrentFile] = useState<VocabularyFile | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [appState, setAppState] = useState<AppState>('file-manager');
  const { currentTheme, setTheme, availableThemes } = useTheme();

  // 認証状態をチェック
  useEffect(() => {
    console.log('App component mounted. Starting auth check...');
    const checkAuth = async () => {
      try {
        console.log('Checking Supabase session...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session check result:', session);
        if (session) {
          setIsAuthenticated(true);
          await loadVocabularyFiles();
          // ローカルストレージからのデータ移行を試みる
          await migrateFromLocalStorage();
        } else {
          console.log('No session found. User needs to authenticate.');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('認証チェックエラー:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
      } finally {
        console.log('Finished auth check. Setting isLoading to false.');
        setIsLoading(false);
      }
    };

    checkAuth();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        await loadVocabularyFiles();
        await migrateFromLocalStorage();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setFiles([]);
        setCurrentFile(null);
        setAppState('file-manager');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Supabaseから単語帳を読み込む
  const loadVocabularyFiles = async () => {
    try {
      const loadedFiles = await fetchVocabularyFiles();
      setFiles(loadedFiles);
    } catch (error) {
      console.error('単語帳の読み込みエラー:', error);
    }
  };

  const handleCreateFile = async (name: string, targetLanguage?: SupportedLanguage) => {
    try {
      const newFile = await createVocabularyFile(name, targetLanguage || 'en');
      setFiles([...files, newFile]);
    } catch (error) {
      console.error('単語帳作成エラー:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      alert(`単語帳の作成に失敗しました: ${error instanceof Error ? error.message : 'エラーが発生しました'}`);
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      await deleteVocabularyFile(id);
      setFiles(files.filter(file => file.id !== id));
    } catch (error) {
      console.error('単語帳削除エラー:', error);
      alert('単語帳の削除に失敗しました');
    }
  };

  const handleSelectFile = (file: VocabularyFile) => {
    setCurrentFile(file);
    setAppState('word-manager');
  };

  const handleUpdateFile = async (updatedFile: VocabularyFile) => {
    try {
      await updateVocabularyFile(updatedFile);
      setFiles(files.map(file => 
        file.id === updatedFile.id ? updatedFile : file
      ));
      setCurrentFile(updatedFile);
    } catch (error) {
      console.error('単語帳更新エラー:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('サインアウトエラー:', error);
    }
  };

  const handleStartFlashcards = () => {
    setCurrentWordIndex(0);
    setAppState('flashcards');
  };

  const handleNextWord = () => {
    if (currentFile && currentWordIndex < currentFile.words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      setCurrentWordIndex(0);
    }
  };

  const handlePreviousWord = () => {
    if (currentFile && currentWordIndex > 0) {
      setCurrentWordIndex(currentWordIndex - 1);
    } else if (currentFile) {
      setCurrentWordIndex(currentFile.words.length - 1);
    }
  };

  const handleShuffleWords = () => {
    if (currentFile) {
      const shuffledWords = [...currentFile.words].sort(() => Math.random() - 0.5);
      const shuffledFile = { ...currentFile, words: shuffledWords };
      handleUpdateFile(shuffledFile);
      setCurrentWordIndex(0);
    }
  };

  const handleBackToWordManager = () => {
    setAppState('word-manager');
  };

  const handleBackToFileManager = () => {
    setAppState('file-manager');
    setCurrentFile(null);
  };

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.loading} flex items-center justify-center`}>
        <div className="text-white text-center">
          <h1 className="text-3xl font-bold mb-4">AI単語帳</h1>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未認証の場合は認証画面を表示
  if (!isAuthenticated) {
    return <Auth onSuccess={() => setIsAuthenticated(true)} />;
  }

  if (appState === 'file-manager') {
    return (
      <FileManager
        files={files}
        onCreateFile={handleCreateFile}
        onDeleteFile={handleDeleteFile}
        onSelectFile={handleSelectFile}
        onSignOut={handleSignOut}
        currentTheme={currentTheme}
        availableThemes={availableThemes}
        onThemeChange={setTheme}
      />
    );
  }

  if (appState === 'word-manager' && currentFile) {
    return (
      <WordManager
        file={currentFile}
        onBack={handleBackToFileManager}
        onUpdateFile={handleUpdateFile}
        onStartFlashcards={handleStartFlashcards}
        currentTheme={currentTheme}
        availableThemes={availableThemes}
        onThemeChange={setTheme}
      />
    );
  }

  if (appState === 'flashcards' && currentFile && currentFile.words.length > 0) {
    return (
      <Flashcard
        word={currentFile.words[currentWordIndex]}
        currentIndex={currentWordIndex}
        totalWords={currentFile.words.length}
        onNext={handleNextWord}
        onPrevious={handlePreviousWord}
        onShuffle={handleShuffleWords}
        onBack={handleBackToWordManager}
        currentTheme={currentTheme}
        availableThemes={availableThemes}
        onThemeChange={setTheme}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.loading} flex items-center justify-center`}>
      <div className="text-white text-center">
        <h1 className="text-3xl font-bold mb-4">AI単語帳</h1>
        <p>読み込み中...</p>
      </div>
    </div>
  );
}

export default App;