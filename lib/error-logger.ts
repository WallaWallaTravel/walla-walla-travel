/**
 * Client-side error logger
 * Automatically captures and logs errors for debugging
 */

export class ErrorLogger {
  private static instance: ErrorLogger;
  private errors: Array<{
    timestamp: string;
    type: string;
    message: string;
    stack?: string;
    url?: string;
  }> = [];

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
      this.logError('Unhandled Error', event.error || event.message, event.filename);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', event.reason);
    });

    // Capture console errors
    const originalError = console.error;
    console.error = (...args) => {
      this.logError('Console Error', args.join(' '));
      originalError.apply(console, args);
    };
  }

  logError(type: string, message: any, url?: string) {
    const error = {
      timestamp: new Date().toISOString(),
      type,
      message: typeof message === 'object' ? JSON.stringify(message) : String(message),
      stack: message?.stack,
      url: url || window.location.href
    };

    this.errors.push(error);

    // Send to server for logging
    this.sendToServer(error);

    // Also log to console for immediate visibility
    console.log('🔴 ERROR CAPTURED:', error);
  }

  private async sendToServer(error: any) {
    try {
      await fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      });
    } catch (e) {
      // Silently fail if logging fails
    }
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


