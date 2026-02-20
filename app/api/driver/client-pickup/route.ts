import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  requireAuth,
} from '@/app/api/utils';
import { query } from '@/lib/db';
import { logger, logApiRequest } from '@/lib/logger';
import { z } from 'zod';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

// Request body schema
const ClientPickupSchema = z.object({
  clientServiceId: z.number().int().positive('Client service ID must be a positive integer'),
  pickupLocation: z.string().min(1, 'Pickup location is required').max(500),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
});

/**
 * POST /api/driver/client-pickup
 * Log client pickup time and location
 *
 * Wrapped with withErrorHandling for consistent error handling
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Check authentication
  const authResult = await requireAuth();

  logApiRequest('POST', '/api/driver/client-pickup', authResult.userId);

  // Parse and validate request body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse('Invalid JSON in request body', 400);
  }

  const parseResult = ClientPickupSchema.safeParse(rawBody);
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
    return errorResponse('Cannot log pickup - shift is already completed', 400);
  }

  // Check if pickup already logged
  if (service.pickup_time !== null) {
    return errorResponse('Pickup already logged for this service', 400);
  }

  // Check service status
  if (service.status === 'completed') {
    return errorResponse('Cannot log pickup - service is already completed', 400);
  }

  // 2. Update client service with pickup information
  const updateResult = await query(`
    UPDATE client_services
    SET
      pickup_time = CURRENT_TIMESTAMP,
      pickup_location = $1,
      pickup_lat = $2,
      pickup_lng = $3,
      status = 'in_progress',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING
      id,
      client_name,
      pickup_time,
      pickup_location,
      status,
      hourly_rate
  `, [
    body.pickupLocation,
    body.pickupLat || null,
    body.pickupLng || null,
    body.clientServiceId
  ]);

  const updatedService = updateResult.rows[0];

  logger.info('Client pickup logged', {
    serviceId: updatedService.id,
    clientName: updatedService.client_name,
    pickupTime: updatedService.pickup_time,
    location: body.pickupLocation,
    status: updatedService.status,
  });

  return successResponse({
    service: updatedService,
    vehicle: service.vehicle_number ? {
      vehicle_number: service.vehicle_number
    } : null
  }, 'Client pickup logged successfully');
});

/**
 * GET /api/driver/client-pickup
 * Get current service ready for pickup
 */
export const GET = withErrorHandling(async () => {
  // Check authentication
  const authResult = await requireAuth();

  const driverId = parseInt(authResult.userId);

  // Get active client service for driver (assigned but not picked up yet)
  const serviceResult = await query(`
    SELECT
      cs.*,
      v.vehicle_number,
      v.make,
      v.model
    FROM client_services cs
    JOIN time_cards tc ON cs.time_card_id = tc.id
    LEFT JOIN vehicles v ON cs.vehicle_id = v.id
    WHERE cs.driver_id = $1
      AND tc.clock_out_time IS NULL
      AND cs.status IN ('assigned', 'in_progress')
    ORDER BY cs.created_at DESC
    LIMIT 1
  `, [driverId]);

  if (serviceResult.rows.length === 0) {
    return successResponse(null, 'No active client service found');
  }

  return successResponse({
    service: serviceResult.rows[0]
  }, 'Active client service retrieved');
});
