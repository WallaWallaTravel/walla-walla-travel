import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';

import { z } from 'zod';

const BodySchema = z.object({
  booking_number: z.string().max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  last_name: z.string().min(1).max(255),
  lookup_method: z.enum(['email', 'phone', 'booking_number']).optional(),
});

interface BookingRow {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  tour_date: string;
  status: string;
}

export const POST =
  withErrorHandling(async (request: NextRequest) => {
  const body = BodySchema.parse(await request.json());
  const { booking_number, email, phone, last_name, lookup_method } = body;

  if (!last_name) {
    throw new BadRequestError('Last name is required');
  }

  let rows: BookingRow[];
  const lastNamePattern = `%${last_name.trim()}%`;

  // Look up by the specified method
  if (lookup_method === 'email' && email) {
    const emailTrimmed = email.trim();
    rows = await prisma.$queryRaw<BookingRow[]>`
      SELECT id, booking_number, customer_name, customer_email, tour_date, status
      FROM bookings
      WHERE LOWER(customer_email) = LOWER(${emailTrimmed})
      AND UPPER(customer_name) LIKE UPPER(${lastNamePattern})
      ORDER BY tour_date DESC
      LIMIT 1`;
  } else if (lookup_method === 'phone' && phone) {
    const phoneDigits = phone.replace(/\D/g, '');
    const phoneLast10 = phoneDigits.slice(-10);
    const phonePattern = `%${phoneLast10}`;

    rows = await prisma.$queryRaw<BookingRow[]>`
      SELECT id, booking_number, customer_name, customer_email, customer_phone, tour_date, status
      FROM bookings
      WHERE REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g') LIKE ${phonePattern}
      AND UPPER(customer_name) LIKE UPPER(${lastNamePattern})
      ORDER BY tour_date DESC
      LIMIT 1`;
  } else if (booking_number) {
    const bookingNumberTrimmed = booking_number.trim();
    rows = await prisma.$queryRaw<BookingRow[]>`
      SELECT id, booking_number, customer_name, customer_email, tour_date, status
      FROM bookings
      WHERE UPPER(booking_number) = UPPER(${bookingNumberTrimmed})
      AND UPPER(customer_name) LIKE UPPER(${lastNamePattern})
      LIMIT 1`;
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
});
