/**
 * Enhanced Logging System
 * Structured logging with levels, context, and external service integration
 */

import { env, isProduction, isDevelopment } from '@/lib/config/env';

// ============================================================================
// Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: LogContext;
  service?: string;
  requestId?: string;
  userId?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

// ============================================================================
// Logger Configuration
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 
  (isProduction ? 'info' : 'debug');

// ============================================================================
// Logger Class
// ============================================================================

class Logger {
  private serviceName?: string;

  constructor(serviceName?: string) {
    this.serviceName = serviceName;
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL];
  }

  /**
   * Format log entry for console
   */
  private formatForConsole(entry: LogEntry): string {
    if (isDevelopment) {
      // Pretty format for development
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      const level = entry.level.toUpperCase().padEnd(5);
      const service = entry.service ? `[${entry.service}]` : '';
      
      return `${timestamp} ${level} ${service} ${entry.message}`;
    } else {
      // JSON format for production (easier to parse)
      return JSON.stringify(entry);
    }
  }

  /**
   * Create a log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): LogEntry {
    return {
      level,
      timestamp: new Date().toISOString(),
      message,
      service: this.serviceName,
      context,
    };
  }

  /**
   * Write log to console
   */
  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formatted = this.formatForConsole(entry);

    switch (entry.level) {
      case 'debug':
        console.debug(formatted, entry.context || '');
        break;
      case 'info':
        console.log(formatted, entry.context || '');
        break;
      case 'warn':
        console.warn(formatted, entry.context || '');
        break;
      case 'error':
        console.error(formatted, entry.context || '', entry.error || '');
        break;
    }
  }

  /**
   * Send log to external service (e.g., Sentry)
   */
  private async sendToExternalService(entry: LogEntry): Promise<void> {
    // Only send errors to Sentry in production
    if (isProduction && entry.level === 'error' && env.SENTRY_DSN) {
      try {
        // TODO: Integrate Sentry
        // Sentry.captureException(new Error(entry.message), {
        //   contexts: {
        //     custom: entry.context,
        //   },
        // });
      } catch (error) {
        console.error('Failed to send log to Sentry:', error);
      }
    }
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Debug log (development only)
   */
  debug(context: LogContext | string, message?: string): void {
    const actualMessage = typeof context === 'string' ? context : message || 'Debug';
    const actualContext = typeof context === 'object' ? context : undefined;

    const entry = this.createEntry('debug', actualMessage, actualContext);
    this.writeLog(entry);
  }

  /**
   * Info log
   */
  info(context: LogContext | string, message?: string): void {
    const actualMessage = typeof context === 'string' ? context : message || 'Info';
    const actualContext = typeof context === 'object' ? context : undefined;

    const entry = this.createEntry('info', actualMessage, actualContext);
    this.writeLog(entry);
    this.sendToExternalService(entry);
  }

  /**
   * Warning log
   */
  warn(context: LogContext | string, message?: string): void {
    const actualMessage = typeof context === 'string' ? context : message || 'Warning';
    const actualContext = typeof context === 'object' ? context : undefined;

    const entry = this.createEntry('warn', actualMessage, actualContext);
    this.writeLog(entry);
    this.sendToExternalService(entry);
  }

  /**
   * Error log
   */
  error(error: Error | LogContext | string, message?: string): void {
    let actualMessage: string;
    let actualContext: LogContext | undefined;
    let errorDetails: LogEntry['error'] | undefined;

    if (error instanceof Error) {
      actualMessage = message || error.message;
      errorDetails = {
        message: error.message,
        stack: error.stack,
        code: (error as { code?: string }).code,
      };
    } else if (typeof error === 'string') {
      actualMessage = error;
    } else {
      actualMessage = message || 'Error';
      actualContext = error;
    }

    const entry: LogEntry = {
      ...this.createEntry('error', actualMessage, actualContext),
      error: errorDetails,
    };

    this.writeLog(entry);
    this.sendToExternalService(entry);
  }

  /**
   * Create a child logger with a specific service name
   */
  child(serviceName: string): Logger {
    return new Logger(serviceName);
  }

  /**
   * Log HTTP request
   */
  httpRequest(data: {
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    userId?: number;
  }): void {
    this.info({
      type: 'http_request',
      ...data,
    }, `${data.method} ${data.url} - ${data.statusCode} (${data.duration}ms)`);
  }

  /**
   * Log database query
   */
  dbQuery(data: {
    query: string;
    duration: number;
    rowCount?: number;
  }): void {
    this.debug({
      type: 'db_query',
      ...data,
    }, `DB Query: ${data.query.substring(0, 100)}... (${data.duration}ms, ${data.rowCount} rows)`);
  }

  /**
   * Log business event
   */
  businessEvent(event: string, data: LogContext): void {
    this.info({
      type: 'business_event',
      event,
      ...data,
    }, `Business Event: ${event}`);
  }
}

// ============================================================================
// Exports
// ============================================================================

// Default logger instance
export const logger = new Logger();

// Create service-specific logger
export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}

// Export Logger class for custom instances
export { Logger };


