import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware/auth-wrapper';
import { validateBody } from '@/lib/api/middleware/validation';
import { PostTripInspectionSchema } from '@/lib/validation/schemas/vehicle.schemas';
import { inspectionService } from '@/lib/services/inspection.service';
import { notificationService } from '@/lib/services/notification.service';

/**
 * POST /api/inspections/post-trip
 * Create post-trip inspection with critical defect workflow
 * 
 * ✅ REFACTORED: Service layer + notifications
 */
export const POST = withAuth(async (request: NextRequest, session) => {
  const driverId = parseInt(session.userId);

  // ✅ Validate with Zod
  const data = await validateBody(request, PostTripInspectionSchema);

  // ✅ Use service layer for business logic
  const result = await inspectionService.createPostTrip(driverId, data);

  // ✅ Send notifications if critical defect
  if (result.criticalDefect) {
    await notificationService.sendCriticalDefectAlert({
      driverId,
      vehicleId: data.vehicleId,
      defectDescription: data.inspectionData.defectDescription || 'No description provided',
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      inspection: result.inspection,
      criticalDefect: result.criticalDefect,
      vehicleOutOfService: result.vehicleOutOfService,
    },
    message: result.criticalDefect
      ? 'Critical defect reported. Vehicle marked out of service. Supervisor notified.'
      : 'Post-trip inspection saved successfully',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/inspections/post-trip
 * Check if post-trip inspection exists for current shift
 * 
 * ✅ REFACTORED: Clean and simple
 */
export const GET = withAuth(async (request: NextRequest, session) => {
  const driverId = parseInt(session.userId);

  // Get active time card
  const { query } = await import('@/lib/db');
  const timeCardResult = await query(`
    SELECT id FROM time_cards
    WHERE driver_id = $1 AND clock_out_time IS NULL
    ORDER BY clock_in_time DESC
    LIMIT 1
  `, [driverId]);

  const timeCardId = timeCardResult.rows[0]?.id;

  if (!timeCardId) {
    return NextResponse.json({
      success: true,
      data: null,
      message: 'No active shift',
      timestamp: new Date().toISOString(),
    });
  }

  // Query for post-trip inspection for THIS shift
  const result = await query(`
    SELECT i.*, v.vehicle_number, v.make, v.model
    FROM inspections i
    JOIN vehicles v ON i.vehicle_id = v.id
    WHERE i.time_card_id = $1
      AND i.type = 'post_trip'
    ORDER BY i.created_at DESC
    LIMIT 1
  `, [timeCardId]);

  return NextResponse.json({
    success: true,
    data: result.rows[0] || null,
    message: result.rows.length > 0 ? 'Post-trip inspection retrieved' : 'No post-trip inspection for this shift',
    timestamp: new Date().toISOString(),
  });
});
