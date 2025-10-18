import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/app/api/utils';
import { query } from '@/lib/db';

/**
 * GET /api/bookings/[bookingNumber]
 *
 * Retrieve complete booking details by booking number.
 * Returns booking with customer, wineries, driver, vehicle, and payment information.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const { bookingNumber } = await params;

    // Validate booking number format
    if (!bookingNumber || !/^WWT-\d{4}-\d{5}$/.test(bookingNumber)) {
      return errorResponse('Invalid booking number format. Expected format: WWT-YYYY-NNNNN', 400);
    }

    // 1. Get booking details with customer info
    const bookingResult = await query(
      `SELECT
        b.id,
        b.booking_number,
        b.status,
        b.tour_date,
        b.start_time,
        b.end_time,
        b.duration_hours,
        b.customer_id,
        b.customer_name,
        b.customer_email,
        b.customer_phone,
        b.party_size,
        b.pickup_location,
        b.dropoff_location,
        b.special_requests,
        b.dietary_restrictions,
        b.accessibility_needs,
        b.base_price,
        b.gratuity,
        b.taxes,
        b.total_price,
        b.deposit_amount,
        b.deposit_paid,
        b.deposit_paid_at,
        b.final_payment_amount,
        b.final_payment_paid,
        b.final_payment_paid_at,
        b.driver_id,
        b.vehicle_id,
        b.cancellation_reason,
        b.cancelled_at,
        b.created_at,
        b.completed_at,
        c.email as customer_email_verified,
        c.phone as customer_phone_verified,
        c.vip_status
       FROM bookings b
       LEFT JOIN customers c ON c.id = b.customer_id
       WHERE b.booking_number = $1`,
      [bookingNumber]
    );

    if (bookingResult.rows.length === 0) {
      return errorResponse('Booking not found', 404);
    }

    const booking = bookingResult.rows[0];

    // 2. Get wineries for this booking
    const wineriesResult = await query(
      `SELECT
        w.id,
        w.name,
        w.slug,
        w.description,
        w.short_description,
        w.specialties,
        w.tasting_fee,
        w.address,
        w.city,
        w.phone,
        w.website,
        w.photos,
        w.amenities,
        w.average_rating,
        bw.visit_order,
        bw.scheduled_arrival,
        bw.scheduled_departure,
        bw.actual_arrival,
        bw.actual_departure,
        bw.notes
       FROM booking_wineries bw
       JOIN wineries w ON w.id = bw.winery_id
       WHERE bw.booking_id = $1
       ORDER BY bw.visit_order`,
      [booking.id]
    );

    const wineries = wineriesResult.rows.map(w => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      description: w.short_description || w.description,
      specialties: w.specialties,
      tasting_fee: w.tasting_fee ? parseFloat(w.tasting_fee) : null,
      address: w.address,
      city: w.city,
      phone: w.phone,
      website: w.website,
      photos: w.photos,
      amenities: w.amenities,
      average_rating: w.average_rating ? parseFloat(w.average_rating) : null,
      visit_order: w.visit_order,
      scheduled_arrival: w.scheduled_arrival,
      scheduled_departure: w.scheduled_departure,
      actual_arrival: w.actual_arrival,
      actual_departure: w.actual_departure,
      notes: w.notes
    }));

    // 3. Get driver information if assigned
    let driver = null;
    if (booking.driver_id) {
      const driverResult = await query(
        `SELECT id, name, email, phone FROM users WHERE id = $1`,
        [booking.driver_id]
      );
      if (driverResult.rows.length > 0) {
        const d = driverResult.rows[0];
        driver = {
          id: d.id,
          name: d.name,
          email: d.email,
          phone: d.phone
        };
      }
    }

    // 4. Get vehicle information if assigned
    let vehicle = null;
    if (booking.vehicle_id) {
      const vehicleResult = await query(
        `SELECT id, name, license_plate, vehicle_type, capacity FROM vehicles WHERE id = $1`,
        [booking.vehicle_id]
      );
      if (vehicleResult.rows.length > 0) {
        const v = vehicleResult.rows[0];
        vehicle = {
          id: v.id,
          name: v.name,
          license_plate: v.license_plate,
          type: v.vehicle_type,
          capacity: v.capacity
        };
      }
    }

    // 5. Get payment history
    const paymentsResult = await query(
      `SELECT
        id,
        amount,
        payment_type,
        payment_method,
        status,
        stripe_payment_intent_id,
        card_brand,
        card_last4,
        created_at,
        succeeded_at,
        failed_at,
        failure_reason
       FROM payments
       WHERE booking_id = $1
       ORDER BY created_at DESC`,
      [booking.id]
    );

    const payments = paymentsResult.rows.map(p => ({
      id: p.id,
      amount: parseFloat(p.amount),
      payment_type: p.payment_type,
      payment_method: p.payment_method,
      status: p.status,
      stripe_payment_intent_id: p.stripe_payment_intent_id,
      card_brand: p.card_brand,
      card_last4: p.card_last4,
      created_at: p.created_at,
      succeeded_at: p.succeeded_at,
      failed_at: p.failed_at,
      failure_reason: p.failure_reason
    }));

    // 6. Get booking timeline
    const timelineResult = await query(
      `SELECT
        id,
        event_type,
        event_description,
        event_data,
        created_at
       FROM booking_timeline
       WHERE booking_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [booking.id]
    );

    const timeline = timelineResult.rows.map(t => ({
      id: t.id,
      event_type: t.event_type,
      description: t.event_description,
      data: t.event_data,
      created_at: t.created_at
    }));

    // 7. Calculate cancellation deadline and modification permissions
    const tourDate = new Date(booking.tour_date);
    const now = new Date();
    const hoursUntilTour = (tourDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    const cancellationDeadline = new Date(tourDate);
    cancellationDeadline.setHours(cancellationDeadline.getHours() - 72);

    const canModify = hoursUntilTour > 72 && booking.status !== 'cancelled' && booking.status !== 'completed';
    const canCancel = hoursUntilTour > 24 && booking.status !== 'cancelled' && booking.status !== 'completed';

    // 8. Calculate final payment due date
    const finalPaymentDueDate = new Date(tourDate);
    finalPaymentDueDate.setHours(finalPaymentDueDate.getHours() - 48);

    // Construct response
    return successResponse({
      booking_number: booking.booking_number,
      status: booking.status,
      tour_date: booking.tour_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      duration_hours: parseFloat(booking.duration_hours),
      customer: {
        id: booking.customer_id,
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone,
        vip_status: booking.vip_status || false
      },
      party_size: booking.party_size,
      pickup_location: booking.pickup_location,
      dropoff_location: booking.dropoff_location,
      special_requests: booking.special_requests,
      dietary_restrictions: booking.dietary_restrictions,
      accessibility_needs: booking.accessibility_needs,
      wineries: wineries,
      driver: driver,
      vehicle: vehicle,
      pricing: {
        base_price: parseFloat(booking.base_price),
        gratuity: parseFloat(booking.gratuity),
        taxes: parseFloat(booking.taxes),
        total: parseFloat(booking.total_price),
        deposit_paid: parseFloat(booking.deposit_amount),
        deposit_paid_at: booking.deposit_paid_at,
        balance_due: parseFloat(booking.final_payment_amount),
        balance_due_date: finalPaymentDueDate.toISOString().split('T')[0],
        balance_paid: booking.final_payment_paid,
        balance_paid_at: booking.final_payment_paid_at
      },
      payments: payments,
      timeline: timeline,
      permissions: {
        can_modify: canModify,
        can_cancel: canCancel,
        cancellation_deadline: cancellationDeadline.toISOString()
      },
      cancellation: booking.status === 'cancelled' ? {
        cancelled_at: booking.cancelled_at,
        reason: booking.cancellation_reason
      } : null,
      created_at: booking.created_at,
      completed_at: booking.completed_at
    });

  } catch (error) {
    console.error('❌ Get booking error:', error);
    return errorResponse('Failed to retrieve booking. Please try again.', 500);
  }
}
