import React from 'react';
import { X, Globe, BookOpen, Lightbulb, Languages, Info } from 'lucide-react';
import { Word, supportedLanguages } from '../types';
import { SpeechButton } from './SpeechButton';

interface WordDetailModalProps {
  word: Word;
  isOpen: boolean;
  onClose: () => void;
}

export const WordDetailModal: React.FC<WordDetailModalProps> = ({ word, isOpen, onClose }) => {
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
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
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

          {/* 例文 */}
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