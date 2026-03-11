/**
 * Reserve & Refine Booking API
 * Allows customers to put down a deposit to hold their date
 * Then Ryan calls within 24 hours to customize
 *
 * @deprecated LEGACY — uses raw SQL instead of bookingService.
 * Modern equivalent: POST /api/bookings/create (service-layer, full booking wizard).
 * Still in active use by /book/reserve flow — do NOT delete without migrating that page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getSetting } from '@/lib/settings/settings-service';
import { sendReservationConfirmation } from '@/lib/email';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { z } from 'zod';
import { noDisposableEmail } from '@/lib/utils/email-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  // Contact Info
  contactName: z.string().min(1).max(255),
  contactEmail: z.string().email().superRefine(noDisposableEmail),
  contactPhone: z.string().min(1).max(20),

  // Event Details
  partySize: z.number().int().positive(),
  preferredDate: z.string().min(1),
  alternateDate: z.string().optional(),
  eventType: z.string().min(1).max(255),
  specialRequests: z.string().max(5000).optional(),
  brandId: z.number().int().positive().optional(),

  // Payment
  paymentMethod: z.enum(['check', 'card']),
  depositAmount: z.number().positive(),
});

interface ReserveRequest {
  // Contact Info
  contactName: string;
  contactEmail: string;
  contactPhone: string;

  // Event Details
  partySize: number;
  preferredDate: string;
  alternateDate?: string;
  eventType: string;
  specialRequests?: string;
  brandId?: number; // Which brand is handling this reservation

  // Payment
  paymentMethod: 'check' | 'card';
  depositAmount: number;
}

/**
 * POST /api/booking/reserve
 * Create a reservation with deposit
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const data: ReserveRequest = BodySchema.parse(await request.json());

  // Validate required fields
  if (!data.contactName || !data.contactEmail || !data.contactPhone) {
    throw new BadRequestError('Contact information is required');
  }

  if (!data.preferredDate || data.partySize < 1) {
    throw new BadRequestError('Date and party size are required');
  }

  // Get deposit settings
  const depositSettings = await getSetting('deposit_rules') as { reserve_refine?: Record<string, number> } | undefined;
  const bookingSettings = await getSetting('booking_flow_settings') as { reserve_refine_consultation_hours?: number } | undefined;

  // Validate deposit amount
  const expectedDeposit = data.partySize <= 7
    ? depositSettings?.reserve_refine?.['1-7'] ?? 250
    : depositSettings?.reserve_refine?.['8-14'] ?? 350;

  if (Math.abs(data.depositAmount - expectedDeposit) > 50) {
    throw new BadRequestError(`Invalid deposit amount. Expected approximately $${expectedDeposit}`);
  }

  // Use Prisma transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create or find customer
    let customerId: number;

    const existingCustomerRows = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM customers WHERE LOWER(email) = LOWER(${data.contactEmail})`;

    if (existingCustomerRows.length > 0) {
      customerId = existingCustomerRows[0].id;

      // Update customer info
      await tx.$executeRaw`
        UPDATE customers
        SET name = ${data.contactName}, phone = ${data.contactPhone}, updated_at = NOW()
        WHERE id = ${customerId}`;
    } else {
      // Create new customer
      const newCustomerRows = await tx.$queryRaw<{ id: number }[]>`
        INSERT INTO customers (email, name, phone, created_at, updated_at)
        VALUES (${data.contactEmail}, ${data.contactName}, ${data.contactPhone}, NOW(), NOW())
        RETURNING id`;
      customerId = newCustomerRows[0].id;
    }

    // 2. Generate reservation number
    const reservationNumber = `RES${Date.now().toString().slice(-8)}`;

    // 3. Create reservation record
    const consultationHours = bookingSettings?.reserve_refine_consultation_hours || 24;
    const reservationRows = await tx.$queryRaw<{ id: number }[]>`
      INSERT INTO reservations (
        reservation_number,
        customer_id,
        party_size,
        preferred_date,
        alternate_date,
        event_type,
        special_requests,
        deposit_amount,
        deposit_paid,
        payment_method,
        status,
        brand_id,
        consultation_deadline,
        created_at,
        updated_at
      ) VALUES (${reservationNumber}, ${customerId}, ${data.partySize}, ${data.preferredDate}, ${data.alternateDate || null}, ${data.eventType}, ${data.specialRequests || null}, ${data.depositAmount}, ${data.paymentMethod === 'check' ? false : true}, ${data.paymentMethod}, 'pending', ${data.brandId || 1}, NOW() + INTERVAL '${consultationHours} hours', NOW(), NOW())
      RETURNING id`;

    const reservationId = reservationRows[0].id;

    // 4. If card payment, create payment record
    if (data.paymentMethod === 'card') {
      await tx.$executeRaw`
        INSERT INTO payments (
          reservation_id,
          customer_id,
          amount,
          payment_type,
          payment_method,
          status,
          brand_id,
          created_at
        ) VALUES (${reservationId}, ${customerId}, ${data.depositAmount}, 'deposit', 'card', 'pending', ${data.brandId || 1}, NOW())`;
    }

    // 5. Log activity
    await tx.$executeRaw`
      INSERT INTO activity_log (
        activity_type,
        user_type,
        user_id,
        description,
        metadata,
        created_at
      ) VALUES ('reservation_created', 'customer', ${customerId}, ${`New reservation ${reservationNumber} for ${data.partySize} guests on ${data.preferredDate}`}, ${JSON.stringify({
        reservation_id: reservationId,
        reservation_number: reservationNumber,
        deposit_amount: data.depositAmount,
        payment_method: data.paymentMethod
      })}::jsonb, NOW())`;

    return { reservationId, reservationNumber, customerId };
  });

  // Send confirmation email
  const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/reserve/confirmation?id=${result.reservationId}`;

  try {
    await sendReservationConfirmation(
      {
        customer_name: data.contactName,
        customer_email: data.contactEmail,
        reservation_number: result.reservationNumber,
        party_size: data.partySize,
        preferred_date: data.preferredDate,
        event_type: data.eventType,
        deposit_amount: data.depositAmount,
        payment_method: data.paymentMethod,
        consultation_hours: bookingSettings?.reserve_refine_consultation_hours || 24,
        confirmation_url: confirmationUrl
      },
      data.contactEmail,
      data.brandId || 1 // Pass brand ID for brand-specific email template
    );
  } catch (emailError) {
    logger.error('Reserve & Refine email send failed', { error: emailError });
    // Don't fail the reservation if email fails
  }

  logger.info('New reserve & refine reservation', {
    reservationNumber: result.reservationNumber,
    partySize: data.partySize,
    depositAmount: data.depositAmount,
    paymentMethod: data.paymentMethod
  });

  return NextResponse.json({
    success: true,
    reservationId: result.reservationId,
    reservationNumber: result.reservationNumber,
    message: data.paymentMethod === 'card'
      ? 'Reservation created! Processing payment...'
      : 'Reservation created! Please mail your check.'
  });
});
