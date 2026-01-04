import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import {
  successResponse,
  errorResponse,
  requireAuth,
  getOptionalAuth,
  parseRequestBody,
  validateRequiredFields,
  logApiRequest
} from '@/app/api/utils';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';

interface OdometerUpdate {
  mileage: number;
  notes?: string;
  fuel_level?: number;
}

/**
 * PUT /api/vehicles/:id/odometer
 * Updates the vehicle's odometer reading
 */
export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check authentication - required for odometer updates
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult;
    }
    const session = authResult;

    logApiRequest('PUT', `/api/vehicles/${id}/odometer`, session.userId);

    // Validate vehicle ID
    const vehicleId = parseInt(id);
    if (isNaN(vehicleId)) {
      return errorResponse('Invalid vehicle ID', 400);
    }

    // Parse request body
    const body = await parseRequestBody<OdometerUpdate>(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }

    // Validate required fields
    const validationError = validateRequiredFields(body as unknown as Record<string, unknown>, ['mileage']);
    if (validationError) {
      return errorResponse(validationError, 400);
    }

    // Validate mileage is a positive number
    const newMileage = parseFloat(body.mileage.toString());
    if (isNaN(newMileage) || newMileage < 0) {
      return errorResponse('Invalid mileage value', 400);
    }

    // Validate fuel level if provided
    if (body.fuel_level !== undefined) {
      const fuelLevel = parseFloat(body.fuel_level.toString());
      if (isNaN(fuelLevel) || fuelLevel < 0 || fuelLevel > 100) {
        return errorResponse('Fuel level must be between 0 and 100', 400);
      }
    }

    const driverId = parseInt(session.userId);

    // Use transaction for consistency
    const result = await withTransaction(async (client) => {
      // Get current vehicle data
      const vehicleResult = await client.query(`
        SELECT 
          id,
          vehicle_number,
          current_mileage,
          next_service_due,
          is_active
        FROM vehicles 
        WHERE id = $1
      `, [vehicleId]);

      if (vehicleResult.rowCount === 0) {
        throw new Error('Vehicle not found');
      }

      const vehicle = vehicleResult.rows[0];

      if (!vehicle.is_active) {
        throw new Error('Cannot update odometer for inactive vehicle');
      }

      // Check for odometer rollback
      if (newMileage < vehicle.current_mileage) {
        throw new Error(`New mileage (${newMileage}) cannot be less than current mileage (${vehicle.current_mileage})`);
      }

      // Update vehicle mileage and optionally fuel level
      const updateFields = ['current_mileage = $2', 'updated_at = CURRENT_TIMESTAMP'];
      const updateParams = [vehicleId, newMileage];
      let paramCount = 2;

      if (body.fuel_level !== undefined) {
        paramCount++;
        updateFields.push(`fuel_level = $${paramCount}`);
        updateParams.push(body.fuel_level);
      }

      const updateResult = await client.query(`
        UPDATE vehicles 
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `, updateParams);

      const updatedVehicle = updateResult.rows[0];

      // Log mileage change
      await client.query(`
        INSERT INTO mileage_logs (
          vehicle_id,
          recorded_date,
          mileage,
          previous_mileage,
          mileage_change,
          recorded_by,
          notes
        ) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6)
      `, [
        vehicleId,
        newMileage,
        vehicle.current_mileage,
        newMileage - vehicle.current_mileage,
        driverId,
        body.notes || null,
      ]);

      // Update time card if this is an end-of-day reading
      await client.query(`
        UPDATE time_cards 
        SET end_mileage = $2
        WHERE vehicle_id = $1 
          AND driver_id = $3
          AND DATE(clock_in_time) = CURRENT_DATE
          AND clock_out_time IS NOT NULL
          AND end_mileage IS NULL
      `, [vehicleId, newMileage, driverId]);

      // Update daily trip mileage
      await client.query(`
        UPDATE daily_trips 
        SET 
          end_mileage = $2,
          total_miles = $2 - start_mileage
        WHERE vehicle_id = $1 
          AND driver_id = $3
          AND trip_date = CURRENT_DATE
          AND end_mileage IS NULL
      `, [vehicleId, newMileage, driverId]);

      return updatedVehicle;
    });

    // Check if service is required
    const serviceRequired = result.next_service_due && result.current_mileage >= result.next_service_due;
    const milesUntilService = result.next_service_due ? result.next_service_due - result.current_mileage : null;

    // Create service alert if needed
    if (serviceRequired) {
      await query(`
        INSERT INTO vehicle_alerts (
          vehicle_id,
          alert_type,
          severity,
          message,
          created_by
        ) VALUES ($1, 'service_due', 'warning', $2, $3)
        ON CONFLICT (vehicle_id, alert_type) 
        DO UPDATE SET 
          message = EXCLUDED.message,
          updated_at = CURRENT_TIMESTAMP
      `, [
        vehicleId,
        `Service required - ${Math.abs(milesUntilService ?? 0)} miles overdue`,
        driverId,
      ]);
    }

    // Format response
    const responseData = {
      id: result.id,
      vehicle_number: result.vehicle_number,
      current_mileage: result.current_mileage,
      fuel_level: result.fuel_level,
      service_required: serviceRequired,
      miles_until_service: milesUntilService,
      updated_at: result.updated_at,
    };

    let message = 'Odometer updated successfully';
    if (serviceRequired) {
      message += `. Service is due (${Math.abs(milesUntilService ?? 0)} miles overdue)`;
    } else if (milesUntilService && milesUntilService <= 500) {
      message += `. Service due in ${milesUntilService} miles`;
    }

    return successResponse(responseData, message);

  } catch (error) {
    logger.error('Update odometer error', { error });

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return errorResponse(error.message, 404);
      }
      if (error.message.includes('cannot be less than') || 
          error.message.includes('inactive vehicle')) {
        return errorResponse(error.message, 400);
      }
    }
    
    return errorResponse('Failed to update odometer', 500);
  }
}

