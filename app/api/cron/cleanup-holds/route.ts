/**
 * Cron: Cleanup Expired Holds
 *
 * Cleans up abandoned hold blocks that were never converted to bookings.
 * Should be called every 5 minutes.
 * Protected by CRON_SECRET (fail-closed).
 */

import { NextRequest, NextResponse } from 'next/server';
import { vehicleAvailabilityService } from '@/lib/services/vehicle-availability.service';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';

export const GET = withCronAuth(async (_request: NextRequest) => {
  const deletedCount = await vehicleAvailabilityService.cleanupExpiredHolds();

  return NextResponse.json({
    success: true,
    message: `Cleaned up ${deletedCount} expired hold${deletedCount !== 1 ? 's' : ''}`,
    deleted_count: deletedCount,
    timestamp: new Date().toISOString(),
  });
});

// Also support POST for manual triggering
export const POST = GET;
