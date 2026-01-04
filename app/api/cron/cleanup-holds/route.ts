/**
 * Cron: Cleanup Expired Holds
 *
 * This endpoint should be called periodically (e.g., every 5 minutes)
 * to clean up abandoned hold blocks that were never converted to bookings.
 *
 * For Vercel: Add to vercel.json with path "/api/cron/cleanup-holds"
 * and schedule every 5 minutes
 *
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import { vehicleAvailabilityService } from '@/lib/services/vehicle-availability.service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret (for Vercel cron jobs)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In production, require authorization
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const deletedCount = await vehicleAvailabilityService.cleanupExpiredHolds();

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired hold${deletedCount !== 1 ? 's' : ''}`,
      deleted_count: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cron cleanup-holds error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Cleanup failed', details: message },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export const POST = GET;
