import * as Sentry from '@sentry/nextjs';

export async function register() {
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

  if (!SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side (Node.js) — API routes, SSR, RSC
    Sentry.init({
      dsn: SENTRY_DSN,
      release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev',
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',
      sampleRate: 1.0,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      debug: process.env.NODE_ENV === 'development',
      integrations: [],

      ignoreErrors: [
        'ZodError',
        'ValidationError',
        'RATE_LIMIT_EXCEEDED',
        'JsonWebTokenError',
        'TokenExpiredError',
      ],

      beforeSend(event) {
        if (process.env.NODE_ENV === 'development') {
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

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime — Vercel middleware
    Sentry.init({
      dsn: SENTRY_DSN,
      release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev',
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',
      sampleRate: 1.0,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.NODE_ENV === 'development',

      ignoreErrors: [
        'NEXT_REDIRECT',
        'NEXT_NOT_FOUND',
      ],

      beforeSend(event) {
        if (process.env.NODE_ENV === 'development') {
          return null;
        }
        return event;
      },
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
