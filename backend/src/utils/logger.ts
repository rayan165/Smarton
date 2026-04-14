const LOG_LEVELS: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getLogLevel(): number {
  const level = process.env.LOG_LEVEL ?? 'info';
  return LOG_LEVELS[level] ?? 1;
}

export interface Logger {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
}

export function createLogger(module: string): Logger {
  const threshold = getLogLevel();

  function log(level: string, levelNum: number, message: string, data?: Record<string, unknown>): void {
    if (levelNum < threshold) return;
    const timestamp = new Date().toISOString();
    const tag = `[${timestamp}] [${level.toUpperCase()}] [${module}]`;
    if (data && Object.keys(data).length > 0) {
      console.log(`${tag} ${message}`, JSON.stringify(data));
    } else {
      console.log(`${tag} ${message}`);
    }
  }

  return {
    debug: (message: string, data?: Record<string, unknown>) => log('debug', 0, message, data),
    info: (message: string, data?: Record<string, unknown>) => log('info', 1, message, data),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', 2, message, data),
    error: (message: string, data?: Record<string, unknown>) => log('error', 3, message, data),
  };
}
