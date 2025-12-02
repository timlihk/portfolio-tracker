import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  if (stack) {
    log += `\n${stack}`;
  }
  return log;
});

// Custom format for JSON output (production)
const jsonFormat = printf(({ level, message, timestamp, ...meta }) => {
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...meta
  });
});

// Determine log level based on environment
const getLogLevel = () => {
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
};

// Create the logger
const logger = winston.createLogger({
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
  logger.add(new winston.transports.Console({
    format: combine(timestamp(), jsonFormat)
  }));
} else {
  // Colorized, readable format for development
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      consoleFormat
    )
  }));
}

// Helper methods for common logging patterns
logger.request = (req, message, meta = {}) => {
  logger.info(message, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.userId,
    ...meta
  });
};

logger.dbQuery = (query, duration, meta = {}) => {
  logger.debug('Database query', {
    query: query.substring(0, 100),
    duration: `${duration}ms`,
    ...meta
  });
};

logger.apiCall = (service, endpoint, duration, meta = {}) => {
  logger.info('External API call', {
    service,
    endpoint,
    duration: `${duration}ms`,
    ...meta
  });
};

export default logger;
