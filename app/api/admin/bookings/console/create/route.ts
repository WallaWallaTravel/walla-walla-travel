/**
 * Admin Console Create Booking API
 *
 * POST /api/admin/bookings/console/create
 *
 * Creates a booking from the internal console with support for:
 * - Draft, create, or create_and_invoice modes
 * - Multi-vehicle bookings
 * - Transactional safety using hold blocks
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { vehicleAvailabilityService } from '@/lib/services/vehicle-availability.service';
import { bookingCoreService } from '@/lib/services/booking/core.service';
import { sendBookingConfirmationEmail } from '@/lib/services/email-automation.service';
import { logger } from '@/lib/logger';

const CreateConsoleBookingSchema = z.object({
  saveMode: z.enum(['draft', 'create', 'create_and_invoice']),
  customer: z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(10),
    can_text: z.boolean(),
  }),
  tour: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    duration_hours: z.number().min(0).max(12),
    party_size: z.number().min(1).max(50),
    pickup_location: z.string().min(1),
    dropoff_location: z.string().optional(),
    special_requests: z.string().optional(),
    wine_preferences: z.string().optional(),
    tour_type: z.enum(['wine_tour', 'private_transportation', 'airport_transfer', 'corporate', 'dinner_service']).optional(),
    how_did_you_hear: z.string().optional(),
    custom_price: z.number().nullable().optional(),
  }),
  vehicles: z.array(z.number()).min(0),
  driver_id: z.number().nullable().optional(),
  pricing: z.object({
    total_price: z.number().min(0),
    deposit_amount: z.number().min(0),
    breakdown: z.array(z.object({
      label: z.string(),
      amount: z.number(),
      key: z.string().optional(),
      editable: z.boolean().optional(),
    })),
    custom_discount: z.number().optional(),
    custom_price_override: z.number().nullable().optional(),
  }),
});

export async function POST(request: Request) {
  const holdBlockIds: number[] = [];

  try {
    const body = await request.json();
    const parsed = CreateConsoleBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { saveMode, customer, tour, vehicles, driver_id, pricing } = parsed.data;

    // Calculate end time
    const [hours, minutes] = tour.start_time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + tour.duration_hours * 60;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

    // Step 1: Create hold blocks for selected vehicles (transactional safety)
    if (vehicles.length > 0 && saveMode !== 'draft') {
      for (const vehicleId of vehicles) {
        try {
          const holdBlock = await vehicleAvailabilityService.createHoldBlock({
            vehicleId,
            date: tour.date,
            startTime: tour.start_time,
            endTime,
            notes: `Console booking hold for ${customer.first_name} ${customer.last_name}`,
          });
          holdBlockIds.push(holdBlock.id);
        } catch (error) {
          // Release any holds we already created
          for (const blockId of holdBlockIds) {
            await vehicleAvailabilityService.releaseHoldBlock(blockId).catch(() => {});
          }
          throw error;
        }
      }
    }

    // Step 2: Get or create customer
    const customerName = `${customer.first_name} ${customer.last_name}`;
    const customerId = await bookingCoreService.getOrCreateCustomer({
      email: customer.email,
      name: customerName,
      phone: customer.phone,
    });

    // Update customer with can_text preference
    await pool.query(
      `UPDATE customers SET can_text = $1 WHERE id = $2`,
      [customer.can_text, customerId]
    );

    // Step 3: Generate booking number
    const bookingNumber = await bookingCoreService.generateBookingNumber();

    // Step 4: Determine status based on save mode
    const status = saveMode === 'draft' ? 'draft' : 'pending';

    // Step 5: Create booking
    const bookingResult = await pool.query<{
      id: number;
      booking_number: string;
      status: string;
    }>(
      `INSERT INTO bookings (
        booking_number,
        customer_id,
        customer_name,
        customer_email,
        customer_phone,
        party_size,
        tour_date,
        start_time,
        end_time,
        duration_hours,
        pickup_location,
        dropoff_location,
        special_requests,
        total_price,
        base_price,
        deposit_amount,
        deposit_paid,
        final_payment_amount,
        final_payment_paid,
        gratuity,
        taxes,
        status,
        driver_id,
        vehicle_id,
        booking_source,
        referral_source,
        wine_tour_preference,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id, booking_number, status`,
      [
        bookingNumber,
        customerId,
        customerName,
        customer.email,
        customer.phone,
        tour.party_size,
        tour.date,
        tour.start_time,
        endTime,
        tour.duration_hours,
        tour.pickup_location,
        tour.dropoff_location || tour.pickup_location, // dropoff defaults to pickup
        tour.special_requests || null,
        pricing.total_price,
        pricing.total_price, // base_price = total for now
        pricing.deposit_amount,
        false, // deposit_paid
        pricing.total_price - pricing.deposit_amount, // final_payment_amount
        false, // final_payment_paid
        0, // gratuity
        0, // taxes (already included in total)
        status,
        driver_id || null,
        vehicles.length === 1 ? vehicles[0] : null, // Single vehicle goes in vehicle_id
        'console',
        tour.how_did_you_hear || null,
        tour.wine_preferences || null,
      ]
    );

    const booking = bookingResult.rows[0];

    // Step 6: Convert hold blocks to booking blocks
    if (holdBlockIds.length > 0) {
      for (const blockId of holdBlockIds) {
        await vehicleAvailabilityService.convertHoldToBooking(blockId, booking.id);
      }
    }

    // Step 7: Create additional vehicle availability blocks for multi-vehicle
    if (vehicles.length > 1) {
      // Store vehicle assignments in a separate table or JSON field
      await pool.query(
        `UPDATE bookings SET
          vehicle_ids = $1,
          notes = COALESCE(notes, '') || $2
         WHERE id = $3`,
        [
          JSON.stringify(vehicles),
          `\n[Multi-vehicle booking: ${vehicles.length} vehicles]`,
          booking.id,
        ]
      );
    }

    // Step 8: Create timeline event
    await pool.query(
      `INSERT INTO booking_timeline (booking_id, event_type, event_description, event_data, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [
        booking.id,
        'booking_created',
        `Booking created via console (${saveMode})`,
        JSON.stringify({
          save_mode: saveMode,
          created_by: 'console',
          vehicles: vehicles,
          driver_id: driver_id,
        }),
      ]
    );

    // Step 9: Handle create_and_invoice mode
    let invoiceSent = false;
    if (saveMode === 'create_and_invoice') {
      try {
        await sendBookingConfirmationEmail(booking.id);
        invoiceSent = true;
        logger.info('Console booking invoice sent', { bookingId: booking.id });
      } catch (emailError) {
        logger.error('Failed to send console booking invoice', {
          error: emailError,
          bookingId: booking.id,
        });
        // Don't fail the whole request, just note the email failed
      }
    }

    logger.info('Console booking created', {
      bookingId: booking.id,
      bookingNumber: booking.booking_number,
      saveMode,
      vehicleCount: vehicles.length,
      invoiceSent,
    });

    return NextResponse.json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          booking_number: booking.booking_number,
          status: booking.status,
        },
        invoice_sent: invoiceSent,
      },
    });
  } catch (error) {
    // Release any hold blocks if something failed
    for (const blockId of holdBlockIds) {
      await vehicleAvailabilityService.releaseHoldBlock(blockId).catch(() => {});
    }

    logger.error('Console booking creation failed', { error });

    // Check for specific error types
    const errorMessage = error instanceof Error ? error.message : 'Failed to create booking';

    if (errorMessage.includes('no longer available') || errorMessage.includes('conflict')) {
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
