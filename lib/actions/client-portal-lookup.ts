'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const LookupSchema = z.object({
  last_name: z.string().min(1).max(255),
  lookup_method: z.enum(['email', 'phone', 'booking_number']),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  booking_number: z.string().max(50).optional(),
});

type LookupInput = z.infer<typeof LookupSchema>;
type LookupRow = { id: number };

export async function lookupBooking(input: LookupInput): Promise<{ error: string }> {
  const parsed = LookupSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Invalid input. Please check your details.' };
  }

  const { last_name, lookup_method, email, phone, booking_number } = parsed.data;
  const lastNamePattern = `%${last_name.trim()}%`;

  let rows: LookupRow[];

  try {
    if (lookup_method === 'email' && email) {
      rows = await prisma.$queryRawUnsafe<LookupRow[]>(
        `SELECT id FROM bookings
         WHERE LOWER(customer_email) = LOWER($1)
         AND UPPER(customer_name) LIKE UPPER($2)
         ORDER BY tour_date DESC LIMIT 1`,
        email.trim(),
        lastNamePattern
      );
    } else if (lookup_method === 'phone' && phone) {
      const phoneLast10 = phone.replace(/\D/g, '').slice(-10);
      rows = await prisma.$queryRawUnsafe<LookupRow[]>(
        `SELECT id FROM bookings
         WHERE REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g') LIKE $1
         AND UPPER(customer_name) LIKE UPPER($2)
         ORDER BY tour_date DESC LIMIT 1`,
        `%${phoneLast10}`,
        lastNamePattern
      );
    } else if (booking_number) {
      rows = await prisma.$queryRawUnsafe<LookupRow[]>(
        `SELECT id FROM bookings
         WHERE UPPER(booking_number) = UPPER($1)
         AND UPPER(customer_name) LIKE UPPER($2)
         LIMIT 1`,
        booking_number.trim(),
        lastNamePattern
      );
    } else {
      return { error: 'Please provide a booking number, email, or phone number.' };
    }
  } catch {
    return { error: 'Unable to look up booking. Please try again.' };
  }

  if (!rows || rows.length === 0) {
    const typeMsg =
      lookup_method === 'email' ? 'email address' :
      lookup_method === 'phone' ? 'phone number' : 'booking number';
    return { error: `Booking not found. Please check your ${typeMsg} and last name.` };
  }

  redirect(`/client-portal/${rows[0].id}`);
}
