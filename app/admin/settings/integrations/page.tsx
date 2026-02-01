"use client";

/**
 * Integrations Admin Page
 * Manage external service integrations (Google Calendar, etc.)
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface CalendarStatus {
  configured: boolean;
  calendarId: string | null;
  lastSyncedAt: string | null;
  totalSynced: number;
  pendingSync: number;
  credentialsPath: string;
  tokenPath: string;
}

interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary: boolean;
  accessRole: string;
  backgroundColor?: string;
}

interface SyncResult {
  synced: number[];
  updated: number[];
  failed: { id: number; error: string }[];
}

export default function IntegrationsPage() {
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/integrations/google-calendar/status');
      if (response.ok) {
        const data = await response.json();
        setCalendarStatus(data.status);
      }
    } catch (error) {
      logger.error('Failed to load calendar status', { error });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const loadCalendars = async () => {
    setLoadingCalendars(true);
    try {
      const response = await fetch('/api/admin/integrations/google-calendar/calendars');
      if (response.ok) {
        const data = await response.json();
        setCalendars(data.calendars);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to load calendars' });
      }
    } catch (error) {
      logger.error('Failed to load calendars', { error });
      setMessage({ type: 'error', text: 'Failed to load calendars' });
    } finally {
      setLoadingCalendars(false);
    }
  };

  const triggerSync = async (type: 'all' | 'new' | 'updated' = 'all') => {
    setSyncing(true);
    setMessage(null);
    setLastSyncResult(null);

    try {
      const response = await fetch('/api/admin/integrations/google-calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setLastSyncResult(data.results);
        // Reload status to get updated counts
        await loadStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Sync failed' });
      }
    } catch (error) {
      logger.error('Sync failed', { error });
      setMessage({ type: 'error', text: 'Sync failed. Please try again.' });
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🔗 Integrations</h1>
              <p className="text-sm text-gray-600">Manage external service connections</p>
            </div>
            {message && (
              <div className={`px-4 py-2 rounded-lg ${
                message.type === 'success' ? 'bg-green-100 text-green-800' :
                message.type === 'error' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {message.text}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Google Calendar Section */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📅</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Google Calendar Sync</h2>
                    <p className="text-sm text-gray-600">
                      Two-way sync between bookings and Google Calendar
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  calendarStatus?.configured
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {calendarStatus?.configured ? 'Connected' : 'Not Configured'}
                </div>
              </div>
            </div>

            <div className="p-6">
              {calendarStatus?.configured ? (
                <div className="space-y-6">
                  {/* Status Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Calendar ID</p>
                      <p className="font-mono text-sm text-gray-900 truncate" title={calendarStatus.calendarId || ''}>
                        {calendarStatus.calendarId || 'primary'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Last Synced</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(calendarStatus.lastSyncedAt)}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600">Total Synced</p>
                      <p className="text-2xl font-bold text-green-700">
                        {calendarStatus.totalSynced}
                      </p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4">
                      <p className="text-sm text-amber-600">Pending Sync</p>
                      <p className="text-2xl font-bold text-amber-700">
                        {calendarStatus.pendingSync}
                      </p>
                    </div>
                  </div>

                  {/* Sync Actions */}
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync Actions</h3>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => triggerSync('all')}
                        disabled={syncing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {syncing ? 'Syncing...' : 'Sync All'}
                      </button>
                      <button
                        onClick={() => triggerSync('new')}
                        disabled={syncing}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sync New Only
                      </button>
                      <button
                        onClick={() => triggerSync('updated')}
                        disabled={syncing}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sync Updated Only
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      New bookings are automatically synced when created. Use these buttons for manual sync.
                    </p>
                  </div>

                  {/* Last Sync Result */}
                  {lastSyncResult && (
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Sync Result</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-50 rounded-lg p-4">
                          <p className="text-sm text-green-600">New Events Created</p>
                          <p className="text-xl font-bold text-green-700">{lastSyncResult.synced.length}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-sm text-blue-600">Events Updated</p>
                          <p className="text-xl font-bold text-blue-700">{lastSyncResult.updated.length}</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4">
                          <p className="text-sm text-red-600">Failed</p>
                          <p className="text-xl font-bold text-red-700">{lastSyncResult.failed.length}</p>
                        </div>
                      </div>
                      {lastSyncResult.failed.length > 0 && (
                        <div className="mt-4 bg-red-50 rounded-lg p-4">
                          <p className="text-sm font-medium text-red-800 mb-2">Failed Bookings:</p>
                          <ul className="text-sm text-red-700 space-y-1">
                            {lastSyncResult.failed.map((f) => (
                              <li key={f.id}>Booking #{f.id}: {f.error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Available Calendars */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Available Calendars</h3>
                      <button
                        onClick={loadCalendars}
                        disabled={loadingCalendars}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50"
                      >
                        {loadingCalendars ? 'Loading...' : 'Load Calendars'}
                      </button>
                    </div>
                    {calendars.length > 0 && (
                      <div className="space-y-2">
                        {calendars.map((cal) => (
                          <div
                            key={cal.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              cal.id === calendarStatus.calendarId || (cal.primary && calendarStatus.calendarId === 'primary')
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: cal.backgroundColor || '#4285f4' }}
                              />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {cal.summary}
                                  {cal.primary && (
                                    <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                      Primary
                                    </span>
                                  )}
                                </p>
                                {cal.description && (
                                  <p className="text-sm text-gray-500">{cal.description}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">{cal.accessRole}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {calendars.length === 0 && (
                      <p className="text-sm text-gray-500">
                        Click &quot;Load Calendars&quot; to see available calendars.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🔧</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Google Calendar Not Configured
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    To enable Google Calendar sync, you need to set up OAuth credentials
                    and authorize the application.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-6 text-left max-w-lg mx-auto">
                    <h4 className="font-semibold text-gray-900 mb-3">Setup Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      <li>
                        Create a Google Cloud project and enable the Calendar API
                      </li>
                      <li>
                        Download OAuth credentials and save as{' '}
                        <code className="bg-gray-200 px-1 rounded">
                          {calendarStatus?.credentialsPath || 'scripts/import/credentials.json'}
                        </code>
                      </li>
                      <li>
                        Run the import script to authorize:{' '}
                        <code className="bg-gray-200 px-1 rounded">
                          npx ts-node scripts/import/import-calendar.ts --list-calendars
                        </code>
                      </li>
                      <li>
                        Set <code className="bg-gray-200 px-1 rounded">GOOGLE_CALENDAR_ID</code> in your environment
                      </li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Future Integrations Placeholder */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Other Integrations</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
                <span className="text-3xl mb-2 block">📧</span>
                <p className="font-medium text-gray-700">Gmail Import</p>
                <p className="text-sm text-gray-500">Coming Soon</p>
              </div>
              <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
                <span className="text-3xl mb-2 block">💳</span>
                <p className="font-medium text-gray-700">Stripe</p>
                <p className="text-sm text-gray-500">Coming Soon</p>
              </div>
              <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
                <span className="text-3xl mb-2 block">📊</span>
                <p className="font-medium text-gray-700">QuickBooks</p>
                <p className="text-sm text-gray-500">Coming Soon</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
