import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { sendEmail, EmailTemplates } from '@/lib/email';
import { sendDriverAssignmentToCustomer } from '@/lib/services/email-automation.service';
import { z } from 'zod';

const BodySchema = z.object({
  action: z.enum(['accept', 'decline']),
  notes: z.string().max(5000).optional().nullable(),
});

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ offer_id: string }> }
) => {
  const { offer_id: offerId } = await params;
  const offer_id = parseInt(offerId);
  const body = BodySchema.parse(await request.json());
  const { action, notes } = body;

  if (!['accept', 'decline'].includes(action)) {
    throw new BadRequestError('Invalid action. Must be "accept" or "decline"');
  }

  // Use Prisma transaction instead of raw BEGIN/COMMIT
  const result = await prisma.$transaction(async (tx) => {
    // Get offer details
    const offerRows = await tx.$queryRaw<Record<string, unknown>[]>`
      SELECT
        to2.*,
        b.booking_number,
        b.customer_name
      FROM tour_offers to2
      JOIN bookings b ON to2.booking_id = b.id
      WHERE to2.id = ${offer_id}
    `;

    if (offerRows.length === 0) {
      throw new NotFoundError('Offer not found');
    }

    const offer = offerRows[0];

    // Check if offer is still pending
    if (offer.status !== 'pending') {
      throw new BadRequestError('Offer is no longer available');
    }

    // Check if offer has expired
    if (new Date(offer.expires_at as string) < new Date()) {
      await tx.$executeRaw`
        UPDATE tour_offers
        SET status = 'expired', updated_at = NOW()
        WHERE id = ${offer_id}
      `;

      throw new BadRequestError('Offer has expired');
    }

    if (action === 'accept') {
      // Update offer status
      await tx.$executeRaw`
        UPDATE tour_offers
        SET
          status = 'accepted',
          response_at = NOW(),
          response_notes = ${notes || null}
        WHERE id = ${offer_id}
      `;

      // Assign driver to booking
      await tx.$executeRaw`
        UPDATE bookings
        SET
          driver_id = ${offer.driver_id as number},
          status = CASE
            WHEN status = 'pending' THEN 'confirmed'
            ELSE status
          END,
          updated_at = NOW()
        WHERE id = ${offer.booking_id as number}
      `;

      // Assign vehicle if specified
      if (offer.vehicle_id) {
        await tx.$executeRaw`
          INSERT INTO vehicle_assignments (
            vehicle_id,
            booking_id,
            driver_id,
            assigned_at,
            status
          ) VALUES (${offer.vehicle_id as number}, ${offer.booking_id as number}, ${offer.driver_id as number}, NOW(), 'assigned')
          ON CONFLICT (booking_id)
          DO UPDATE SET
            vehicle_id = ${offer.vehicle_id as number},
            driver_id = ${offer.driver_id as number},
            assigned_at = NOW(),
            status = 'assigned'
        `;
      }

      // Withdraw other pending offers for this booking
      await tx.$executeRaw`
        UPDATE tour_offers
        SET
          status = 'withdrawn',
          response_at = NOW(),
          response_notes = 'Automatically withdrawn - booking accepted by another driver'
        WHERE booking_id = ${offer.booking_id as number}
        AND id != ${offer_id}
        AND status = 'pending'
      `;

      return { action: 'accept', offer };
    } else {
      // action === 'decline'
      await tx.$executeRaw`
        UPDATE tour_offers
        SET
          status = 'declined',
          response_at = NOW(),
          response_notes = ${notes || null}
        WHERE id = ${offer_id}
      `;

      return { action: 'decline', offer };
    }
  });

  if (result.action === 'accept') {
    const offer = result.offer;

    // Get full booking and driver details for emails
    const bookingRows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT
        b.*,
        u.name as driver_name,
        u.email as driver_email,
        u.phone as driver_phone,
        v.make as vehicle_make,
        v.model as vehicle_model,
        v.vehicle_number
      FROM bookings b
      LEFT JOIN users u ON b.driver_id = u.id
      LEFT JOIN vehicles v ON v.id = ${offer.vehicle_id as number | null}
      WHERE b.id = ${offer.booking_id as number}
    `;

    const bookingData = bookingRows[0];

    // Send confirmation email to driver
    if (bookingData?.driver_email) {
      const template = EmailTemplates.driverAssignment({
        driver_name: bookingData.driver_name as string,
        customer_name: bookingData.customer_name as string,
        booking_number: bookingData.booking_number as string,
        tour_date: bookingData.tour_date as string,
        start_time: bookingData.start_time as string,
        pickup_location: (bookingData.pickup_location as string) || 'TBD',
        vehicle_name: bookingData.vehicle_number ?
          `${bookingData.vehicle_number} (${bookingData.vehicle_make} ${bookingData.vehicle_model})` : undefined,
      });

      await sendEmail({
        to: bookingData.driver_email as string,
        ...template,
      });
    }

    // Notify admin that driver accepted
    const adminEmail = process.env.ADMIN_EMAIL || 'info@wallawallatravel.com';
    await sendEmail({
      to: adminEmail,
      subject: `✅ Driver Accepted: ${(bookingData?.booking_number as string) || (offer.booking_number as string)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">✅ Tour Offer Accepted!</h2>
          <p><strong>${(bookingData?.driver_name as string) || 'Driver'}</strong> has accepted the tour.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Booking:</strong> ${(bookingData?.booking_number as string) || (offer.booking_number as string)}</p>
            <p><strong>Customer:</strong> ${(bookingData?.customer_name as string) || (offer.customer_name as string)}</p>
            <p><strong>Date:</strong> ${bookingData?.tour_date ? new Date(bookingData.tour_date as string).toLocaleDateString() : 'TBD'}</p>
          </div>
          <p>The driver and booking have been automatically linked.</p>
        </div>
      `,
    });

    // Notify customer that driver has been assigned (async)
    sendDriverAssignmentToCustomer(offer.booking_id as number).catch(err => {
      logger.error('TourOffer: Failed to send customer notification', { error: err, bookingId: offer.booking_id });
    });

    return NextResponse.json({
      success: true,
      message: 'Tour accepted! You have been assigned to this booking.',
      booking_id: offer.booking_id,
      booking_number: offer.booking_number,
    });

  } else {
    return NextResponse.json({
      success: true,
      message: 'Tour declined.',
    });
  }
});
