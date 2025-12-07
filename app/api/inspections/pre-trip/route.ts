import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware/auth-wrapper';
import { validateBody } from '@/lib/api/middleware/validation';
import { PreTripInspectionSchema } from '@/lib/validation/schemas/vehicle.schemas';
import { inspectionService } from '@/lib/services/inspection.service';

/**
 * POST /api/inspections/pre-trip
 * Create pre-trip inspection
 * 
 * ✅ REFACTORED: Service layer + Zod validation
 */
export const POST = withAuth(async (request: NextRequest, session) => {
  // ✅ Validate with Zod
  const data = await validateBody(request, PreTripInspectionSchema);

  // ✅ Use service layer
  const inspection = await inspectionService.createPreTrip(
    parseInt(session.userId),
    data
  );

  return NextResponse.json({
    success: true,
    data: inspection,
    message: 'Pre-trip inspection created successfully',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/inspections/pre-trip
 * Check if pre-trip is required for driver's current vehicle
 * 
 * ✅ REFACTORED: Service layer
 */
export const GET = withAuth(async (request: NextRequest, session, _context): Promise<NextResponse> => {
  const driverId = parseInt(session.userId);

  // Get driver's current vehicle from active time card
  const { query } = await import('@/lib/db');
  const timeCardResult = await query(`
    SELECT vehicle_id FROM time_cards
    WHERE driver_id = $1 AND clock_out_time IS NULL
    ORDER BY clock_in_time DESC
    LIMIT 1
  `, [driverId]);

  if (timeCardResult.rows.length === 0 || !timeCardResult.rows[0].vehicle_id) {
    return NextResponse.json({
      success: true,
      data: null,
      message: 'No active shift or vehicle assigned',
      timestamp: new Date().toISOString(),
    });
  }

  const vehicleId = timeCardResult.rows[0].vehicle_id;

  // ✅ Use service to check requirement
  const requirement = await inspectionService.isPreTripRequired(vehicleId);

  return NextResponse.json({
    success: true,
    data: {
      vehicleId,
      required: requirement.required,
      reason: requirement.reason,
    },
    timestamp: new Date().toISOString(),
  });
});