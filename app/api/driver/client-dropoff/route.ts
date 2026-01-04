import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  requireAuth,
} from '@/app/api/utils';
import { query } from '@/lib/db';
import { logger, logApiRequest } from '@/lib/logger';
import { z } from 'zod';

// Request body schema
const ClientDropoffSchema = z.object({
  clientServiceId: z.number().int().positive('Client service ID must be a positive integer'),
  dropoffLocation: z.string().min(1, 'Dropoff location is required').max(500),
  dropoffLat: z.number().min(-90).max(90).optional(),
  dropoffLng: z.number().min(-180).max(180).optional(),
});

/**
 * POST /api/driver/client-dropoff
 * Log client dropoff time, calculate service hours and total cost
 *
 * ✅ REFACTORED: Zod validation + structured logging
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult;
    }

    logApiRequest('POST', '/api/driver/client-dropoff', authResult.userId);

    // Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const parseResult = ClientDropoffSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return errorResponse('Validation failed: ' + parseResult.error.issues.map((e) => e.message).join(', '), 400);
    }

    const body = parseResult.data;

    const driverId = parseInt(authResult.userId);

    // 1. Verify client service exists and belongs to driver
    const serviceResult = await query(`
      SELECT
        cs.*,
        tc.clock_out_time,
        v.vehicle_number
      FROM client_services cs
      JOIN time_cards tc ON cs.time_card_id = tc.id
      LEFT JOIN vehicles v ON cs.vehicle_id = v.id
      WHERE cs.id = $1
    `, [body.clientServiceId]);

    if (serviceResult.rows.length === 0) {
      return errorResponse('Client service not found', 404);
    }

    const service = serviceResult.rows[0];

    // Verify service belongs to current driver
    if (service.driver_id !== driverId) {
      return errorResponse('This service is not assigned to you', 403);
    }

    // Check if shift is still active
    if (service.clock_out_time !== null) {
      return errorResponse('Cannot log dropoff - shift is already completed', 400);
    }

    // Check if pickup was logged
    if (service.pickup_time === null) {
      return errorResponse('Cannot log dropoff - pickup time not recorded', 400);
    }

    // Check if dropoff already logged
    if (service.dropoff_time !== null) {
      return errorResponse('Dropoff already logged for this service', 400);
    }

    // 2. Calculate service hours and total cost
    // Service hours = (dropoff_time - pickup_time) in hours
    // Total cost = service_hours * hourly_rate

    const updateResult = await query(`
      UPDATE client_services
      SET
        dropoff_time = CURRENT_TIMESTAMP,
        dropoff_location = $1,
        dropoff_lat = $2,
        dropoff_lng = $3,
        -- Calculate service hours: difference in hours between pickup and dropoff
        service_hours = ROUND(
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - pickup_time)) / 3600.0,
          2
        ),
        -- Calculate total cost: service_hours * hourly_rate
        total_cost = ROUND(
          (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - pickup_time)) / 3600.0) * hourly_rate,
          2
        ),
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING
        id,
        client_name,
        pickup_time,
        pickup_location,
        dropoff_time,
        dropoff_location,
        service_hours,
        hourly_rate,
        total_cost,
        status
    `, [
      body.dropoffLocation,
      body.dropoffLat || null,
      body.dropoffLng || null,
      body.clientServiceId
    ]);

    const completedService = updateResult.rows[0];

    // 3. Update vehicle assignment status to completed
    await query(`
      UPDATE vehicle_assignments
      SET status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE client_service_id = $1 AND status = 'active'
    `, [body.clientServiceId]);

    logger.info('Client dropoff logged and service completed', {
      serviceId: completedService.id,
      clientName: completedService.client_name,
      pickupTime: completedService.pickup_time,
      dropoffTime: completedService.dropoff_time,
      serviceHours: completedService.service_hours,
      hourlyRate: completedService.hourly_rate,
      totalCost: completedService.total_cost,
    });

    return successResponse({
      service: {
        ...completedService,
        // Format times for display
        pickup_time_formatted: new Date(completedService.pickup_time).toLocaleString('en-US', {
          timeZone: 'America/Los_Angeles',
          dateStyle: 'short',
          timeStyle: 'short'
        }),
        dropoff_time_formatted: new Date(completedService.dropoff_time).toLocaleString('en-US', {
          timeZone: 'America/Los_Angeles',
          dateStyle: 'short',
          timeStyle: 'short'
        })
      },
      billing: {
        service_hours: parseFloat(completedService.service_hours),
        hourly_rate: parseFloat(completedService.hourly_rate),
        total_cost: parseFloat(completedService.total_cost),
        formatted: `${completedService.service_hours} hrs × $${completedService.hourly_rate}/hr = $${completedService.total_cost}`
      },
      vehicle: service.vehicle_number ? {
        vehicle_number: service.vehicle_number
      } : null
    }, 'Client dropoff logged and billing calculated successfully');

  } catch (error) {
    logger.error('Client dropoff error', { error });
    return errorResponse('Failed to log client dropoff', 500);
  }
}

/**
 * GET /api/driver/client-dropoff
 * Get service ready for dropoff (pickup completed, dropoff not yet logged)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult;
    }

    const driverId = parseInt(authResult.userId);

    // Get active service with pickup completed but dropoff not logged
    const serviceResult = await query(`
      SELECT
        cs.*,
        v.vehicle_number,
        v.make,
        v.model,
        -- Calculate estimated cost if dropoff were now
        ROUND(
          (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - cs.pickup_time)) / 3600.0) * cs.hourly_rate,
          2
        ) as estimated_cost,
        ROUND(
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - cs.pickup_time)) / 3600.0,
          2
        ) as elapsed_hours
      FROM client_services cs
      JOIN time_cards tc ON cs.time_card_id = tc.id
      LEFT JOIN vehicles v ON cs.vehicle_id = v.id
      WHERE cs.driver_id = $1
        AND tc.clock_out_time IS NULL
        AND cs.status = 'in_progress'
        AND cs.pickup_time IS NOT NULL
        AND cs.dropoff_time IS NULL
      ORDER BY cs.pickup_time DESC
      LIMIT 1
    `, [driverId]);

    if (serviceResult.rows.length === 0) {
      return successResponse(null, 'No service ready for dropoff');
    }

    const service = serviceResult.rows[0];

    return successResponse({
      service,
      billing_preview: {
        elapsed_hours: parseFloat(service.elapsed_hours),
        hourly_rate: parseFloat(service.hourly_rate),
        estimated_cost: parseFloat(service.estimated_cost),
        formatted: `${service.elapsed_hours} hrs × $${service.hourly_rate}/hr ≈ $${service.estimated_cost}`
      }
    }, 'Service ready for dropoff');

  } catch (error) {
    logger.error('Get dropoff service error', { error });
    return errorResponse('Failed to retrieve service for dropoff', 500);
  }
}
