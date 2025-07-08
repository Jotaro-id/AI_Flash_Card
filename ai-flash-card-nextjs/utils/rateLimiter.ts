import { logger } from './logger';

// レートリミット管理クラス
export class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private minIntervalMs: number;
  private requestCount = 0;
  private windowStartTime = Date.now();
  private maxRequestsPerMinute: number;

  constructor(options: {
    minIntervalMs?: number;
    maxRequestsPerMinute?: number;
  } = {}) {
    // デフォルト値：最小間隔1秒、1分間に最大10リクエスト
    this.minIntervalMs = options.minIntervalMs || 1000;
    this.maxRequestsPerMinute = options.maxRequestsPerMinute || 10;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // 1分間のウィンドウが経過したらリセット
      const now = Date.now();
      if (now - this.windowStartTime >= 60000) {
        this.requestCount = 0;
        this.windowStartTime = now;
      }

      // レート制限チェック
      if (this.requestCount >= this.maxRequestsPerMinute) {
        const waitTime = 60000 - (now - this.windowStartTime);
        logger.info(`レート制限に達しました。${Math.ceil(waitTime / 1000)}秒待機します...`);
        await this.delay(waitTime);
        continue;
      }

      // 最小間隔チェック
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minIntervalMs) {
        const waitTime = this.minIntervalMs - timeSinceLastRequest;
        await this.delay(waitTime);
      }

      const task = this.queue.shift();
      if (task) {
        this.lastRequestTime = Date.now();
        this.requestCount++;
        
        logger.debug(`APIリクエスト実行 (${this.requestCount}/${this.maxRequestsPerMinute})`);
        
        try {
          await task();
        } catch (error) {
          logger.error('タスク実行エラー:', error);
        }
      }
    }

    this.processing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 現在の状態を取得
  getStatus() {
    const now = Date.now();
    const timeInWindow = now - this.windowStartTime;
    const remainingRequests = Math.max(0, this.maxRequestsPerMinute - this.requestCount);
    const resetIn = Math.max(0, 60000 - timeInWindow);

    return {
      remainingRequests,
      resetIn: Math.ceil(resetIn / 1000), // 秒単位
      queueLength: this.queue.length,
      processing: this.processing
    };
  }
}

// シングルトンインスタンス
export const geminiRateLimiter = new RateLimiter({
  minIntervalMs: 2000, // 最小2秒間隔
  maxRequestsPerMinute: 20 // 1分間に最大20リクエスト（Gemini無料版の制限）
});