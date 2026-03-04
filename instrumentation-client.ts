import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev',
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',
    sampleRate: 1.0,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,
    debug: process.env.NODE_ENV === 'development',

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.browserTracingIntegration({
        enableInp: true,
      }),
    ],

    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'AbortError',
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],

    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],

    beforeSend(event) {
      if (process.env.NODE_ENV === 'development') {
        return null;
      }

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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
