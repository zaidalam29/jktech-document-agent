// src/tests/utils/__mocks__/logger.js
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const getLogLevel = () => {
  try {
    // This will be mocked in tests
    const level = 'DEBUG'; // Default for tests
    return LOG_LEVELS[level] || LOG_LEVELS.INFO;
  } catch {
    return LOG_LEVELS.INFO;
  }
};

const currentLogLevel = getLogLevel();

class Logger {
  debug(...args) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args) {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      console.log('[INFO]', ...args);
    }
  }

  warn(...args) {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      console.log('[WARN]', ...args);
    }
  }

  error(...args) {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      console.log('[ERROR]', ...args);
    }
  }
}

const logger = new Logger();
export default logger;