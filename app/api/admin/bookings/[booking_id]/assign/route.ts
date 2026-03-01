import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { queryOne, query, withTransaction } from '@/lib/db-helpers';
import { sendDriverAssignmentToCustomer } from '@/lib/services/email-automation.service';
import { sendEmail, EmailTemplates } from '@/lib/email';
import { auditService } from '@/lib/services/audit.service';
import { withComplianceCheck } from '@/lib/api/middleware/compliance-check';


/**
 * PUT /api/admin/bookings/[booking_id]/assign
 * Assign driver and vehicle to a booking
 *
 * Body: {
 *   driver_id: number,
 *   vehicle_id: number,
 *   notify_driver?: boolean,
 *   notify_customer?: boolean,
 *   compliance_override?: boolean,          // Optional: attempt to override compliance block
 *   compliance_override_reason?: string     // Required if override is true
 * }
 *
 * COMPLIANCE ENFORCEMENT:
 * This endpoint checks driver and vehicle compliance before assignment:
 * - Driver: Medical cert, license, MVR, annual review, open violations
 * - Vehicle: Registration, insurance, DOT inspection, critical defects
 * - HOS: Daily driving/on-duty limits, weekly limits
 *
 * Returns 403 if compliance violations prevent assignment.
 */

// Inner handler (after compliance check passes)
async function handleAssignment(
  request: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) {
  const { booking_id } = await params;
  const bookingId = parseInt(booking_id);

  if (isNaN(bookingId)) {
    throw new BadRequestError('Invalid booking ID');
  }

  const body = await request.json();
  const { driver_id, vehicle_id, notify_driver, notify_customer, compliance_override: _compliance_override, compliance_override_reason: _compliance_override_reason } = body;

  if (!driver_id || !vehicle_id) {
    throw new BadRequestError('driver_id and vehicle_id are required');
  }

  const result = await withTransaction(async (client) => {
    // 1. Get booking
    const booking = await queryOne(
      `SELECT * FROM bookings WHERE id = $1`,
      [bookingId],
      client
    );

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // 2. Verify driver exists and is available
    // Drivers can have role 'driver' or 'owner' (owner also drives)
    const driver = await queryOne(
      `SELECT * FROM users WHERE id = $1 AND role IN ('driver', 'owner') AND is_active = true`,
      [driver_id],
      client
    );

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // 3. Verify vehicle exists
    const vehicle = await queryOne(
      `SELECT * FROM vehicles WHERE id = $1`,
      [vehicle_id],
      client
    );

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    // 4. Check for conflicts (driver or vehicle already booked at overlapping time)
    const conflicts = await queryOne(
      `SELECT COUNT(*) as count
       FROM bookings b
       WHERE b.tour_date = $1
       AND b.id != $2
       AND b.status NOT IN ('cancelled', 'completed')
       AND (
         b.driver_id = $3
         OR b.vehicle_id = $4
       )
       AND (
         (b.start_time, b.end_time) OVERLAPS ($5::time, $6::time)
       )`,
      [booking.tour_date, bookingId, driver_id, vehicle_id, booking.start_time, booking.end_time],
      client
    );

    if (conflicts && conflicts.count > 0) {
      throw new BadRequestError('Driver or vehicle has conflicting booking');
    }

    // 5. Update booking with driver and vehicle
    // bookings table has driver_id and vehicle_id columns directly
    // (vehicle_assignments table is for time-card tracking, not booking assignment)
    await query(
      `UPDATE bookings
       SET driver_id = $1,
           vehicle_id = $2,
           status = CASE WHEN status = 'pending' THEN 'assigned' ELSE status END,
           updated_at = NOW()
       WHERE id = $3`,
      [driver_id, vehicle_id, bookingId],
      client
    );

    return { booking, driver, vehicle };
  });

  // 7. Send notifications (async, don't block response)
  if (notify_driver && result.driver.email) {
    const template = EmailTemplates.driverAssignment({
      driver_name: result.driver.name,
      customer_name: result.booking.customer_name,
      booking_number: result.booking.booking_number,
      tour_date: result.booking.tour_date,
      start_time: result.booking.start_time,
      pickup_location: result.booking.pickup_location || 'TBD',
      vehicle_name: result.vehicle ? 
        `${result.vehicle.vehicle_number} (${result.vehicle.make} ${result.vehicle.model})` : undefined,
    });
    
    sendEmail({
      to: result.driver.email,
      ...template,
    }).catch(err => logger.error('Failed to send driver notification', { error: err }));
  }

  if (notify_customer) {
    sendDriverAssignmentToCustomer(bookingId).catch(err => {
      logger.error('Failed to send customer notification', { error: err });
    });
  }

  // Audit log: driver/vehicle assignment
  auditService.logFromRequest(request, 0, 'booking_assigned', {
    bookingId,
    driverId: driver_id,
    vehicleId: vehicle_id,
    driverName: result.driver.name,
    vehicleName: `${result.vehicle.make} ${result.vehicle.model}`,
  }).catch(() => {}); // Non-blocking

  return NextResponse.json({
    success: true,
    message: 'Driver and vehicle assigned successfully',
    data: {
      booking_id: bookingId,
      driver_name: result.driver.name,
      vehicle_name: `${result.vehicle.make} ${result.vehicle.model}`,
    },
  });
}

// Compliance-checked handler (accepts request + route context)
const complianceHandler = withComplianceCheck(handleAssignment, {
  checkType: 'assignment',
  extractEntities: async (request, context) => {
    // Clone request to read body without consuming it
    const clonedRequest = request.clone();
    const body = await clonedRequest.json();

    // Get booking to determine tour date
    const { booking_id } = await context.params;
    const booking = await queryOne(
      `SELECT tour_date FROM bookings WHERE id = $1`,
      [parseInt(booking_id as string)]
    );

    return {
      driverId: body.driver_id,
      vehicleId: body.vehicle_id,
      tourDate: booking?.tour_date ? new Date(booking.tour_date) : new Date(),
      bookingId: parseInt(booking_id as string),
    };
  },
  allowOverride: true, // Allow admin override for non-critical violations
});

// Wrap with admin auth (which includes error handling), then delegate to compliance handler
export const PUT = withAdminAuth(async (request, _session, context) => {
  return complianceHandler(request, context as { params: Promise<{ booking_id: string }> });
});

