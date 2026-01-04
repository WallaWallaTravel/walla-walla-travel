import { NextRequest } from 'next/server';
import { successResponse, errorResponse, logApiRequest } from '@/app/api/utils';
import { requireAdmin } from '@/lib/admin-auth';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Request body schema
const AssignVehicleSchema = z.object({
  timeCardId: z.number().int().positive(),
  vehicleId: z.number().int().positive(),
  clientName: z.string().min(1).max(255),
  hourlyRate: z.number().positive('Hourly rate must be greater than 0'),
  notes: z.string().max(1000).optional(),
  clientPhone: z.string().max(20).optional(),
  clientEmail: z.string().email().optional(),
});

/**
 * POST /api/admin/assign-vehicle
 * Assign vehicle to driver with client and billing information
 *
 * ✅ REFACTORED: Zod validation + structured logging
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin();
    if ('status' in authResult) {
      return authResult;
    }

    logApiRequest('POST', '/api/admin/assign-vehicle', authResult.userId);

    // Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const parseResult = AssignVehicleSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return errorResponse('Validation failed: ' + parseResult.error.issues.map((e) => e.message).join(', '), 400);
    }

    const body = parseResult.data;

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

    // CRITICAL CHECK: Prevent mid-shift vehicle assignment to non-driving shifts
    // If the time card started without a vehicle (vehicle_id is NULL), the driver is on a non-driving shift.
    // Assigning a vehicle mid-shift creates an impossible state:
    // - System will require post-trip inspection before clock-out
    // - But pre-trip inspection was never done (because there was no vehicle at clock-in)
    // - Driver gets STUCK and cannot clock out!
    if (timeCard.vehicle_id === null) {
      return errorResponse(
        'Cannot assign vehicle to a shift that started without a vehicle (non-driving shift). ' +
        'Driver must clock out and clock in again with a vehicle for driving shifts.',
        400
      );
    }

    // 3. Update time card with vehicle assignment (only if shift already had a vehicle)
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

    logger.info('Vehicle assigned successfully', {
      timeCardId: body.timeCardId,
      vehicleNumber: vehicle.vehicle_number,
      clientName: body.clientName,
      hourlyRate: body.hourlyRate,
      assignedBy: `${authResult.name} (${authResult.email})`,
    });

    return successResponse({
      clientService,
      vehicleAssignment: vehicleAssignmentResult.rows[0],
      vehicle: {
        id: vehicle.id,
        vehicle_number: vehicle.vehicle_number
      }
    }, 'Vehicle assigned successfully');

  } catch (error) {
    logger.error('Vehicle assignment error', { error });
    return errorResponse('Failed to assign vehicle', 500);
  }
}
