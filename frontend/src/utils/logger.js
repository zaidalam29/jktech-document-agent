const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const getLogLevel = () => {
  try {
    const level = import.meta.env.VITE_LOG_LEVEL?.toUpperCase();
    return LOG_LEVELS[level] || LOG_LEVELS.INFO;
  } catch {
    return LOG_LEVELS.INFO;
  }
};

const currentLogLevel = getLogLevel();

class Logger {
  debug(...args) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.debug('[DEBUG]', ...args);
    }
  }

  info(...args) {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args) {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args) {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }
}

const logger = new Logger();
export default logger;