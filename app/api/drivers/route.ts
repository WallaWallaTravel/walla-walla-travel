/**
 * Drivers API
 * 
 * ✅ REFACTORED: Service layer handles data fetching
 */

import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { driverService } from '@/lib/services/driver.service';

/**
 * GET /api/drivers
 * Returns list of active drivers
 *
 * ✅ SECURED: Requires admin authentication
 */
export const GET = withAdminAuth(async (_request, _session) => {
  const drivers = await driverService.listActive();

  return NextResponse.json({
    success: true,
    drivers,
    count: drivers.length,
    timestamp: new Date().toISOString(),
  });
});
