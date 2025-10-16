import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  requireAuth,
  parseRequestBody,
  validateRequiredFields,
  logApiRequest,
  formatDateForDB
} from '@/app/api/utils';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult;
    }
    const session = authResult;

    logApiRequest('POST', '/api/inspections/pre-trip', session.userId);

    // Parse request body
    const body = await parseRequestBody<{
      vehicleId: number;
      startMileage: number;
      inspectionData: {
        exterior: { lights: boolean; tires: boolean; body: boolean };
        interior: { seats: boolean; seatbelts: boolean; mirrors: boolean };
        engine: { fluids: boolean; belts: boolean; battery: boolean };
      };
    }>(request);

    if (!body) {
      return errorResponse('Invalid request body', 400);
    }

    // Validate required fields
    const validationError = validateRequiredFields(body, ['vehicleId', 'startMileage', 'inspectionData']);
    if (validationError) {
      return errorResponse(validationError, 400);
    }

    // SMART PRE-TRIP LOGIC: Check if pre-trip is required for THIS VEHICLE
    // Pre-trip is required if:
    // 1. No pre-trip exists for this vehicle today (first shift of day), OR
    // 2. Last post-trip for this vehicle reported defects (safety check required)

    // Check if pre-trip already exists for THIS VEHICLE today (Pacific Time)
    const preTripToday = await query(`
      SELECT id
      FROM inspections
      WHERE vehicle_id = $1
        AND type = 'pre_trip'
        AND DATE(created_at AT TIME ZONE 'America/Los_Angeles') = DATE(NOW() AT TIME ZONE 'America/Los_Angeles')
      LIMIT 1
    `, [body.vehicleId]);

    // Check if previous post-trip for THIS VEHICLE reported defects
    const lastPostTrip = await query(`
      SELECT defects_found, defect_severity
      FROM inspections
      WHERE vehicle_id = $1
        AND type = 'post_trip'
      ORDER BY created_at DESC
      LIMIT 1
    `, [body.vehicleId]);

    const preTripExistsToday = preTripToday.rows.length > 0;
    const lastPostTripHadDefects =
      lastPostTrip.rows.length > 0 &&
      lastPostTrip.rows[0].defects_found === true &&
      lastPostTrip.rows[0].defect_severity !== 'none';

    // If pre-trip exists today AND no defects were reported, block duplicate
    if (preTripExistsToday && !lastPostTripHadDefects) {
      return errorResponse(
        'Pre-trip inspection not required. Another driver already completed pre-trip inspection for this vehicle today, and no defects were reported.',
        400
      );
    }

    // If defects were reported, allow pre-trip even if one exists today
    // If no pre-trip exists today, allow it (first shift of day)
    console.log(`✅ Pre-trip inspection allowed for vehicle ${body.vehicleId}`);
    console.log(`   Pre-trip exists today: ${preTripExistsToday}`);
    console.log(`   Last post-trip had defects: ${lastPostTripHadDefects}`);
    console.log(`   Reason: ${!preTripExistsToday ? 'First shift of day' : 'Previous defects require verification'}`);

    // Get active time card ID (links inspection to specific shift)
    const driverId = parseInt(session.userId);
    const timeCardResult = await query(`
      SELECT id FROM time_cards
      WHERE driver_id = $1 AND clock_out_time IS NULL
      ORDER BY clock_in_time DESC
      LIMIT 1
    `, [driverId]);

    const timeCardId = timeCardResult.rows[0]?.id || null;

    // Create pre-trip inspection with time_card_id for per-shift tracking
    const inspectionResult = await query(`
      INSERT INTO inspections (
        driver_id,
        vehicle_id,
        time_card_id,
        type,
        mileage,
        checklist,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, driver_id, vehicle_id, time_card_id, type, mileage, checklist, created_at
    `, [
      driverId,
      body.vehicleId,
      timeCardId,
      'pre_trip',
      body.startMileage,
      JSON.stringify(body.inspectionData)
    ]);

    const inspection = inspectionResult.rows[0];

    console.log(`✅ Pre-trip inspection saved (ID: ${inspection.id})`);
    console.log(`   Driver: ${driverId}, Vehicle: ${body.vehicleId}, Time Card: ${timeCardId}`);

    return successResponse(inspection, 'Pre-trip inspection created successfully');

  } catch (error) {
    console.error('Pre-trip inspection error:', error);
    return errorResponse('Failed to create pre-trip inspection', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult;
    }
    const session = authResult;

    logApiRequest('GET', '/api/inspections/pre-trip', session.userId);

    // Query for today's pre-trip inspection (Pacific Time)
    const result = await query(`
      SELECT i.*, v.vehicle_number, v.make, v.model 
      FROM inspections i 
      JOIN vehicles v ON i.vehicle_id = v.id 
      WHERE i.driver_id = $1 
        AND i.type = 'pre_trip'
        AND DATE(i.created_at AT TIME ZONE 'America/Los_Angeles') = DATE(NOW() AT TIME ZONE 'America/Los_Angeles')
      ORDER BY i.created_at DESC 
      LIMIT 1
    `, [parseInt(session.userId)]);

    if (result.rows.length === 0) {
      return successResponse(null, 'No pre-trip inspection found for today');
    }

    return successResponse(result.rows[0], 'Pre-trip inspection retrieved');

  } catch (error) {
    console.error('Get pre-trip inspection error:', error);
    return errorResponse('Failed to retrieve pre-trip inspection', 500);
  }
}