'use client';

import React from 'react';
import { SupportedLanguage } from '@/types';

interface TenseMoodSelectorProps {
  targetLanguage: SupportedLanguage;
  selectedTense: string;
  selectedMood: string;
  onTenseChange: (tense: string) => void;
  onMoodChange: (mood: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availableConjugations: any;
}

const tenseOptions: Record<string, Record<string, Record<string, string>>> = {
  es: {
    indicative: {
      present: '現在形',
      preterite: '点過去',
      imperfect: '線過去',
      future: '未来形',
      conditional: '過去未来',
      presentPerfect: '現在完了',
      pastPerfect: '過去完了',
      futurePerfect: '未来完了'
    },
    subjunctive: {
      present: '接続法現在',
      imperfect: '接続法過去',
      presentPerfect: '接続法現在完了',
      pastPerfect: '接続法過去完了'
    },
    imperative: {
      affirmative: '命令法肯定',
      negative: '命令法否定'
    }
  },
  fr: {
    indicative: {
      present: '現在形',
      imparfait: '半過去',
      passeSimple: '単純過去',
      futur: '単純未来',
      passeCompose: '複合過去',
      plusQueParfait: '大過去',
      futurAnterieur: '前未来'
    },
    subjunctive: {
      present: '接続法現在',
      imparfait: '接続法半過去',
      passe: '接続法過去',
      plusQueParfait: '接続法大過去'
    },
    conditional: {
      present: '条件法現在',
      passe: '条件法過去'
    },
    imperative: {
      present: '命令法'
    }
  },
  en: {
    indicative: {
      present: '現在形',
      past: '過去形',
      future: '未来形',
      presentPerfect: '現在完了',
      pastPerfect: '過去完了',
      futurePerfect: '未来完了'
    }
  },
  de: {
    indicative: {
      present: '現在形',
      preterite: '過去形',
      perfect: '現在完了',
      pluperfect: '過去完了',
      future: '未来形',
      futurePerfect: '未来完了'
    },
    subjunctive: {
      presentI: '接続法第一式',
      presentII: '接続法第二式',
      pastI: '接続法第一式過去',
      pastII: '接続法第二式過去'
    },
    imperative: {
      present: '命令法'
    }
  }
};

export function TenseMoodSelector({
  targetLanguage,
  selectedTense,
  selectedMood,
  onTenseChange,
  onMoodChange,
  availableConjugations
}: TenseMoodSelectorProps) {
  // デバッグ: 利用可能な活用形を確認
  console.log('[TenseMoodSelector] Available conjugations:', availableConjugations);
  console.log('[TenseMoodSelector] Available conjugation keys:', Object.keys(availableConjugations || {}));
  
  const languageTenses = tenseOptions[targetLanguage] || tenseOptions.en;
  const moods = Object.keys(languageTenses);
  const currentMoodTenses = languageTenses[selectedMood as keyof typeof languageTenses] || {};

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">時制・法を選択</h2>
      
      {/* 法の選択 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">法</label>
        <div className="flex flex-wrap gap-2">
          {moods.map((mood) => (
            <button
              key={mood}
              onClick={() => {
                onMoodChange(mood);
                // 法を変更したら、その法の最初の時制を選択
                const moodTenses = languageTenses[mood as keyof typeof languageTenses];
                if (moodTenses) {
                  const firstTense = Object.keys(moodTenses)[0];
                  onTenseChange(firstTense);
                }
              }}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMood === mood
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {mood === 'indicative' ? '直接法' :
               mood === 'subjunctive' ? '接続法' :
               mood === 'imperative' ? '命令法' :
               mood === 'conditional' ? '条件法' : mood}
            </button>
          ))}
        </div>
      </div>

      {/* 時制の選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">時制</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(currentMoodTenses).map(([tense, label]) => {
            // 利用可能な活用形かチェック
            // 直接法の場合はトップレベルをチェック、それ以外は法の下をチェック
            let isAvailable = false;
            
            if (selectedMood === 'indicative') {
              // 直接法の場合、トップレベルのキーをチェック
              isAvailable = !!availableConjugations?.[tense];
              
              // もしなければ、別の可能性のあるキー名もチェック
              if (!isAvailable && tense === 'preterite') {
                // スペイン語の点過去は別の名前で保存されている可能性
                isAvailable = !!availableConjugations?.['pretérito'] || 
                            !!availableConjugations?.['preterito'] ||
                            !!availableConjugations?.['past'] ||
                            !!availableConjugations?.['pasado'];
              }
            } else {
              // その他の法の場合
              isAvailable = !!availableConjugations?.[selectedMood]?.[tense];
            }
            
            console.log(`[TenseMoodSelector] Checking ${selectedMood} ${tense}: ${isAvailable}`);
            
            return (
              <button
                key={tense}
                onClick={() => onTenseChange(tense)}
                disabled={!isAvailable}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedTense === tense
                    ? 'bg-blue-500 text-white'
                    : isAvailable
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}