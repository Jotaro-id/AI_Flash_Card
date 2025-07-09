'use client';

import React, { useState, useEffect } from 'react';
import { Word, SupportedLanguage } from '@/types';
import { Check, X, RotateCcw, ChevronRight } from 'lucide-react';
import { logger } from '@/utils/logger';

interface FillBlanksExerciseProps {
  verb: Word;
  targetLanguage?: SupportedLanguage;
  tense: string;
  mood: string;
  onComplete: () => void;
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
  onComplete
}: FillBlanksExerciseProps) {
  const [blanks, setBlanks] = useState<number[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState<{ [key: number]: boolean }>({});
  const [attempts, setAttempts] = useState<{ [key: number]: number }>({});
  const [conjugations, setConjugations] = useState<ConjugationForm[]>([]);

  useEffect(() => {
    // 活用形データを取得
    const verbConjugations = verb.aiGenerated?.grammaticalChanges?.verbConjugations;
    if (!verbConjugations) {
      logger.warn('No verb conjugations found');
      return;
    }

    // 時制・法に応じた活用形を取得
    let conjugationData: Record<string, string> | undefined;
    if (mood === 'indicative') {
      const data = verbConjugations[tense];
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

    // 人称の順序
    const personOrder = ['yo', 'tú', 'él/ella/Ud.', 'nosotros', 'vosotros', 'ellos/ellas/Uds.'];
    const forms: ConjugationForm[] = [];

    // オブジェクト形式のデータを配列に変換
    if (typeof conjugationData === 'object' && !Array.isArray(conjugationData)) {
      personOrder.forEach(person => {
        if (conjugationData[person]) {
          forms.push({
            person,
            conjugation: conjugationData[person],
            hint: conjugationData[person].charAt(0) + '...'
          });
        }
      });
    }

    setConjugations(forms);

    // ランダムに2-3個の空欄を作成
    const blankCount = Math.floor(Math.random() * 2) + 2; // 2-3個
    const blankIndices: number[] = [];
    while (blankIndices.length < blankCount && blankIndices.length < forms.length) {
      const index = Math.floor(Math.random() * forms.length);
      if (!blankIndices.includes(index)) {
        blankIndices.push(index);
      }
    }
    setBlanks(blankIndices);
    setUserAnswers({});
    setShowResults({});
    setAttempts({});
  }, [verb, tense, mood]);

  const handleInputChange = (index: number, value: string) => {
    setUserAnswers(prev => ({ ...prev, [index]: value }));
  };

  const checkAnswer = (index: number) => {
    const userAnswer = userAnswers[index]?.trim().toLowerCase();
    const correctAnswer = conjugations[index].conjugation.toLowerCase();
    const isCorrect = userAnswer === correctAnswer;

    setShowResults(prev => ({ ...prev, [index]: isCorrect }));
    setAttempts(prev => ({ ...prev, [index]: (prev[index] || 0) + 1 }));

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