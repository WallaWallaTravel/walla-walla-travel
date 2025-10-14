import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/vehicles
 * Returns list of active vehicles with current status
 */
export async function GET() {
  try {
    const result = await query(
      `SELECT 
        v.id,
        v.vehicle_number,
        v.make,
        v.model,
        v.year,
        v.vin,
        v.license_plate,
        v.capacity,
        v.current_mileage,
        v.registration_expiry,
        v.inspection_due,
        v.is_active,
        v.created_at,
        -- Check if vehicle is currently in use
        EXISTS(
          SELECT 1 FROM time_cards tc
          WHERE tc.vehicle_id = v.id
          AND tc.clock_in_time::date = CURRENT_DATE
          AND tc.clock_out_time IS NULL
        ) as is_in_use,
        -- Get current driver if in use
        (
          SELECT u.name 
          FROM time_cards tc
          JOIN users u ON tc.driver_id = u.id
          WHERE tc.vehicle_id = v.id
          AND tc.clock_in_time::date = CURRENT_DATE
          AND tc.clock_out_time IS NULL
          LIMIT 1
        ) as current_driver
      FROM vehicles v
      WHERE v.is_active = true
      ORDER BY v.vehicle_number`
    );

    return NextResponse.json({
      success: true,
      vehicles: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error fetching vehicles:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch vehicles',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
