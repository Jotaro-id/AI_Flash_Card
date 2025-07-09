'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Filter, BookOpen, FileText, Brain } from 'lucide-react';
import { VocabularyFile, Word, SupportedLanguage } from '@/types';
import { FillBlanksExercise } from './conjugation/FillBlanksExercise';
import { SpellInputExercise } from './conjugation/SpellInputExercise';
import { TenseMoodSelector } from './conjugation/TenseMoodSelector';
import { logger } from '@/utils/logger';

interface VerbConjugationContainerProps {
  vocabularyFile: VocabularyFile;
  onBack: () => void;
  targetLanguage: SupportedLanguage;
}

type PracticeType = 'fill-blanks' | 'spell-input' | 'multiple-choice';

export function VerbConjugationContainer({ 
  vocabularyFile, 
  onBack,
  targetLanguage 
}: VerbConjugationContainerProps) {
  const [verbs, setVerbs] = useState<Word[]>([]);
  const [currentVerb, setCurrentVerb] = useState<Word | null>(null);
  const [practiceType, setPracticeType] = useState<PracticeType>('fill-blanks');
  const [selectedTense, setSelectedTense] = useState<string>('present');
  const [selectedMood, setSelectedMood] = useState<string>('indicative');
  
  useEffect(() => {
    // 動詞のみをフィルタリング
    const filteredVerbs = vocabularyFile.words.filter(
      word => word.aiGenerated?.wordClass === 'verb'
    );
    logger.info('Filtered verbs:', { count: filteredVerbs.length });
    setVerbs(filteredVerbs);
    
    if (filteredVerbs.length > 0) {
      setCurrentVerb(filteredVerbs[0]);
      // デバッグ: 最初の動詞の活用データを確認
      logger.info('First verb conjugation data:', filteredVerbs[0].aiGenerated?.grammaticalChanges?.verbConjugations);
    }
  }, [vocabularyFile]);

  const handleNextVerb = () => {
    const currentIndex = verbs.findIndex(v => v.id === currentVerb?.id);
    const nextIndex = (currentIndex + 1) % verbs.length;
    setCurrentVerb(verbs[nextIndex]);
  };

  const handlePracticeTypeChange = (type: PracticeType) => {
    setPracticeType(type);
  };

  if (verbs.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={20} />
          <span>戻る</span>
        </button>
        
        <div className="text-center py-12">
          <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">動詞が見つかりません</h2>
          <p className="text-gray-600">この単語帳には動詞が登録されていません。</p>
          <p className="text-gray-600 mt-2">単語を追加してAI情報を生成してください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={20} />
          <span>戻る</span>
        </button>
        
        <h1 className="text-2xl font-bold text-gray-800">動詞活用練習</h1>
        
        <div className="text-sm text-gray-600">
          {verbs.indexOf(currentVerb!) + 1} / {verbs.length}
        </div>
      </div>

      {/* 練習タイプ選択 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">練習タイプを選択</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handlePracticeTypeChange('fill-blanks')}
            className={`p-4 rounded-lg border-2 transition-all ${
              practiceType === 'fill-blanks'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <BookOpen className="w-8 h-8 mx-auto mb-2" />
            <h3 className="font-semibold">活用表穴埋め</h3>
            <p className="text-sm text-gray-600 mt-1">活用表の空欄を埋める</p>
          </button>
          
          <button
            onClick={() => handlePracticeTypeChange('spell-input')}
            className={`p-4 rounded-lg border-2 transition-all ${
              practiceType === 'spell-input'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <FileText className="w-8 h-8 mx-auto mb-2" />
            <h3 className="font-semibold">スペル入力</h3>
            <p className="text-sm text-gray-600 mt-1">活用形を入力する</p>
          </button>
          
          <button
            onClick={() => handlePracticeTypeChange('multiple-choice')}
            className={`p-4 rounded-lg border-2 transition-all ${
              practiceType === 'multiple-choice'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            disabled
          >
            <Brain className="w-8 h-8 mx-auto mb-2" />
            <h3 className="font-semibold">選択式クイズ</h3>
            <p className="text-sm text-gray-600 mt-1">準備中</p>
          </button>
        </div>
      </div>

      {/* 時制・法選択 */}
      <TenseMoodSelector
        targetLanguage={targetLanguage}
        selectedTense={selectedTense}
        selectedMood={selectedMood}
        onTenseChange={setSelectedTense}
        onMoodChange={setSelectedMood}
        availableConjugations={currentVerb?.aiGenerated?.grammaticalChanges?.verbConjugations || {}}
      />

      {/* 練習エリア */}
      <div className="bg-white rounded-lg shadow p-6">
        {currentVerb && (
          <>
            {practiceType === 'fill-blanks' && (
              <FillBlanksExercise
                verb={currentVerb}
                targetLanguage={targetLanguage}
                tense={selectedTense}
                mood={selectedMood}
                onComplete={handleNextVerb}
              />
            )}
            
            {practiceType === 'spell-input' && (
              <SpellInputExercise
                verb={currentVerb}
                targetLanguage={targetLanguage}
                tense={selectedTense}
                mood={selectedMood}
                onComplete={handleNextVerb}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}