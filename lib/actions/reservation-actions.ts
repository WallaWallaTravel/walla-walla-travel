'use server';

/**
 * Server Actions for the public /book/reserve flow.
 * Replaces client-side fetch('/api/booking/reserve') calls.
 */

import { prisma } from '@/lib/prisma';
import { getSetting } from '@/lib/settings/settings-service';
import { sendReservationConfirmation } from '@/lib/email';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { noDisposableEmail } from '@/lib/utils/email-validation';

const ReserveSchema = z.object({
  contactName: z.string().min(1).max(255),
  contactEmail: z.string().email().superRefine(noDisposableEmail),
  contactPhone: z.string().min(1).max(20),
  partySize: z.number().int().positive(),
  preferredDate: z.string().min(1),
  alternateDate: z.string().optional(),
  eventType: z.string().min(1).max(255),
  specialRequests: z.string().max(5000).optional(),
  brandId: z.number().int().positive().optional(),
  paymentMethod: z.enum(['check', 'card']),
  depositAmount: z.number().positive(),
});

export type ReserveInput = z.infer<typeof ReserveSchema>;

export type ReserveResult = {
  success: true;
  reservationId: number;
  reservationNumber: string;
  message: string;
} | {
  success: false;
  error: string;
};

export async function createReservation(input: ReserveInput): Promise<ReserveResult> {
  const parsed = ReserveSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const data = parsed.data;

  // Get deposit settings
  const depositSettings = await getSetting('deposit_rules') as { reserve_refine?: Record<string, number> } | undefined;
  const bookingSettings = await getSetting('booking_flow_settings') as { reserve_refine_consultation_hours?: number } | undefined;

  // Validate deposit amount
  const expectedDeposit = data.partySize <= 7
    ? depositSettings?.reserve_refine?.['1-7'] ?? 250
    : depositSettings?.reserve_refine?.['8-14'] ?? 350;

  if (Math.abs(data.depositAmount - expectedDeposit) > 50) {
    return { success: false, error: `Invalid deposit amount. Expected approximately $${expectedDeposit}` };
  }

  try {
    const { reservationId, reservationNumber } = await prisma.$transaction(async (tx) => {
      // 1. Create or find customer
      let customerId: number;

      const existingCustomer = await tx.$queryRawUnsafe<{ id: number }[]>(
        'SELECT id FROM customers WHERE LOWER(email) = LOWER($1)',
        data.contactEmail
      );

      if (existingCustomer.length > 0) {
        customerId = existingCustomer[0].id;
        await tx.$queryRawUnsafe(
          `UPDATE customers SET name = $1, phone = $2, updated_at = NOW() WHERE id = $3`,
          data.contactName, data.contactPhone, customerId
        );
      } else {
        const newCustomer = await tx.$queryRawUnsafe<{ id: number }[]>(
          `INSERT INTO customers (email, name, phone, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id`,
          data.contactEmail, data.contactName, data.contactPhone
        );
        customerId = newCustomer[0].id;
      }

      // 2. Generate reservation number
      const resNumber = `RES${Date.now().toString().slice(-8)}`;

      // 3. Create reservation
      const reservation = await tx.$queryRawUnsafe<{ id: number }[]>(
        `INSERT INTO reservations (
          reservation_number, customer_id, party_size, preferred_date, alternate_date,
          event_type, special_requests, deposit_amount, deposit_paid, payment_method,
          status, brand_id, consultation_deadline, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() + INTERVAL '24 hours', NOW(), NOW())
        RETURNING id`,
        resNumber, customerId, data.partySize, data.preferredDate,
        data.alternateDate || null, data.eventType, data.specialRequests || null,
        data.depositAmount, data.paymentMethod === 'card',
        data.paymentMethod, 'pending', data.brandId || 1,
        bookingSettings?.reserve_refine_consultation_hours || 24
      );

      const resId = reservation[0].id;

      // 4. If card payment, create payment record
      if (data.paymentMethod === 'card') {
        await tx.$queryRawUnsafe(
          `INSERT INTO payments (
            reservation_id, customer_id, amount, payment_type, payment_method,
            status, brand_id, created_at
          ) VALUES ($1, $2, $3, 'deposit', 'card', 'pending', $4, NOW())`,
          resId, customerId, data.depositAmount, data.brandId || 1
        );
      }

      // 5. Log activity
      await tx.$queryRawUnsafe(
        `INSERT INTO activity_log (
          activity_type, user_type, user_id, description, metadata, created_at
        ) VALUES ('reservation_created', 'customer', $1, $2, $3, NOW())`,
        customerId,
        `New reservation ${resNumber} for ${data.partySize} guests on ${data.preferredDate}`,
        JSON.stringify({
          reservation_id: resId,
          reservation_number: resNumber,
          deposit_amount: data.depositAmount,
          payment_method: data.paymentMethod
        })
      );

      return { reservationId: resId, reservationNumber: resNumber };
    });

    // Send confirmation email (non-blocking)
    const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/reserve/confirmation?id=${reservationId}`;

    try {
      await sendReservationConfirmation(
        {
          customer_name: data.contactName,
          customer_email: data.contactEmail,
          reservation_number: reservationNumber,
          party_size: data.partySize,
          preferred_date: data.preferredDate,
          event_type: data.eventType,
          deposit_amount: data.depositAmount,
          payment_method: data.paymentMethod,
          consultation_hours: bookingSettings?.reserve_refine_consultation_hours || 24,
          confirmation_url: confirmationUrl
        },
        data.contactEmail,
        data.brandId || 1
      );
    } catch (emailError) {
      logger.error('Reserve & Refine email send failed', { error: emailError });
    }

    logger.info('New reserve & refine reservation', {
      reservationNumber,
      partySize: data.partySize,
      depositAmount: data.depositAmount,
      paymentMethod: data.paymentMethod
    });

    return {
      success: true,
      reservationId,
      reservationNumber,
      message: data.paymentMethod === 'card'
        ? 'Reservation created! Processing payment...'
        : 'Reservation created! Please mail your check.'
    };
  } catch (error) {
    logger.error('Failed to create reservation', { error });
    return { success: false, error: 'Failed to create reservation. Please try again.' };
  }
}

/**
 * Fetch reservation by ID with customer info.
 * Used by confirmation and payment pages.
 */
export async function getReservationById(id: number) {
  if (isNaN(id) || id < 1) return null;

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT
      r.*,
      c.name as customer_name,
      c.email as customer_email,
      c.phone as customer_phone
     FROM reservations r
     JOIN customers c ON r.customer_id = c.id
     WHERE r.id = $1`,
    id
  );

  if (rows.length === 0) return null;

  return rows[0];
}
