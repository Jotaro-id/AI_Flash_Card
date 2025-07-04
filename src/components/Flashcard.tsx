import React, { useState, useEffect } from 'react';
import { RotateCcw, ChevronLeft, ChevronRight, Shuffle, Info } from 'lucide-react';
import { Word, ColorTheme } from '../types';
import { ThemeSelector } from './ThemeSelector';
import { SpeechButton } from './SpeechButton';
import { speechService } from '../services/speechService';

interface FlashcardProps {
  word: Word;
  currentIndex: number;
  totalWords: number;
  onNext: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  onBack: () => void;
  currentTheme: ColorTheme;
  availableThemes: ColorTheme[];
  onThemeChange: (themeId: string) => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  word,
  currentIndex,
  totalWords,
  onNext,
  onPrevious,
  onShuffle,
  onBack,
  currentTheme,
  availableThemes,
  onThemeChange
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);

  // カードが変更されたときに自動音声再生
  useEffect(() => {
    if (autoPlayEnabled && word && speechService.isSupported()) {
      const playAudio = async () => {
        try {
          // 少し遅延を入れてからカードの単語を再生
          await new Promise(resolve => setTimeout(resolve, 500));
          const detectedLanguage = speechService.detectLanguage(word.word);
          await speechService.speak(word.word, detectedLanguage);
        } catch (error) {
          console.error('Auto speech playback failed:', error);
        }
      };
      
      playAudio();
    }
  }, [word.id, word, autoPlayEnabled]); // word.idが変更されたときに実行

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
          const detectedLanguage = speechService.detectLanguage(word.word);
          await speechService.speak(word.word, detectedLanguage);
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
                <SpeechButton text={word.word} language="auto" size={24} />
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
                    <SpeechButton text={word.aiGenerated.exampleSentence} language="en" size={16} />
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

              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">AI生成データ (JSON)</h3>
                <pre className="text-white/80 text-sm bg-black/20 p-3 rounded overflow-x-auto">
                  {JSON.stringify(word.aiGenerated, null, 2)}
                </pre>
              </div>
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

          <div className="flex justify-center mb-8">
            <div 
              className="relative w-80 h-80 cursor-pointer"
              onClick={handleFlip}
            >
              <div className={`absolute inset-0 w-full h-full transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front */}
                <div className="absolute inset-0 w-full h-full backface-hidden">
                  <div className="w-full h-full bg-white/20 backdrop-blur-sm rounded-2xl p-8 flex flex-col items-center justify-center shadow-2xl border border-white/30">
                    <div className="flex items-center gap-4 mb-4">
                      <h2 className="text-4xl font-bold text-white text-center">{word.word}</h2>
                      <SpeechButton text={word.word} language="auto" size={28} />
                    </div>
                    <p className="text-white/70 text-center">タップして答えを表示</p>
                  </div>
                </div>

                {/* Back */}
                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
                  <div className="w-full h-full bg-white/20 backdrop-blur-sm rounded-2xl p-8 flex flex-col items-center justify-center shadow-2xl border border-white/30">
                    {word.aiGenerated ? (
                      <div className="text-center space-y-3">
                        <div className="flex items-center gap-3 justify-center">
                          <h3 className="text-2xl font-bold text-white">{word.aiGenerated.englishEquivalent}</h3>
                          <SpeechButton text={word.aiGenerated.englishEquivalent} language="en" size={20} />
                        </div>
                        <div className="flex items-center gap-3 justify-center">
                          <p className="text-xl text-white/90">{word.aiGenerated.japaneseEquivalent}</p>
                          <SpeechButton text={word.aiGenerated.japaneseEquivalent} language="ja" size={18} />
                        </div>
                        <p className="text-white/70">{word.aiGenerated.pronunciation}</p>
                        <div className="mt-4 p-3 bg-white/20 rounded-lg">
                          <div className="flex items-start gap-2">
                            <p className="text-white/90 text-sm italic flex-1">"{word.aiGenerated.exampleSentence}"</p>
                            <SpeechButton text={word.aiGenerated.exampleSentence} language="en" size={16} />
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
          </div>

          <div className="flex justify-center gap-4 mb-6">
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

          {/* 自動再生の説明 */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              {autoPlayEnabled 
                ? '🔊 自動音声再生が有効です（カード表示時とフリップ時に自動再生）' 
                : '🔇 自動音声再生が無効です（手動で音声ボタンをクリックしてください）'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};