/**
 * Google Calendar Sync API
 * Trigger manual sync of bookings to Google Calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { googleCalendarSyncService } from '@/lib/services/google-calendar-sync.service';
import { BaseService } from '@/lib/services/base.service';
import { getSessionFromRequest } from '@/lib/auth/session';
import { auditService } from '@/lib/services/audit.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper service to query bookings
class SyncService extends BaseService {
  protected get serviceName(): string {
    return 'CalendarSyncService';
  }

  async getBookingsToSync(limit: number = 50): Promise<number[]> {
    const result = await this.queryMany<{ id: number }>(
      `SELECT id
       FROM bookings
       WHERE google_calendar_event_id IS NULL
         AND status IN ('confirmed', 'pending')
         AND tour_date >= CURRENT_DATE
       ORDER BY tour_date ASC
       LIMIT $1`,
      [limit]
    );
    return result.map((r) => r.id);
  }

  async getRecentBookingsToUpdate(hours: number = 24): Promise<number[]> {
    const result = await this.queryMany<{ id: number }>(
      `SELECT id
       FROM bookings
       WHERE google_calendar_event_id IS NOT NULL
         AND updated_at > google_calendar_synced_at
         AND updated_at > NOW() - INTERVAL '${hours} hours'
       ORDER BY updated_at DESC`,
      []
    );
    return result.map((r) => r.id);
  }
}

const syncService = new SyncService();

/**
 * POST /api/admin/integrations/google-calendar/sync
 * Trigger manual sync of bookings to Google Calendar
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Check if configured
  const isConfigured = await googleCalendarSyncService.isConfigured();
  if (!isConfigured) {
    throw new BadRequestError(
      'Google Calendar is not configured. Please set up credentials first.'
    );
  }

  // Get optional parameters from request body
  let syncType = 'all';
  let bookingId: number | undefined;

  try {
    const body = await request.json();
    syncType = body.type || 'all';
    bookingId = body.bookingId;
  } catch {
    // No body, use defaults
  }

  const results: {
    synced: number[];
    updated: number[];
    failed: { id: number; error: string }[];
  } = {
    synced: [],
    updated: [],
    failed: [],
  };

  // Sync a specific booking
  if (bookingId) {
    const result = await googleCalendarSyncService.syncBooking(bookingId);
    if (result.success) {
      results.synced.push(bookingId);
    } else {
      results.failed.push({ id: bookingId, error: result.error || 'Unknown error' });
    }
  } else if (syncType === 'new' || syncType === 'all') {
    // Sync new bookings (no calendar event ID yet)
    const newBookings = await syncService.getBookingsToSync(50);
    for (const id of newBookings) {
      const result = await googleCalendarSyncService.syncBooking(id);
      if (result.success) {
        results.synced.push(id);
      } else {
        results.failed.push({ id, error: result.error || 'Unknown error' });
      }
    }
  }

  if (syncType === 'updated' || syncType === 'all') {
    // Update bookings that have been modified since last sync
    const updatedBookings = await syncService.getRecentBookingsToUpdate(24);
    for (const id of updatedBookings) {
      const result = await googleCalendarSyncService.syncBooking(id);
      if (result.success) {
        results.updated.push(id);
      } else {
        results.failed.push({ id, error: result.error || 'Unknown error' });
      }
    }
  }

  // Audit log
  const session = await getSessionFromRequest(request);
  const userId = session?.user?.id || 1;
  await auditService.logFromRequest(request, userId, 'calendar_sync_triggered', {
    syncType,
    bookingId,
    syncedCount: results.synced.length,
    updatedCount: results.updated.length,
    failedCount: results.failed.length,
  });

  return NextResponse.json({
    success: true,
    message: `Sync complete: ${results.synced.length} new, ${results.updated.length} updated, ${results.failed.length} failed`,
    results,
  });
});
