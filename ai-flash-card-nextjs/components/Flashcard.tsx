import React, { useState, useEffect } from 'react';
import { RotateCcw, ChevronLeft, ChevronRight, Shuffle, Info, Check, X, HelpCircle } from 'lucide-react';
import { Word, ColorTheme, SupportedLanguage, LearningStatus } from '@/types';
import { ThemeSelector } from './ThemeSelector';
import { SpeechButton } from './SpeechButton';
import { speechService } from '@/services/speechService';
import { GrammaticalChangesTable } from './GrammaticalChangesTable';
import { SwipeableCard, SwipeDirection } from './SwipeableCard';

interface FlashcardProps {
  word: Word;
  currentIndex: number;
  totalWords: number;
  targetLanguage: SupportedLanguage;
  onNext: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  onBack: () => void;
  currentTheme: ColorTheme;
  availableThemes: ColorTheme[];
  onThemeChange: (themeId: string) => void;
  onLearningStatusChange?: (wordId: string, status: LearningStatus) => void;
  wordBookId?: string;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  word,
  currentIndex,
  totalWords,
  targetLanguage,
  onNext,
  onPrevious,
  onShuffle,
  onBack,
  currentTheme,
  availableThemes,
  onThemeChange,
  onLearningStatusChange,
  wordBookId
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);

  // 学習状況を更新する関数
  const handleLearningStatusChange = async (status: LearningStatus) => {
    if (onLearningStatusChange && wordBookId) {
      await onLearningStatusChange(word.id, status);
      // ステータス更新後、少し待ってから次のカードに進む
      setTimeout(() => {
        onNext();
      }, 500);
    }
  };

  // カードが変更されたときに自動音声再生
  useEffect(() => {
    if (autoPlayEnabled && word && speechService.isSupported()) {
      const playAudio = async () => {
        try {
          // 少し遅延を入れてからカードの単語を再生
          await new Promise(resolve => setTimeout(resolve, 500));
          // ファイルの言語設定を使用
          await speechService.speak(word.word, targetLanguage);
        } catch (error) {
          console.error('Auto speech playback failed:', error);
        }
      };
      
      playAudio();
    }
  }, [word.id, word, autoPlayEnabled, targetLanguage]); // word.idが変更されたときに実行

  // カードがフリップされたときの自動音声再生
  useEffect(() => {
    if (autoPlayEnabled && isFlipped && word.aiGenerated && speechService.isSupported()) {
      const playFlippedAudio = async () => {
        try {
          // フリップ後に英語の意味を再生
          await new Promise(resolve => setTimeout(resolve, 300));
          const detectedLanguage = speechService.detectLanguage(word.aiGenerated!.englishEquivalent);
          await speechService.speak(word.aiGenerated!.englishEquivalent, detectedLanguage);
        } catch (error) {
          console.error('Auto speech playback for flipped card failed:', error);
        }
      };
      
      playFlippedAudio();
    }
  }, [isFlipped, word.id, word.aiGenerated, autoPlayEnabled]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleSwipe = (direction: SwipeDirection) => {
    if (!isFlipped || !onLearningStatusChange || !wordBookId) return;

    // スワイプ方向に応じて学習状況を更新
    const statusMap: Record<SwipeDirection, LearningStatus> = {
      right: 'learned',
      left: 'forgot',
      up: 'uncertain'
    };

    handleLearningStatusChange(statusMap[direction]);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setShowDetails(false);
    onNext();
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    setShowDetails(false);
    onPrevious();
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setShowDetails(false);
    onShuffle();
  };

  const toggleAutoPlay = () => {
    setAutoPlayEnabled(!autoPlayEnabled);
    if (!autoPlayEnabled) {
      // 自動再生を有効にした場合、現在の単語を再生
      const playCurrentWord = async () => {
        try {
          // ファイルの言語設定を使用
          await speechService.speak(word.word, targetLanguage);
        } catch (error) {
          console.error('Manual speech playback failed:', error);
        }
      };
      playCurrentWord();
    }
  };

  if (showDetails && word.aiGenerated) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.flashcard} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setShowDetails(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{word.word}</h2>
                <SpeechButton text={word.word} language={targetLanguage} size={24} />
                <span className="text-white/70">- 詳細情報</span>
              </div>
              <ThemeSelector
                currentTheme={currentTheme}
                availableThemes={availableThemes}
                onThemeChange={onThemeChange}
                isOpen={isThemeSelectorOpen}
                onToggle={() => setIsThemeSelectorOpen(!isThemeSelectorOpen)}
              />
            </div>

            <div className="space-y-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">基本情報</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-white/90"><strong>英語:</strong> {word.aiGenerated.englishEquivalent}</p>
                      <SpeechButton text={word.aiGenerated.englishEquivalent} language="en" size={16} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-white/90"><strong>日本語:</strong> {word.aiGenerated.japaneseEquivalent}</p>
                      <SpeechButton text={word.aiGenerated.japaneseEquivalent} language="ja" size={16} />
                    </div>
                    <p className="text-white/90"><strong>発音:</strong> {word.aiGenerated.pronunciation}</p>
                  </div>
                  <div>
                    <p className="text-white/90"><strong>品詞:</strong> {word.aiGenerated.wordClass}</p>
                    {word.aiGenerated.tenseInfo && (
                      <p className="text-white/90"><strong>時制:</strong> {word.aiGenerated.tenseInfo}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 文法変化表 */}
              <GrammaticalChangesTable 
                grammaticalChanges={word.aiGenerated.grammaticalChanges}
                wordClass={word.aiGenerated.wordClass}
                targetLanguage={targetLanguage as 'en' | 'ja' | 'es' | 'fr' | 'it' | 'de' | 'zh' | 'ko' | 'auto'}
              />

              {/* 多言語翻訳セクション */}
              {word.aiGenerated.translations && (
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3">多言語翻訳</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {word.aiGenerated.translations.spanish && (
                      <div className="flex items-center gap-2">
                        <p className="text-white/90 flex-1"><strong>スペイン語:</strong> {word.aiGenerated.translations.spanish}</p>
                        <SpeechButton text={word.aiGenerated.translations.spanish} language="es" size={16} />
                      </div>
                    )}
                    {word.aiGenerated.translations.french && (
                      <div className="flex items-center gap-2">
                        <p className="text-white/90 flex-1"><strong>フランス語:</strong> {word.aiGenerated.translations.french}</p>
                        <SpeechButton text={word.aiGenerated.translations.french} language="fr" size={16} />
                      </div>
                    )}
                    {word.aiGenerated.translations.italian && (
                      <div className="flex items-center gap-2">
                        <p className="text-white/90 flex-1"><strong>イタリア語:</strong> {word.aiGenerated.translations.italian}</p>
                        <SpeechButton text={word.aiGenerated.translations.italian} language="it" size={16} />
                      </div>
                    )}
                    {word.aiGenerated.translations.german && (
                      <div className="flex items-center gap-2">
                        <p className="text-white/90 flex-1"><strong>ドイツ語:</strong> {word.aiGenerated.translations.german}</p>
                        <SpeechButton text={word.aiGenerated.translations.german} language="de" size={16} />
                      </div>
                    )}
                    {word.aiGenerated.translations.chinese && (
                      <div className="flex items-center gap-2">
                        <p className="text-white/90 flex-1"><strong>中国語:</strong> {word.aiGenerated.translations.chinese}</p>
                        <SpeechButton text={word.aiGenerated.translations.chinese} language="zh" size={16} />
                      </div>
                    )}
                    {word.aiGenerated.translations.korean && (
                      <div className="flex items-center gap-2">
                        <p className="text-white/90 flex-1"><strong>韓国語:</strong> {word.aiGenerated.translations.korean}</p>
                        <SpeechButton text={word.aiGenerated.translations.korean} language="ko" size={16} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">例文</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-white/90"><strong>基本例文:</strong> {word.aiGenerated.exampleSentence}</p>
                    </div>
                    <SpeechButton text={word.aiGenerated.exampleSentence} language={targetLanguage} size={16} />
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-white/90"><strong>日本語例文:</strong> {word.aiGenerated.japaneseExample}</p>
                    </div>
                    <SpeechButton text={word.aiGenerated.japaneseExample} language="ja" size={16} />
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-white/90"><strong>英語例文:</strong> {word.aiGenerated.englishExample}</p>
                    </div>
                    <SpeechButton text={word.aiGenerated.englishExample} language="en" size={16} />
                  </div>
                </div>
              </div>

              {/* 多言語例文セクション */}
              {word.aiGenerated.multilingualExamples && (
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3">多言語例文</h3>
                  <div className="space-y-3">
                    {word.aiGenerated.multilingualExamples.spanish && (
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-white/90"><strong>スペイン語:</strong> {word.aiGenerated.multilingualExamples.spanish}</p>
                        </div>
                        <SpeechButton text={word.aiGenerated.multilingualExamples.spanish} language="es" size={16} />
                      </div>
                    )}
                    {word.aiGenerated.multilingualExamples.french && (
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-white/90"><strong>フランス語:</strong> {word.aiGenerated.multilingualExamples.french}</p>
                        </div>
                        <SpeechButton text={word.aiGenerated.multilingualExamples.french} language="fr" size={16} />
                      </div>
                    )}
                    {word.aiGenerated.multilingualExamples.italian && (
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-white/90"><strong>イタリア語:</strong> {word.aiGenerated.multilingualExamples.italian}</p>
                        </div>
                        <SpeechButton text={word.aiGenerated.multilingualExamples.italian} language="it" size={16} />
                      </div>
                    )}
                    {word.aiGenerated.multilingualExamples.german && (
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-white/90"><strong>ドイツ語:</strong> {word.aiGenerated.multilingualExamples.german}</p>
                        </div>
                        <SpeechButton text={word.aiGenerated.multilingualExamples.german} language="de" size={16} />
                      </div>
                    )}
                    {word.aiGenerated.multilingualExamples.chinese && (
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-white/90"><strong>中国語:</strong> {word.aiGenerated.multilingualExamples.chinese}</p>
                        </div>
                        <SpeechButton text={word.aiGenerated.multilingualExamples.chinese} language="zh" size={16} />
                      </div>
                    )}
                    {word.aiGenerated.multilingualExamples.korean && (
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-white/90"><strong>韓国語:</strong> {word.aiGenerated.multilingualExamples.korean}</p>
                        </div>
                        <SpeechButton text={word.aiGenerated.multilingualExamples.korean} language="ko" size={16} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">使用方法・注意点</h3>
                <p className="text-white/90">{word.aiGenerated.usageNotes}</p>
              </div>

              {word.aiGenerated.additionalInfo && (
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-2">追加情報</h3>
                  <p className="text-white/90">{word.aiGenerated.additionalInfo}</p>
                </div>
              )}

              {/* 学習状況選択ボタン */}
              {onLearningStatusChange && wordBookId && (
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3">この単語を覚えましたか？</h3>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => handleLearningStatusChange('learned')}
                      className="flex-1 bg-green-500/80 hover:bg-green-500 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Check size={20} />
                      覚えた
                    </button>
                    <button
                      onClick={() => handleLearningStatusChange('uncertain')}
                      className="flex-1 bg-yellow-500/80 hover:bg-yellow-500 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <HelpCircle size={20} />
                      怪しい
                    </button>
                    <button
                      onClick={() => handleLearningStatusChange('forgot')}
                      className="flex-1 bg-red-500/80 hover:bg-red-500 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <X size={20} />
                      覚えていない
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.flashcard} p-4`}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="text-white/80 hover:text-white transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="text-white/80 text-sm">
              {currentIndex + 1} / {totalWords}
            </div>
            <div className="flex items-center gap-3">
              {/* 自動再生トグルボタン */}
              <button
                onClick={toggleAutoPlay}
                className={`px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
                  autoPlayEnabled 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-white/20 hover:bg-white/30 text-white/80'
                }`}
                title={autoPlayEnabled ? '自動音声再生: ON' : '自動音声再生: OFF'}
              >
                🔊 {autoPlayEnabled ? 'ON' : 'OFF'}
              </button>
              <ThemeSelector
                currentTheme={currentTheme}
                availableThemes={availableThemes}
                onThemeChange={onThemeChange}
                isOpen={isThemeSelectorOpen}
                onToggle={() => setIsThemeSelectorOpen(!isThemeSelectorOpen)}
              />
              <button
                onClick={handleShuffle}
                className="text-white/80 hover:text-white transition-colors hover:rotate-180 transform duration-300"
              >
                <Shuffle size={24} />
              </button>
            </div>
          </div>

          <div className="flex justify-center mb-4">
            <SwipeableCard 
              key={word.id}
              onSwipe={handleSwipe} 
              disabled={!isFlipped || !onLearningStatusChange || !wordBookId}
            >
              <div 
                className="relative w-64 h-64 cursor-pointer"
                onClick={handleFlip}
              >
                <div className={`absolute inset-0 w-full h-full transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front */}
                <div className="absolute inset-0 w-full h-full backface-hidden">
                  <div className="w-full h-full bg-white/20 backdrop-blur-sm rounded-2xl p-6 flex flex-col items-center justify-center shadow-2xl border border-white/30">
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-3xl font-bold text-white text-center">{word.word}</h2>
                      <SpeechButton text={word.word} language={targetLanguage} size={24} />
                    </div>
                    <p className="text-white/70 text-center text-sm">タップして答えを表示</p>
                  </div>
                </div>

                {/* Back */}
                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
                  <div className="w-full h-full bg-white/20 backdrop-blur-sm rounded-2xl p-6 flex flex-col items-center justify-center shadow-2xl border border-white/30">
                    {word.aiGenerated ? (
                      <div className="text-center space-y-2">
                        <div className="flex items-center gap-2 justify-center">
                          <h3 className="text-xl font-bold text-white">{word.aiGenerated.englishEquivalent}</h3>
                          <SpeechButton text={word.aiGenerated.englishEquivalent} language="en" size={18} />
                        </div>
                        <div className="flex items-center gap-2 justify-center">
                          <p className="text-lg text-white/90">{word.aiGenerated.japaneseEquivalent}</p>
                          <SpeechButton text={word.aiGenerated.japaneseEquivalent} language="ja" size={16} />
                        </div>
                        <p className="text-white/70 text-sm">{word.aiGenerated.pronunciation}</p>
                        <div className="mt-3 p-2 bg-white/20 rounded-lg">
                          <div className="flex items-start gap-2">
                            <p className="text-white/90 text-xs italic flex-1">&ldquo;{word.aiGenerated.exampleSentence}&rdquo;</p>
                            <SpeechButton text={word.aiGenerated.exampleSentence} language={targetLanguage} size={14} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-white/80">AI情報を生成中...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </SwipeableCard>
          </div>

          <div className="flex justify-center gap-4 mb-3">
            <button
              onClick={handlePrevious}
              className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-200 hover:scale-110"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleFlip}
              className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-200 hover:scale-110"
            >
              <RotateCcw size={24} />
            </button>
            <button
              onClick={handleNext}
              className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-200 hover:scale-110"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* 学習状況選択ボタン（フリップされた時のみ表示） */}
          {word.aiGenerated && isFlipped && onLearningStatusChange && wordBookId && (
            <div className="mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 max-w-md mx-auto">
                <h3 className="text-white font-medium mb-2 text-center text-sm">この単語を覚えましたか？</h3>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => handleLearningStatusChange('learned')}
                    className="flex-1 bg-green-500/80 hover:bg-green-500 text-white font-medium py-2 px-2 rounded-md transition-all duration-200 flex items-center justify-center gap-1 hover:scale-105 text-xs"
                  >
                    <Check size={14} />
                    覚えた
                  </button>
                  <button
                    onClick={() => handleLearningStatusChange('uncertain')}
                    className="flex-1 bg-yellow-500/80 hover:bg-yellow-500 text-white font-medium py-2 px-2 rounded-md transition-all duration-200 flex items-center justify-center gap-1 hover:scale-105 text-xs"
                  >
                    <HelpCircle size={14} />
                    怪しい
                  </button>
                  <button
                    onClick={() => handleLearningStatusChange('forgot')}
                    className="flex-1 bg-red-500/80 hover:bg-red-500 text-white font-medium py-2 px-2 rounded-md transition-all duration-200 flex items-center justify-center gap-1 hover:scale-105 text-xs"
                  >
                    <X size={14} />
                    覚えていない
                  </button>
                </div>
              </div>
            </div>
          )}

          {word.aiGenerated && (
            <div className="text-center">
              <button
                onClick={() => setShowDetails(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto transition-all duration-200 hover:scale-105"
              >
                <Info size={20} />
                詳細情報を表示
              </button>
            </div>
          )}

          {/* 自動再生とスワイプの説明 */}
          <div className="mt-3 text-center space-y-1">
            <p className="text-white/60 text-xs">
              {autoPlayEnabled 
                ? '🔊 自動音声再生が有効です' 
                : '🔇 自動音声再生が無効です'
              }
            </p>
            {isFlipped && onLearningStatusChange && wordBookId && (
              <p className="text-white/60 text-xs">
                💡 右スワイプ: 覚えた | 左スワイプ: 覚えていない | 上スワイプ: 怪しい
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};