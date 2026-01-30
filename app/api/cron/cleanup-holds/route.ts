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
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Verify cron secret (for Vercel cron jobs)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In production, require authorization
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw new UnauthorizedError('Unauthorized');
  }

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
