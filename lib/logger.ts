/**
 * Centralized logging system for the application
 * Provides consistent error handling and debugging capabilities
 */

import { NextResponse } from 'next/server';

export interface LogEntry {
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug';
  source: string;
  message: string;
  details?: any;
  stack?: string;
  sql?: string;
  params?: any[];
  userId?: string;
  errorCode?: string;
}

// In-memory log storage for development
const LOG_BUFFER_SIZE = 100;
const logBuffer: LogEntry[] = [];

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  /**
   * Log an error with full details
   */
  error(source: string, message: string, error?: any, context?: any): string {
    const errorId = this.generateErrorId();
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'error',
      source,
      message,
      details: {
        ...context,
        errorId,
        error: error ? {
          message: error.message,
          code: error.code,
          detail: error.detail,
          constraint: error.constraint,
          table: error.table,
          column: error.column,
        } : undefined,
      },
      stack: error?.stack,
      errorCode: error?.code,
    };

    this.addToBuffer(entry);
    this.consoleLog(entry);
    
    return errorId;
  }

  /**
   * Log a database query error
   */
  dbError(source: string, sql: string, params: any[], error: any): string {
    const errorId = this.generateErrorId();
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'error',
      source: `DB:${source}`,
      message: `Database query failed: ${error.message}`,
      sql,
      params,
      details: {
        errorId,
        severity: error.severity,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        where: error.where,
        constraint: error.constraint,
        table: error.table,
        column: error.column,
        dataType: error.dataType,
        file: error.file,
        line: error.line,
        routine: error.routine,
      },
      stack: error.stack,
      errorCode: error.code,
    };

    this.addToBuffer(entry);
    this.consoleLog(entry);
    
    return errorId;
  }

  /**
   * Log an API request
   */
  apiRequest(method: string, path: string, userId?: string, body?: any): void {
    if (!this.isDevelopment) return;
    
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'info',
      source: 'API',
      message: `${method} ${path}`,
      details: {
        userId,
        body: body ? this.sanitizeBody(body) : undefined,
      },
    };

    this.addToBuffer(entry);
    console.log(
      `${colors.cyan}[API]${colors.reset} ${method} ${path}`,
      userId ? `[User: ${userId}]` : '',
      body ? JSON.stringify(this.sanitizeBody(body)) : ''
    );
  }

  /**
   * Log a warning
   */
  warn(source: string, message: string, details?: any): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'warn',
      source,
      message,
      details,
    };

    this.addToBuffer(entry);
    this.consoleLog(entry);
  }

  /**
   * Log info message
   */
  info(source: string, message: string, details?: any): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'info',
      source,
      message,
      details,
    };

    this.addToBuffer(entry);
    if (this.isDevelopment) {
      this.consoleLog(entry);
    }
  }

  /**
   * Log debug message (only in development)
   */
  debug(source: string, message: string, details?: any): void {
    if (!this.isDevelopment) return;
    
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'debug',
      source,
      message,
      details,
    };

    this.addToBuffer(entry);
    this.consoleLog(entry);
  }

  /**
   * Get recent logs (for development debugging)
   */
  getRecentLogs(limit: number = 50, level?: string): LogEntry[] {
    let logs = [...logBuffer].reverse();
    
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    return logs.slice(0, limit);
  }

  /**
   * Clear log buffer
   */
  clearLogs(): void {
    logBuffer.length = 0;
  }

  /**
   * Create an error response with proper logging
   */
  errorResponse(
    source: string,
    error: any,
    statusCode: number = 500,
    userMessage?: string
  ): NextResponse {
    const errorId = this.error(source, error.message || 'Unknown error', error);
    
    const response = {
      success: false,
      error: this.isDevelopment
        ? error.message
        : userMessage || 'An error occurred. Please try again.',
      errorId,
      ...(this.isDevelopment && {
        debug: {
          message: error.message,
          code: error.code,
          detail: error.detail,
          stack: error.stack,
          source,
        },
      }),
    };

    return NextResponse.json(response, { status: statusCode });
  }

  /**
   * Create a success response with optional logging
   */
  successResponse(data: any, message?: string, log?: boolean): NextResponse {
    if (log) {
      this.info('Response', message || 'Success', { dataKeys: Object.keys(data || {}) });
    }
    
    return NextResponse.json({
      success: true,
      data,
      ...(message && { message }),
    });
  }

  // Private methods

  private generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private addToBuffer(entry: LogEntry): void {
    logBuffer.push(entry);
    
    // Keep buffer size limited
    if (logBuffer.length > LOG_BUFFER_SIZE) {
      logBuffer.shift();
    }
  }

  private consoleLog(entry: LogEntry): void {
    if (!this.isDevelopment && entry.level !== 'error') return;
    
    const timestamp = entry.timestamp.toISOString();
    const levelColors = {
      error: colors.red,
      warn: colors.yellow,
      info: colors.cyan,
      debug: colors.magenta,
    };
    
    const levelColor = levelColors[entry.level] || colors.reset;
    
    // Main log message
    console.log(
      `${levelColor}[${entry.level.toUpperCase()}]${colors.reset}`,
      `${colors.bright}[${entry.source}]${colors.reset}`,
      timestamp,
      entry.message
    );
    
    // Details
    if (entry.details) {
      console.log('📦 Details:', entry.details);
    }
    
    // SQL query
    if (entry.sql) {
      console.log(`${colors.blue}📊 SQL:${colors.reset}`, entry.sql);
      if (entry.params?.length) {
        console.log(`${colors.blue}📌 Params:${colors.reset}`, entry.params);
      }
    }
    
    // Stack trace (only for errors)
    if (entry.stack && entry.level === 'error') {
      console.log(`${colors.red}📚 Stack:${colors.reset}\n`, entry.stack);
    }
    
    // Separator for errors
    if (entry.level === 'error') {
      console.log(colors.red + '='.repeat(60) + colors.reset);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenient wrapper functions
export const logError = (source: string, message: string, error?: any, context?: any) =>
  logger.error(source, message, error, context);

export const logDbError = (source: string, sql: string, params: any[], error: any) =>
  logger.dbError(source, sql, params, error);

export const logApiRequest = (method: string, path: string, userId?: string, body?: any) =>
  logger.apiRequest(method, path, userId, body);

export const logWarn = (source: string, message: string, details?: any) =>
  logger.warn(source, message, details);

export const logInfo = (source: string, message: string, details?: any) =>
  logger.info(source, message, details);

export const logDebug = (source: string, message: string, details?: any) =>
  logger.debug(source, message, details);

// Helper for creating consistent API responses
export const apiResponse = {
  success: (data: any, message?: string, log?: boolean) =>
    logger.successResponse(data, message, log),
    
  error: (source: string, error: any, statusCode?: number, userMessage?: string) =>
    logger.errorResponse(source, error, statusCode, userMessage),
};

export default logger;