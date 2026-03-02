'use client';

import * as Sentry from '@sentry/nextjs';

export default function SentryExamplePage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
        Sentry Test Page
      </h1>
      <p style={{ color: '#374151', marginBottom: '1.5rem' }}>
        Click the button below to throw a test error. It should appear in your
        Sentry dashboard within a few seconds.
      </p>
      <button
        type="button"
        onClick={() => {
          const error = new Error('Sentry test error — safe to ignore');
          Sentry.captureException(error);
          throw error;
        }}
        style={{
          backgroundColor: '#dc2626',
          color: 'white',
          padding: '0.625rem 1.25rem',
          borderRadius: '0.5rem',
          border: 'none',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Throw Test Error
      </button>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '1rem' }}>
        Remove this page after verifying the Sentry pipeline works.
      </p>
    </div>
  );
}
