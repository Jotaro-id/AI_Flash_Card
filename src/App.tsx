import React, { useState, useEffect } from 'react';
import { FileManager } from './components/FileManager';
import { WordManager } from './components/WordManager';
import { Flashcard } from './components/Flashcard';
import { Auth } from './components/Auth';
import { ConnectionStatus } from './components/ConnectionStatus';
import { VocabularyFile, SupportedLanguage } from './types';
import { useTheme } from './hooks/useTheme';
import { supabase } from './lib/supabase';
import { 
  fetchVocabularyFiles, 
  createVocabularyFile, 
  deleteVocabularyFile, 
  updateVocabularyFile,
  migrateFromLocalStorage,
  signOut,
  debugSupabaseData
} from './services/supabaseService';
import { runSupabaseDiagnostics, DiagnosticResult } from './utils/supabaseDiagnostics';

type AppState = 'file-manager' | 'word-manager' | 'flashcards';

function App() {
  console.log('App component rendering...');
  console.log('Environment check - VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Not set');
  console.log('Environment check - VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set');
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [files, setFiles] = useState<VocabularyFile[]>([]);
  const [currentFile, setCurrentFile] = useState<VocabularyFile | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [appState, setAppState] = useState<AppState>('file-manager');
  const { currentTheme, setTheme, availableThemes } = useTheme();
  
  // filesステートの変更を監視
  useEffect(() => {
    console.log('App: filesステートが更新されました', {
      filesCount: files.length,
      files
    });
  }, [files]);
  
  // デバッグ用にグローバルに関数を公開
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-expect-error デバッグ目的でwindowオブジェクトに関数を追加
      window.debugSupabaseData = debugSupabaseData;
      // @ts-expect-error デバッグ目的でwindowオブジェクトに関数を追加  
      window.runSupabaseDiagnostics = runSupabaseDiagnostics;
      
      // 環境変数へのアクセス関数も追加
      // @ts-expect-error デバッグ目的でwindowオブジェクトに関数を追加
      window.getSupabaseConfig = () => {
        return {
          VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
          isDev: import.meta.env.DEV
        };
      };
      
      console.log('デバッグ関数とSupabaseクライアントをwindowオブジェクトに追加しました');
      console.log('利用可能なデバッグ関数:');
      console.log('- window.debugSupabaseData()');
      console.log('- window.runSupabaseDiagnostics()');
      console.log('- window.getSupabaseConfig()');
      console.log('- window.supabase (Supabaseクライアント)');
    }
  }, []);

  // 認証状態をチェック（開発時は認証をスキップ）
  useEffect(() => {
    console.log('App component mounted. Starting auth check...');
    
    // 10秒後にタイムアウト
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.log('Loading timeout - showing error state');
        setLoadingTimeout(true);
        setIsLoading(false);
      }
    }, 10000);
    
    const checkAuth = async () => {
      try {
        console.log('Checking Supabase session...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session check result:', session);
        
        if (session) {
          setIsAuthenticated(true);
          console.log('セッション確認済み:', { userId: session.user.id, email: session.user.email });
          // デバッグ診断を実行
          await debugSupabaseData();
          // ローカルストレージからのデータ移行を試みる
          await migrateFromLocalStorage();
          await loadVocabularyFiles();
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
        setAuthError(error instanceof Error ? error.message : '認証エラーが発生しました');
        // エラー時は認証されていない状態とする
        setIsAuthenticated(false);
      } finally {
        console.log('Finished auth check. Setting isLoading to false.');
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };

    checkAuth();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        console.log('SIGNED_INイベント発生:', { userId: session.user.id, email: session.user.email });
        // デバッグ診断を実行
        await debugSupabaseData();
        // ローカルストレージからのデータ移行を試みる
        await migrateFromLocalStorage();
        // データを読み込む
        await loadVocabularyFiles();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setFiles([]);
        setCurrentFile(null);
        setAppState('file-manager');
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Supabaseから単語帳を読み込む
  const loadVocabularyFiles = async () => {
    try {
      console.log('loadVocabularyFiles: 開始');
      const loadedFiles = await fetchVocabularyFiles();
      console.log('loadVocabularyFiles: 読み込み完了', loadedFiles);
      console.log('loadVocabularyFiles: 読み込んだファイル数', loadedFiles.length);
      if (loadedFiles.length > 0) {
        console.log('loadVocabularyFiles: 最初のファイル', loadedFiles[0]);
      }
      setFiles(loadedFiles);
      console.log('loadVocabularyFiles: state更新完了');
      // 現在のfilesステートも確認
      console.log('loadVocabularyFiles: 現在のfiles state', files);
    } catch (error) {
      console.error('単語帳の読み込みエラー:', error);
      console.error('エラー詳細:', {
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
      console.log('handleDeleteFile: 削除開始', id);
      await deleteVocabularyFile(id);
      console.log('handleDeleteFile: データベース削除完了');
      
      // データベースから削除成功後、UIステートを更新
      const updatedFiles = files.filter(file => file.id !== id);
      setFiles(updatedFiles);
      console.log('handleDeleteFile: UIステート更新完了', {
        削除前ファイル数: files.length,
        削除後ファイル数: updatedFiles.length,
        削除されたID: id
      });
      
      // 成功メッセージを表示
      alert('ファイルを削除しました');
    } catch (error) {
      console.error('単語帳削除エラー:', error);
      console.error('エラー詳細:', {
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

  // リトライ処理
  const handleRetry = () => {
    setIsLoading(true);
    setLoadingTimeout(false);
    setAuthError(null);
    setDiagnosticResults([]);
    window.location.reload();
  };

  // 診断実行
  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const results = await runSupabaseDiagnostics();
      setDiagnosticResults(results);
    } catch (error) {
      console.error('診断実行エラー:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
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
              
              {diagnosticResults.length > 0 && (
                <div className="bg-black/20 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <h4 className="text-white font-semibold mb-2">診断結果:</h4>
                  <div className="space-y-1 text-xs">
                    {diagnosticResults.map((result, index) => (
                      <div key={index} className={`flex items-start gap-2 ${
                        result.status === 'success' ? 'text-green-300' : 
                        result.status === 'warning' ? 'text-yellow-300' : 'text-red-300'
                      }`}>
                        <span className="flex-shrink-0">
                          {result.status === 'success' ? '✅' : 
                           result.status === 'warning' ? '⚠️' : '❌'}
                        </span>
                        <div>
                          <div className="font-medium">{result.test}</div>
                          <div className="text-white/70">{result.message}</div>
                          {result.details && (
                            <div className="text-white/50 mt-1">{result.details}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <details className="text-left">
                <summary className="cursor-pointer text-white/70 hover:text-white text-sm">
                  トラブルシューティング
                </summary>
                <div className="mt-3 space-y-2 text-sm text-white/70">
                  <p>• インターネット接続を確認してください</p>
                  <p>• ブラウザのキャッシュをクリアしてください</p>
                  <p>• 環境変数が正しく設定されているか確認してください</p>
                  <p>• Supabaseのテーブルとカラムが作成されているか確認してください</p>
                  <p className="mt-3">環境変数の状態:</p>
                  <p className="font-mono text-xs">
                    VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL ? '✓ 設定済み' : '✗ 未設定'}
                  </p>
                  <p className="font-mono text-xs">
                    VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ 設定済み' : '✗ 未設定'}
                  </p>
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
    return <Auth onSuccess={() => setIsAuthenticated(true)} />;
  }

  if (appState === 'file-manager') {
    console.log('App: FileManagerをレンダリング', {
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
        />
        <ConnectionStatus />
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
        />
        <ConnectionStatus />
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