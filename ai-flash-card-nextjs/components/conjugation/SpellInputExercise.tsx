'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Word, SupportedLanguage } from '@/types';
import { Check, X, RotateCcw, ChevronRight, ChevronLeft, Info } from 'lucide-react';
import { logger } from '@/utils/logger';
import { useConjugationTracking } from '@/hooks/useConjugationTracking';
import { FilterSettings } from './PracticeFilter';

interface SpellInputExerciseProps {
  verb: Word;
  targetLanguage?: SupportedLanguage;
  tense: string;
  mood: string;
  onComplete: () => void;
  filterSettings?: FilterSettings;
  currentVerbIndex?: number;
  totalVerbCount?: number;
  onPreviousVerb?: () => void;
  onNextVerb?: () => void;
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
  onComplete,
  filterSettings,
  currentVerbIndex = 0,
  totalVerbCount = 1,
  onPreviousVerb,
  onNextVerb
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
  const { startTracking, recordAnswer } = useConjugationTracking();

  const selectQuestion = useCallback((questionIndex: number) => {
    if (questions.length === 0) return;
    
    setCurrentQuestion(questions[questionIndex]);
    setUserAnswer('');
    setShowResult(null);
    setAttempts(0);
    
    // 時間計測を開始
    startTracking();
    
    // 入力フィールドにフォーカス
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [questions, startTracking]);

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
    const newQuestions: Question[] = [];

    // オブジェクト形式のデータを配列に変換
    if (typeof conjugationData === 'object' && !Array.isArray(conjugationData)) {
      logger.info('Conjugation data for tense/mood:', conjugationData);
      
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
          
          newQuestions.push({
            person: displayPerson,
            correctAnswer: conjugationData[person].trim(), // 前後の空白を削除
            hint: conjugationData[person].slice(0, 2) + '...'
          });
          addedPersons.add(conjugationData[person]);
        }
      });
      logger.info('Generated questions:', newQuestions);
    }

    // 苦手モードの場合、フィルタリング
    let filteredQuestions = newQuestions;
    if (filterSettings?.mode === 'weak' && filterSettings.weakConjugations) {
      const personMap: { [key: string]: string } = {
        'yo': '1sg',
        'tú': '2sg',
        'él/ella/usted': '3sg',
        'nosotros/nosotras': '1pl',
        'vosotros/vosotras': '2pl',
        'ellos/ellas/ustedes': '3pl'
      };
      
      filteredQuestions = newQuestions.filter(question => {
        const personKey = personMap[question.person];
        return filterSettings.weakConjugations!.some(weak => 
          weak.word_card_id === verb.id &&
          weak.tense === tense &&
          weak.mood === mood &&
          weak.person === personKey
        );
      });
      
      logger.info('Weak mode filtering:', {
        verbId: verb.id,
        tense,
        mood,
        originalQuestions: newQuestions.length,
        filteredQuestions: filteredQuestions.length
      });
      
      // 苦手な活用形がない場合は、全ての問題を使用
      if (filteredQuestions.length === 0) {
        logger.info('No weak conjugations for this verb/tense/mood, using all questions');
        filteredQuestions = newQuestions;
      }
    }

    setQuestions(filteredQuestions);
    setTotalQuestions(filteredQuestions.length);
    setUsedQuestions([]);
    setCorrectCount(0);
    setQuestionHistory([]);
    setCurrentQuestionIndex(0);
    
    // 最初の問題を選択
    if (filteredQuestions.length > 0) {
      const firstIndex = Math.floor(Math.random() * filteredQuestions.length);
      setQuestionHistory([firstIndex]);
      setUsedQuestions([firstIndex]);
      setCurrentQuestion(filteredQuestions[firstIndex]);
      setUserAnswer('');
      setShowResult(null);
      setAttempts(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [verb, tense, mood, filterSettings]);

  const checkAnswer = async () => {
    if (!currentQuestion || !userAnswer.trim()) return;

    // 正規化関数：見えない文字を削除し、アクセント記号を考慮
    const normalize = (str: string) => {
      return str
        .trim()
        .toLowerCase()
        .normalize('NFD') // アクセント記号を分解
        .replace(/[\u0300-\u036f]/g, '') // アクセント記号を削除
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // ゼロ幅文字を削除
        .replace(/\s+/g, ' '); // 複数の空白を1つに
    };

    const normalizedUserAnswer = normalize(userAnswer);
    const normalizedCorrectAnswer = normalize(currentQuestion.correctAnswer);
    
    // デバッグ用ログ
    logger.info('Answer check:', {
      userAnswer: normalizedUserAnswer,
      correctAnswer: normalizedCorrectAnswer,
      userAnswerLength: normalizedUserAnswer.length,
      correctAnswerLength: normalizedCorrectAnswer.length,
      match: normalizedUserAnswer === normalizedCorrectAnswer
    });
    
    const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
    const currentAttempts = attempts + 1;
    setShowResult(isCorrect);
    setAttempts(currentAttempts);

    // 学習履歴を保存
    if (verb.id) {
      const personToCode: { [key: string]: string } = {
        'yo': '1sg',
        'tú': '2sg',
        'él/ella/usted': '3sg',
        'nosotros/nosotras': '1pl',
        'vosotros/vosotras': '2pl',
        'ellos/ellas/ustedes': '3pl'
      };
      
      await recordAnswer({
        wordCardId: verb.id,
        practiceType: 'spell-input',
        tense,
        mood,
        person: personToCode[currentQuestion.person] || currentQuestion.person,
        correctAnswer: currentQuestion.correctAnswer,
        userAnswer: userAnswer.trim(),
        isCorrect,
        attempts: currentAttempts
      });
    }

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
      {/* 進捗表示とナビゲーション */}
      <div className="flex items-center justify-center gap-4 mb-2">
        <button
          onClick={goToPreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className={`p-2 rounded-lg transition-colors ${
            currentQuestionIndex === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
          aria-label="前の問題"
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className="text-lg font-medium text-gray-700">
          {currentQuestionIndex + 1} / {totalQuestions}
        </div>
        
        <button
          onClick={goToNextQuestion}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="次の問題"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* 動詞単位のナビゲーション */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={onPreviousVerb}
          disabled={!onPreviousVerb || currentVerbIndex === 0}
          className={`p-2 rounded-lg transition-colors ${
            !onPreviousVerb || currentVerbIndex === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
          aria-label="前の動詞"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="text-sm text-gray-600">
          動詞: {currentVerbIndex + 1} / {totalVerbCount}
        </div>
        
        <button
          onClick={onNextVerb || onComplete}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="次の動詞"
        >
          <ChevronRight size={20} />
        </button>
      </div>

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
            onClick={onPreviousVerb}
            disabled={!onPreviousVerb || currentVerbIndex === 0 || showResult === true}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg transition-colors"
          >
            <ChevronRight size={20} className="rotate-180" />
            前の動詞へ
          </button>
          <button
            onClick={() => {
              setUsedQuestions([]);
              setCorrectCount(0);
              setQuestionHistory([]);
              setCurrentQuestionIndex(0);
              if (questions.length > 0) {
                const firstIndex = Math.floor(Math.random() * questions.length);
                setQuestionHistory([firstIndex]);
                setUsedQuestions([firstIndex]);
                setCurrentQuestion(questions[firstIndex]);
                setUserAnswer('');
                setShowResult(null);
                setAttempts(0);
                setTimeout(() => inputRef.current?.focus(), 100);
              }
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