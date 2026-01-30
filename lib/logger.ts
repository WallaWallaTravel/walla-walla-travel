/**
 * Structured Logger with Correlation ID Support
 *
 * Provides consistent logging across the application with:
 * - Environment-aware log levels
 * - Structured JSON output for production
 * - Context/metadata support
 * - Automatic correlation ID inclusion
 * - Performance timing helpers
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *
 *   logger.info('User logged in', { userId: 123 });
 *   logger.error('Failed to process payment', { error, bookingId });
 *   logger.warn('Rate limit approaching', { remaining: 10 });
 *   logger.debug('Cache hit', { key: 'user:123' });
 */

import { generateSecureString } from '@/lib/utils';

// Lazy-load Sentry to avoid circular deps and enable tree-shaking
let sentryCapture: ((error: Error, context?: Record<string, unknown>) => void) | null = null;

// Initialize Sentry integration (server-side only)
if (typeof window === 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    // Dynamic import to avoid bundling issues
    const Sentry = require('@sentry/nextjs');
    sentryCapture = (error: Error, context?: Record<string, unknown>) => {
      if (context) {
        Sentry.setContext('error_context', context);
      }
      Sentry.captureException(error);
    };
  } catch {
    // Sentry not available
  }
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

// Try to import request context (server-side only)
let getRequestId: () => string = () => '';

// Only load request context on server (uses async_hooks which is Node.js-only)
if (typeof window === 'undefined') {
  try {
    // Dynamic import to avoid circular dependencies and webpack bundling for client
    const requestContext = require('./api/middleware/request-context');
    getRequestId = requestContext.getRequestId;
  } catch {
    // Request context not available
  }
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Environment configuration
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLogLevel(): LogLevel {
  const env = process.env.NODE_ENV;
  const configuredLevel = process.env.LOG_LEVEL as LogLevel | undefined;

  if (configuredLevel && LOG_LEVELS[configuredLevel] !== undefined) {
    return configuredLevel;
  }

  // Default: debug in development, info in production
  return env === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  const minLevel = getMinLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function formatError(error: unknown): LogEntry['error'] | undefined {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext
): LogEntry {
  // Try to get request ID for correlation
  let requestId: string | undefined;
  try {
    requestId = getRequestId();
    if (requestId === '' || requestId.startsWith('fallback-')) {
      requestId = undefined;
    }
  } catch {
    // Ignore - not in request context
  }

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    requestId,
  };

  if (context) {
    // Extract error if present
    if (context.error) {
      entry.error = formatError(context.error);
      const { error: _error, ...rest } = context;
      if (Object.keys(rest).length > 0) {
        entry.context = rest;
      }
    } else {
      entry.context = context;
    }
  }

  return entry;
}

function outputLog(entry: LogEntry): void {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // JSON output for production (easier to parse in log aggregators)
    const output = JSON.stringify(entry);
    switch (entry.level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  } else {
    // Human-readable output for development
    const prefix = {
      debug: '[DEBUG]',
      info: '[INFO]',
      warn: '[WARN]',
      error: '[ERROR]',
    }[entry.level];

    const requestIdStr = entry.requestId ? ` [${entry.requestId.substring(0, 8)}]` : '';
    const contextStr = entry.context
      ? ' ' + JSON.stringify(entry.context)
      : '';
    const errorStr = entry.error
      ? '\n   Error: ' + entry.error.name + ': ' + entry.error.message + (entry.error.stack ? '\n' + entry.error.stack : '')
      : '';

    const output = prefix + requestIdStr + ' ' + entry.message + contextStr + errorStr;

    switch (entry.level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }
}

/**
 * Main logger object
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    if (shouldLog('debug')) {
      outputLog(createLogEntry('debug', message, context));
    }
  },

  info(message: string, context?: LogContext): void {
    if (shouldLog('info')) {
      outputLog(createLogEntry('info', message, context));
    }
  },

  warn(message: string, context?: LogContext): void {
    if (shouldLog('warn')) {
      outputLog(createLogEntry('warn', message, context));
    }
  },

  error(message: string, context?: LogContext): void {
    if (shouldLog('error')) {
      const entry = createLogEntry('error', message, context);
      outputLog(entry);

      // Auto-capture to Sentry in production
      if (sentryCapture && process.env.NODE_ENV === 'production') {
        const error = context?.error;
        if (error instanceof Error) {
          sentryCapture(error, { message, ...entry.context });
        } else if (error) {
          sentryCapture(new Error(message), { originalError: String(error), ...entry.context });
        } else {
          // Log message-only errors to Sentry as well
          sentryCapture(new Error(message), entry.context);
        }
      }
    }
  },

  /**
   * Create a child logger with preset context
   */
  child(defaultContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) =>
        logger.debug(message, { ...defaultContext, ...context }),
      info: (message: string, context?: LogContext) =>
        logger.info(message, { ...defaultContext, ...context }),
      warn: (message: string, context?: LogContext) =>
        logger.warn(message, { ...defaultContext, ...context }),
      error: (message: string, context?: LogContext) =>
        logger.error(message, { ...defaultContext, ...context }),
    };
  },

  /**
   * Time an async operation
   */
  async time<T>(
    label: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);
      logger.debug(label + ' completed', { ...context, durationMs: duration });
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      logger.error(label + ' failed', { ...context, durationMs: duration, error });
      throw error;
    }
  },

  /**
   * Time a sync operation
   */
  timeSync<T>(label: string, fn: () => T, context?: LogContext): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = Math.round(performance.now() - start);
      logger.debug(label + ' completed', { ...context, durationMs: duration });
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      logger.error(label + ' failed', { ...context, durationMs: duration, error });
      throw error;
    }
  },
};

// Named exports for specific log levels (convenient imports)
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);

/**
 * Log an error with full context - returns error ID for tracking
 */
export function logError(
  source: string,
  message: string,
  error?: unknown,
  context?: LogContext
): string {
  const errorId = `ERR-${Date.now()}-${generateSecureString(5, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}`;
  logger.error(`[${source}] ${message}`, {
    errorId,
    ...context,
    error,
  });
  return errorId;
}

/**
 * Log API request for audit/debugging
 */
export function logApiRequest(
  method: string,
  path: string,
  userId?: string,
  body?: unknown
): void {
  logger.info('API Request', {
    method,
    path,
    userId,
    body: process.env.NODE_ENV === 'development' ? body : undefined,
  });
}

/**
 * Log database error with query context
 */
export function logDbError(
  operation: string,
  error: unknown,
  context?: LogContext
): void {
  logger.error(`Database error in ${operation}`, {
    ...context,
    error,
  });
}

export default logger;
