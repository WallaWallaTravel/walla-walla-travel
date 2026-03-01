/**
 * Google Calendar Integration Status API
 * Check if Google Calendar sync is configured and get last sync info
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { googleCalendarSyncService } from '@/lib/services/google-calendar-sync.service';
import { BaseService } from '@/lib/services/base.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper service to query database
class IntegrationStatusService extends BaseService {
  protected get serviceName(): string {
    return 'IntegrationStatusService';
  }

  async getLastSyncInfo(): Promise<{
    lastSyncedAt: string | null;
    totalSynced: number;
    pendingSync: number;
  }> {
    // Get the most recent sync timestamp
    const lastSync = await this.queryOne<{ google_calendar_synced_at: string }>(
      `SELECT google_calendar_synced_at
       FROM bookings
       WHERE google_calendar_synced_at IS NOT NULL
       ORDER BY google_calendar_synced_at DESC
       LIMIT 1`
    );

    // Count synced bookings
    const syncedCount = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM bookings
       WHERE google_calendar_event_id IS NOT NULL`
    );

    // Count bookings needing sync (confirmed/pending without calendar event)
    const pendingCount = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM bookings
       WHERE google_calendar_event_id IS NULL
         AND status IN ('confirmed', 'pending')
         AND tour_date >= CURRENT_DATE`
    );

    return {
      lastSyncedAt: lastSync?.google_calendar_synced_at || null,
      totalSynced: parseInt(syncedCount?.count || '0', 10),
      pendingSync: parseInt(pendingCount?.count || '0', 10),
    };
  }
}

const statusService = new IntegrationStatusService();

/**
 * GET /api/admin/integrations/google-calendar/status
 * Check Google Calendar integration status
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session) => {
  // Check if Google Calendar is configured
  const isConfigured = await googleCalendarSyncService.isConfigured();

  // Get sync statistics from database
  const syncInfo = await statusService.getLastSyncInfo();

  // Get current calendar ID (from env or default)
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  return NextResponse.json({
    success: true,
    status: {
      configured: isConfigured,
      calendarId: isConfigured ? calendarId : null,
      lastSyncedAt: syncInfo.lastSyncedAt,
      totalSynced: syncInfo.totalSynced,
      pendingSync: syncInfo.pendingSync,
      credentialsPath: 'scripts/import/credentials.json',
      tokenPath: 'scripts/import/token.json',
    },
  });
});
