import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Request body schema
const ClockOutSchema = z.object({
  driverId: z.number().int().positive('Driver ID must be a positive integer'),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().positive().optional(),
  }).optional(),
  signature: z.string().max(5000).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * POST /api/time-clock/clock-out
 * Completes a time card by clocking out
 *
 * ✅ REFACTORED: Zod validation + structured logging
 */
export async function POST(request: Request) {
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

    const parseResult = ClockOutSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed: ' + parseResult.error.issues.map((e) => e.message).join(', ')
        },
        { status: 400 }
      );
    }

    const { driverId, location, signature, notes } = parseResult.data;

    // Find today's active time card
    const existingResult = await query(
      `SELECT id, clock_in_time
      FROM time_cards
      WHERE driver_id = $1
      AND clock_in_time::date = CURRENT_DATE
      AND clock_out_time IS NULL`,
      [driverId]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No active time card found for today' 
        },
        { status: 404 }
      );
    }

    const timeCardId = existingResult.rows[0].id;
    const clockInTime = existingResult.rows[0].clock_in_time;

    // Calculate hours worked
    const hoursResult = await query(
      `SELECT 
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - $1)) / 3600 as hours_worked`,
      [clockInTime]
    );
    
    const hoursWorked = parseFloat(hoursResult.rows[0].hours_worked);

    // Update time card with clock out
    const result = await query(
      `UPDATE time_cards
      SET 
        clock_out_time = CURRENT_TIMESTAMP,
        clock_out_location = $2,
        clock_out_gps_accuracy = $3,
        total_hours_worked = $4,
        driver_signature = $5,
        notes = COALESCE(notes || E'\n\n', '') || COALESCE($6, '')
      WHERE id = $1
      RETURNING *`,
      [
        timeCardId,
        location ? `${location.latitude},${location.longitude}` : null,
        location?.accuracy || null,
        hoursWorked,
        signature || null,
        notes || null
      ]
    );

    const _timeCard = result.rows[0];

    // Update daily_trips end time
    await query(
      `UPDATE daily_trips
      SET 
        end_time = CURRENT_TIMESTAMP,
        end_location = $2
      WHERE driver_id = $1
      AND trip_date = CURRENT_DATE`,
      [
        driverId,
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
      LEFT JOIN vehicles v ON tc.vehicle_id = v.id
      WHERE tc.id = $1`,
      [timeCardId]
    );

    // Check for compliance violations
    const violations = [];
    if (hoursWorked > 10) {
      violations.push({
        type: 'driving_limit',
        message: 'Exceeded 10-hour driving limit',
        severity: 'critical'
      });
    }
    if (hoursWorked > 15) {
      violations.push({
        type: 'on_duty_limit',
        message: 'Exceeded 15-hour on-duty limit',
        severity: 'critical'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Clocked out successfully',
      timeCard: detailsResult.rows[0],
      violations,
      hoursWorked: Math.round(hoursWorked * 10) / 10 // Round to 1 decimal
    });

  } catch (error) {
    logger.error('Error clocking out', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clock out',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
