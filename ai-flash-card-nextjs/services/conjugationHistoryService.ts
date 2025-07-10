import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export interface ConjugationHistoryEntry {
  word_card_id: string;
  practice_type: 'fill-blanks' | 'spell-input';
  tense: string;
  mood: string;
  person: string;
  correct_answer: string;
  user_answer: string;
  is_correct: boolean;
  response_time_ms?: number;
  attempts?: number;
}

export interface ConjugationStats {
  word_card_id: string;
  word: string;
  practice_type: string;
  tense: string;
  mood: string;
  person: string;
  total_attempts: number;
  correct_count: number;
  accuracy_rate: number;
  avg_response_time: number;
  last_practiced_at: Date;
  next_review_at: Date;
}

export const conjugationHistoryService = {
  // 学習履歴を保存
  async saveHistory(entry: ConjugationHistoryEntry): Promise<void> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        logger.warn('No active session, skipping history save');
        return;
      }
      
      const { error } = await supabase
        .from('verb_conjugation_history')
        .insert({
          ...entry,
          user_id: session.user.id
        });
      
      if (error) {
        logger.error('Failed to save conjugation history:', error);
        throw error;
      }
      
      logger.info('Conjugation history saved successfully');
    } catch (error) {
      logger.error('Error saving conjugation history:', error);
      // エラーを再スローせずに続行
    }
  },

  // 単語の統計情報を取得
  async getWordStats(wordCardId: string): Promise<ConjugationStats[]> {
    try {
      const { data, error } = await supabase
        .from('verb_conjugation_stats')
        .select('*')
        .eq('word_card_id', wordCardId);
      
      if (error) {
        logger.error('Failed to get conjugation stats:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      logger.error('Error getting conjugation stats:', error);
      throw error;
    }
  },

  // ユーザーの全体的な統計情報を取得
  async getUserStats(): Promise<ConjugationStats[]> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        logger.info('No active session, returning empty stats');
        return [];
      }
      
      const { data, error } = await supabase
        .from('verb_conjugation_stats')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (error) {
        logger.error('Failed to get user conjugation stats:', error);
        // ビューが存在しない場合などは空配列を返す
        return [];
      }
      
      return data || [];
    } catch (error) {
      logger.error('Error getting user conjugation stats:', error);
      return [];
    }
  },

  // 苦手な活用形を取得（正答率が閾値以下）
  async getWeakConjugations(accuracyThreshold: number = 80): Promise<ConjugationStats[]> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        logger.info('No active session, returning empty weak conjugations');
        return [];
      }
      
      const { data, error } = await supabase
        .from('verb_conjugation_stats')
        .select('*')
        .eq('user_id', session.user.id)
        .lt('accuracy_rate', accuracyThreshold)
        .order('accuracy_rate', { ascending: true });
      
      if (error) {
        logger.error('Failed to get weak conjugations:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      logger.error('Error getting weak conjugations:', error);
      return [];
    }
  },

  // 復習が必要な活用形を取得
  async getDueForReview(): Promise<ConjugationStats[]> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        logger.info('No active session, returning empty due reviews');
        return [];
      }
      
      const { data, error } = await supabase
        .from('verb_conjugation_stats')
        .select('*')
        .eq('user_id', session.user.id)
        .lte('next_review_at', new Date().toISOString())
        .order('next_review_at', { ascending: true });
      
      if (error) {
        logger.error('Failed to get conjugations due for review:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      logger.error('Error getting conjugations due for review:', error);
      return [];
    }
  },

  // 学習履歴をクリア（開発・テスト用）
  async clearHistory(wordCardId?: string): Promise<void> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        logger.warn('No active session, cannot clear history');
        return;
      }
      
      let query = supabase
        .from('verb_conjugation_history')
        .delete()
        .eq('user_id', session.user.id);
      
      if (wordCardId) {
        query = query.eq('word_card_id', wordCardId);
      }
      
      const { error } = await query;
      
      if (error) {
        logger.error('Failed to clear conjugation history:', error);
        throw error;
      }
      
      logger.info('Conjugation history cleared successfully');
    } catch (error) {
      logger.error('Error clearing conjugation history:', error);
    }
  }
};