import React, { useState } from 'react';
import { X, Globe, BookOpen, Lightbulb, Languages, Info, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Word, supportedLanguages } from '@/types';
import { SpeechButton } from './SpeechButton';
import { GrammaticalChangesTable } from './GrammaticalChangesTable';

interface WordDetailModalProps {
  word: Word;
  isOpen: boolean;
  onClose: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  targetLanguage?: string;
}

export const WordDetailModal: React.FC<WordDetailModalProps> = ({ word, isOpen, onClose, onRegenerate, isRegenerating, targetLanguage = 'en' }) => {
  const [showJapaneseTranslation, setShowJapaneseTranslation] = useState(false);
  const [showEnglishTranslation, setShowEnglishTranslation] = useState(false);

  if (!isOpen || !word.aiGenerated) return null;

  const aiInfo = word.aiGenerated;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景のオーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* モーダルコンテンツ */}
      <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                {word.word}
                <SpeechButton text={word.word} language="en" size={24} />
              </h2>
              <div className="flex items-center gap-4">
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  {aiInfo.wordClass}
                </span>
                <span className="text-white/80">
                  {aiInfo.pronunciation}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-lg"
                  title="AI情報を再生成"
                >
                  <RefreshCw size={20} className={isRegenerating ? 'animate-spin' : ''} />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* 基本情報 */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-3 text-gray-800">
              <Languages size={20} />
              基本的な意味
            </h3>
            <div className="space-y-3 bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-gray-600 font-medium min-w-[80px]">英語:</span>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-gray-800">{aiInfo.englishEquivalent}</span>
                  <SpeechButton text={aiInfo.englishEquivalent} language="en" size={16} />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-600 font-medium min-w-[80px]">日本語:</span>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-gray-800">{aiInfo.japaneseEquivalent}</span>
                  <SpeechButton text={aiInfo.japaneseEquivalent} language="ja" size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* 段階的表示の例文 */}
          {aiInfo.enhancedExample && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-3 text-gray-800">
                <BookOpen size={20} />
                例文
              </h3>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-5 space-y-4">
                {/* 第1段階: 元言語の例文 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">
                      {supportedLanguages[aiInfo.enhancedExample.originalLanguage]}
                    </span>
                    <SpeechButton 
                      text={aiInfo.enhancedExample.originalSentence} 
                      language={aiInfo.enhancedExample.originalLanguage} 
                      size={16} 
                    />
                  </div>
                  <p className="text-lg text-gray-800 font-medium">
                    {aiInfo.enhancedExample.originalSentence}
                  </p>
                </div>

                {/* 第2段階: 日本語訳を表示/非表示 */}
                <div className="border-t border-gray-200 pt-3">
                  <button
                    onClick={() => setShowJapaneseTranslation(!showJapaneseTranslation)}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors mb-2"
                  >
                    {showJapaneseTranslation ? <EyeOff size={16} /> : <Eye size={16} />}
                    {showJapaneseTranslation ? '日本語訳を隠す' : '日本語訳を見る'}
                  </button>
                  
                  {showJapaneseTranslation && (
                    <div className="bg-white/70 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">🇯🇵 日本語</span>
                        <SpeechButton 
                          text={aiInfo.enhancedExample.japaneseTranslation} 
                          language="ja" 
                          size={14} 
                        />
                      </div>
                      <p className="text-gray-800">{aiInfo.enhancedExample.japaneseTranslation}</p>
                    </div>
                  )}
                </div>

                {/* 第3段階: 英訳を表示/非表示 */}
                {aiInfo.enhancedExample.originalLanguage !== 'en' && (
                  <div className="border-t border-gray-200 pt-3">
                    <button
                      onClick={() => setShowEnglishTranslation(!showEnglishTranslation)}
                      className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors mb-2"
                    >
                      {showEnglishTranslation ? <EyeOff size={16} /> : <Eye size={16} />}
                      {showEnglishTranslation ? '英訳を隠す' : '英訳を見る'}
                    </button>
                    
                    {showEnglishTranslation && (
                      <div className="bg-white/70 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-600">🇬🇧 English</span>
                          <SpeechButton 
                            text={aiInfo.enhancedExample.englishTranslation} 
                            language="en" 
                            size={14} 
                          />
                        </div>
                        <p className="text-gray-800">{aiInfo.enhancedExample.englishTranslation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* フォールバック用の従来の例文表示 */}
          {!aiInfo.enhancedExample && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-3 text-gray-800">
                <BookOpen size={20} />
                例文
              </h3>
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-800 mb-2">{aiInfo.exampleSentence}</p>
                  <SpeechButton text={aiInfo.exampleSentence} language="en" size={16} />
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-gray-800 mb-2">{aiInfo.japaneseExample}</p>
                  <SpeechButton text={aiInfo.japaneseExample} language="ja" size={16} />
                </div>
                {aiInfo.englishExample && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-gray-800 mb-2">{aiInfo.englishExample}</p>
                    <SpeechButton text={aiInfo.englishExample} language="en" size={16} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 文法変化表 */}
          <GrammaticalChangesTable 
            grammaticalChanges={aiInfo.grammaticalChanges}
            wordClass={aiInfo.wordClass}
            targetLanguage={targetLanguage as 'en' | 'ja' | 'es' | 'fr' | 'it' | 'de' | 'zh' | 'ko' | 'auto'}
          />

          {/* 使用上の注意 */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-3 text-gray-800">
              <Lightbulb size={20} />
              使用上の注意・コツ
            </h3>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-gray-800">{aiInfo.usageNotes}</p>
            </div>
          </div>

          {/* 追加情報 */}
          {(aiInfo.tenseInfo || aiInfo.additionalInfo) && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-3 text-gray-800">
                <Info size={20} />
                文法・追加情報
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {aiInfo.tenseInfo && (
                  <p className="text-gray-800">
                    <span className="font-medium">時制:</span> {aiInfo.tenseInfo}
                  </p>
                )}
                {aiInfo.additionalInfo && (
                  <p className="text-gray-800">{aiInfo.additionalInfo}</p>
                )}
              </div>
            </div>
          )}

          {/* 多言語翻訳 */}
          {aiInfo.translations && Object.keys(aiInfo.translations).length > 0 && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-3 text-gray-800">
                <Globe size={20} />
                多言語での表現
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(aiInfo.translations).map(([langCode, translation]) => (
                  translation && (
                    <div key={langCode} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-600">
                          {supportedLanguages[langCode as keyof typeof supportedLanguages]}
                        </span>
                        <SpeechButton 
                          text={translation} 
                          language={langCode as 'es' | 'fr' | 'de' | 'it' | 'zh' | 'ko'} 
                          size={14} 
                        />
                      </div>
                      <p className="text-gray-800">{translation}</p>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* 多言語例文 */}
          {aiInfo.multilingualExamples && Object.keys(aiInfo.multilingualExamples).length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-3 text-gray-800">
                <BookOpen size={20} />
                多言語での例文
              </h3>
              <div className="space-y-3">
                {Object.entries(aiInfo.multilingualExamples).map(([langCode, example]) => (
                  example && (
                    <div key={langCode} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">
                          {supportedLanguages[langCode as keyof typeof supportedLanguages]}
                        </span>
                        <SpeechButton 
                          text={example} 
                          language={langCode as 'es' | 'fr' | 'de' | 'it' | 'zh' | 'ko'} 
                          size={16} 
                        />
                      </div>
                      <p className="text-gray-800">{example}</p>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};