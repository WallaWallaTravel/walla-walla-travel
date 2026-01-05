/**
 * Sentry Edge Configuration
 *
 * This file configures Sentry for edge function error tracking.
 * It runs on Vercel's edge network and captures middleware errors.
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

    // Performance monitoring - capture 10% of edge transactions
    // (higher volume on edge, so lower sample rate)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Enable debug in development
    debug: process.env.NODE_ENV === 'development',

    // Filter noisy errors
    ignoreErrors: [
      // Expected middleware behavior
      'NEXT_REDIRECT',
      'NEXT_NOT_FOUND',
    ],

    // Attach context before sending
    beforeSend(event) {
      // Don't send in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[Sentry Edge] Would send', { exception: event.exception });
        return null;
      }

      return event;
    },
  });
}
