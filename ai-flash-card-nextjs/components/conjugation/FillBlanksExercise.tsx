'use client';

import React, { useState, useEffect } from 'react';
import { Word, SupportedLanguage } from '@/types';
import { Check, X, RotateCcw, ChevronRight } from 'lucide-react';
import { logger } from '@/utils/logger';
import { useConjugationTracking } from '@/hooks/useConjugationTracking';
import { FilterSettings } from './PracticeFilter';

interface FillBlanksExerciseProps {
  verb: Word;
  targetLanguage?: SupportedLanguage;
  tense: string;
  mood: string;
  onComplete: () => void;
  filterSettings?: FilterSettings;
}

interface ConjugationForm {
  person: string;
  conjugation: string;
  hint?: string;
}

export function FillBlanksExercise({
  verb,
  tense,
  mood,
  onComplete,
  filterSettings
}: FillBlanksExerciseProps) {
  const [blanks, setBlanks] = useState<number[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState<{ [key: number]: boolean }>({});
  const [attempts, setAttempts] = useState<{ [key: number]: number }>({});
  const [conjugations, setConjugations] = useState<ConjugationForm[]>([]);
  const { startTracking, recordAnswer } = useConjugationTracking();

  useEffect(() => {
    // 活用形データを取得
    const verbConjugations = verb.aiGenerated?.grammaticalChanges?.verbConjugations;
    if (!verbConjugations) {
      logger.warn('No verb conjugations found');
      return;
    }
    
    // デバッグ: 活用形データの構造を確認
    logger.info('Verb conjugations structure:', verbConjugations);
    logger.info('Available keys:', Object.keys(verbConjugations));
    logger.info('Selected mood:', mood);
    logger.info('Selected tense:', tense);

    // 時制・法に応じた活用形を取得
    let conjugationData: Record<string, string> | undefined;
    if (mood === 'indicative') {
      // 直接法の場合、複数の可能性のあるキー名をチェック
      let data = verbConjugations[tense];
      
      // 点過去の場合、別の名前で保存されている可能性をチェック
      if (!data && tense === 'preterite') {
        data = verbConjugations['pretérito'] || 
               verbConjugations['preterito'] || 
               verbConjugations['past'] ||
               verbConjugations['pasado'];
        logger.info('Checking alternative keys for preterite:', {
          'pretérito': !!verbConjugations['pretérito'],
          'preterito': !!verbConjugations['preterito'],
          'past': !!verbConjugations['past'],
          'pasado': !!verbConjugations['pasado']
        });
      }
      
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        conjugationData = data as Record<string, string>;
      }
    } else {
      const moodData = verbConjugations[mood];
      if (moodData && typeof moodData === 'object' && !Array.isArray(moodData)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (moodData as Record<string, any>)[tense];
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          conjugationData = data as Record<string, string>;
        }
      }
    }

    if (!conjugationData) {
      logger.warn('No conjugation data for selected tense/mood');
      return;
    }

    // 人称の順序 - AIが生成するキーに合わせる
    const personOrder = [
      'yo', 
      'tú', 
      'él/ella/usted', 
      'él/ella/Ud.',  // 後方互換性のため
      'nosotros/nosotras',
      'nosotros',     // 後方互換性のため
      'vosotros/vosotras',
      'vosotros',     // 後方互換性のため
      'ellos/ellas/ustedes',
      'ellos/ellas/Uds.'  // 後方互換性のため
    ];
    const forms: ConjugationForm[] = [];

    // オブジェクト形式のデータを配列に変換
    if (typeof conjugationData === 'object' && !Array.isArray(conjugationData)) {
      // 既に追加された人称を記録
      const addedPersons = new Set<string>();
      
      personOrder.forEach(person => {
        if (conjugationData[person] && !addedPersons.has(conjugationData[person])) {
          // 表示用の人称名を統一
          let displayPerson = person;
          if (person === 'él/ella/Ud.') displayPerson = 'él/ella/usted';
          if (person === 'nosotros') displayPerson = 'nosotros/nosotras';
          if (person === 'vosotros') displayPerson = 'vosotros/vosotras';
          if (person === 'ellos/ellas/Uds.') displayPerson = 'ellos/ellas/ustedes';
          
          forms.push({
            person: displayPerson,
            conjugation: conjugationData[person],
            hint: conjugationData[person].charAt(0) + '...'
          });
          addedPersons.add(conjugationData[person]);
        }
      });
    }

    setConjugations(forms);

    // 空欄を作成
    const blankIndices: number[] = [];
    
    if (filterSettings?.mode === 'weak' && filterSettings.weakConjugations) {
      // 苦手モード: 現在の動詞・時制・法の苦手な活用形のみを出題
      const personKeys = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'];
      const personMap: { [key: string]: string } = {
        'yo': '1sg',
        'tú': '2sg',
        'él/ella/usted': '3sg',
        'él/ella/Ud.': '3sg',
        'nosotros/nosotras': '1pl',
        'nosotros': '1pl',
        'vosotros/vosotras': '2pl',
        'vosotros': '2pl',
        'ellos/ellas/ustedes': '3pl',
        'ellos/ellas/Uds.': '3pl'
      };
      
      // 現在の動詞・時制・法で苦手な活用形を探す
      forms.forEach((form, index) => {
        const personKey = personMap[form.person] || personKeys[index];
        const isWeak = filterSettings.weakConjugations!.some(weak => 
          weak.word_card_id === verb.id &&
          weak.tense === tense &&
          weak.mood === mood &&
          weak.person === personKey
        );
        
        if (isWeak) {
          blankIndices.push(index);
        }
      });
      
      logger.info('Weak mode blanks:', {
        verbId: verb.id,
        tense,
        mood,
        weakConjugations: filterSettings.weakConjugations.filter(w => w.word_card_id === verb.id),
        blankIndices
      });
      
      // 苦手な活用形がない場合は、通常のランダム選択にフォールバック
      if (blankIndices.length === 0) {
        logger.info('No weak conjugations found for this verb/tense/mood, falling back to random');
        const blankCount = Math.floor(Math.random() * 2) + 2;
        const indices = Array.from({ length: forms.length }, (_, i) => i);
        for (let i = 0; i < blankCount && i < forms.length; i++) {
          const randomIndex = Math.floor(Math.random() * indices.length);
          blankIndices.push(indices.splice(randomIndex, 1)[0]);
        }
      }
    } else {
      // 通常モード: ランダムに2-3個の空欄を作成
      const blankCount = Math.floor(Math.random() * 2) + 2;
      const indices = Array.from({ length: forms.length }, (_, i) => i);
      for (let i = 0; i < blankCount && i < forms.length; i++) {
        const randomIndex = Math.floor(Math.random() * indices.length);
        blankIndices.push(indices.splice(randomIndex, 1)[0]);
      }
    }
    
    setBlanks(blankIndices);
    setUserAnswers({});
    setShowResults({});
    setAttempts({});
  }, [verb, tense, mood, filterSettings]);

  const handleInputChange = (index: number, value: string) => {
    // 初回入力時に時間計測を開始
    if (!userAnswers[index]) {
      startTracking();
    }
    setUserAnswers(prev => ({ ...prev, [index]: value }));
  };

  const checkAnswer = async (index: number) => {
    const userAnswer = userAnswers[index]?.trim();
    const correctAnswer = conjugations[index].conjugation;
    const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
    const currentAttempts = (attempts[index] || 0) + 1;

    setShowResults(prev => ({ ...prev, [index]: isCorrect }));
    setAttempts(prev => ({ ...prev, [index]: currentAttempts }));

    // 学習履歴を保存
    if (verb.id) {
      const personKeys = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'];
      await recordAnswer({
        wordCardId: verb.id,
        practiceType: 'fill-blanks',
        tense,
        mood,
        person: personKeys[index] || `person_${index}`,
        correctAnswer,
        userAnswer,
        isCorrect,
        attempts: currentAttempts
      });
    }

    // すべての空欄が正解したらコンプリート
    if (isCorrect) {
      const allCorrect = blanks.every(i => 
        showResults[i] === true || (i === index && isCorrect)
      );
      if (allCorrect) {
        setTimeout(onComplete, 1500);
      }
    }
  };

  const resetExercise = () => {
    setUserAnswers({});
    setShowResults({});
    setAttempts({});
  };

  if (conjugations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">この時制・法の活用形データがありません。</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {verb.word} - {tense === 'present' ? '現在形' : tense}
        </h3>
        <p className="text-gray-600">空欄に正しい活用形を入力してください。</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 px-4 py-2 bg-gray-50 text-left">人称</th>
              <th className="border border-gray-300 px-4 py-2 bg-gray-50 text-left">活用形</th>
            </tr>
          </thead>
          <tbody>
            {conjugations.map((form, index) => {
              const isBlank = blanks.includes(index);
              const showResult = showResults[index];
              const attempt = attempts[index] || 0;

              return (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2 font-medium">
                    {form.person}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {isBlank ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={userAnswers[index] || ''}
                          onChange={(e) => handleInputChange(index, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              checkAnswer(index);
                            }
                          }}
                          className={`px-3 py-1 border rounded-md flex-1 ${
                            showResult === true
                              ? 'border-green-500 bg-green-50'
                              : showResult === false
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300'
                          }`}
                          placeholder="活用形を入力..."
                          disabled={showResult === true}
                        />
                        {showResult === true && (
                          <Check className="text-green-500" size={20} />
                        )}
                        {showResult === false && (
                          <>
                            <X className="text-red-500" size={20} />
                            <span className="text-sm text-gray-600">
                              正解: {form.conjugation}
                            </span>
                          </>
                        )}
                        {!showResult && attempt > 0 && (
                          <span className="text-sm text-gray-500">
                            ヒント: {form.hint}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="font-medium">{form.conjugation}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={resetExercise}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
        >
          <RotateCcw size={20} />
          リセット
        </button>

        <button
          onClick={onComplete}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          次の動詞へ
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}