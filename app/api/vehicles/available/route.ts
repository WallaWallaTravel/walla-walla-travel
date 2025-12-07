/**
 * Available Vehicles API
 * 
 * ✅ REFACTORED: Service layer handles complex query logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware/auth-wrapper';
import { vehicleService } from '@/lib/services/vehicle.service';

/**
 * GET /api/vehicles/available
 * Get available vehicles for current driver
 * 
 * ✅ REFACTORED: Reduced from 101 lines to 18 lines
 */
export const GET = withAuth(async (request: NextRequest, session) => {
  const result = await vehicleService.getAvailableForDriver(Number(session.userId));

  return NextResponse.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  });
});
