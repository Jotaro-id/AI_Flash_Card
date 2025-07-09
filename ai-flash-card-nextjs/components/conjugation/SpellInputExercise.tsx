'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Word, SupportedLanguage } from '@/types';
import { Check, X, RotateCcw, ChevronRight, Info } from 'lucide-react';
import { logger } from '@/utils/logger';

interface SpellInputExerciseProps {
  verb: Word;
  targetLanguage?: SupportedLanguage;
  tense: string;
  mood: string;
  onComplete: () => void;
}

interface Question {
  person: string;
  correctAnswer: string;
  hint: string;
}

export function SpellInputExercise({
  verb,
  tense,
  mood,
  onComplete
}: SpellInputExerciseProps) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [usedQuestions, setUsedQuestions] = useState<number[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionHistory, setQuestionHistory] = useState<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectQuestion = useCallback((questionIndex: number) => {
    if (questions.length === 0) return;
    
    setCurrentQuestion(questions[questionIndex]);
    setUserAnswer('');
    setShowResult(null);
    setAttempts(0);
    
    // 入力フィールドにフォーカス
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [questions]);

  const selectNextQuestion = useCallback((availableQuestions: Question[]) => {
    const remainingIndices = availableQuestions
      .map((_, index) => index)
      .filter(index => !usedQuestions.includes(index));

    if (remainingIndices.length === 0) {
      // すべての問題を解いた
      setTimeout(onComplete, 1500);
      return;
    }

    const randomIndex = remainingIndices[Math.floor(Math.random() * remainingIndices.length)];
    const newHistory = [...questionHistory, randomIndex];
    
    setCurrentQuestionIndex(newHistory.length - 1);
    setQuestionHistory(newHistory);
    setUsedQuestions([...usedQuestions, randomIndex]);
    selectQuestion(randomIndex);
  }, [onComplete, questionHistory, usedQuestions, selectQuestion]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      selectQuestion(questionHistory[prevIndex]);
    }
  }, [currentQuestionIndex, questionHistory, selectQuestion]);

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questionHistory.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      selectQuestion(questionHistory[nextIndex]);
    } else {
      selectNextQuestion(questions);
    }
  }, [currentQuestionIndex, questionHistory, questions, selectQuestion, selectNextQuestion]);

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

    // 人称の順序
    const personOrder = ['yo', 'tú', 'él/ella/Ud.', 'nosotros', 'vosotros', 'ellos/ellas/Uds.'];
    const newQuestions: Question[] = [];

    // オブジェクト形式のデータを配列に変換
    if (typeof conjugationData === 'object' && !Array.isArray(conjugationData)) {
      personOrder.forEach(person => {
        if (conjugationData[person]) {
          newQuestions.push({
            person,
            correctAnswer: conjugationData[person],
            hint: conjugationData[person].slice(0, 2) + '...'
          });
        }
      });
    }

    setQuestions(newQuestions);
    setTotalQuestions(newQuestions.length);
    setUsedQuestions([]);
    setCorrectCount(0);
    setQuestionHistory([]);
    setCurrentQuestionIndex(0);
    
    // 最初の問題を選択
    if (newQuestions.length > 0) {
      const firstIndex = Math.floor(Math.random() * newQuestions.length);
      setQuestionHistory([firstIndex]);
      setUsedQuestions([firstIndex]);
      selectQuestion(firstIndex);
    }
  }, [verb, tense, mood, selectQuestion]);

  const checkAnswer = () => {
    if (!currentQuestion || !userAnswer.trim()) return;

    const isCorrect = userAnswer.trim().toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
    setShowResult(isCorrect);
    setAttempts(attempts + 1);

    if (isCorrect) {
      setCorrectCount(correctCount + 1);
      setTimeout(() => {
        goToNextQuestion();
      }, 1500);
    }
  };

  const skipQuestion = () => {
    goToNextQuestion();
  };

  const getTenseLabel = () => {
    const labels: { [key: string]: string } = {
      present: '現在形',
      preterite: '点過去',
      imperfect: '線過去',
      future: '未来形',
      conditional: '過去未来',
      presentPerfect: '現在完了',
      pastPerfect: '過去完了',
      futurePerfect: '未来完了'
    };
    return labels[tense] || tense;
  };

  if (!currentQuestion) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">この時制・法の活用形データがありません。</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">スペル入力練習</h3>
            <p className="text-gray-600">正しい活用形を入力してください。</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">進捗: {usedQuestions.length} / {totalQuestions}</p>
            <p className="text-sm text-gray-600">正解: {correctCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-8 mb-6">
        <div className="text-center mb-6">
          <p className="text-lg text-gray-700 mb-2">
            <span className="font-bold">{verb.word}</span> ({getTenseLabel()})
          </p>
          <p className="text-2xl font-bold text-blue-600 mb-4">{currentQuestion.person}</p>
        </div>

        <div className="max-w-md mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                checkAnswer();
              }
            }}
            className={`w-full px-4 py-3 text-lg border-2 rounded-lg transition-all ${
              showResult === true
                ? 'border-green-500 bg-green-50'
                : showResult === false
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder="活用形を入力..."
            disabled={showResult === true}
          />

          {/* フィードバック */}
          <div className="mt-4 min-h-[2rem]">
            {showResult === true && (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <Check size={20} />
                <span className="font-semibold">正解！</span>
              </div>
            )}
            {showResult === false && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-red-600">
                  <X size={20} />
                  <span className="font-semibold">不正解</span>
                </div>
                {attempts >= 2 && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600">正解: <span className="font-bold">{currentQuestion.correctAnswer}</span></p>
                  </div>
                )}
                {attempts === 1 && (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Info size={16} />
                    <span>ヒント: {currentQuestion.hint}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={checkAnswer}
              disabled={!userAnswer.trim() || showResult === true}
              className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              確認
            </button>
            <button
              onClick={skipQuestion}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              スキップ
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <div className="flex gap-2">
          <button
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg transition-colors"
          >
            <ChevronRight size={20} className="rotate-180" />
            前の問題
          </button>
          <button
            onClick={() => {
              setUsedQuestions([]);
              setCorrectCount(0);
              setQuestionHistory([]);
              setCurrentQuestionIndex(0);
              const firstIndex = Math.floor(Math.random() * questions.length);
              setQuestionHistory([firstIndex]);
              setUsedQuestions([firstIndex]);
              selectQuestion(firstIndex);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            <RotateCcw size={20} />
            最初から
          </button>
        </div>

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