'use client';

import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';

export default function SentryExamplePage() {
  const [eventId, setEventId] = useState<string | null>(null);

  function triggerClientError() {
    const id = Sentry.captureException(
      new Error(`Sentry test error (client) — ${new Date().toISOString()}`)
    );
    setEventId(id);
  }

  async function triggerServerError() {
    const res = await fetch('/api/sentry-example-api');
    const data = await res.json();
    setEventId(data.eventId ?? 'sent (check Sentry dashboard)');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sentry Test Page</h1>
        <p className="text-gray-700 mb-6">
          Click a button to send a test error to Sentry. Check the{' '}
          <a
            href="https://walla-walla-travel.sentry.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 underline"
          >
            Sentry dashboard
          </a>{' '}
          to verify it arrives.
        </p>

        <div className="space-y-3">
          <button
            onClick={triggerClientError}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Throw Client Error
          </button>

          <button
            onClick={triggerServerError}
            className="w-full px-4 py-2.5 bg-gray-800 text-white font-medium rounded-lg shadow-sm hover:bg-gray-900 transition-colors"
          >
            Throw Server Error
          </button>
        </div>

        {eventId && (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm font-medium text-emerald-800">Event sent</p>
            <p className="text-xs text-emerald-700 font-mono mt-1 break-all">{eventId}</p>
          </div>
        )}
      </div>
    </div>
  );
}
