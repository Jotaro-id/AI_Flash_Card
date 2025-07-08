// ログレベル
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// ログエントリ
interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: unknown;
  stackTrace?: string;
}

// ログを保存するための配列
const logs: LogEntry[] = [];
const MAX_LOGS = 1000;

// ログレベルの文字列表現
const logLevelStrings = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR'
};

// コンソールにもログを出力
const logToConsole = (entry: LogEntry) => {
  const prefix = `[${entry.timestamp.toISOString()}] [${logLevelStrings[entry.level]}]`;
  
  switch (entry.level) {
    case LogLevel.DEBUG:
      console.log(prefix, entry.message, entry.data);
      break;
    case LogLevel.INFO:
      console.info(prefix, entry.message, entry.data);
      break;
    case LogLevel.WARN:
      console.warn(prefix, entry.message, entry.data);
      break;
    case LogLevel.ERROR:
      console.error(prefix, entry.message, entry.data);
      if (entry.stackTrace) {
        console.error('Stack trace:', entry.stackTrace);
      }
      break;
  }
};

// ログを追加
const addLog = (level: LogLevel, message: string, data?: unknown) => {
  const entry: LogEntry = {
    timestamp: new Date(),
    level,
    message,
    data
  };
  
  // エラーの場合はスタックトレースを追加
  if (level === LogLevel.ERROR && data instanceof Error) {
    entry.stackTrace = data.stack;
  }
  
  logs.push(entry);
  
  // 最大ログ数を超えたら古いものから削除
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  
  // コンソールにも出力
  logToConsole(entry);
  
  // localStorageにも保存（デバッグ用）
  try {
    localStorage.setItem('ai-flashcard-logs', JSON.stringify(logs.slice(-100))); // 最新100件のみ
  } catch {
    // localStorageがいっぱいの場合は無視
  }
};

// ログAPI
export const logger = {
  debug: (message: string, data?: unknown) => addLog(LogLevel.DEBUG, message, data),
  info: (message: string, data?: unknown) => addLog(LogLevel.INFO, message, data),
  warn: (message: string, data?: unknown) => addLog(LogLevel.WARN, message, data),
  error: (message: string, data?: unknown) => addLog(LogLevel.ERROR, message, data),
  
  // すべてのログを取得
  getLogs: () => [...logs],
  
  // ログをクリア
  clearLogs: () => {
    logs.length = 0;
    localStorage.removeItem('ai-flashcard-logs');
  },
  
  // ログをエクスポート（デバッグ用）
  exportLogs: () => {
    const logText = logs.map(entry => {
      const levelStr = logLevelStrings[entry.level];
      const dataStr = entry.data ? `\nData: ${JSON.stringify(entry.data, null, 2)}` : '';
      const stackStr = entry.stackTrace ? `\nStack: ${entry.stackTrace}` : '';
      return `[${entry.timestamp.toISOString()}] [${levelStr}] ${entry.message}${dataStr}${stackStr}`;
    }).join('\n\n');
    
    return logText;
  },
  
  // ログをダウンロード
  downloadLogs: () => {
    const logText = logger.exportLogs();
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-flashcard-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

// グローバルにも公開（デバッグ用）
if (typeof window !== 'undefined') {
  // @ts-expect-error デバッグ目的でwindowオブジェクトに追加
  window.aiFlashcardLogger = logger;
}