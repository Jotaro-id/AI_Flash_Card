import React, { useState } from 'react';
import { VocabularyFile } from '@/types';
import { Flashcard } from './Flashcard';
import { useTheme } from '@/hooks/useTheme';

interface FlashcardContainerProps {
  file: VocabularyFile;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onBack: () => void;
}

export const FlashcardContainer: React.FC<FlashcardContainerProps> = ({
  file,
  currentIndex,
  onIndexChange,
  onBack,
}) => {
  const { currentTheme, setTheme, availableThemes } = useTheme();
  const [shuffledIndices, setShuffledIndices] = useState<number[]>(
    Array.from({ length: file.words.length }, (_, i) => i)
  );
  const [isShuffled, setIsShuffled] = useState(false);

  const actualIndex = isShuffled ? shuffledIndices[currentIndex] : currentIndex;
  const currentWord = file.words[actualIndex];

  const handleNext = () => {
    if (currentIndex < file.words.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  const handleShuffle = () => {
    if (!isShuffled) {
      const newIndices = [...Array.from({ length: file.words.length }, (_, i) => i)];
      for (let i = newIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newIndices[i], newIndices[j]] = [newIndices[j], newIndices[i]];
      }
      setShuffledIndices(newIndices);
      setIsShuffled(true);
    } else {
      setIsShuffled(false);
    }
    onIndexChange(0);
  };

  if (!currentWord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-2xl mb-4">単語が見つかりません</p>
          <button
            onClick={onBack}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <Flashcard
      word={currentWord}
      currentIndex={currentIndex}
      totalWords={file.words.length}
      targetLanguage={file.targetLanguage || 'en'}
      onNext={handleNext}
      onPrevious={handlePrevious}
      onShuffle={handleShuffle}
      onBack={onBack}
      currentTheme={currentTheme}
      availableThemes={availableThemes}
      onThemeChange={setTheme}
    />
  );
};