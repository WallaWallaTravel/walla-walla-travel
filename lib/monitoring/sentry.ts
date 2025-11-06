/**
 * Sentry Error Monitoring Setup
 * 
 * This file provides a wrapper around Sentry for error monitoring.
 * It can be easily swapped out for other monitoring services.
 */

interface ErrorContext {
  [key: string]: any;
}

interface User {
  id: string;
  email?: string;
  username?: string;
}

class ErrorMonitoring {
  private enabled: boolean;
  private environment: string;

  constructor() {
    this.enabled = process.env.NEXT_PUBLIC_SENTRY_DSN !== undefined;
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Initialize Sentry (call this in app initialization)
   */
  init() {
    if (!this.enabled) {
      console.log('📊 Error monitoring disabled (no SENTRY_DSN found)');
      return;
    }

    // TODO: Initialize Sentry when ready
    // Sentry.init({
    //   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    //   environment: this.environment,
    //   tracesSampleRate: 1.0,
    // });

    console.log(`📊 Error monitoring initialized for ${this.environment}`);
  }

  /**
   * Capture an exception
   */
  captureException(error: Error, context?: ErrorContext) {
    if (!this.enabled) {
      console.error('❌ Error:', error);
      if (context) console.error('Context:', context);
      return;
    }

    // TODO: Send to Sentry
    // Sentry.captureException(error, { extra: context });
    
    console.error('❌ Error captured:', error.message);
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
    if (!this.enabled) {
      console.log(`[${level.toUpperCase()}] ${message}`);
      return;
    }

    // TODO: Send to Sentry
    // Sentry.captureMessage(message, { level, extra: context });
    
    console.log(`📊 Message captured: ${message}`);
  }

  /**
   * Set user context
   */
  setUser(user: User | null) {
    if (!this.enabled) return;

    // TODO: Set Sentry user
    // Sentry.setUser(user);
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(message: string, category: string, data?: ErrorContext) {
    if (!this.enabled) return;

    // TODO: Add Sentry breadcrumb
    // Sentry.addBreadcrumb({
    //   message,
    //   category,
    //   data,
    //   level: 'info',
    // });
  }

  /**
   * Set custom context
   */
  setContext(name: string, context: ErrorContext) {
    if (!this.enabled) return;

    // TODO: Set Sentry context
    // Sentry.setContext(name, context);
  }

  /**
   * Wrap async function with error monitoring
   */
  wrapAsync<T>(fn: () => Promise<T>, context?: ErrorContext): Promise<T> {
    return fn().catch((error) => {
      this.captureException(error, context);
      throw error;
    });
  }
}

// Export singleton instance
export const errorMonitoring = new ErrorMonitoring();

// Convenience exports
export const captureException = (error: Error, context?: ErrorContext) => 
  errorMonitoring.captureException(error, context);

export const captureMessage = (message: string, level?: 'info' | 'warning' | 'error', context?: ErrorContext) => 
  errorMonitoring.captureMessage(message, level, context);

export const setUser = (user: User | null) => 
  errorMonitoring.setUser(user);

export const addBreadcrumb = (message: string, category: string, data?: ErrorContext) => 
  errorMonitoring.addBreadcrumb(message, category, data);

