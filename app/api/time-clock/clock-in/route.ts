import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { complianceService } from '@/lib/services/compliance.service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Request body schema
const ClockInSchema = z.object({
  driverId: z.number().int().positive('Driver ID must be a positive integer'),
  vehicleId: z.number().int().positive('Vehicle ID must be a positive integer'),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().positive().optional(),
  }).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * POST /api/time-clock/clock-in
 * Creates a new time card for clock in
 *
 * ✅ REFACTORED: Zod validation + structured logging
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
    // Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const parseResult = ClockInSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed: ' + parseResult.error.issues.map((e) => e.message).join(', ')
        },
        { status: 400 }
      );
    }

    const { driverId, vehicleId, location, notes } = parseResult.data;

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
        work_reporting_location,
        work_reporting_lat,
        work_reporting_lng,
        notes,
        date,
        status
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, CURRENT_DATE, 'active')
      RETURNING
        id,
        driver_id,
        vehicle_id,
        clock_in_time,
        work_reporting_location,
        notes`,
      [
        driverId,
        vehicleId,
        location ? `${location.latitude},${location.longitude}` : null,
        location?.latitude || null,
        location?.longitude || null,
        notes || null
      ]
    );

    const timeCard = result.rows[0];

    // Also create a daily_trips record for distance tracking (if not exists)
    try {
      await query(
        `INSERT INTO daily_trips (
          time_card_id,
          driver_id,
          vehicle_id,
          date,
          base_location_lat,
          base_location_lng
        ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)`,
        [
          timeCard.id,
          driverId,
          vehicleId,
          location?.latitude || null,
          location?.longitude || null
        ]
      );
    } catch {
      // Ignore if daily_trips record already exists
    }

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
    logger.error('Error clocking in', { error });
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
