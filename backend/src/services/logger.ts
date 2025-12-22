import winston from 'winston';
import type { Request } from 'express';

const { combine, timestamp, printf, colorize, errors } = winston.format;

interface LogMeta {
  [key: string]: unknown;
}

// Custom format for console output
const consoleFormat = printf((info) => {
  const { level, message, timestamp: ts, stack, ...meta } = info;
  let log = `${ts} [${level}]: ${message}`;
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  if (stack) {
    log += `\n${stack}`;
  }
  return log;
});

// Custom format for JSON output (production)
const jsonFormat = printf((info) => {
  const { level, message, timestamp: ts, ...meta } = info;
  return JSON.stringify({
    timestamp: ts,
    level,
    message,
    ...meta
  });
});

// Determine log level based on environment
const getLogLevel = (): string => {
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
};

// Create the logger
const baseLogger = winston.createLogger({
  level: getLogLevel(),
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: { service: 'portfolio-tracker' },
  transports: []
});

// Add console transport
if (process.env.NODE_ENV === 'production') {
  // JSON format for production (better for log aggregation)
  baseLogger.add(new winston.transports.Console({
    format: combine(timestamp(), jsonFormat)
  }));
  baseLogger.add(new winston.transports.File({
    filename: 'logs/app.log',
    maxsize: 5 * 1024 * 1024,
    maxFiles: 3,
    tailable: true,
    format: combine(timestamp(), jsonFormat)
  }));
} else {
  // Colorized, readable format for development
  baseLogger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      consoleFormat
    )
  }));
}

// Extended logger with helper methods
const logger = Object.assign(baseLogger, {
  request: (req: Request & { userId?: number }, message: string, meta: LogMeta = {}): void => {
    baseLogger.info(message, {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userId: req.userId,
      ...meta
    });
  },

  dbQuery: (query: string, duration: number, meta: LogMeta = {}): void => {
    baseLogger.debug('Database query', {
      query: query.substring(0, 100),
      duration: `${duration}ms`,
      ...meta
    });
  },

  apiCall: (service: string, endpoint: string, duration: number, meta: LogMeta = {}): void => {
    baseLogger.info('External API call', {
      service,
      endpoint,
      duration: `${duration}ms`,
      ...meta
    });
  }
});

export default logger;
