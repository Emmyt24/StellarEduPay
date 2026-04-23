'use strict';

/**
 * Structured Logger Utility
 * 
 * Provides consistent logging with levels, timestamps, and context.
 * Can be easily swapped for a more robust solution like Winston or Pino.
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLevel = process.env.LOG_LEVEL || 'INFO';

function shouldLog(level) {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.map(arg => {
    if (arg instanceof Error) {
      return {
        message: arg.message,
        stack: arg.stack,
        ...arg,
      };
    }
    return arg;
  });
  
  return {
    timestamp,
    level,
    message,
    args: formattedArgs.length > 0 ? formattedArgs : undefined,
    pid: process.pid,
  };
}

const logger = {
  error(message, ...args) {
    if (shouldLog('ERROR')) {
      const formatted = formatMessage('ERROR', message, ...args);
      console.error(JSON.stringify(formatted));
    }
  },
  
  warn(message, ...args) {
    if (shouldLog('WARN')) {
      const formatted = formatMessage('WARN', message, ...args);
      console.warn(JSON.stringify(formatted));
    }
  },
  
  info(message, ...args) {
    if (shouldLog('INFO')) {
      const formatted = formatMessage('INFO', message, ...args);
      console.log(JSON.stringify(formatted));
    }
  },
  
  debug(message, ...args) {
    if (shouldLog('DEBUG')) {
      const formatted = formatMessage('DEBUG', message, ...args);
      console.log(JSON.stringify(formatted));
    }
  },
  
  /**
   * Create a child logger with additional context
   */
  child(context) {
    return {
      error: (message, ...args) => logger.error(`[${context}] ${message}`, ...args),
      warn: (message, ...args) => logger.warn(`[${context}] ${message}`, ...args),
      info: (message, ...args) => logger.info(`[${context}] ${message}`, ...args),
      debug: (message, ...args) => logger.debug(`[${context}] ${message}`, ...args),
    };
  },
};

module.exports = logger;
module.exports.logger = logger; // named export for destructured imports
