'use client';

import React, { useState, useEffect } from 'react';
import { FileManager } from '@/components/FileManager';
import { WordManager } from '@/components/WordManager';
import { FlashcardContainer } from '@/components/FlashcardContainer';
import { Auth } from '@/components/Auth';
import { VocabularyFile, SupportedLanguage, LearningStatus } from '@/types';
import { useTheme } from '@/hooks/useTheme';
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
} from '@/services/localStorageService';
import { logger } from '@/utils/logger';

type AppState = 'file-manager' | 'word-manager' | 'flashcards';

export default function Home() {
  logger.info('App component rendering...');
  logger.info('Environment check', {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string; id: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [files, setFiles] = useState<VocabularyFile[]>([]);
  const [currentFile, setCurrentFile] = useState<VocabularyFile | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [appState, setAppState] = useState<AppState>('file-manager');
  const { currentTheme, setTheme, availableThemes } = useTheme();
  
  // filesステートの変更を監視
  useEffect(() => {
    logger.debug('App: filesステートが更新されました', {
      fileCount: files.length,
      fileNames: files.map(f => f.name)
    });
  }, [files]);

  useEffect(() => {
    logger.debug('App: currentFileが更新されました', {
      fileName: currentFile?.name || 'null',
      wordCount: currentFile?.words?.length || 0
    });
  }, [currentFile]);

  useEffect(() => {
    const checkAuth = async () => {
      logger.info('Checking authentication...');
      try {
        const timer = setTimeout(() => {
          logger.warn('Loading timeout reached');
          setLoadingTimeout(true);
        }, 5000);

        const user = await getCurrentUser();
        
        clearTimeout(timer);
        
        logger.info('Auth check completed', { 
          user,
          isAuthenticated: !!user 
        });
        
        if (user) {
          setIsAuthenticated(true);
          setCurrentUser(user);
          loadVocabularyFiles();
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
        setAuthError(null);
      } catch (error) {
        logger.error('Auth check error:', error);
        setAuthError(error instanceof Error ? error.message : '認証エラー');
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const loadVocabularyFiles = async () => {
    logger.info('Loading vocabulary files...');
    try {
      const fetchedFiles = await fetchVocabularyFiles();
      logger.info('Vocabulary files loaded', { 
        count: fetchedFiles.length,
        fileNames: fetchedFiles.map(f => f.name)
      });
      setFiles(fetchedFiles);
    } catch (error) {
      logger.error('Failed to load vocabulary files:', error);
    }
  };

  const handleLogin = async (email: string) => {
    logger.info('Logging in...', { email });
    setIsAuthenticated(true);
    setCurrentUser({ email, id: email });
    
    await createSampleData();
    await loadVocabularyFiles();
  };

  const handleLogout = async () => {
    logger.info('Logging out...');
    try {
      await signOut();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentFile(null);
      setFiles([]);
    } catch (error) {
      logger.error('Logout error:', error);
    }
  };

  const handleCreateFile = async (name: string, targetLanguage: SupportedLanguage = 'en') => {
    logger.info('Creating new file', { name, targetLanguage });
    try {
      const newFile = await createVocabularyFile(name, targetLanguage);
      logger.info('File created successfully', { fileId: newFile.id, fileName: newFile.name });
      await loadVocabularyFiles();
    } catch (error) {
      logger.error('Failed to create file:', error);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    logger.info('Deleting file', { fileId });
    try {
      await deleteVocabularyFile(fileId);
      logger.info('File deleted successfully', { fileId });
      await loadVocabularyFiles();
      if (currentFile?.id === fileId) {
        setCurrentFile(null);
        setAppState('file-manager');
      }
    } catch (error) {
      logger.error('Failed to delete file:', error);
    }
  };

  const handleSelectFile = (file: VocabularyFile) => {
    logger.info('Selecting file', { fileId: file.id, fileName: file.name });
    setCurrentFile(file);
    setAppState('word-manager');
    setCurrentWordIndex(0);
  };

  const handleBack = () => {
    logger.info('Going back to file manager');
    setAppState('file-manager');
    setCurrentWordIndex(0);
  };

  const handleStudyWords = () => {
    logger.info('Starting flashcard study');
    if (currentFile && currentFile.words.length > 0) {
      setAppState('flashcards');
      setCurrentWordIndex(0);
    }
  };

  const handleUpdateFile = async (updatedFile: VocabularyFile) => {
    logger.info('Updating file', { fileId: updatedFile.id, fileName: updatedFile.name });
    try {
      const result = await updateVocabularyFile(updatedFile);
      logger.info('File updated successfully');
      setCurrentFile(result);
      
      await loadVocabularyFiles();
    } catch (error) {
      logger.error('Failed to update file:', error);
    }
  };

  const handleLearningStatusChange = async (wordId: string, status: LearningStatus) => {
    if (!currentFile) return;
    
    logger.info('Updating learning status', { wordId, status });
    
    try {
      // 単語の学習状況を更新
      const updatedWords = currentFile.words.map(word => 
        word.id === wordId 
          ? { ...word, learningStatus: status }
          : word
      );
      
      const updatedFile = {
        ...currentFile,
        words: updatedWords
      };
      
      // ファイルを保存
      await updateVocabularyFile(updatedFile);
      setCurrentFile(updatedFile);
      
      logger.info('Learning status updated successfully');
    } catch (error) {
      logger.error('Failed to update learning status:', error);
    }
  };

  const handleDiagnosticsClick = () => {
    debugLocalStorageData();
  };

  if (!isAuthenticated && isLoading) {
    logger.debug('Rendering loading state...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white">認証状態を確認中...</p>
          {loadingTimeout && (
            <div className="space-y-2">
              <p className="text-yellow-300 text-sm">
                読み込みに時間がかかっています
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white text-blue-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ページを再読み込み
              </button>
            </div>
          )}
          {authError && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg max-w-md mx-auto">
              <p className="font-semibold">エラー:</p>
              <p className="text-sm">{authError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    logger.debug('Rendering auth component...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
        <Auth onSuccess={handleLogin} />
      </div>
    );
  }

  logger.debug('Rendering main app state:', { appState });
  
  return (
    <div className="min-h-screen">{/* ヘッダーは各コンポーネント内で管理 */}

        {appState === 'file-manager' && (
          <FileManager
            files={files}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onSelectFile={handleSelectFile}
            onSignOut={handleLogout}
            currentTheme={currentTheme}
            availableThemes={availableThemes}
            onThemeChange={setTheme}
            currentUser={currentUser}
            onDebug={handleDiagnosticsClick}
          />
        )}

        {appState === 'word-manager' && currentFile && (
          <WordManager
            file={currentFile}
            onBack={handleBack}
            onUpdateFile={handleUpdateFile}
            onStartFlashcards={handleStudyWords}
            currentTheme={currentTheme}
            availableThemes={availableThemes}
            onThemeChange={setTheme}
            currentUser={currentUser}
            onSignOut={handleLogout}
          />
        )}

        {appState === 'flashcards' && currentFile && (
          <FlashcardContainer
            file={currentFile}
            currentIndex={currentWordIndex}
            onIndexChange={setCurrentWordIndex}
            onBack={async () => {
              // フィルタリングされている場合は、元のファイルを再読み込み
              if (currentFile?.isFiltered) {
                await loadVocabularyFiles();
              }
              setAppState('word-manager');
            }}
            onLearningStatusChange={handleLearningStatusChange}
            wordBookId={currentFile.id}
          />
        )}
    </div>
  );
}