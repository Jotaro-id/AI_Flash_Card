import { logger } from '@/utils/logger';

export interface ConjugationHistoryEntry {
  id?: string;
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
  created_at?: string;
}

export interface ConjugationStats {
  word_card_id: string;
  tense: string;
  mood: string;
  person: string;
  total_attempts: number;
  correct_count: number;
  accuracy_rate: number;
  has_failed: boolean;
  last_practiced_at?: string;
  next_review_at?: string;
}

const STORAGE_KEY = 'conjugation_history';

export const conjugationHistoryService = {
  // 学習履歴を保存
  async saveHistory(entry: ConjugationHistoryEntry): Promise<void> {
    try {
      const history = this.getHistory();
      const newEntry = {
        ...entry,
        id: Date.now().toString(),
        created_at: new Date().toISOString()
      };
      
      history.push(newEntry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      
      logger.info('Conjugation history saved to localStorage:', {
        word_card_id: newEntry.word_card_id,
        is_correct: newEntry.is_correct,
        tense: newEntry.tense,
        mood: newEntry.mood,
        person: newEntry.person
      });
    } catch (error) {
      logger.error('Error saving conjugation history to localStorage:', error);
    }
  },

  // 履歴を取得
  getHistory(): ConjugationHistoryEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Error reading conjugation history from localStorage:', error);
      return [];
    }
  },

  // ユーザーの全体的な統計情報を取得（活用形単位）
  async getUserStats(): Promise<ConjugationStats[]> {
    try {
      const history = this.getHistory();
      
      if (history.length === 0) {
        logger.info('No conjugation history found');
        return [];
      }
      
      // データを集計（活用形単位: word_card_id + tense + mood + person）
      const statsMap = new Map<string, ConjugationStats>();
      
      logger.info(`Processing ${history.length} history records from localStorage`);
      
      history.forEach(record => {
        // 活用形単位のキーを生成
        const key = `${record.word_card_id}_${record.tense}_${record.mood}_${record.person}`;
        
        if (!statsMap.has(key)) {
          statsMap.set(key, {
            word_card_id: record.word_card_id,
            tense: record.tense,
            mood: record.mood,
            person: record.person,
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
          stats.has_failed = true;
          logger.debug(`Conjugation ${key} marked as failed`);
        }
        
        // 最終練習日時を更新
        if (!stats.last_practiced_at || (record.created_at && new Date(record.created_at) > new Date(stats.last_practiced_at))) {
          stats.last_practiced_at = record.created_at;
        }
      });
      
      // 正答率を計算
      statsMap.forEach(stats => {
        stats.accuracy_rate = stats.total_attempts > 0 
          ? Math.round((stats.correct_count / stats.total_attempts) * 100) 
          : 0;
      });
      
      const results = Array.from(statsMap.values());
      logger.info(`Aggregated stats for ${results.length} conjugations, ${results.filter(s => s.has_failed).length} marked as failed`);
      
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
      
      logger.info(`Found ${weakStats.length} weak conjugations`);
      
      return weakStats;
    } catch (error) {
      logger.error('Error getting weak conjugations:', error);
      return [];
    }
  },

  // 学習履歴をクリア
  async clearHistory(wordCardId?: string): Promise<void> {
    try {
      if (wordCardId) {
        // 特定の単語の履歴のみクリア
        const history = this.getHistory();
        const filtered = history.filter(h => h.word_card_id !== wordCardId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        logger.info(`Cleared history for word ${wordCardId}`);
      } else {
        // 全履歴をクリア
        localStorage.removeItem(STORAGE_KEY);
        logger.info('Cleared all conjugation history');
      }
    } catch (error) {
      logger.error('Error clearing conjugation history:', error);
    }
  }
};