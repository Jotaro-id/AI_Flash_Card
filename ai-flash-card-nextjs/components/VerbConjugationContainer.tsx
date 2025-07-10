'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Filter, BookOpen, FileText, Brain, ChevronRight } from 'lucide-react';
import { VocabularyFile, Word, SupportedLanguage } from '@/types';
import { FillBlanksExercise } from './conjugation/FillBlanksExercise';
import { SpellInputExercise } from './conjugation/SpellInputExercise';
import { TenseMoodSelector } from './conjugation/TenseMoodSelector';
import { PracticeFilter, FilterSettings } from './conjugation/PracticeFilter';
import { conjugationHistoryService } from '@/services/conjugationHistoryLocalService';
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
  const [filteredVerbs, setFilteredVerbs] = useState<Word[]>([]);
  const [currentVerb, setCurrentVerb] = useState<Word | null>(null);
  const [practiceType, setPracticeType] = useState<PracticeType>('fill-blanks');
  const [selectedTense, setSelectedTense] = useState<string>('present');
  const [selectedMood, setSelectedMood] = useState<string>('indicative');
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    mode: 'all',
    accuracyThreshold: 80
  });
  const [showFilter, setShowFilter] = useState(false);
  
  useEffect(() => {
    // 動詞のみをフィルタリング（原型でない動詞は除外）
    const filteredVerbs = vocabularyFile.words.filter(
      word => {
        // 動詞であることを確認
        if (word.aiGenerated?.wordClass !== 'verb') return false;
        
        // 原型でない動詞を除外するチェック
        const wordText = word.word.toLowerCase();
        
        // 活用された形の特徴的なパターンを除外
        // スペイン語の活用語尾パターン
        const conjugatedPatterns = [
          /ío$/, // río のような過去形
          /ía$/, // 未完了過去形
          /ieron$/, // 3人称複数過去形
          /imos$/, // 1人称複数形
          /éis$/, // 2人称複数形
          /ando$/, // 現在分詞
          /iendo$/, // 現在分詞
          /ado$/, // 過去分詞
          /ido$/, // 過去分詞
        ];
        
        // 活用形のパターンにマッチする場合は除外
        const isConjugated = conjugatedPatterns.some(pattern => pattern.test(wordText));
        if (isConjugated) {
          logger.info(`Excluding conjugated verb: ${word.word}`);
          return false;
        }
        
        // 動詞の原型の典型的な語尾をチェック（スペイン語）
        const infinitivePatterns = [/ar$/, /er$/, /ir$/];
        const isInfinitive = infinitivePatterns.some(pattern => pattern.test(wordText));
        
        // 原型でない場合は除外
        if (!isInfinitive && targetLanguage === 'es') {
          logger.info(`Excluding non-infinitive verb: ${word.word}`);
          return false;
        }
        
        return true;
      }
    );
    logger.info('Filtered verbs:', { count: filteredVerbs.length });
    setVerbs(filteredVerbs);
    setFilteredVerbs(filteredVerbs); // 初期状態では全ての動詞を表示
    
    if (filteredVerbs.length > 0) {
      setCurrentVerb(filteredVerbs[0]);
      // デバッグ: 最初の動詞の活用データを確認
      logger.info('First verb conjugation data:', filteredVerbs[0].aiGenerated?.grammaticalChanges?.verbConjugations);
    }
  }, [vocabularyFile, targetLanguage]);

  // フィルター設定に基づいて動詞をフィルタリング
  useEffect(() => {
    const applyFilter = async () => {
      if (filterSettings.mode === 'all') {
        setFilteredVerbs(verbs);
        return;
      }

      try {
        // 統計情報を取得
        const stats = await conjugationHistoryService.getUserStats();
        const verbIds = verbs.map(v => v.id).filter(Boolean);
        
        logger.info('Filter debug:', {
          totalVerbs: verbs.length,
          verbIds: verbIds.length,
          totalStats: stats.length
        });
        
        const relevantStats = stats.filter(stat => verbIds.includes(stat.word_card_id));
        
        logger.info('Relevant stats:', {
          count: relevantStats.length,
          failedCount: relevantStats.filter(s => s.has_failed).length
        });

        let filtered = verbs;

        if (filterSettings.mode === 'weak') {
          // 苦手な動詞のみ（その動詞の任意の活用形で一度でも失敗したか、正答率が閾値以下）
          const weakVerbIds = new Set<string>();
          relevantStats
            .filter(stat => stat.has_failed || stat.accuracy_rate < filterSettings.accuracyThreshold)
            .forEach(stat => weakVerbIds.add(stat.word_card_id));
          
          logger.info('Weak verb IDs:', Array.from(weakVerbIds));
          
          filtered = verbs.filter(v => v.id && weakVerbIds.has(v.id));
          
          logger.info('Filtered verbs:', filtered.length);
        } else if (filterSettings.mode === 'due') {
          // 復習が必要な動詞のみ
          const now = new Date();
          const dueVerbIds = relevantStats
            .filter(stat => stat.next_review_at && new Date(stat.next_review_at) <= now)
            .map(stat => stat.word_card_id);
          filtered = verbs.filter(v => v.id && dueVerbIds.includes(v.id));
        } else if (filterSettings.mode === 'custom') {
          // カスタムフィルター（現在は全ての動詞を表示）
          // TODO: 履歴データから詳細なフィルタリングを実装
          filtered = verbs;
        }

        setFilteredVerbs(filtered);
        if (filtered.length > 0 && !filtered.find(v => v.id === currentVerb?.id)) {
          setCurrentVerb(filtered[0]);
        }
      } catch (error) {
        logger.error('Failed to apply filter:', error);
        setFilteredVerbs(verbs);
      }
    };

    applyFilter();
  }, [filterSettings, verbs, currentVerb]);

  const handleNextVerb = () => {
    const currentIndex = filteredVerbs.findIndex(v => v.id === currentVerb?.id);
    const nextIndex = (currentIndex + 1) % filteredVerbs.length;
    setCurrentVerb(filteredVerbs[nextIndex]);
  };

  const handlePreviousVerb = () => {
    const currentIndex = filteredVerbs.findIndex(v => v.id === currentVerb?.id);
    const prevIndex = currentIndex - 1 < 0 ? filteredVerbs.length - 1 : currentIndex - 1;
    setCurrentVerb(filteredVerbs[prevIndex]);
  };

  const handleFilterChange = (settings: FilterSettings) => {
    setFilterSettings(settings);
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
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`p-2 rounded-lg transition-colors ${
              showFilter 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
            title="フィルター"
          >
            <Filter size={20} />
          </button>
          <button
            onClick={handlePreviousVerb}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="前の動詞"
            disabled={filteredVerbs.length === 0}
          >
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <span className="text-sm text-gray-600">
            {filteredVerbs.length > 0 ? filteredVerbs.indexOf(currentVerb!) + 1 : 0} / {filteredVerbs.length}
            {filterSettings.mode !== 'all' && ` (全{verbs.length}個中)`}
          </span>
          <button
            onClick={handleNextVerb}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="次の動詞"
            disabled={filteredVerbs.length === 0}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* フィルター */}
      {showFilter && (
        <PracticeFilter
          onFilterChange={handleFilterChange}
          wordCardIds={verbs.map(v => v.id).filter(Boolean) as string[]}
        />
      )}

      {/* フィルタリング結果の表示 */}
      {filterSettings.mode !== 'all' && filteredVerbs.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            フィルター条件に一致する動詞がありません。
            {filterSettings.mode === 'weak' && 'まずいくつかの動詞を練習してからお試しください。'}
            {filterSettings.mode === 'due' && '復習が必要な動詞はまだありません。'}
          </p>
        </div>
      )}

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
        {currentVerb && filteredVerbs.length > 0 ? (
          <>
            {practiceType === 'fill-blanks' && (
              <FillBlanksExercise
                verb={currentVerb}
                targetLanguage={targetLanguage}
                tense={selectedTense}
                mood={selectedMood}
                onComplete={handleNextVerb}
                filterSettings={filterSettings}
                currentIndex={filteredVerbs.findIndex(v => v.id === currentVerb?.id)}
                totalCount={filteredVerbs.length}
                onPrevious={handlePreviousVerb}
                onNext={handleNextVerb}
              />
            )}
            
            {practiceType === 'spell-input' && (
              <SpellInputExercise
                verb={currentVerb}
                targetLanguage={targetLanguage}
                tense={selectedTense}
                mood={selectedMood}
                onComplete={handleNextVerb}
                filterSettings={filterSettings}
                currentVerbIndex={filteredVerbs.findIndex(v => v.id === currentVerb?.id)}
                totalVerbCount={filteredVerbs.length}
                onPreviousVerb={handlePreviousVerb}
                onNextVerb={handleNextVerb}
              />
            )}
          </>
        ) : filterSettings.mode !== 'all' ? (
          <div className="text-center py-8">
            <p className="text-gray-600">フィルター条件に一致する動詞がありません。</p>
            <button
              onClick={() => setFilterSettings({ mode: 'all', accuracyThreshold: 80 })}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              フィルターを解除
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}