/**
 * GET /api/vehicles/:id/odometer
 * Gets the current odometer reading and history
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Optional authentication
    const session = await getOptionalAuth();
    logApiRequest('GET', `/api/vehicles/${id}/odometer`, session?.userId);

    // Validate vehicle ID
    const vehicleId = parseInt(id);
    if (isNaN(vehicleId)) {
      return errorResponse('Invalid vehicle ID', 400);
    }

    // Get current odometer reading
    const vehicleResult = await query(`
      SELECT 
        id,
        vehicle_number,
        current_mileage,
        fuel_level,
        next_service_due,
        updated_at
      FROM vehicles 
      WHERE id = $1
    `, [vehicleId]);

    if (vehicleResult.rowCount === 0) {
      return errorResponse('Vehicle not found', 404);
    }

    const vehicle = vehicleResult.rows[0];

    // Get recent mileage history
    const historyResult = await query(`
      SELECT 
        ml.recorded_date,
        ml.mileage,
        ml.previous_mileage,
        ml.mileage_change,
        ml.notes,
        u.name as recorded_by
      FROM mileage_logs ml
      LEFT JOIN users u ON ml.recorded_by = u.id
      WHERE ml.vehicle_id = $1
      ORDER BY ml.recorded_date DESC
      LIMIT 20
    `, [vehicleId]);

    // Calculate service status
    const serviceRequired = vehicle.next_service_due && vehicle.current_mileage >= vehicle.next_service_due;
    const milesUntilService = vehicle.next_service_due ? vehicle.next_service_due - vehicle.current_mileage : null;

    // Format response
    const responseData = {
      current: {
        mileage: vehicle.current_mileage,
        fuel_level: vehicle.fuel_level,
        last_updated: vehicle.updated_at,
        service_required: serviceRequired,
        miles_until_service: milesUntilService,
      },
      history: historyResult.rows,
    };

    return successResponse(responseData, 'Odometer data retrieved successfully');

  } catch (error) {
    logger.error('Get odometer error', { error });
    return errorResponse('Failed to retrieve odometer data', 500);
  }
}