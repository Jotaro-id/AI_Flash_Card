import { AIWordInfo } from '@/types';
import { logger } from '@/utils/logger';

// キャッシュの型定義
interface CacheEntry {
  data: AIWordInfo;
  timestamp: number;
  word: string;
}

// キャッシュストレージ
class AIWordInfoCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly MAX_CACHE_SIZE = 1000; // 最大1000単語をキャッシュ
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7日間

  constructor() {
    // 起動時にローカルストレージからキャッシュを復元
    this.loadFromLocalStorage();
  }

  // キャッシュから単語情報を取得
  get(word: string): AIWordInfo | null {
    const entry = this.cache.get(word.toLowerCase());
    
    if (!entry) {
      return null;
    }

    // キャッシュの有効期限をチェック
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(word.toLowerCase());
      this.saveToLocalStorage();
      return null;
    }

    logger.debug(`キャッシュヒット: ${word}`);
    return entry.data;
  }

  // キャッシュに単語情報を保存
  set(word: string, data: AIWordInfo): void {
    // キャッシュサイズの制限をチェック
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // 最も古いエントリを削除
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(word.toLowerCase(), {
      data,
      timestamp: Date.now(),
      word
    });

    this.saveToLocalStorage();
    logger.debug(`キャッシュに保存: ${word}`);
  }

  // 最も古いエントリを見つける
  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  // ローカルストレージに保存
  private saveToLocalStorage(): void {
    try {
      // ブラウザ環境でのみlocalStorageを使用
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const cacheData = Array.from(this.cache.entries());
        localStorage.setItem('ai-word-info-cache', JSON.stringify(cacheData));
      }
    } catch (error) {
      logger.error('キャッシュの保存に失敗:', error);
    }
  }

  // ローカルストレージから読み込み
  private loadFromLocalStorage(): void {
    try {
      // ブラウザ環境でのみlocalStorageを使用
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('ai-word-info-cache');
        if (stored) {
          const cacheData = JSON.parse(stored) as Array<[string, CacheEntry]>;
          this.cache = new Map(cacheData);
          logger.info(`キャッシュを復元: ${this.cache.size}件`);
          
          // 有効期限切れのエントリを削除
          this.cleanupExpiredEntries();
        }
      }
    } catch (error) {
      logger.error('キャッシュの読み込みに失敗:', error);
      if (error instanceof Error) {
        logger.error('Stack trace:', error.stack);
      }
      this.cache.clear();
    }
  }

  // キャッシュをクリア
  clear(): void {
    this.cache.clear();
    // ブラウザ環境でのみlocalStorageを使用
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('ai-word-info-cache');
    }
    logger.info('キャッシュをクリア');
  }

  // 特定の単語のキャッシュを削除
  delete(word: string): void {
    const deleted = this.cache.delete(word.toLowerCase());
    if (deleted) {
      this.saveToLocalStorage();
      logger.debug(`キャッシュから削除: ${word}`);
    }
  }

  // キャッシュ統計を取得
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      utilization: (this.cache.size / this.MAX_CACHE_SIZE) * 100
    };
  }

  // 有効期限切れのエントリを削除
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      logger.info(`有効期限切れのキャッシュエントリを${removedCount}件削除`);
      this.saveToLocalStorage();
    }
  }
}

// シングルトンインスタンス
export const aiWordInfoCache = new AIWordInfoCache();