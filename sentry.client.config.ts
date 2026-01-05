/**
 * Sentry Client Configuration
 *
 * This file configures Sentry for client-side (browser) error tracking.
 * It runs in the browser and captures JavaScript errors, performance data,
 * and user interactions.
 */

import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Only initialize if DSN is provided
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment identification
    environment: process.env.NODE_ENV || 'development',

    // Capture 100% of errors in production, 100% in development
    // Adjust based on volume if needed
    sampleRate: 1.0,

    // Performance monitoring - capture 20% of transactions
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Session replay for debugging user issues
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,

    // Enable detailed debug info in development
    debug: process.env.NODE_ENV === 'development',

    // Integrations for better error context
    integrations: [
      Sentry.replayIntegration({
        // Mask all text and inputs by default for privacy
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.browserTracingIntegration({
        // Capture interactions with buttons, links, etc.
        enableInp: true,
      }),
    ],

    // Filter out noisy errors
    ignoreErrors: [
      // Network errors from extensions
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // User cancelled actions
      'AbortError',
      // Network connectivity issues
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      // Browser extension errors
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],

    // Don't send errors from these URLs
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],

    // Attach additional context to errors
    beforeSend(event, hint) {
      // Don't send errors in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[Sentry] Would send', { event, hint });
        return null;
      }

      // Add current URL and referrer
      if (typeof window !== 'undefined') {
        event.tags = {
          ...event.tags,
          url: window.location.href,
          referrer: document.referrer || 'direct',
        };
      }

      return event;
    },
  });
}
