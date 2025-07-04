import React, { useState } from 'react';
import { FileManager } from './components/FileManager';
import { WordManager } from './components/WordManager';
import { Flashcard } from './components/Flashcard';
import { VocabularyFile } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTheme } from './hooks/useTheme';

type AppState = 'file-manager' | 'word-manager' | 'flashcards';

function App() {
  const [files, setFiles] = useLocalStorage<VocabularyFile[]>('vocabulary-files', []);
  const [currentFile, setCurrentFile] = useState<VocabularyFile | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [appState, setAppState] = useState<AppState>('file-manager');
  const { currentTheme, setTheme, availableThemes } = useTheme();

  const handleCreateFile = (name: string) => {
    const newFile: VocabularyFile = {
      id: Date.now().toString(),
      name,
      createdAt: new Date(),
      words: []
    };
    setFiles([...files, newFile]);
  };

  const handleDeleteFile = (id: string) => {
    setFiles(files.filter(file => file.id !== id));
  };

  const handleSelectFile = (file: VocabularyFile) => {
    setCurrentFile(file);
    setAppState('word-manager');
  };

  const handleUpdateFile = (updatedFile: VocabularyFile) => {
    setFiles(files.map(file => 
      file.id === updatedFile.id ? updatedFile : file
    ));
    setCurrentFile(updatedFile);
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

  if (appState === 'file-manager') {
    return (
      <FileManager
        files={files}
        onCreateFile={handleCreateFile}
        onDeleteFile={handleDeleteFile}
        onSelectFile={handleSelectFile}
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