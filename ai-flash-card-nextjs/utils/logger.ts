type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, data?: any) {
    if (!this.isDevelopment && level === 'debug') {
      return; // Skip debug logs in production
    }

    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      data
    };

    switch (level) {
      case 'debug':
        console.log(`[${timestamp}] [DEBUG] ${message}`, data || '');
        break;
      case 'info':
        console.info(`[${timestamp}] [INFO] ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`[${timestamp}] [WARN] ${message}`, data || '');
        break;
      case 'error':
        console.error(`[${timestamp}] [ERROR] ${message}`, data || '');
        break;
    }

    // Here you could also send logs to a remote service if needed
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }
}

export const logger = new Logger();