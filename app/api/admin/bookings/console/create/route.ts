/**
 * Admin Console Create Booking API
 *
 * POST /api/admin/bookings/console/create
 *
 * Creates a booking from the internal console with support for:
 * - Draft, create, or create_and_invoice modes
 * - Multi-vehicle bookings
 * - Transactional safety using hold blocks
 *
 * SCHEMA NOTES (verified against Prisma schema 2026-02-18):
 * - bookings: no vehicle_ids column, no notes column
 * - booking_timeline.id: use nextval() since sequence may not auto-fire
 * - customers: sms_marketing_consent (not can_text)
 * - bookings.tour_type: exists, should be populated from request
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
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

export const POST = withAdminAuth(async (request: NextRequest, _session) => {
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

    // Update customer with text consent preference (DB column: sms_marketing_consent)
    await prisma.$executeRaw`
      UPDATE customers SET sms_marketing_consent = ${customer.can_text} WHERE id = ${customerId}`;

    // Step 3: Generate booking number
    const bookingNumber = await bookingCoreService.generateBookingNumber();

    // Step 4: Determine status based on save mode
    const status = saveMode === 'draft' ? 'draft' : 'pending';

    // Step 5: Create booking
    const bookingRows = await prisma.$queryRaw<{
      id: number;
      booking_number: string;
      status: string;
    }[]>`
      INSERT INTO bookings (
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
        tour_type,
        created_at,
        updated_at
      ) VALUES (
        ${bookingNumber},
        ${customerId},
        ${customerName},
        ${customer.email},
        ${customer.phone},
        ${tour.party_size},
        ${tour.date},
        ${tour.start_time},
        ${endTime},
        ${tour.duration_hours},
        ${tour.pickup_location},
        ${tour.dropoff_location || tour.pickup_location},
        ${tour.special_requests || null},
        ${pricing.total_price},
        ${pricing.total_price},
        ${pricing.deposit_amount},
        ${false},
        ${pricing.total_price - pricing.deposit_amount},
        ${false},
        ${0},
        ${0},
        ${status},
        ${driver_id || null},
        ${vehicles.length === 1 ? vehicles[0] : null},
        'console',
        ${tour.how_did_you_hear || null},
        ${tour.wine_preferences || null},
        ${tour.tour_type || 'wine_tour'},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id, booking_number, status`;

    const booking = bookingRows[0];

    // Step 6: Convert hold blocks to booking blocks
    if (holdBlockIds.length > 0) {
      for (const blockId of holdBlockIds) {
        await vehicleAvailabilityService.convertHoldToBooking(blockId, booking.id);
      }
    }

    // Step 7: For multi-vehicle bookings, store in special_requests
    // (bookings table has no vehicle_ids or notes column)
    if (vehicles.length > 1) {
      await prisma.$executeRaw`
        UPDATE bookings SET
          special_requests = COALESCE(special_requests, '') || ${`\n[Multi-vehicle booking: vehicles ${vehicles.join(', ')}]`}
        WHERE id = ${booking.id}`;
    }

    // Step 8: Create timeline event
    // Use nextval to generate id (sequence may not auto-fire from raw SQL)
    try {
      await prisma.$executeRaw`
        INSERT INTO booking_timeline (id, booking_id, event_type, event_description, event_data, created_at)
        VALUES (
          (SELECT COALESCE(MAX(id), 0) + 1 FROM booking_timeline),
          ${booking.id}, 'booking_created', ${`Booking created via console (${saveMode})`}, ${JSON.stringify({
            save_mode: saveMode,
            created_by: 'console',
            vehicles: vehicles,
            driver_id: driver_id,
          })}::jsonb, CURRENT_TIMESTAMP
        )`;
    } catch (timelineError) {
      // Timeline is informational — don't fail the booking if this errors
      logger.error('Failed to create booking timeline entry', {
        error: timelineError,
        bookingId: booking.id,
      });
    }

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
});
