/**
 * Drivers API
 * 
 * ✅ REFACTORED: Service layer handles data fetching
 */

import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { driverService } from '@/lib/services/driver.service';

/**
 * GET /api/drivers
 * Returns list of active drivers
 * 
 * ✅ REFACTORED: Reduced from 51 lines to 16 lines
 */
export const GET = withErrorHandling(async () => {
  const drivers = await driverService.listActive();

  return NextResponse.json({
    success: true,
    drivers,
    count: drivers.length,
    timestamp: new Date().toISOString(),
  });
});
