/**
 * Sentry Error Monitoring Integration
 *
 * @module lib/monitoring/sentry
 * @description Provides a unified interface for error monitoring using Sentry.
 * Automatically initializes based on environment variables and provides
 * convenient methods for error tracking, user context, and breadcrumbs.
 *
 * Configuration:
 * - NEXT_PUBLIC_SENTRY_DSN: Sentry Data Source Name
 * - SENTRY_AUTH_TOKEN: Auth token for source map uploads (build time only)
 * - SENTRY_ORG: Sentry organization slug
 * - SENTRY_PROJECT: Sentry project slug
 */

import * as Sentry from '@sentry/nextjs';

interface ErrorContext {
  [key: string]: unknown;
}

interface User {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}

/**
 * Check if Sentry is enabled
 */
function isSentryEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_SENTRY_DSN;
}

/**
 * Error Monitoring class providing Sentry integration
 */
class ErrorMonitoring {
  private enabled: boolean;
  private environment: string;

  constructor() {
    this.enabled = isSentryEnabled();
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Capture an exception and send to Sentry
   */
  captureException(error: Error, context?: ErrorContext): string | undefined {
    if (!this.enabled) {
      console.error('[Error]', error.message, context);
      return undefined;
    }

    // Add context as extra data
    if (context) {
      Sentry.setContext('error_context', context);
    }

    // Capture and return the event ID for tracking
    return Sentry.captureException(error);
  }

  /**
   * Capture a message and send to Sentry
   */
  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: ErrorContext
  ): string | undefined {
    if (!this.enabled) {
      console.log(`[${level.toUpperCase()}] ${message}`, context);
      return undefined;
    }

    if (context) {
      Sentry.setContext('message_context', context);
    }

    const sentryLevel = level === 'warning' ? 'warning' : level === 'error' ? 'error' : 'info';
    return Sentry.captureMessage(message, sentryLevel);
  }

  /**
   * Set the current user context
   */
  setUser(user: User | null): void {
    if (!this.enabled) return;

    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
      });

      // Add custom tag for role-based filtering
      if (user.role) {
        Sentry.setTag('user_role', user.role);
      }
    } else {
      Sentry.setUser(null);
    }
  }

  /**
   * Add a breadcrumb for debugging context
   */
  addBreadcrumb(
    message: string,
    category: string,
    data?: ErrorContext,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info'
  ): void {
    if (!this.enabled) return;

    Sentry.addBreadcrumb({
      message,
      category,
      data: data as Record<string, unknown>,
      level,
    });
  }

  /**
   * Set custom context for better error debugging
   */
  setContext(name: string, context: ErrorContext): void {
    if (!this.enabled) return;

    Sentry.setContext(name, context as Record<string, unknown>);
  }

  /**
   * Set a tag for filtering errors
   */
  setTag(key: string, value: string): void {
    if (!this.enabled) return;

    Sentry.setTag(key, value);
  }

  /**
   * Start a new transaction for performance monitoring
   */
  startTransaction(name: string, op: string): Sentry.Span | undefined {
    if (!this.enabled) return undefined;

    return Sentry.startInactiveSpan({
      name,
      op,
    });
  }

  /**
   * Wrap an async function with error monitoring
   */
  async wrapAsync<T>(fn: () => Promise<T>, context?: ErrorContext): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Error) {
        this.captureException(error, context);
      }
      throw error;
    }
  }

  /**
   * Create a child scope for isolated error context
   */
  withScope<T>(callback: (scope: Sentry.Scope) => T): T {
    if (!this.enabled) {
      // Create a mock scope for disabled mode
      return callback({} as Sentry.Scope);
    }

    return Sentry.withScope(callback);
  }

  /**
   * Flush all pending events (useful before serverless function exits)
   */
  async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.enabled) return true;

    return Sentry.flush(timeout);
  }

  /**
   * Get Sentry status for health checks
   */
  getStatus(): { enabled: boolean; environment: string } {
    return {
      enabled: this.enabled,
      environment: this.environment,
    };
  }
}

// Export singleton instance
export const errorMonitoring = new ErrorMonitoring();

// Convenience exports for common operations
export const captureException = (error: Error, context?: ErrorContext): string | undefined =>
  errorMonitoring.captureException(error, context);

export const captureMessage = (
  message: string,
  level?: 'info' | 'warning' | 'error',
  context?: ErrorContext
): string | undefined => errorMonitoring.captureMessage(message, level, context);

export const setUser = (user: User | null): void => errorMonitoring.setUser(user);

export const addBreadcrumb = (
  message: string,
  category: string,
  data?: ErrorContext,
  level?: 'debug' | 'info' | 'warning' | 'error'
): void => errorMonitoring.addBreadcrumb(message, category, data, level);

export const setContext = (name: string, context: ErrorContext): void =>
  errorMonitoring.setContext(name, context);

export const setTag = (key: string, value: string): void => errorMonitoring.setTag(key, value);

// Export Sentry directly for advanced use cases
export { Sentry };

export default errorMonitoring;
