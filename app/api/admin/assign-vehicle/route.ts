import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  parseRequestBody,
  validateRequiredFields,
  logApiRequest
} from '@/app/api/utils';
import { requireAdmin } from '@/lib/admin-auth';
import { query } from '@/lib/db';

/**
 * POST /api/admin/assign-vehicle
 * Assign vehicle to driver with client and billing information
 *
 * Body:
 * {
 *   timeCardId: number,
 *   vehicleId: number,
 *   clientName: string,
 *   hourlyRate: number,
 *   notes?: string,
 *   clientPhone?: string,
 *   clientEmail?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin();
    if ('status' in authResult) {
      return authResult;
    }

    logApiRequest('POST', '/api/admin/assign-vehicle', authResult.userId);

    // Parse request body
    const body = await parseRequestBody<{
      timeCardId: number;
      vehicleId: number;
      clientName: string;
      hourlyRate: number;
      notes?: string;
      clientPhone?: string;
      clientEmail?: string;
    }>(request);

    if (!body) {
      return errorResponse('Invalid request body', 400);
    }

    // Validate required fields
    const validationError = validateRequiredFields(body, ['timeCardId', 'vehicleId', 'clientName', 'hourlyRate']);
    if (validationError) {
      return errorResponse(validationError, 400);
    }

    // Validate hourly rate is positive
    if (body.hourlyRate <= 0) {
      return errorResponse('Hourly rate must be greater than 0', 400);
    }

    // Start transaction by getting client
    const client = await query('SELECT 1'); // Get a connection from pool

    // 1. Verify time card exists and is active (not clocked out)
    const timeCardResult = await query(`
      SELECT id, driver_id, vehicle_id, clock_out_time
      FROM time_cards
      WHERE id = $1
    `, [body.timeCardId]);

    if (timeCardResult.rows.length === 0) {
      return errorResponse('Time card not found', 404);
    }

    const timeCard = timeCardResult.rows[0];

    if (timeCard.clock_out_time !== null) {
      return errorResponse('Cannot assign vehicle - shift is already completed', 400);
    }

    // 2. Verify vehicle exists and is available
    const vehicleResult = await query(`
      SELECT id, vehicle_number, status, is_active
      FROM vehicles
      WHERE id = $1
    `, [body.vehicleId]);

    if (vehicleResult.rows.length === 0) {
      return errorResponse('Vehicle not found', 404);
    }

    const vehicle = vehicleResult.rows[0];

    if (!vehicle.is_active) {
      return errorResponse('Vehicle is inactive', 400);
    }

    if (vehicle.status === 'out_of_service') {
      return errorResponse('Vehicle is out of service', 400);
    }

    // Check if vehicle is already assigned to another active shift
    const vehicleInUse = await query(`
      SELECT tc.id, u.name as driver_name
      FROM time_cards tc
      JOIN users u ON tc.driver_id = u.id
      WHERE tc.vehicle_id = $1
        AND tc.clock_out_time IS NULL
        AND tc.id != $2
    `, [body.vehicleId, body.timeCardId]);

    if (vehicleInUse.rows.length > 0) {
      return errorResponse(
        `Vehicle ${vehicle.vehicle_number} is already assigned to ${vehicleInUse.rows[0].driver_name}`,
        400
      );
    }

    // 3. Update time card with vehicle assignment
    await query(`
      UPDATE time_cards
      SET vehicle_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [body.vehicleId, body.timeCardId]);

    // 4. Create client service record
    const clientServiceResult = await query(`
      INSERT INTO client_services (
        time_card_id,
        driver_id,
        vehicle_id,
        client_name,
        client_phone,
        client_email,
        hourly_rate,
        notes,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'assigned', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      body.timeCardId,
      timeCard.driver_id,
      body.vehicleId,
      body.clientName,
      body.clientPhone || null,
      body.clientEmail || null,
      body.hourlyRate,
      body.notes || null
    ]);

    const clientService = clientServiceResult.rows[0];

    // 5. Update time card with client_service_id
    await query(`
      UPDATE time_cards
      SET client_service_id = $1
      WHERE id = $2
    `, [clientService.id, body.timeCardId]);

    // 6. Create vehicle assignment record
    const vehicleAssignmentResult = await query(`
      INSERT INTO vehicle_assignments (
        time_card_id,
        driver_id,
        vehicle_id,
        client_service_id,
        assigned_by,
        assignment_notes,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      body.timeCardId,
      timeCard.driver_id,
      body.vehicleId,
      clientService.id,
      parseInt(authResult.userId),
      body.notes || null
    ]);

    // 7. Update vehicle status to 'assigned'
    await query(`
      UPDATE vehicles
      SET status = 'assigned', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [body.vehicleId]);

    console.log(`✅ Vehicle assigned successfully:`);
    console.log(`   Time Card ID: ${body.timeCardId}`);
    console.log(`   Vehicle: ${vehicle.vehicle_number}`);
    console.log(`   Client: ${body.clientName}`);
    console.log(`   Rate: $${body.hourlyRate}/hr`);
    console.log(`   Assigned by: ${authResult.name} (${authResult.email})`);

    return successResponse({
      clientService,
      vehicleAssignment: vehicleAssignmentResult.rows[0],
      vehicle: {
        id: vehicle.id,
        vehicle_number: vehicle.vehicle_number
      }
    }, 'Vehicle assigned successfully');

  } catch (error) {
    console.error('❌ Vehicle assignment error:', error);
    return errorResponse('Failed to assign vehicle', 500);
  }
}
