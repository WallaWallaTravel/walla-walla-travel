import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { complianceService } from '@/lib/services/compliance.service';

/**
 * POST /api/time-clock/clock-in
 * Creates a new time card for clock in
 *
 * Body: {
 *   driverId: number,
 *   vehicleId: number,
 *   location: { latitude: number, longitude: number, accuracy: number },
 *   notes?: string
 * }
 *
 * COMPLIANCE ENFORCEMENT:
 * This endpoint checks HOS (Hours of Service) limits before allowing clock-in:
 * - Daily driving limit: 10 hours (FMCSA 395.5)
 * - Daily on-duty limit: 15 hours
 * - Weekly limit: 60/70 hours
 *
 * HOS violations CANNOT be overridden - this is for driver and public safety.
 * Returns 403 if HOS limits would be exceeded.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { driverId, vehicleId, location, notes } = body;

    // Validate required fields
    if (!driverId || !vehicleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver ID and Vehicle ID are required'
        },
        { status: 400 }
      );
    }

    // ==========================================================================
    // COMPLIANCE CHECK: Verify HOS limits before allowing clock-in
    // ==========================================================================
    const hosCheck = await complianceService.checkHOSCompliance(driverId, new Date());

    if (!hosCheck.canProceed) {
      // Log the compliance block
      await complianceService.logComplianceCheck(
        'clock_in',
        '/api/time-clock/clock-in',
        {
          canProceed: false,
          driverCompliance: {
            driverId,
            isCompliant: true,
            canProceed: true,
            violations: [],
            warnings: [],
            allowsAdminOverride: true,
          },
          vehicleCompliance: {
            vehicleId,
            isCompliant: true,
            canProceed: true,
            violations: [],
            warnings: [],
            allowsAdminOverride: true,
          },
          hosCompliance: hosCheck,
          allViolations: hosCheck.violations,
          allWarnings: hosCheck.warnings,
          primaryViolation: hosCheck.primaryViolation,
          allowsAdminOverride: false, // HOS violations cannot be overridden
        },
        {
          driverId,
          vehicleId,
          tourDate: new Date(),
          requestIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'COMPLIANCE_BLOCKED',
            message: hosCheck.primaryViolation?.message || 'HOS limits exceeded',
            violations: hosCheck.violations,
            warnings: hosCheck.warnings,
            canOverride: false,
            reason: 'Hours of Service (HOS) violations cannot be overridden. This is a safety requirement.',
          }
        },
        { status: 403 }
      );
    }

    // Check if there are HOS warnings to include in response
    const hosWarnings = hosCheck.warnings.length > 0 ? hosCheck.warnings : undefined;

    // Check if driver is already clocked in today
    const existingResult = await query(
      `SELECT id FROM time_cards
      WHERE driver_id = $1
      AND clock_in_time::date = CURRENT_DATE
      AND clock_out_time IS NULL`,
      [driverId]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Driver is already clocked in today' 
        },
        { status: 409 }
      );
    }

    // Check if vehicle is already in use
    const vehicleInUseResult = await query(
      `SELECT tc.id, u.name as driver_name
      FROM time_cards tc
      JOIN users u ON tc.driver_id = u.id
      WHERE tc.vehicle_id = $1
      AND tc.clock_in_time::date = CURRENT_DATE
      AND tc.clock_out_time IS NULL`,
      [vehicleId]
    );

    if (vehicleInUseResult.rows.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Vehicle is already in use by ${vehicleInUseResult.rows[0].driver_name}` 
        },
        { status: 409 }
      );
    }

    // Create time card
    const result = await query(
      `INSERT INTO time_cards (
        driver_id,
        vehicle_id,
        clock_in_time,
        clock_in_location,
        clock_in_gps_accuracy,
        notes
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)
      RETURNING 
        id,
        driver_id,
        vehicle_id,
        clock_in_time,
        clock_in_location,
        notes`,
      [
        driverId,
        vehicleId,
        location ? `${location.latitude},${location.longitude}` : null,
        location?.accuracy || null,
        notes || null
      ]
    );

    const timeCard = result.rows[0];

    // Also create a daily_trips record
    await query(
      `INSERT INTO daily_trips (
        driver_id,
        vehicle_id,
        trip_date,
        start_time,
        start_location
      ) VALUES ($1, $2, CURRENT_DATE, CURRENT_TIMESTAMP, $3)
      ON CONFLICT (driver_id, trip_date) 
      DO NOTHING`,
      [
        driverId,
        vehicleId,
        location ? `${location.latitude},${location.longitude}` : null
      ]
    );

    // Get driver and vehicle details for response
    const detailsResult = await query(
      `SELECT 
        tc.*,
        u.name as driver_name,
        u.email as driver_email,
        v.vehicle_number,
        v.make,
        v.model
      FROM time_cards tc
      JOIN users u ON tc.driver_id = u.id
      JOIN vehicles v ON tc.vehicle_id = v.id
      WHERE tc.id = $1`,
      [timeCard.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Clocked in successfully',
      timeCard: detailsResult.rows[0],
      // Include HOS warnings so driver sees them even on successful clock-in
      ...(hosWarnings && { warnings: hosWarnings }),
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error clocking in:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clock in',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
