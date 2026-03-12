import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { sendEmail, EmailTemplates } from '@/lib/email';
import { sendDriverAssignmentToCustomer } from '@/lib/services/email-automation.service';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { z } from 'zod';

const BodySchema = z.object({
  action: z.enum(['accept', 'decline']),
  notes: z.string().max(5000).optional().nullable(),
});

export const POST = withCSRF(
  withErrorHandling(async (
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

  // Run transactional queries inside prisma.$transaction
  const { offer, expired } = await prisma.$transaction(async (tx) => {
    // Get offer details
    const offerRows = await tx.$queryRawUnsafe<Record<string, any>[]>(`
      SELECT
        tof.*,
        b.booking_number,
        b.customer_name
      FROM tour_offers tof
      JOIN bookings b ON tof.booking_id = b.id
      WHERE tof.id = $1
    `, offer_id);

    if (offerRows.length === 0) {
      throw new NotFoundError('Offer not found');
    }

    const offerData = offerRows[0];

    // Check if offer is still pending
    if (offerData.status !== 'pending') {
      throw new BadRequestError('Offer is no longer available');
    }

    // Check if offer has expired
    if (new Date(offerData.expires_at) < new Date()) {
      await tx.$executeRawUnsafe(`
        UPDATE tour_offers
        SET status = 'expired', updated_at = NOW()
        WHERE id = $1
      `, offer_id);

      return { offer: offerData, expired: true };
    }

    if (action === 'accept') {
      // Update offer status
      await tx.$executeRawUnsafe(`
        UPDATE tour_offers
        SET
          status = 'accepted',
          response_at = NOW(),
          response_notes = $2
        WHERE id = $1
      `, offer_id, notes || null);

      // Assign driver to booking
      await tx.$executeRawUnsafe(`
        UPDATE bookings
        SET
          driver_id = $1,
          status = CASE
            WHEN status = 'pending' THEN 'confirmed'
            ELSE status
          END,
          updated_at = NOW()
        WHERE id = $2
      `, offerData.driver_id, offerData.booking_id);

      // Assign vehicle if specified
      if (offerData.vehicle_id) {
        await tx.$executeRawUnsafe(`
          INSERT INTO vehicle_assignments (
            vehicle_id,
            booking_id,
            driver_id,
            assigned_at,
            status
          ) VALUES ($1, $2, $3, NOW(), 'assigned')
          ON CONFLICT (booking_id)
          DO UPDATE SET
            vehicle_id = $1,
            driver_id = $3,
            assigned_at = NOW(),
            status = 'assigned'
        `, offerData.vehicle_id, offerData.booking_id, offerData.driver_id);
      }

      // Withdraw other pending offers for this booking
      await tx.$executeRawUnsafe(`
        UPDATE tour_offers
        SET
          status = 'withdrawn',
          response_at = NOW(),
          response_notes = 'Automatically withdrawn - booking accepted by another driver'
        WHERE booking_id = $1
        AND id != $2
        AND status = 'pending'
      `, offerData.booking_id, offer_id);
    } else {
      // action === 'decline'
      await tx.$executeRawUnsafe(`
        UPDATE tour_offers
        SET
          status = 'declined',
          response_at = NOW(),
          response_notes = $2
        WHERE id = $1
      `, offer_id, notes || null);
    }

    return { offer: offerData, expired: false };
  });

  if (expired) {
    throw new BadRequestError('Offer has expired');
  }

  if (action === 'accept') {
    // Get full booking and driver details for emails (outside transaction)
    const bookingRows = await prisma.$queryRawUnsafe<Record<string, any>[]>(`
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
      LEFT JOIN vehicles v ON v.id = $2
      WHERE b.id = $1
    `, offer.booking_id, offer.vehicle_id);

    const bookingData = bookingRows[0];

    // Send confirmation email to driver
    if (bookingData?.driver_email) {
      const template = EmailTemplates.driverAssignment({
        driver_name: bookingData.driver_name,
        customer_name: bookingData.customer_name,
        booking_number: bookingData.booking_number,
        tour_date: bookingData.tour_date,
        start_time: bookingData.start_time,
        pickup_location: bookingData.pickup_location || 'TBD',
        vehicle_name: bookingData.vehicle_number ?
          `${bookingData.vehicle_number} (${bookingData.vehicle_make} ${bookingData.vehicle_model})` : undefined,
      });

      await sendEmail({
        to: bookingData.driver_email,
        ...template,
      });
    }

    // Notify admin that driver accepted
    const adminEmail = process.env.ADMIN_EMAIL || 'info@wallawallatravel.com';
    await sendEmail({
      to: adminEmail,
      subject: `✅ Driver Accepted: ${bookingData?.booking_number || offer.booking_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">✅ Tour Offer Accepted!</h2>
          <p><strong>${bookingData?.driver_name || 'Driver'}</strong> has accepted the tour.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Booking:</strong> ${bookingData?.booking_number || offer.booking_number}</p>
            <p><strong>Customer:</strong> ${bookingData?.customer_name || offer.customer_name}</p>
            <p><strong>Date:</strong> ${bookingData?.tour_date ? new Date(bookingData.tour_date).toLocaleDateString() : 'TBD'}</p>
          </div>
          <p>The driver and booking have been automatically linked.</p>
        </div>
      `,
    });

    // Notify customer that driver has been assigned (async)
    sendDriverAssignmentToCustomer(offer.booking_id).catch(err => {
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
})
);
