/**
 * Client-side error logger
 *
 * Sends all errors to Sentry (when NEXT_PUBLIC_SENTRY_DSN is set).
 * Also keeps a small in-memory buffer for dev debugging.
 */

import * as Sentry from '@sentry/nextjs';

interface LoggedError {
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
  url?: string;
}

export class ErrorLogger {
  private static instance: ErrorLogger;
  private errors: LoggedError[] = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupErrorHandlers();
    }
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private setupErrorHandlers() {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      const err = event.error || event.message;
      if (err instanceof Error) {
        Sentry.captureException(err);
      }
      this.logError('Unhandled Error', err, event.filename);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason instanceof Error) {
        Sentry.captureException(event.reason);
      } else {
        Sentry.captureMessage(`Unhandled rejection: ${String(event.reason)}`, 'error');
      }
      this.logError('Unhandled Promise Rejection', event.reason);
    });
  }

  logError(type: string, message: unknown, url?: string) {
    const errorMessage = message as { stack?: string } | null;
    const error: LoggedError = {
      timestamp: new Date().toISOString(),
      type,
      message: typeof message === 'object' ? JSON.stringify(message) : String(message),
      stack: errorMessage?.stack,
      url: url || window.location.href
    };

    this.errors.push(error);
  }

  getErrors() {
    return this.errors;
  }

  clearErrors() {
    this.errors = [];
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  ErrorLogger.getInstance();
}
