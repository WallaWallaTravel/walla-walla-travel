/**
 * Sentry Server Configuration
 *
 * This file configures Sentry for server-side (Node.js) error tracking.
 * It runs on the server and captures API errors, database issues,
 * and server-side rendering problems.
 */

import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

// Only initialize if DSN is provided
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment identification
    environment: process.env.NODE_ENV || 'development',

    // Capture 100% of errors
    sampleRate: 1.0,

    // Performance monitoring - capture 20% of transactions in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Enable detailed debug info in development
    debug: process.env.NODE_ENV === 'development',

    // Integrations for server-side monitoring
    integrations: [],

    // Filter out noisy errors
    ignoreErrors: [
      // Expected validation errors
      'ZodError',
      'ValidationError',
      // Rate limiting (expected behavior)
      'RATE_LIMIT_EXCEEDED',
      // Auth errors (expected for invalid tokens)
      'JsonWebTokenError',
      'TokenExpiredError',
    ],

    // Attach additional context to errors
    beforeSend(event, hint) {
      // Don't send in development (but log them)
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[Sentry Server] Would send', { exception: event.exception });
        return null;
      }

      // Scrub sensitive data from request bodies
      if (event.request?.data) {
        const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'cookie'];
        const data =
          typeof event.request.data === 'string'
            ? event.request.data
            : JSON.stringify(event.request.data);

        sensitiveKeys.forEach((key) => {
          if (data.toLowerCase().includes(key)) {
            event.request!.data = '[REDACTED - contains sensitive data]';
          }
        });
      }

      return event;
    },

    // Scrub sensitive headers
    beforeSendTransaction(event) {
      if (event.request?.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-csrf-token'];
        sensitiveHeaders.forEach((header) => {
          if (event.request!.headers![header]) {
            event.request!.headers![header] = '[REDACTED]';
          }
        });
      }
      return event;
    },
  });
}
