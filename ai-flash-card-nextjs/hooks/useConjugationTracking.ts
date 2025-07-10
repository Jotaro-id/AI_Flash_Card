import { useRef, useCallback } from 'react';
import { conjugationHistoryService, ConjugationHistoryEntry } from '@/services/conjugationHistoryLocalService';
import { logger } from '@/utils/logger';

interface TrackingParams {
  wordCardId: string;
  practiceType: 'fill-blanks' | 'spell-input';
  tense: string;
  mood: string;
  person: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  attempts?: number;
}

export function useConjugationTracking() {
  const startTimeRef = useRef<number | undefined>(undefined);

  const startTracking = useCallback(() => {
    startTimeRef.current = Date.now();
    logger.debug('Started tracking response time');
  }, []);

  const recordAnswer = useCallback(async (params: TrackingParams) => {
    try {
      const responseTime = startTimeRef.current 
        ? Date.now() - startTimeRef.current 
        : undefined;

      const entry: ConjugationHistoryEntry = {
        word_card_id: params.wordCardId,
        practice_type: params.practiceType,
        tense: params.tense,
        mood: params.mood,
        person: params.person,
        correct_answer: params.correctAnswer,
        user_answer: params.userAnswer,
        is_correct: params.isCorrect,
        response_time_ms: responseTime,
        attempts: params.attempts
      };

      await conjugationHistoryService.saveHistory(entry);
      
      logger.info('Recorded conjugation answer:', {
        wordCardId: params.wordCardId,
        isCorrect: params.isCorrect,
        responseTime,
        person: params.person,
        tense: params.tense,
        mood: params.mood,
        userAnswer: params.userAnswer,
        correctAnswer: params.correctAnswer
      });

      // Reset start time
      startTimeRef.current = undefined;
    } catch (error) {
      logger.error('Failed to record conjugation answer:', error);
      // エラーが発生しても練習は続行できるようにする
    }
  }, []);

  return {
    startTracking,
    recordAnswer
  };
}