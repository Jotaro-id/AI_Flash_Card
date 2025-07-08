import React, { useState, useEffect } from 'react';
import { FileManager } from './components/FileManager';
import { WordManager } from './components/WordManager';
import { Flashcard } from './components/Flashcard';
import { Auth } from './components/Auth';
import { ConnectionStatus } from './components/ConnectionStatus';
import { RateLimitStatus } from './components/RateLimitStatus';
import { VocabularyFile, SupportedLanguage } from './types';
import { useTheme } from './hooks/useTheme';
// LocalStorageを使用するように変更
import { 
  fetchVocabularyFiles, 
  createVocabularyFile, 
  deleteVocabularyFile, 
  updateVocabularyFile,
  createSampleData,
  logout as signOut,
  debugLocalStorageData,
  getCurrentUser
} from './services/localStorageService';
// Supabase診断ツールは使用しない
// import { runSupabaseDiagnostics, DiagnosticResult } from './utils/supabaseDiagnostics';
// import { runDetailedSupabaseDiagnostics } from './utils/performanceDiagnostics';
import { logger } from './utils/logger';

type AppState = 'file-manager' | 'word-manager' | 'flashcards';

function App() {
  logger.info('App component rendering...');
  logger.info('Environment check', {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Not set',
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set'
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string; id: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  // const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [isRunningDiagnostics] = useState(false);
  const [files, setFiles] = useState<VocabularyFile[]>([]);
  const [currentFile, setCurrentFile] = useState<VocabularyFile | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [appState, setAppState] = useState<AppState>('file-manager');
  const { currentTheme, setTheme, availableThemes } = useTheme();
  
  // filesステートの変更を監視
  useEffect(() => {
    logger.debug('App: filesステートが更新されました', {
      filesCount: files.length,
      files
    });
  }, [files]);
  
  // デバッグ用にグローバルに関数を公開
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-expect-error デバッグ目的でwindowオブジェクトに関数を追加
      window.debugLocalStorageData = debugLocalStorageData;
      // @ts-expect-error デバッグ目的でwindowオブジェクトに関数を追加
      window.getSupabaseConfig = () => {
        return {
          VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
          isDev: import.meta.env.DEV
        };
      };
      
      logger.info('デバッグ関数をwindowオブジェクトに追加しました');
      logger.info('利用可能なデバッグ関数:', [
        'window.debugLocalStorageData()',
        'window.aiFlashcardLogger (ログユーティリティ)'
      ]);
    }
  }, []);

  // LocalStorage版の認証チェック
  useEffect(() => {
    logger.info('App component mounted. Starting auth check...');
    
    const checkAuth = async () => {
      try {
        logger.info('Checking LocalStorage user...');
        const user = getCurrentUser();
        
        if (user) {
          setIsAuthenticated(true);
          setCurrentUser(user);
          logger.info('ユーザー確認済み', { userId: user.id, email: user.email });
          
          // サンプルデータを作成
          await createSampleData();
          
          // 単語帳を読み込む
          logger.info('loadVocabularyFilesを実行中...');
          await loadVocabularyFiles();
          logger.info('loadVocabularyFiles完了');
        } else {
          logger.info('No user found. Need to login.');
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (error) {
        logger.error('認証チェックエラー', error);
        setAuthError(error instanceof Error ? error.message : '認証エラーが発生しました');
        setIsAuthenticated(false);
      } finally {
        logger.info('Finished auth check. Setting isLoading to false.');
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // LocalStorageから単語帳を読み込む
  const loadVocabularyFiles = async () => {
    try {
      logger.info('loadVocabularyFiles: 開始');
      const loadedFiles = await fetchVocabularyFiles();
      logger.info('loadVocabularyFiles: 読み込み完了', {
        fileCount: loadedFiles.length,
        firstFile: loadedFiles.length > 0 ? loadedFiles[0] : null
      });
      setFiles(loadedFiles);
      logger.info('loadVocabularyFiles: state更新完了');
    } catch (error) {
      logger.error('単語帳の読み込みエラー', error);
      logger.error('エラー詳細', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      setAuthError(`単語帳の読み込みに失敗しました: ${errorMessage}`);
    }
  };

  const handleCreateFile = async (name: string, targetLanguage?: SupportedLanguage) => {
    try {
      const newFile = await createVocabularyFile(name, targetLanguage || 'en');
      setFiles([...files, newFile]);
    } catch (error) {
      logger.error('単語帳作成エラー', error);
      logger.error('Error details', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      alert(`単語帳の作成に失敗しました: ${error instanceof Error ? error.message : 'エラーが発生しました'}`);
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      logger.info('handleDeleteFile: 削除開始', { id });
      await deleteVocabularyFile(id);
      logger.info('handleDeleteFile: データベース削除完了');
      
      // データベースから削除成功後、UIステートを更新
      const updatedFiles = files.filter(file => file.id !== id);
      setFiles(updatedFiles);
      logger.info('handleDeleteFile: UIステート更新完了', {
        削除前ファイル数: files.length,
        削除後ファイル数: updatedFiles.length,
        削除されたID: id
      });
      
      // 成功メッセージを表示
      alert('ファイルを削除しました');
    } catch (error) {
      logger.error('単語帳削除エラー', error);
      logger.error('エラー詳細', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      alert(`単語帳の削除に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSelectFile = (file: VocabularyFile) => {
    setCurrentFile(file);
    setAppState('word-manager');
  };

  const handleUpdateFile = async (updatedFile: VocabularyFile) => {
    console.log('[DEBUG App] handleUpdateFile called with:', {
      fileId: updatedFile.id,
      fileName: updatedFile.name,
      wordCount: updatedFile.words.length,
      words: updatedFile.words.map(w => ({ id: w.id, word: w.word }))
    });
    
    try {
      await updateVocabularyFile(updatedFile);
      console.log('[DEBUG App] updateVocabularyFile completed successfully');
      
      setFiles(files.map(file => 
        file.id === updatedFile.id ? updatedFile : file
      ));
      setCurrentFile(updatedFile);
      console.log('[DEBUG App] State updated with new file data');
    } catch (error) {
      logger.error('単語帳更新エラー', error);
      console.error('[DEBUG App] Failed to update file:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      logger.error('サインアウトエラー', error);
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

  // リトライ処理
  const handleRetry = () => {
    setIsLoading(true);
    setLoadingTimeout(false);
    setAuthError(null);
    // setDiagnosticResults([]);
    window.location.reload();
  };

  // LocalStorage版では診断機能は不要
  const handleRunDiagnostics = async () => {
    logger.info('LocalStorage版では診断機能は利用できません');
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
  
  // タイムアウトまたはエラー時の表示
  if (loadingTimeout || authError) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.loading} flex items-center justify-center`}>
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-white text-center">
            <h1 className="text-3xl font-bold mb-4">AI単語帳</h1>
            
            {loadingTimeout ? (
              <>
                <p className="text-xl mb-2">読み込みに時間がかかっています</p>
                <p className="text-sm mb-6 text-white/80">
                  接続に問題があるかもしれません。以下をお試しください：
                </p>
              </>
            ) : (
              <>
                <p className="text-xl mb-2">エラーが発生しました</p>
                <p className="text-sm mb-6 text-white/80 break-words">
                  {authError}
                </p>
              </>
            )}
            
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full bg-white/30 hover:bg-white/40 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                再読み込み
              </button>
              
              <button
                onClick={() => {
                  setIsLoading(false);
                  setLoadingTimeout(false);
                  setAuthError(null);
                  setIsAuthenticated(false);
                }}
                className="w-full bg-blue-500/30 hover:bg-blue-500/40 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                ログイン画面へ
              </button>
              
              <button
                onClick={handleRunDiagnostics}
                disabled={isRunningDiagnostics}
                className="w-full bg-purple-500/30 hover:bg-purple-500/40 disabled:bg-gray-500/30 text-white px-4 py-3 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed"
              >
                {isRunningDiagnostics ? '診断中...' : '接続診断を実行'}
              </button>
              
              <details className="text-left">
                <summary className="cursor-pointer text-white/70 hover:text-white text-sm">
                  トラブルシューティング
                </summary>
                <div className="mt-3 space-y-2 text-sm text-white/70">
                  <p>• インターネット接続を確認してください</p>
                  <p>• ブラウザのキャッシュをクリアしてください</p>
                  <p>• LocalStorage版ではローカルにデータが保存されます</p>
                  <p>• ブラウザのLocalStorageが有効になっていることを確認してください</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 未認証の場合は認証画面を表示
  if (!isAuthenticated) {
    return <Auth onSuccess={() => {
      setIsAuthenticated(true);
      window.location.reload(); // LocalStorageからユーザー情報を再読み込み
    }} />;
  }

  if (appState === 'file-manager') {
    logger.debug('App: FileManagerをレンダリング', {
      filesCount: files.length,
      files,
      appState
    });
    return (
      <>
        <FileManager
          files={files}
          onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile}
          onSelectFile={handleSelectFile}
          onSignOut={handleSignOut}
          currentTheme={currentTheme}
          availableThemes={availableThemes}
          onThemeChange={setTheme}
          currentUser={currentUser}
        />
        <ConnectionStatus />
        <RateLimitStatus />
      </>
    );
  }

  if (appState === 'word-manager' && currentFile) {
    return (
      <>
        <WordManager
          file={currentFile}
          onBack={handleBackToFileManager}
          onUpdateFile={handleUpdateFile}
          onStartFlashcards={handleStartFlashcards}
          currentTheme={currentTheme}
          availableThemes={availableThemes}
          onThemeChange={setTheme}
          currentUser={currentUser}
          onSignOut={handleSignOut}
        />
        <ConnectionStatus />
        <RateLimitStatus />
      </>
    );
  }

  if (appState === 'flashcards' && currentFile && currentFile.words.length > 0) {
    return (
      <>
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
        <ConnectionStatus />
        <RateLimitStatus />
      </>
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