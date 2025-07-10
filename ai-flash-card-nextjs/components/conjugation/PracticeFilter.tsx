'use client';

import React, { useState, useEffect } from 'react';
import { Filter, BarChart3, Target, Clock } from 'lucide-react';
import { conjugationHistoryService, ConjugationStats } from '@/services/conjugationHistoryService';
import { logger } from '@/utils/logger';

interface PracticeFilterProps {
  onFilterChange: (filter: FilterSettings) => void;
  wordCardIds?: string[];
}

export interface FilterSettings {
  mode: 'all' | 'weak' | 'due' | 'custom';
  accuracyThreshold: number;
  includeTenses?: string[];
  includeMoods?: string[];
  includePersons?: string[];
}

export function PracticeFilter({ onFilterChange, wordCardIds }: PracticeFilterProps) {
  const [filterMode, setFilterMode] = useState<FilterSettings['mode']>('all');
  const [accuracyThreshold, setAccuracyThreshold] = useState(80);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stats, setStats] = useState<ConjugationStats[]>([]);
  const [loading, setLoading] = useState(false);

  // 選択可能なオプション
  const availableTenses = ['present', 'preterite', 'imperfect', 'future', 'conditional'];
  const availableMoods = ['indicative', 'subjunctive', 'imperative'];
  const availablePersons = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'];

  const [selectedTenses, setSelectedTenses] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);

  useEffect(() => {
    loadStats();
  }, [wordCardIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStats = async () => {
    setLoading(true);
    try {
      const allStats = await conjugationHistoryService.getUserStats();
      
      // wordCardIdsが指定されている場合はフィルタリング
      const filteredStats = wordCardIds 
        ? allStats.filter(stat => wordCardIds.includes(stat.word_card_id))
        : allStats;
      
      setStats(filteredStats);
    } catch (error) {
      logger.error('Failed to load conjugation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterModeChange = (mode: FilterSettings['mode']) => {
    setFilterMode(mode);
    updateFilter(mode, accuracyThreshold);
  };

  const handleAccuracyThresholdChange = (value: number) => {
    setAccuracyThreshold(value);
    if (filterMode === 'weak') {
      updateFilter(filterMode, value);
    }
  };

  const updateFilter = (
    mode: FilterSettings['mode'], 
    threshold: number = accuracyThreshold
  ) => {
    const settings: FilterSettings = {
      mode,
      accuracyThreshold: threshold,
      includeTenses: selectedTenses.length > 0 ? selectedTenses : undefined,
      includeMoods: selectedMoods.length > 0 ? selectedMoods : undefined,
      includePersons: selectedPersons.length > 0 ? selectedPersons : undefined
    };
    
    onFilterChange(settings);
  };

  const getWeakCount = () => {
    return stats.filter(stat => stat.accuracy_rate < accuracyThreshold).length;
  };

  const getDueCount = () => {
    const now = new Date();
    return stats.filter(stat => new Date(stat.next_review_at) <= now).length;
  };

  const toggleTense = (tense: string) => {
    const newTenses = selectedTenses.includes(tense)
      ? selectedTenses.filter(t => t !== tense)
      : [...selectedTenses, tense];
    setSelectedTenses(newTenses);
    
    if (filterMode === 'custom') {
      updateFilter(filterMode);
    }
  };

  const toggleMood = (mood: string) => {
    const newMoods = selectedMoods.includes(mood)
      ? selectedMoods.filter(m => m !== mood)
      : [...selectedMoods, mood];
    setSelectedMoods(newMoods);
    
    if (filterMode === 'custom') {
      updateFilter(filterMode);
    }
  };

  const togglePerson = (person: string) => {
    const newPersons = selectedPersons.includes(person)
      ? selectedPersons.filter(p => p !== person)
      : [...selectedPersons, person];
    setSelectedPersons(newPersons);
    
    if (filterMode === 'custom') {
      updateFilter(filterMode);
    }
  };

  const getTenseLabel = (tense: string) => {
    const labels: { [key: string]: string } = {
      present: '現在形',
      preterite: '点過去',
      imperfect: '線過去',
      future: '未来形',
      conditional: '過去未来'
    };
    return labels[tense] || tense;
  };

  const getMoodLabel = (mood: string) => {
    const labels: { [key: string]: string } = {
      indicative: '直説法',
      subjunctive: '接続法',
      imperative: '命令法'
    };
    return labels[mood] || mood;
  };

  const getPersonLabel = (person: string) => {
    const labels: { [key: string]: string } = {
      '1sg': '私（単数）',
      '2sg': '君（単数）',
      '3sg': '彼/彼女（単数）',
      '1pl': '私達（複数）',
      '2pl': '君達（複数）',
      '3pl': '彼ら/彼女ら（複数）'
    };
    return labels[person] || person;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold">練習フィルター</h2>
      </div>

      {/* フィルターモード選択 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <button
          onClick={() => handleFilterModeChange('all')}
          className={`p-3 rounded-lg border-2 transition-all text-sm ${
            filterMode === 'all'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <Filter className="w-5 h-5" />
            <span className="font-medium">すべて</span>
          </div>
        </button>

        <button
          onClick={() => handleFilterModeChange('weak')}
          className={`p-3 rounded-lg border-2 transition-all text-sm ${
            filterMode === 'weak'
              ? 'border-red-500 bg-red-50 text-red-700'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          disabled={loading}
        >
          <div className="flex flex-col items-center gap-1">
            <Target className="w-5 h-5" />
            <span className="font-medium">苦手</span>
            {!loading && (
              <span className="text-xs">({getWeakCount()}問)</span>
            )}
          </div>
        </button>

        <button
          onClick={() => handleFilterModeChange('due')}
          className={`p-3 rounded-lg border-2 transition-all text-sm ${
            filterMode === 'due'
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          disabled={loading}
        >
          <div className="flex flex-col items-center gap-1">
            <Clock className="w-5 h-5" />
            <span className="font-medium">復習</span>
            {!loading && (
              <span className="text-xs">({getDueCount()}問)</span>
            )}
          </div>
        </button>

        <button
          onClick={() => handleFilterModeChange('custom')}
          className={`p-3 rounded-lg border-2 transition-all text-sm ${
            filterMode === 'custom'
              ? 'border-purple-500 bg-purple-50 text-purple-700'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">カスタム</span>
          </div>
        </button>
      </div>

      {/* 苦手モードの閾値設定 */}
      {filterMode === 'weak' && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              正答率の閾値
            </label>
            <span className="text-sm font-semibold text-gray-900">
              {accuracyThreshold}%以下
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={accuracyThreshold}
            onChange={(e) => handleAccuracyThresholdChange(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* カスタムモードの詳細設定 */}
      {filterMode === 'custom' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAdvanced ? '詳細設定を隠す' : '詳細設定を表示'}
          </button>

          {showAdvanced && (
            <>
              {/* 時制選択 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">時制</h3>
                <div className="flex flex-wrap gap-2">
                  {availableTenses.map(tense => (
                    <label key={tense} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={selectedTenses.includes(tense)}
                        onChange={() => toggleTense(tense)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">{getTenseLabel(tense)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 法選択 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">法</h3>
                <div className="flex flex-wrap gap-2">
                  {availableMoods.map(mood => (
                    <label key={mood} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={selectedMoods.includes(mood)}
                        onChange={() => toggleMood(mood)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">{getMoodLabel(mood)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 人称選択 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">人称</h3>
                <div className="grid grid-cols-2 gap-2">
                  {availablePersons.map(person => (
                    <label key={person} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={selectedPersons.includes(person)}
                        onChange={() => togglePerson(person)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">{getPersonLabel(person)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 統計情報 */}
      {!loading && stats.length > 0 && (
        <div className="mt-4 pt-4 border-t text-sm text-gray-600">
          <p>総練習回数: {stats.reduce((sum, stat) => sum + stat.total_attempts, 0)}回</p>
          <p>
            全体正答率: {
              Math.round(
                stats.reduce((sum, stat) => sum + stat.accuracy_rate * stat.total_attempts, 0) /
                stats.reduce((sum, stat) => sum + stat.total_attempts, 0)
              )
            }%
          </p>
        </div>
      )}
    </div>
  );
}