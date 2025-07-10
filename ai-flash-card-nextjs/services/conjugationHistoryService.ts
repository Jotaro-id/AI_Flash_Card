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
  word?: string;
  practice_type?: string;
  tense?: string;
  mood?: string;
  person?: string;
  total_attempts: number;
  correct_count: number;
  accuracy_rate: number;
  avg_response_time?: number;
  last_practiced_at?: Date;
  next_review_at?: Date;
  has_failed?: boolean; // 一度でも失敗したか
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
      
      const insertData = {
        ...entry,
        user_id: session.user.id
      };
      
      logger.info('Saving conjugation history:', {
        word_card_id: insertData.word_card_id,
        is_correct: insertData.is_correct,
        user_id: insertData.user_id
      });
      
      const { error } = await supabase
        .from('verb_conjugation_history')
        .insert(insertData);
      
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
      
      // 直接テーブルからデータを取得
      const { data: historyData, error } = await supabase
        .from('verb_conjugation_history')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (error) {
        logger.error('Failed to get conjugation history:', error);
        return [];
      }
      
      if (!historyData || historyData.length === 0) {
        return [];
      }
      
      // データを集計
      const statsMap = new Map<string, ConjugationStats>();
      
      logger.info(`Processing ${historyData.length} history records`);
      
      historyData.forEach(record => {
        const key = record.word_card_id;
        
        if (!statsMap.has(key)) {
          statsMap.set(key, {
            word_card_id: record.word_card_id,
            total_attempts: 0,
            correct_count: 0,
            accuracy_rate: 0,
            has_failed: false
          });
        }
        
        const stats = statsMap.get(key)!;
        stats.total_attempts++;
        if (record.is_correct) {
          stats.correct_count++;
        } else {
          stats.has_failed = true; // 一度でも失敗したらtrue
          logger.debug(`Word ${record.word_card_id} marked as failed`);
        }
        
        // 最終練習日時を更新
        if (!stats.last_practiced_at || new Date(record.created_at) > new Date(stats.last_practiced_at)) {
          stats.last_practiced_at = record.created_at;
        }
        
        // 次回復習日時を更新
        if (!stats.next_review_at || (record.next_review_at && new Date(record.next_review_at) < new Date(stats.next_review_at))) {
          stats.next_review_at = record.next_review_at;
        }
      });
      
      // 正答率を計算
      statsMap.forEach(stats => {
        stats.accuracy_rate = stats.total_attempts > 0 
          ? Math.round((stats.correct_count / stats.total_attempts) * 100) 
          : 0;
      });
      
      const results = Array.from(statsMap.values());
      logger.info(`Aggregated stats for ${results.length} words, ${results.filter(s => s.has_failed).length} marked as failed`);
      
      return results;
    } catch (error) {
      logger.error('Error getting user conjugation stats:', error);
      return [];
    }
  },

  // 苦手な活用形を取得（一度でも不正解なら苦手に分類）
  async getWeakConjugations(accuracyThreshold: number = 80): Promise<ConjugationStats[]> {
    try {
      const allStats = await this.getUserStats();
      
      // 一度でも失敗したか、正答率が閾値以下のものをフィルタリング
      const weakStats = allStats.filter(stat => 
        stat.has_failed || stat.accuracy_rate < accuracyThreshold
      );
      
      // 正答率の低い順にソート
      weakStats.sort((a, b) => a.accuracy_rate - b.accuracy_rate);
      
      return weakStats;
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