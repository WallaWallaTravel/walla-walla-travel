import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { z } from 'zod';

const BodySchema = z.object({
  booking_number: z.string().max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  last_name: z.string().min(1).max(255),
  lookup_method: z.enum(['email', 'phone', 'booking_number']).optional(),
});

export const POST = withCSRF(
  withErrorHandling(async (request: NextRequest) => {
  const body = BodySchema.parse(await request.json());
  const { booking_number, email, phone, last_name, lookup_method } = body;

  if (!last_name) {
    throw new BadRequestError('Last name is required');
  }

  let rows: Record<string, any>[];
  const lastNamePattern = `%${last_name.trim()}%`;

  // Look up by the specified method
  if (lookup_method === 'email' && email) {
    // Look up by email
    rows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
      `SELECT id, booking_number, customer_name, customer_email, tour_date, status
       FROM bookings
       WHERE LOWER(customer_email) = LOWER($1)
       AND UPPER(customer_name) LIKE UPPER($2)
       ORDER BY tour_date DESC
       LIMIT 1`,
      email.trim(), lastNamePattern
    );
  } else if (lookup_method === 'phone' && phone) {
    // Look up by phone - strip non-digits and match last 10 digits
    const phoneDigits = phone.replace(/\D/g, '');
    const phoneLast10 = phoneDigits.slice(-10);

    rows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
      `SELECT id, booking_number, customer_name, customer_email, customer_phone, tour_date, status
       FROM bookings
       WHERE REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g') LIKE $1
       AND UPPER(customer_name) LIKE UPPER($2)
       ORDER BY tour_date DESC
       LIMIT 1`,
      `%${phoneLast10}`, lastNamePattern
    );
  } else if (booking_number) {
    // Look up by booking number (original method)
    rows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
      `SELECT id, booking_number, customer_name, customer_email, tour_date, status
       FROM bookings
       WHERE UPPER(booking_number) = UPPER($1)
       AND UPPER(customer_name) LIKE UPPER($2)
       LIMIT 1`,
      booking_number.trim(), lastNamePattern
    );
  } else {
    throw new BadRequestError('Please provide a booking number, email, or phone number');
  }

  if (rows.length === 0) {
    const lookupTypeMsg = lookup_method === 'email' ? 'email address' :
                          lookup_method === 'phone' ? 'phone number' : 'booking number';
    throw new NotFoundError(`Booking not found. Please check your ${lookupTypeMsg} and last name.`);
  }

  const booking = rows[0];

  return NextResponse.json({
    success: true,
    data: {
      booking_id: booking.id,
      booking_number: booking.booking_number,
      tour_date: booking.tour_date,
      status: booking.status
    }
  });
})
);







